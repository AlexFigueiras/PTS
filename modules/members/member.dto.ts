import { z } from 'zod';
import type { UserRole, ProfileStatus } from '@/lib/db/schema';
import { ROLE_LABELS } from '@/lib/auth/authorization';

export { ROLE_LABELS };

export const STATUS_LABELS: Record<ProfileStatus, string> = {
  PENDING: 'Pendente',
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
};

export type MemberDto = {
  userId: string;
  email: string;
  fullName: string | null;
  jobTitle: string | null;
  role: UserRole;
  status: ProfileStatus;
  joinedAt: string;
};

export const updateMemberRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['ADMIN', 'MANAGER', 'PROFESSIONAL']),
});

export const removeMemberSchema = z.object({
  userId: z.string().uuid(),
});

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
