import { BaseService } from '@/services/base.service';
import { rndsFetch } from '../infra/rnds-client';

/**
 * Tipos de referência de documentos retornados pela RNDS.
 * A RNDS expõe metadados de documentos clínicos via `DocumentReference`,
 * que aponta para o Bundle completo em `content.attachment.url`.
 */
export interface RndsDocumentReference {
  /** ID lógico do DocumentReference na RNDS */
  id: string;
  /** Perfil do recurso (ex: BRRegistroAtendimentoClinico) */
  type?: string;
  /** Data em que o documento foi indexado no barramento */
  date?: string;
  /** Descrição do documento (gerada automaticamente pelo barramento) */
  description?: string;
  /** URL de acesso direto ao Bundle do tipo `document` */
  contentUrl: string;
}

/**
 * Resposta estruturada de busca de histórico clínico.
 */
export interface PatientClinicalHistoryResult {
  /** CPF utilizado na consulta */
  patientCpf: string;
  /** Documentos clínicos encontrados e seus metadados */
  documents: RndsDocumentReference[];
  /** Bundles FHIR completos já resolvidos (tipo `document`) */
  resolvedBundles: any[];
}

/**
 * Custom error representando falhas de busca específicas da RNDS.
 */
export class RndsReaderError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly originalError?: any,
  ) {
    super(message);
    this.name = 'RndsReaderError';
    Object.setPrototypeOf(this, RndsReaderError.prototype);
  }
}

/**
 * Serviço de leitura (inbound/pull) do barramento RNDS.
 *
 * Consome o histórico clínico de cidadãos via dois mecanismos oficiais do DATASUS:
 *
 * 1. **DocumentReference**: Busca de metadados de documentos clínicos indexados
 *    no barramento para um paciente específico (via CPF/CNS). Os IDs de referência
 *    retornados são então usados para buscar o Bundle completo do tipo `document`.
 *
 * 2. **$sumario-clinico**: Operação customizada que retorna um Bundle consolidado
 *    com o resumo clínico do paciente (Condition, AllergyIntolerance, MedicationRequest, etc.)
 *    sem necessidade de navegar documento a documento.
 *
 * NOTA IMPORTANTE: A RNDS **não** permite requisições GET abertas diretamente em
 * endpoints de recursos individuais (ex: `/Condition?patient=CPF`). Toda busca de
 * dados de paciente deve passar pelos mecanismos acima.
 */
export class RndsReaderService extends BaseService {
  private static accessToken: string | null = null;
  private static tokenExpiresAt: number | null = null;

  /**
   * Obtém o token de acesso válido via OAuth2 Client Credentials,
   * reutilizando o cache em memória com janela de segurança de 60s.
   */
  private async getValidToken(): Promise<string> {
    const authUrl = process.env.RNDS_AUTH_URL;
    const clientId = process.env.RNDS_CLIENT_ID;
    const clientSecret = process.env.RNDS_CLIENT_SECRET;

    if (!authUrl || !clientId || !clientSecret) {
      throw new RndsReaderError(
        'Configurações de autenticação RNDS incompletas. Defina RNDS_AUTH_URL, RNDS_CLIENT_ID e RNDS_CLIENT_SECRET.',
      );
    }

    const now = Date.now();
    const leewayMs = 60_000;

    if (
      RndsReaderService.accessToken &&
      RndsReaderService.tokenExpiresAt &&
      RndsReaderService.tokenExpiresAt - now > leewayMs
    ) {
      return RndsReaderService.accessToken;
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const response = await rndsFetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new RndsReaderError(
        `Falha na autenticação OAuth2 da RNDS (${response.status}): ${errorText}`,
        response.status,
      );
    }

    const data = (await response.json()) as { access_token: string; expires_in: number };
    RndsReaderService.accessToken = data.access_token;
    RndsReaderService.tokenExpiresAt = Date.now() + data.expires_in * 1000;

    return RndsReaderService.accessToken;
  }

  /**
   * Executa uma requisição GET autenticada ao barramento da RNDS.
   */
  private async authenticatedGet(url: string): Promise<any> {
    const token = await this.getValidToken();

    const response = await rndsFetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/fhir+json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new RndsReaderError(
        `Falha na leitura da RNDS (${response.status}): ${errorText}`,
        response.status,
      );
    }

