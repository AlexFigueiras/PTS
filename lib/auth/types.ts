/**
 * Tipos de domínio para autenticação — independentes do provedor.
 *
 * Services e UI consomem `AuthenticatedUser`, NUNCA `User` do Supabase SDK.
 * Isso isola a app de mudanças de provedor (Clerk, Auth0, custom etc.).
 */

export type AuthenticatedUser = {
  id: string;
  email: string | null;
  emailVerified: boolean;
  /** Metadados de perfil. Não confiar como source of truth — espelhar em `profiles`. */
  metadata: Record<string, unknown>;
};

export interface AuthProvider {
  /** Retorna o usuário autenticado (revalidando o JWT no servidor) ou null. */
  getCurrentUser(): Promise<AuthenticatedUser | null>;
}
