import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import { fetch, Agent } from 'undici';
import { getDispatcher, resetDispatcher, rndsFetch, RndsInfrastructureError } from '../infra/rnds-client';

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  },
}));

vi.mock('undici', async (importOriginal) => {
  const original = await importOriginal<typeof import('undici')>();
  return {
    ...original,
    fetch: vi.fn(),
    Agent: vi.fn().mockImplementation(function () {
      return {
        close: vi.fn(),
      };
    }),
  };
});

describe('RNDS Client mTLS Infrastructure Layer', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
    resetDispatcher();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Certificate Resolution & Dispatcher Initialization', () => {
    it('should successfully load PFX certificate from physical path', () => {
      process.env.RNDS_CERT_PFX_PATH = '/valid/path/cert.pfx';
      process.env.RNDS_CERT_PASSPHRASE = 'test-passphrase';

      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('mock-pfx-binary'));

      const dispatcher = getDispatcher();

      expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining('cert.pfx'));
      expect(fs.readFileSync).toHaveBeenCalledWith(expect.stringContaining('cert.pfx'));
      expect(Agent).toHaveBeenCalledWith(
        expect.objectContaining({
          connect: expect.objectContaining({
            pfx: Buffer.from('mock-pfx-binary'),
            passphrase: 'test-passphrase',
            rejectUnauthorized: false,
          }),
        })
      );
      expect(dispatcher).toBeDefined();
    });

    it('should successfully load and sanitize PFX from base64 string, ignoring line breaks and whitespace', () => {
      const originalBinary = 'mock-pfx-base64-binary-content';
      const rawBase64 = Buffer.from(originalBinary).toString('base64');
      
      // Inject problematic whitespace, spaces, and linebreaks
      process.env.RNDS_CERT_PFX_BASE64 = `   ${rawBase64.substring(0, 8)}\r\n   ${rawBase64.substring(8, 16)}\n   ${rawBase64.substring(16)}   `;
      process.env.RNDS_CERT_PASSPHRASE = 'pfx-pass';

      const dispatcher = getDispatcher();

      expect(Agent).toHaveBeenCalledWith(
        expect.objectContaining({
          connect: expect.objectContaining({
            pfx: Buffer.from(originalBinary),
            passphrase: 'pfx-pass',
          }),
        })
      );
      expect(dispatcher).toBeDefined();
    });

    it('should successfully load CA Trust Chain from path and base64 with sanitization', () => {
      process.env.RNDS_CERT_PFX_BASE64 = Buffer.from('mock-pfx').toString('base64');
      
      const caChainContent = 'icp-brasil-ca-chain-content';
      const rawCaBase64 = Buffer.from(caChainContent).toString('base64');
      process.env.RNDS_CERT_CA_BASE64 = `  \n ${rawCaBase64} \r\n `;

      const dispatcher = getDispatcher();

      expect(Agent).toHaveBeenCalledWith(
        expect.objectContaining({
          connect: expect.objectContaining({
            pfx: Buffer.from('mock-pfx'),
            ca: Buffer.from(caChainContent),
          }),
        })
      );
      expect(dispatcher).toBeDefined();
    });

    it('should throw RndsInfrastructureError if PFX certificate cannot be loaded from path (file does not exist)', () => {
      process.env.RNDS_CERT_PFX_PATH = '/nonexistent/path/cert.pfx';
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);

      expect(() => getDispatcher()).toThrow(RndsInfrastructureError);
      expect(() => getDispatcher()).toThrow('Credential file for PFX Certificate not found at path');
    });

    it('should throw RndsInfrastructureError if no PFX configuration is provided', () => {
      delete process.env.RNDS_CERT_PFX_PATH;
      delete process.env.RNDS_CERT_PFX_BASE64;

      expect(() => getDispatcher()).toThrow(RndsInfrastructureError);
      expect(() => getDispatcher()).toThrow('Missing RNDS mTLS client credentials');
    });

    it('should leverage cached dispatcher on subsequent calls (singleton)', () => {
      process.env.RNDS_CERT_PFX_BASE64 = Buffer.from('mock-pfx').toString('base64');

      const dispatcher1 = getDispatcher();
      const dispatcher2 = getDispatcher();

      expect(Agent).toHaveBeenCalledTimes(1);
      expect(dispatcher1).toBe(dispatcher2);
    });
  });

  describe('Secure Fetch Wrapper (rndsFetch)', () => {
    it('should automatically inject dispatcher and default Content-Type header to fhir+json', async () => {
      process.env.RNDS_CERT_PFX_BASE64 = Buffer.from('mock-pfx').toString('base64');
      
      const fakeResponse = { status: 200 } as any;
      vi.mocked(fetch).mockResolvedValue(fakeResponse);

      const response = await rndsFetch('https://rnds-gateway/fhir/r4/Composition');

      expect(fetch).toHaveBeenCalledWith(
        'https://rnds-gateway/fhir/r4/Composition',
        expect.objectContaining({
          dispatcher: expect.any(Object),
          headers: expect.any(Object),
          signal: expect.any(AbortSignal),
        })
      );

      const actualHeaders = vi.mocked(fetch).mock.calls[0][1]?.headers as any;
      expect(actualHeaders.get('content-type')).toBe('application/fhir+json');
      expect(response).toBe(fakeResponse);
    });

    it('should preserve and allow custom Content-Type like form-urlencoded for OAuth2 dynamic requests', async () => {
      process.env.RNDS_CERT_PFX_BASE64 = Buffer.from('mock-pfx').toString('base64');
      
      vi.mocked(fetch).mockResolvedValue({ status: 200 } as any);

      await rndsFetch('https://rnds-gateway/oauth2/token', {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const actualHeaders = vi.mocked(fetch).mock.calls[0][1]?.headers as any;
      expect(actualHeaders.get('content-type')).toBe('application/x-www-form-urlencoded');
    });

    it('should handle request abort timeouts and throw customized RndsInfrastructureError', async () => {
      process.env.RNDS_CERT_PFX_BASE64 = Buffer.from('mock-pfx').toString('base64');

      const abortError = new Error('The operation was aborted.');
      abortError.name = 'AbortError';

      vi.mocked(fetch).mockRejectedValue(abortError);

      await expect(rndsFetch('https://rnds-gateway/fhir/r4/Composition')).rejects.toThrow(RndsInfrastructureError);
      await expect(rndsFetch('https://rnds-gateway/fhir/r4/Composition')).rejects.toThrow('RNDS request timed out after 30 seconds.');
    });

    it('should catch and wrap TLS Handshake errors (e.g. UNABLE_TO_VERIFY_LEAF_SIGNATURE) inside custom exception', async () => {
      process.env.RNDS_CERT_PFX_BASE64 = Buffer.from('mock-pfx').toString('base64');

      const tlsError = new Error('unable to verify the first certificate');
      (tlsError as any).code = 'UNABLE_TO_VERIFY_LEAF_SIGNATURE';

      vi.mocked(fetch).mockRejectedValue(tlsError);

      await expect(rndsFetch('https://rnds-gateway/fhir/r4/Composition')).rejects.toThrow(RndsInfrastructureError);
      await expect(rndsFetch('https://rnds-gateway/fhir/r4/Composition')).rejects.toThrow(
        'RNDS TLS/Network Handshake failed: unable to verify the first certificate'
      );
    });

    it('should let standard non-infrastructure Errors propagate unchanged', async () => {
      process.env.RNDS_CERT_PFX_BASE64 = Buffer.from('mock-pfx').toString('base64');

      const standardError = new Error('Parsing failed or bad mapping schema');
      vi.mocked(fetch).mockRejectedValue(standardError);

      await expect(rndsFetch('https://rnds-gateway/fhir/r4/Composition')).rejects.toThrow(standardError);
      await expect(rndsFetch('https://rnds-gateway/fhir/r4/Composition')).not.rejects.toThrow(RndsInfrastructureError);
    });
  });
});
