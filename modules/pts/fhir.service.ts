export interface FhirResource {
  resourceType: string;
  id: string;
  [key: string]: unknown;
}

export interface FhirBundle {
  resourceType: 'Bundle';
  type: 'transaction' | 'collection';
  entry: {
    fullUrl: string;
    resource: FhirResource;
  }[];
}

export class FhirExportService {
  /**
   * Converte uma ficha de PTS em um Bundle de recursos FHIR v4 contendo
   * Observations (triagem de determinantes sociais) e Tasks (fluxo de encaminhamento intersetorial).
   */
  static exportPtsToFhir(
    ptsId: string,
    patientId: string,
    data: Record<string, unknown>,
    scores: Record<string, number> = {}
  ): FhirBundle {
    const entries: { fullUrl: string; resource: FhirResource }[] = [];

    // 1. Criar Observation para SDoH / Insegurança Alimentar se aplicável
    const substances = (data.q2Substances as string[]) || [];
    if (substances.length > 0) {
      entries.push({
        fullUrl: `urn:uuid:observation-sdoh-substances-${ptsId}`,
        resource: {
          resourceType: 'Observation',
          id: `sdoh-substances-${ptsId}`,
          status: 'final',
          category: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                  code: 'social-history',
                  display: 'Social History'
                }
              ]
            }
          ],
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '88124-3',
                display: 'Food and social security observation panel'
              }
            ],
            text: 'Uso de Substâncias e Fatores de Vulnerabilidade Social'
          },
          subject: {
            reference: `Patient/${patientId}`
          },
          effectiveDateTime: new Date().toISOString(),
          valueString: `Substâncias reportadas: ${substances.join(', ')}`
        }
      });
    }

    // 2. Criar Observations para as médias dos Domínios do PTS
    Object.entries(scores).forEach(([domain, score]) => {
      entries.push({
        fullUrl: `urn:uuid:observation-domain-${domain}-${ptsId}`,
        resource: {
          resourceType: 'Observation',
          id: `pts-domain-${domain}-${ptsId}`,
          status: 'final',
          category: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                  code: 'survey',
                  display: 'Survey'
                }
              ]
            }
          ],
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '88124-3',
                display: `Escore de Vulnerabilidade do Domínio ${domain}`
              }
            ],
            text: `Escore do Domínio ${domain}`
          },
          subject: {
            reference: `Patient/${patientId}`
          },
          effectiveDateTime: new Date().toISOString(),
          valueQuantity: {
            value: score,
            unit: 'Score (0-4)',
            system: 'http://unitsofmeasure.org',
            code: '{score}'
          }
        }
      });
    });

    // 3. Criar Tasks FHIR para as Metas e Intervenções Intersetoriais
    const interventions = (data.interventions as Record<string, unknown>[]) || [];
    interventions.forEach((item: Record<string, unknown>, index: number) => {
      entries.push({
        fullUrl: `urn:uuid:task-intervention-${ptsId}-${index}`,
        resource: {
          resourceType: 'Task',
          id: `pts-task-${ptsId}-${index}`,
          status: item.status === 'completed' ? 'completed' : 'requested',
          intent: 'order',
          description: item.description as string,
          focus: {
            display: `Intervenção Intersetorial no serviço: ${item.service}`
          },
          for: {
            reference: `Patient/${patientId}`
          },
          owner: {
            display: (item.responsible as string) || 'Profissional Designado'
          },
          executionPeriod: {
            end: item.deadline ? new Date(item.deadline as string).toISOString() : undefined
          }
        }
      });
    });

    return {
      resourceType: 'Bundle',
      type: 'collection',
      entry: entries
    };
  }
}
