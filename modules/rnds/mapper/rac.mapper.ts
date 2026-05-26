import { randomUUID } from 'crypto';
import { RacDto } from '../dto/rac.dto';
import {
  FhirBundle,
  FhirComposition,
  FhirPatient,
  FhirEncounter,
  FhirCondition,
  FhirObservation,
  FhirAllergyIntolerance,
  FhirMedicationRequest,
  FhirBundleEntry,
  FhirExtension,
  FhirIdentifier
} from '../types/fhir-r4.types';

/**
 * Divide e higieniza nomes brasileiros de acordo com regras rígidas de compatibilidade do DATASUS.
 * Distribui prenomes e sobrenomes mantendo preposições e partículas intactas para evitar rejeição por divergência cadastral.
 */
export function splitBrazilianName(fullName: string): { family: string; given: string[] } {
  const cleanName = fullName.trim();
  const parts = cleanName.split(/\s+/);
  
  if (parts.length === 1) {
    return { family: parts[0], given: [parts[0]] };
  }

  // Sufixos familiares comuns na cultura brasileira
  const suffixes = ['junior', 'júnior', 'filho', 'neto', 'sobrinho', 'netto', 'segundo'];
  let familyParts: string[] = [];

  const lastWord = parts[parts.length - 1];
  if (suffixes.includes(lastWord.toLowerCase()) && parts.length > 2) {
    // Captura o sobrenome composto ex: "Silva Filho"
    familyParts.push(parts[parts.length - 2]);
    familyParts.push(lastWord);
    parts.splice(parts.length - 2, 2);
  } else {
    familyParts.push(lastWord);
    parts.splice(parts.length - 1, 1);
  }

  // Mantém TODAS as preposições e partículas intermediárias intactas sem deletar nenhuma
  return {
    family: familyParts.join(' '),
    given: parts
  };
}

