'use client';

import { createContext, useContext } from 'react';
import { hasRole } from './authorization';
import type { UserRole } from './authorization';

const RoleContext = createContext<UserRole | null>(null);

export function RoleProvider({
  role,
  children,
}: {
  role: UserRole | null;
  children: React.ReactNode;
}) {
  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>;
}

/** Retorna o papel hierárquico do usuário, ou null fora de contexto. */
export function useRole(): UserRole | null {
  return useContext(RoleContext);
}

type RoleGateProps = {
  minimumRole: UserRole;
  children: React.ReactNode;
  /** Renderizado quando o usuário não tem a permissão mínima. Default: null. */
  fallback?: React.ReactNode;
};

/**
 * Renderiza `children` somente se o usuário tiver ao menos `minimumRole`.
 * Use em Client Components onde a verificação server-side já ocorreu na service layer.
 * Não substitui a autorização server-side — é exclusivamente para controle de UI.
 */
export function RoleGate({ minimumRole, children, fallback = null }: RoleGateProps) {
  const role = useRole();
  if (!role || !hasRole(role, minimumRole)) return <>{fallback}</>;
  return <>{children}</>;
}