    return response.json();
  }

  /**
   * Busca o histórico clínico completo de um cidadão na RNDS.
   *
   * Fluxo de execução:
   * 1. Consulta `DocumentReference?patient.identifier=CPF` para obter os metadados
   *    dos documentos clínicos indexados no barramento.
   * 2. Para cada DocumentReference retornado, extrai o URL de conteúdo
   *    (em `content[].attachment.url`) e efetua o GET do Bundle completo.
   * 3. Retorna a lista de Bundles FHIR já resolvidos, prontos para o parser semântico.
   *
   * @param patientCpf CPF do cidadão (11 dígitos, apenas números)
   * @returns Resultado com documentos referenciados e Bundles resolvidos
   */
  public async fetchPatientClinicalHistory(
    patientCpf: string,
  ): Promise<PatientClinicalHistoryResult> {
    const baseUrl = process.env.RNDS_BASE_URL;
    if (!baseUrl) {
      throw new RndsReaderError('Configuração RNDS_BASE_URL não definida.');
    }

    const cleanCpf = patientCpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      throw new RndsReaderError(`CPF inválido para consulta RNDS: ${patientCpf}`);
    }

    // ── Passo 1: Buscar metadados via DocumentReference ──────────────
    const searchUrl = `${baseUrl}/DocumentReference?patient.identifier=https://rnds-fhir.saude.gov.br/sid/cpf|${cleanCpf}`;
    const searchBundle = await this.authenticatedGet(searchUrl);

    const documents: RndsDocumentReference[] = [];

    if (searchBundle?.entry && Array.isArray(searchBundle.entry)) {
      for (const entry of searchBundle.entry) {
        const resource = entry.resource;
        if (resource?.resourceType !== 'DocumentReference') continue;

        // Extrai o URL do conteúdo do documento a partir de content[].attachment.url
        const contentUrl = resource.content
          ?.map((c: any) => c?.attachment?.url)
          .find((url: string | undefined) => !!url);

        if (!contentUrl) continue;

        // Extrai o tipo/perfil do documento se disponível
        const docType = resource.type?.coding?.[0]?.display
          ?? resource.type?.coding?.[0]?.code
          ?? undefined;

        documents.push({
          id: resource.id ?? '',
          type: docType,
          date: resource.date ?? undefined,
          description: resource.description ?? undefined,
          contentUrl,
        });
      }
    }

    // ── Passo 2: Resolver cada DocumentReference para o Bundle completo ──
    const resolvedBundles: any[] = [];

    for (const doc of documents) {
      try {
        const bundle = await this.authenticatedGet(doc.contentUrl);
        if (bundle?.resourceType === 'Bundle') {
          resolvedBundles.push(bundle);
        }
      } catch (err) {
        // Documentos individuais podem falhar (expirados, retificados, etc.)
        // Logamos e continuamos sem interromper o fluxo de ingestão.
        console.warn(
          `[RndsReaderService] Falha ao resolver DocumentReference ${doc.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return {
      patientCpf: cleanCpf,
      documents,
      resolvedBundles,
    };
  }

  /**
   * Busca o Sumário Clínico consolidado de um cidadão via operação customizada
   * `$sumario-clinico` do DATASUS.
   *
   * Este endpoint retorna diretamente um Bundle consolidado do tipo `document`
   * contendo o resumo clínico ativo do paciente (Condition, AllergyIntolerance,
   * MedicationRequest, etc.) sem necessidade de navegar documento a documento.
   *
   * @param patientCpf CPF do cidadão (11 dígitos, apenas números)
   * @returns Bundle FHIR consolidado (tipo document) ou null se não houver dados
   */
  public async fetchPatientClinicalSummary(patientCpf: string): Promise<any | null> {
    const baseUrl = process.env.RNDS_BASE_URL;
    if (!baseUrl) {
      throw new RndsReaderError('Configuração RNDS_BASE_URL não definida.');
    }

    const cleanCpf = patientCpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      throw new RndsReaderError(`CPF inválido para consulta RNDS: ${patientCpf}`);
    }

    const summaryUrl = `${baseUrl}/Patient/$sumario-clinico?identifier=https://rnds-fhir.saude.gov.br/sid/cpf|${cleanCpf}`;

    try {
      const bundle = await this.authenticatedGet(summaryUrl);
      if (bundle?.resourceType === 'Bundle') {
        return bundle;
      }
      return null;
    } catch (err) {
      // $sumario-clinico pode retornar 404 para pacientes sem histórico
      if (err instanceof RndsReaderError && err.statusCode === 404) {
        return null;
      }
      throw err;
    }
  }
}
