import fs from 'fs';
import path from 'path';
import { fetch, Agent, RequestInit, Response } from 'undici';

/**
 * Custom error representing network or TLS infrastructure failures when
 * interacting with the RNDS gateway.
 */
export class RndsInfrastructureError extends Error {
  constructor(message: string, public readonly originalError?: any) {
    super(message);
    this.name = 'RndsInfrastructureError';
    Object.setPrototypeOf(this, RndsInfrastructureError.prototype);
  }
}

/**
 * Sanitizes base64 string by removing any newlines, spaces, or whitespace
 * introduced during configuration/CI-CD setup.
 */
function sanitizeBase64(base64Str: string): string {
  return base64Str.replace(/\s/g, '');
}

/**
 * Resolves credential buffer from either a physical path or a base64 encoded environment string.
 */
function loadCredential(
  pathEnv: string | undefined,
  base64Env: string | undefined,
  name: string
): Buffer | undefined {
  if (base64Env) {
    try {
      const sanitized = sanitizeBase64(base64Env);
      return Buffer.from(sanitized, 'base64');
    } catch (err: any) {
      throw new RndsInfrastructureError(`Failed to decode Base64 credential for ${name}: ${err.message}`, err);
    }
  }

  if (pathEnv) {
    try {
      const resolvedPath = path.resolve(pathEnv);
      if (!fs.existsSync(resolvedPath)) {
        throw new RndsInfrastructureError(`Credential file for ${name} not found at path: ${resolvedPath}`);
      }
      return fs.readFileSync(resolvedPath);
    } catch (err: any) {
      if (err instanceof RndsInfrastructureError) throw err;
      throw new RndsInfrastructureError(`Failed to read credential file for ${name} at ${pathEnv}: ${err.message}`, err);
    }
  }

  return undefined;
}

let cachedDispatcher: Agent | null = null;

/**
 * Creates and configures the undici Dispatcher Agent with the loaded mTLS certificates.
 * Caches the instance for subsequent calls to benefit from connection reuse/pooling.
 */
export function getDispatcher(): Agent {
  if (cachedDispatcher) {
    return cachedDispatcher;
  }

  const pfxBuffer = loadCredential(
    process.env.RNDS_CERT_PFX_PATH,
    process.env.RNDS_CERT_PFX_BASE64,
    'PFX Certificate'
  );

  const caBuffer = loadCredential(
    process.env.RNDS_CERT_CA_PATH,
    process.env.RNDS_CERT_CA_BASE64,
    'ICP-Brasil CA Trust Chain'
  );

  const passphrase = process.env.RNDS_CERT_PASSPHRASE;

  if (!pfxBuffer) {
    throw new RndsInfrastructureError(
      'Missing RNDS mTLS client credentials. Please configure RNDS_CERT_PFX_PATH or RNDS_CERT_PFX_BASE64.'
    );
  }

  try {
    cachedDispatcher = new Agent({
      connect: {
        pfx: pfxBuffer,
        passphrase: passphrase || undefined,
        ca: caBuffer || undefined,
        rejectUnauthorized: process.env.RNDS_REJECT_UNAUTHORIZED !== undefined
          ? process.env.RNDS_REJECT_UNAUTHORIZED !== 'false'
          : process.env.NODE_ENV === 'production',
      },
      // Optimal connection pooling and keep-alive configuration
      keepAliveTimeout: 30000,
      keepAliveMaxTimeout: 60000,
    });
    return cachedDispatcher;
  } catch (err: any) {
    throw new RndsInfrastructureError(`Failed to initialize undici mTLS Agent: ${err.message}`, err);
  }
}

/**
 * Utility function to reset cached dispatcher dispatcher agent (mostly for test suite isolation).
 */
export function resetDispatcher(): void {
  cachedDispatcher = null;
}

/**
 * Secure wrapper for fetch requests to RNDS.
 * Handles auto-dispatcher injection, standard content-type headers, timeout protection,
 * and robust error mapping for handshake/infrastructure errors.
 */
export async function rndsFetch(url: string, options?: RequestInit): Promise<Response> {
  const dispatcher = getDispatcher();

  // Create standard Headers object to avoid case-insensitive collisions
  const headers = new Headers(options?.headers as any);
  if (!headers.has('content-type')) {
    headers.set('content-type', 'application/fhir+json');
  }

  const controller = new AbortController();
  const timeoutMs = 30000; // 30 seconds
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const finalOptions: RequestInit = {
      ...options,
      dispatcher,
      headers: headers as any,
      signal: controller.signal as any,
    };

    const response = await fetch(url, finalOptions);
    return response;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new RndsInfrastructureError('RNDS request timed out after 30 seconds.', err);
    }

    const isTlsOrNetError =
      err.code === 'ECONNRESET' ||
      err.code === 'ECONNREFUSED' ||
      err.code === 'ENOTFOUND' ||
      err.message?.includes('TLS') ||
      err.message?.includes('handshake') ||
      err.message?.includes('cert') ||
      err.message?.includes('passphrase') ||
      err.message?.includes('mac verify failure') ||
      err.message?.includes('UNABLE_TO_VERIFY_LEAF_SIGNATURE');

    if (isTlsOrNetError) {
      throw new RndsInfrastructureError(`RNDS TLS/Network Handshake failed: ${err.message}`, err);
    }

    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