export class RacMapper {
  /**
   * Converte o DTO estruturado e validado do RAC para um Bundle HL7 FHIR R4 completo,
   * livre de inconsistências ontológicas, com URIs canônicas corretas e higienização brasileira de nomes.
   */
  static toFhirBundle(dto: RacDto): FhirBundle {
    const bundleId = randomUUID();
    const compositionId = randomUUID();
    
    // Instanciação de UUIDs temporários para amarrar os recursos do Bundle (urn:uuid:<uuid>)
    const patientRefId = `urn:uuid:${randomUUID()}`;
    const encounterRefId = `urn:uuid:${randomUUID()}`;

    const entries: FhirBundleEntry[] = [];

    // ── 1. Mapeamento do Cidadão (Patient) ─────────────────────────────
    const patientExtensions: FhirExtension[] = [];

    // Extensão Obrigatória de Raça/Cor/Etnia - Correção: Canônica real do DATASUS
    patientExtensions.push({
      url: 'http://www.saude.gov.br/fhir/r4/StructureDefinition/BRRacaCorEtnia-1.0',
      extension: [
        {
          url: 'race',
          valueCodeableConcept: {
            coding: [
              {
                system: 'http://www.saude.gov.br/fhir/r4/CodeSystem/BRRacaCor-1.0',
                code: dto.patient.raceCode
              }
            ]
          }
        },
        ...(dto.patient.ethnicityCode
          ? [
              {
                url: 'indigenousEthnicity',
                valueCodeableConcept: {
                  coding: [
                    {
                      system: 'http://www.saude.gov.br/fhir/r4/CodeSystem/BREtniaIndigena-1.0',
                      code: dto.patient.ethnicityCode
                    }
                  ]
                }
              }
            ]
          : [])
      ]
    });

    // Extensão do País de Nascimento - Correção: Canônica real do DATASUS
    patientExtensions.push({
      url: 'http://www.saude.gov.br/fhir/r4/StructureDefinition/BRPais-1.0',
      valueCodeableConcept: {
        coding: [
          {
            system: 'http://www.saude.gov.br/fhir/r4/CodeSystem/BRPais-1.0',
            code: dto.patient.birthCountryCode || 'BRA'
          }
        ]
      }
    });

    // Bloco de Identificação Nacional - Correção RNDS: URIs correctas rnds-fhir
    const patientIdentifiers: FhirIdentifier[] = [];
    if (dto.patient.cpf) {
      patientIdentifiers.push({
        use: 'official',
        system: 'https://rnds-fhir.saude.gov.br/sid/cpf',
        value: dto.patient.cpf.replace(/\D/g, '')
      });
    }
    if (dto.patient.cns) {
      patientIdentifiers.push({
        use: 'official',
        system: 'https://rnds-fhir.saude.gov.br/sid/cns',
        value: dto.patient.cns.replace(/\D/g, '')
      });
    }

    // Se em contingência demográfica pura - Correção: Canônicas reais do DATASUS
    if (patientIdentifiers.length === 0) {
      patientExtensions.push({
        url: 'http://www.saude.gov.br/fhir/r4/StructureDefinition/BRIndividuoNaoIdentificado-1.0',
        extension: [
          {
            url: 'gender',
            valueCode: dto.patient.gender === 'male' ? 'M' : dto.patient.gender === 'female' ? 'F' : 'O'
          },
          {
            url: 'birthYear',
            valueDate: dto.patient.birthDate ? dto.patient.birthDate.substring(0, 4) : new Date().getFullYear().toString()
          },
          {
            url: 'reason',
            valueCodeableConcept: {
              coding: [
                {
                  system: 'http://www.saude.gov.br/fhir/r4/CodeSystem/BRJustificativaIndividuoNaoIdentificado-1.0',
                  code: '1'
                }
              ]
            }
          },
          {
            url: 'operator',
            valueString: dto.encounter.participant.fullName
          }
        ]
      });
    }

    // Executa divisão e higienização robusta do nome brasileiro
    const { family, given } = splitBrazilianName(dto.patient.fullName);

    const fhirPatient: FhirPatient = {
      resourceType: 'Patient',
      meta: {
        profile: ['http://www.saude.gov.br/fhir/r4/StructureDefinition/BRIndividuo-1.0']
      },
      extension: patientExtensions,
      identifier: patientIdentifiers,
      active: true,
      name: [
        {
          use: 'official',
          family: family,
          given: given
        }
      ],
      gender: dto.patient.gender || 'unknown',
      birthDate: dto.patient.birthDate || '1900-01-01',
      ...(dto.patient.postalCode && dto.patient.fullAddress
        ? {
            address: [
              {
                use: 'home',
                type: 'both',
                line: [dto.patient.fullAddress],
                city: dto.patient.cityCode || '',
                state: dto.patient.stateCode || '',
                postalCode: dto.patient.postalCode.replace(/\D/g, ''),
                country: 'BRA'
              }
            ]
          }
        : {})
    };

    // ── 2. Mapeamento do Encontro (Encounter) ───────────────────────────
    const participantIdentifier: FhirIdentifier = dto.encounter.participant.cnsOrCpf.length === 11
      ? { system: 'https://rnds-fhir.saude.gov.br/sid/cpf', value: dto.encounter.participant.cnsOrCpf.replace(/\D/g, '') }
      : { system: 'https://rnds-fhir.saude.gov.br/sid/cns', value: dto.encounter.participant.cnsOrCpf.replace(/\D/g, '') };

    const fhirEncounter: FhirEncounter = {
      resourceType: 'Encounter',
      meta: {
        profile: ['http://www.saude.gov.br/fhir/r4/StructureDefinition/BRContatoAssistencial-1.0']
      },
      status: dto.encounter.status,
      // Correção Ontológica: CodeSystem real do DATASUS para Modalidade Assistencial
      class: {
        system: 'http://www.saude.gov.br/fhir/r4/CodeSystem/BRModalidadeAssistencial-1.0',
        code: dto.categoryCode
      },
      // Correção Ontológica: CodeSystem real do DATASUS para Caráter de Atendimento
      priority: {
        coding: [
          {
            system: 'http://www.saude.gov.br/fhir/r4/CodeSystem/BRCaraterAtendimento-1.0',
            code: dto.encounter.priorityCode
          }
        ]
      },
      subject: {
        reference: patientRefId
      },
      participant: [
        {
          type: [
            {
              coding: [
                {
                  system: 'http://www.saude.gov.br/fhir/r4/CodeSystem/BRResponsabilidadeParticipante-1.0',
                  code: 'ATENDENTE'
                }
              ]
            }
          ],
          individual: {
            identifier: participantIdentifier,
            display: dto.encounter.participant.fullName
          },
          // Correção Ontológica: BROcupacao aponta para CodeSystem real do DATASUS
          extension: [
            {
              url: 'http://www.saude.gov.br/fhir/r4/StructureDefinition/BROcupacao-1.0',
              valueCodeableConcept: {
                coding: [
                  {
                    system: 'http://www.saude.gov.br/fhir/r4/CodeSystem/BROcupacao-1.0',
                    code: dto.encounter.participant.cbo
                  }
                ]
              }
            }
          ]
        }
      ],
      period: {
        start: dto.encounter.periodStart,
        end: dto.encounter.periodEnd
      },
      // CNES: URI correta rnds-fhir
      serviceProvider: {
        identifier: {
          system: 'https://rnds-fhir.saude.gov.br/sid/cnes',
          value: dto.encounter.cnes
        }
      }
    };

    // ── 3. Diagnósticos independentes (Condition) ──────────────────────
    const conditionEntries: { refId: string; resource: FhirCondition }[] = [];
    dto.diagnosticos.forEach((diag) => {
      const condRefId = `urn:uuid:${randomUUID()}`;
      const fhirCondition: FhirCondition = {
        resourceType: 'Condition',
        meta: {
          profile: ['http://www.saude.gov.br/fhir/r4/StructureDefinition/BRProblemaDiagnostico-1.0']
        },
        clinicalStatus: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
              code: 'active'
            }
          ]
        },
        category: [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/condition-category',
                code: 'encounter-diagnosis'
              }
            ]
          }
        ],
        code: {
          coding: [
            {
              system: diag.system,
              code: diag.code,
              display: diag.display
            }
          ]
        },
        subject: {
          reference: patientRefId
        },
        encounter: {
          reference: encounterRefId
        }
      };
      conditionEntries.push({ refId: condRefId, resource: fhirCondition });
    });

    // ── 4. Sinais Vitais independentes (Observation) ───────────────────
    const observationEntries: { refId: string; resource: FhirObservation }[] = [];
    dto.sinaisVitais.forEach((obs) => {
      const obsRefId = `urn:uuid:${randomUUID()}`;
      
      let loincCode = '';
      let display = '';
      let ucumCode = obs.unit;

      // Correção UCUM: Tradução estrita para códigos case-sensitive e com sintaxe correta
      switch (obs.type) {
        case 'pressure-systolic':
          loincCode = '8480-6';
          display = 'Systolic blood pressure';
          ucumCode = 'mm[Hg]'; // mm[Hg] é o código estrito UCUM
          break;
        case 'pressure-diastolic':
          loincCode = '8462-4';
          display = 'Diastolic blood pressure';
          ucumCode = 'mm[Hg]';
          break;
        case 'weight':
          loincCode = '29463-7';
          display = 'Body weight';
          ucumCode = 'kg';
          break;
        case 'height':
          loincCode = '8302-2';
          display = 'Body height';
          ucumCode = 'cm';
          break;
        case 'temperature':
          loincCode = '8310-5';
          display = 'Body temperature';
          ucumCode = 'Cel'; // Cel é o código UCUM para Celsius
          break;
        case 'heart-rate':
          loincCode = '8867-4';
          display = 'Heart rate';
          ucumCode = '/min';
          break;
        case 'respiratory-rate':
          loincCode = '9279-1';
          display = 'Respiratory rate';
          ucumCode = '/min';
          break;
      }

      const fhirObservation: FhirObservation = {
        resourceType: 'Observation',
        meta: {
          profile: ['http://www.saude.gov.br/fhir/r4/StructureDefinition/BRSinalVital-1.0']
        },
        status: 'final',
        category: [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                code: 'vital-signs'
              }
            ]
          }
        ],
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: loincCode,
              display
            }
          ]
        },
        subject: {
          reference: patientRefId
        },
        encounter: {
          reference: encounterRefId
        },
        effectiveDateTime: dto.date,
        valueQuantity: {
          value: obs.value,
          unit: obs.unit,
          system: 'http://unitsofmeasure.org',
          code: ucumCode
        },
        ...(obs.bodySite
          ? {
              bodySite: {
                text: obs.bodySite
              }
            }
          : {})
      };
      observationEntries.push({ refId: obsRefId, resource: fhirObservation });
    });

    // ── 5. Alergias independentes (AllergyIntolerance) ─────────────────
    const allergyEntries: { refId: string; resource: FhirAllergyIntolerance }[] = [];
    dto.alergias.forEach((allergy) => {
      const allergyRefId = `urn:uuid:${randomUUID()}`;
      const fhirAllergy: FhirAllergyIntolerance = {
        resourceType: 'AllergyIntolerance',
        meta: {
          profile: ['http://www.saude.gov.br/fhir/r4/StructureDefinition/BRAlergiaReacaoAdversa-1.0']
        },
        clinicalStatus: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
              code: 'active'
            }
          ]
        },
        verificationStatus: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification',
              code: 'confirmed'
            }
          ]
        },
        criticality: allergy.criticality,
        category: allergy.category ? [allergy.category] : undefined,
        code: {
          coding: [
            {
              system: 'http://snomed.info/sct',
              code: allergy.code,
              display: allergy.display
            }
          ]
        },
        patient: {
          reference: patientRefId
        },
        recordedDate: dto.date
      };
      allergyEntries.push({ refId: allergyRefId, resource: fhirAllergy });
    });

    // ── 6. Prescrições independentes (MedicationRequest) ───────────────
    const prescriptionEntries: { refId: string; resource: FhirMedicationRequest }[] = [];
    dto.prescricoes.forEach((presc) => {
      const prescRefId = `urn:uuid:${randomUUID()}`;
      
      const isCommercialUnit = ['caixa', 'frasco', 'ampola', 'comprimido', 'envelope', 'bisnaga', 'unidade'].includes(
        (presc.unit || '').toLowerCase().trim()
      );

      const fhirPresc: FhirMedicationRequest = {
        resourceType: 'MedicationRequest',
        meta: {
          profile: ['http://www.saude.gov.br/fhir/r4/StructureDefinition/BRPrescricaoMedicamento-1.0']
        },
        status: 'active',
        intent: 'order',
        // Correção Ontológica: Tabela de medicamentos oficial do DATASUS
        medicationCodeableConcept: {
          coding: [
            {
              system: 'http://www.saude.gov.br/fhir/r4/CodeSystem/BRMedicamento-1.0',
              code: presc.medicationCode,
              display: presc.medicationDisplay
            }
          ]
        },
        subject: {
          reference: patientRefId
        },
        encounter: {
          reference: encounterRefId
        },
        authoredOn: dto.date,
        dosageInstruction: [
          {
            text: presc.dosageInstruction
          }
        ],
        ...(presc.quantity
          ? {
              dispenseRequest: {
                quantity: {
                  value: presc.quantity,
                  unit: presc.unit || 'Frasco',
                  // Nota: De acordo com o Guia de Negócios do RAC, a codificação de formas
                  // de apresentação de embalagens comerciais (ex: "Caixa", "Frasco")
                  // é uma restrição pendente de tabela específica do catálogo federal de insumos (CATMAT/ANVISA),
                  // portanto, neste momento, mantém-se a string livre sem system/code UCUM.
                  ...(isCommercialUnit
                    ? {}
                    : {
                        system: 'http://unitsofmeasure.org',
                        code: '{unit}'
                      })
                }
              }
            }
          : {})
      };
      prescriptionEntries.push({ refId: prescRefId, resource: fhirPresc });
    });

    // ── 7. Seções da Composition ───────────────────────────────────────
    // Correção: Mapeamento de 'Composition.section.code.coding.system' para BRTipoDocumento-1.0
    const compositionSections = [
      {
        title: 'Informações do Contato Assistencial',
        code: {
          coding: [
            {
              system: 'http://www.saude.gov.br/fhir/r4/CodeSystem/BRTipoDocumento-1.0',
              code: 'informacoesContatoAssistencial'
            }
          ]
        },
        entry: [{ reference: encounterRefId }]
      },
      {
        title: 'Problemas/Diagnósticos Avaliados',
        code: {
          coding: [
            {
              system: 'http://www.saude.gov.br/fhir/r4/CodeSystem/BRTipoDocumento-1.0',
              code: 'problemasDiagnosticosAvaliados'
            }
          ]
        },
        entry: conditionEntries.map((e) => ({ reference: e.refId })),
        ...(conditionEntries.length === 0
          ? {
              emptyReason: {
                coding: [
                  {
                    system: 'http://hl7.org/fhir/ValueSet/list-empty-reason',
                    code: 'no-known-problems'
                  }
                ]
              }
            }
          : {})
      },
      {
        title: 'Sinais Vitais e Antropometria',
        code: {
          coding: [
            {
              system: 'http://www.saude.gov.br/fhir/r4/CodeSystem/BRTipoDocumento-1.0',
              code: 'observacoes'
            }
          ]
        },
        entry: observationEntries.map((e) => ({ reference: e.refId }))
      },
      {
        title: 'Alergias e Reações Adversas',
        code: {
          coding: [
            {
              system: 'http://www.saude.gov.br/fhir/r4/CodeSystem/BRTipoDocumento-1.0',
              code: 'alergiaReacaoAdversa'
            }
          ]
        },
        entry: allergyEntries.map((e) => ({ reference: e.refId }))
      },
      {
        title: 'Prescrição de Medicamentos',
        code: {
          coding: [
            {
              system: 'http://www.saude.gov.br/fhir/r4/CodeSystem/BRTipoDocumento-1.0',
              code: 'prescricao'
            }
          ]
        },
        entry: prescriptionEntries.map((e) => ({ reference: e.refId }))
      }
    ];

    const fhirComposition: FhirComposition = {
      resourceType: 'Composition',
      meta: {
        profile: ['http://www.saude.gov.br/fhir/r4/StructureDefinition/BRRegistroAtendimentoClinico-1.0']
      },
      status: dto.status,
      type: {
        coding: [
          {
            system: 'http://www.saude.gov.br/fhir/r4/CodeSystem/BRTipoDocumento-1.0',
            code: 'RAC',
            display: 'Registro de Atendimento Clínico'
          }
        ]
      },
      category: [
        {
          coding: [
            {
              system: 'http://www.saude.gov.br/fhir/r4/CodeSystem/BRModalidadeAssistencial-1.0',
              code: dto.categoryCode
            }
          ]
        }
      ],
      subject: {
        reference: patientRefId
      },
      encounter: {
        reference: encounterRefId
      },
      date: dto.date,
      author: [
        {
          identifier: participantIdentifier,
          display: dto.encounter.participant.fullName
        }
      ],
      title: dto.title,
      section: compositionSections
    };

    // ── 8. Montagem final do Bundle (Composition sempre em índice 0) ───
    entries.push({
      fullUrl: `urn:uuid:${compositionId}`,
      resource: fhirComposition
    });

    entries.push({
      fullUrl: patientRefId,
      resource: fhirPatient
    });

    entries.push({
      fullUrl: encounterRefId,
      resource: fhirEncounter
    });

    conditionEntries.forEach((e) => entries.push({ fullUrl: e.refId, resource: e.resource }));
    observationEntries.forEach((e) => entries.push({ fullUrl: e.refId, resource: e.resource }));
    allergyEntries.forEach((e) => entries.push({ fullUrl: e.refId, resource: e.resource }));
    prescriptionEntries.forEach((e) => entries.push({ fullUrl: e.refId, resource: e.resource }));

    return {
      resourceType: 'Bundle',
      id: bundleId,
      meta: {
        lastUpdated: new Date().toISOString()
      },
      type: 'document',
      entry: entries
    };
  }
}
