import { BaseService } from '@/services/base.service';
import { rndsFetch } from '../infra/rnds-client';
import { RacMapper } from '../mapper/rac.mapper';
import { RacDto } from '../dto/rac.dto';

/**
 * Custom error class wrapping detailed clinical validation errors returned
 * by the DATASUS barramento as FHIR OperationOutcome resources.
 */
export class RndsClinicalValidationError extends Error {
  constructor(message: string, public readonly outcome: any) {
    super(message);
    this.name = 'RndsClinicalValidationError';
    Object.setPrototypeOf(this, RndsClinicalValidationError.prototype);
  }
}

export class RndsService extends BaseService {
  private static accessToken: string | null = null;
  private static tokenExpiresAt: number | null = null;

  /**
   * Obtém o token de acesso válido, efetuando autenticação e usando o cache se ainda estiver válido.
   */
  private async getValidToken(): Promise<string> {
    const authUrl = process.env.RNDS_AUTH_URL;
    const clientId = process.env.RNDS_CLIENT_ID;
    const clientSecret = process.env.RNDS_CLIENT_SECRET;

    if (!authUrl || !clientId || !clientSecret) {
      throw new Error(
        'Configurações de autenticação RNDS incompletas. Defina RNDS_AUTH_URL, RNDS_CLIENT_ID e RNDS_CLIENT_SECRET.'
      );
    }

    const now = Date.now();
    const leewayMs = 60000; // 60 segundos de margem de segurança

    if (RndsService.accessToken && RndsService.tokenExpiresAt && (RndsService.tokenExpiresAt - now > leewayMs)) {
      return RndsService.accessToken;
    }

    // Fluxo OAuth2 Client Credentials
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const response = await rndsFetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Falha na autenticação OAuth2 da RNDS (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as { access_token: string; expires_in: number };
    RndsService.accessToken = data.access_token;
    RndsService.tokenExpiresAt = Date.now() + data.expires_in * 1000;

    return RndsService.accessToken;
  }

  /**
   * Envia um documento clínico Registro de Atendimento Clínico (RAC) para a RNDS.
   */
  public async sendRac(dto: RacDto): Promise<{ id: string; response: any }> {
    const baseUrl = process.env.RNDS_BASE_URL;
    if (!baseUrl) {
      throw new Error('Configuração RNDS_BASE_URL não definida.');
    }

    const bundle = RacMapper.toFhirBundle(dto);
    const token = await this.getValidToken();

    const response = await rndsFetch(baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/fhir+json',
      },
      body: JSON.stringify(bundle),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');

      if (response.status === 400 || response.status === 422) {
        let outcome: any;
        try {
          outcome = JSON.parse(errorText);
        } catch {
          // Fallback se não for JSON válido
        }

        if (outcome && outcome.resourceType === 'OperationOutcome') {
          const issues = outcome.issue || [];
          const errorDetails = issues
            .map((issue: any, index: number) => {
              const severity = issue.severity || 'error';
              const code = issue.code || 'unknown';
              const diagnostics = issue.diagnostics || issue.details?.text || 'Sem detalhes fornecidos';
              return `[Issue ${index + 1}] Severity: ${severity}, Code: ${code}, Details: ${diagnostics}`;
            })
            .join(' | ');

          throw new RndsClinicalValidationError(
            `Erro de validação clínica na RNDS: ${errorDetails}`,
            outcome
          );
        }
      }

      throw new Error(`Falha ao enviar RAC para a RNDS (${response.status}): ${errorText}`);
    }

    const responseData = await response.json();
    return {
      id: bundle.id || '',
      response: responseData,
    };
  }
}
