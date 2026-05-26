import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RndsService, RndsClinicalValidationError } from '../services/rnds.service';
import { rndsFetch } from '../infra/rnds-client';
import { RacDto } from '../dto/rac.dto';

vi.mock('../infra/rnds-client', () => ({
  rndsFetch: vi.fn(),
}));

describe('RndsService Clinical Integration Layer', () => {
  const mockCtx = {
    tenantId: 'test-tenant-id',
    userId: 'test-user-id',
    role: 'PROFESSIONAL' as const,
    activeUnitId: 'test-unit-id',
  };

  const originalEnv = { ...process.env };
  let service: RndsService;

  const mockRacDto: RacDto = {
    status: 'final',
    categoryCode: '1',
    date: '2026-05-26T12:00:00Z',
    title: 'Registro de Atendimento Clínico',
    patient: {
      fullName: 'Afonso da Silva',
      cpf: '12345678909',
      raceCode: '01',
    },
    encounter: {
      status: 'finished',
      priorityCode: '1',
      periodStart: '2026-05-26T10:00:00Z',
      periodEnd: '2026-05-26T11:00:00Z',
      cnes: '1234567',
      participant: {
        fullName: 'Dr. Roberto',
        cnsOrCpf: '12345678909',
        cbo: '251510',
      },
    },
    diagnosticos: [],
    sinaisVitais: [],
    alergias: [],
    prescricoes: [],
  };

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      RNDS_AUTH_URL: 'https://rnds-gateway/auth/token',
      RNDS_BASE_URL: 'https://rnds-gateway/fhir/r4/Bundle',
      RNDS_CLIENT_ID: 'client-id-123',
      RNDS_CLIENT_SECRET: 'secret-456',
    };
    vi.clearAllMocks();
    service = new RndsService(mockCtx);
    // Reset static properties to avoid bleed across tests
    RndsService['accessToken'] = null;
    RndsService['tokenExpiresAt'] = null;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('OAuth2 Token Caching & Safety Window', () => {
    it('should throw clear error if environment configurations are missing', async () => {
      delete process.env.RNDS_AUTH_URL;
      await expect(service.sendRac(mockRacDto)).rejects.toThrow(
        'Configurações de autenticação RNDS incompletas'
      );
    });

    it('should authenticate, retrieve and cache OAuth2 token successfully', async () => {
      // Mock auth endpoint
      const authResponse = {
        ok: true,
        status: 200,
        json: async () => ({ access_token: 'fake-token-abc', expires_in: 3600 }),
      };

      // Mock post bundle endpoint
      const bundleResponse = {
        ok: true,
        status: 200,
        json: async () => ({ resourceType: 'Bundle', id: 'bundle-uuid-123' }),
      };

      vi.mocked(rndsFetch)
        .mockResolvedValueOnce(authResponse as any)
        .mockResolvedValueOnce(bundleResponse as any);

      const result = await service.sendRac(mockRacDto);

      expect(rndsFetch).toHaveBeenCalledTimes(2);

      // Verify Auth call params
      const authArgs = vi.mocked(rndsFetch).mock.calls[0];
      expect(authArgs[0]).toBe('https://rnds-gateway/auth/token');
      expect(authArgs[1]).toEqual(
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic Y2xpZW50LWlkLTEyMzpzZWNyZXQtNDU2', // base64(client-id-123:secret-456)
          }),
          body: 'grant_type=client_credentials',
        })
      );

      // Verify POST Bundle call params
      const postArgs = vi.mocked(rndsFetch).mock.calls[1];
      expect(postArgs[0]).toBe('https://rnds-gateway/fhir/r4/Bundle');
      expect(postArgs[1]?.headers).toEqual(
        expect.objectContaining({
          'Authorization': 'Bearer fake-token-abc',
          'Content-Type': 'application/fhir+json',
        })
      );

      expect(result.id).toBeDefined();
      expect(result.response.id).toBe('bundle-uuid-123');
    });

    it('should reuse cached token across subsequent calls when within safety window', async () => {
      // Mock auth endpoint
      const authResponse = {
        ok: true,
        status: 200,
        json: async () => ({ access_token: 'cached-token-123', expires_in: 3600 }),
      };

      // Mock post bundle endpoint (call 1 and call 2)
      const bundleResponse = {
        ok: true,
        status: 200,
        json: async () => ({ id: 'resp-id' }),
      };

      vi.mocked(rndsFetch)
        .mockResolvedValueOnce(authResponse as any)
        .mockResolvedValueOnce(bundleResponse as any)
        .mockResolvedValueOnce(bundleResponse as any);

      // Call 1
      await service.sendRac(mockRacDto);
      // Call 2
      await service.sendRac(mockRacDto);

      // Should only authenticate once! Total rndsFetch calls = 1 (auth) + 2 (bundles) = 3
      expect(rndsFetch).toHaveBeenCalledTimes(3);

      const firstAuthCall = vi.mocked(rndsFetch).mock.calls[0][0];
      expect(firstAuthCall).toBe('https://rnds-gateway/auth/token');

      // The other calls should only be the bundle delivery
      expect(vi.mocked(rndsFetch).mock.calls[1][0]).toBe('https://rnds-gateway/fhir/r4/Bundle');
      expect(vi.mocked(rndsFetch).mock.calls[2][0]).toBe('https://rnds-gateway/fhir/r4/Bundle');
    });

    it('should proactively refresh the token if it is expired or close to expiration (inside 60s leeway)', async () => {
      // Setup instance to already contain a token expiring in 30 seconds (within leeway)
      RndsService['accessToken'] = 'old-leeway-token';
      RndsService['tokenExpiresAt'] = Date.now() + 30000; // 30s remaining (< 60s leeway)

      const authResponse = {
        ok: true,
        status: 200,
        json: async () => ({ access_token: 'fresh-refreshed-token', expires_in: 1800 }),
      };

      const bundleResponse = {
        ok: true,
        status: 200,
        json: async () => ({ id: 'new-id' }),
      };

      vi.mocked(rndsFetch)
        .mockResolvedValueOnce(authResponse as any)
        .mockResolvedValueOnce(bundleResponse as any);

      await service.sendRac(mockRacDto);

      // Auth endpoint called because token is inside the 60s leeway window
      expect(rndsFetch).toHaveBeenCalledTimes(2);
      expect(vi.mocked(rndsFetch).mock.calls[0][0]).toBe('https://rnds-gateway/auth/token');
      expect(vi.mocked(rndsFetch).mock.calls[1][1]?.headers).toEqual(
        expect.objectContaining({
          'Authorization': 'Bearer fresh-refreshed-token',
        })
      );
    });
  });

  describe('Clinical Validation Error Parser (OperationOutcome)', () => {
    it('should intercept 400/422 HTTP responses and parse OperationOutcome structures successfully', async () => {
      RndsService['accessToken'] = 'pre-authenticated-token';
      RndsService['tokenExpiresAt'] = Date.now() + 100000;

      const mockOperationOutcome = {
        resourceType: 'OperationOutcome',
        issue: [
          {
            severity: 'error',
            code: 'invalid',
            diagnostics: 'CPF do participante diverge do cadastro nacional',
          },
          {
            severity: 'warning',
            code: 'value',
            details: {
              text: 'CNES com formato correto mas inativo',
            },
          },
        ],
      };

      const errorResponse = {
        ok: false,
        status: 400,
        text: async () => JSON.stringify(mockOperationOutcome),
      };

      vi.mocked(rndsFetch).mockResolvedValue(errorResponse as any);

      await expect(service.sendRac(mockRacDto)).rejects.toThrow(RndsClinicalValidationError);

      try {
        await service.sendRac(mockRacDto);
      } catch (err: any) {
        expect(err).toBeInstanceOf(RndsClinicalValidationError);
        expect(err.message).toContain('Erro de validação clínica na RNDS');
        expect(err.message).toContain('Severity: error, Code: invalid, Details: CPF do participante diverge');
        expect(err.message).toContain('Severity: warning, Code: value, Details: CNES com formato correto');
        expect(err.outcome).toEqual(mockOperationOutcome);
      }
    });

    it('should fallback to standard HTTP errors if outcome payload is not a valid FHIR OperationOutcome', async () => {
      RndsService['accessToken'] = 'pre-authenticated-token';
      RndsService['tokenExpiresAt'] = Date.now() + 100000;

      const badJsonResponse = {
        ok: false,
        status: 422,
        text: async () => 'Generic 422 Unprocessable Entity data',
      };

      vi.mocked(rndsFetch).mockResolvedValueOnce(badJsonResponse as any);

      await expect(service.sendRac(mockRacDto)).rejects.toThrow(
        'Falha ao enviar RAC para a RNDS (422): Generic 422 Unprocessable Entity data'
      );
    });

    it('should handle standard network or internal server errors', async () => {
      RndsService['accessToken'] = 'pre-authenticated-token';
      RndsService['tokenExpiresAt'] = Date.now() + 100000;

      const serverErrorResponse = {
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      };

      vi.mocked(rndsFetch).mockResolvedValueOnce(serverErrorResponse as any);

      await expect(service.sendRac(mockRacDto)).rejects.toThrow(
        'Falha ao enviar RAC para a RNDS (500): Internal Server Error'
      );
    });
  });
});
