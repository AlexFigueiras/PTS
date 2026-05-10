import { z } from 'zod';
import type { TenantRole } from '@/lib/db/schema';

export const ROLE_LABELS: Record<TenantRole, string> = {
  owner: 'Proprietário',
  admin: 'Administrador',
  professional: 'Profissional',
  assistant: 'Assistente',
};

export type MemberDto = {
  userId: string;
  email: string;
  fullName: string | null;
  role: TenantRole;
  joinedAt: string;
};

export const updateMemberRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['admin', 'professional', 'assistant']),
});

export const removeMemberSchema = z.object({
  userId: z.string().uuid(),
});

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
