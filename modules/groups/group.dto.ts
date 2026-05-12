import { z } from 'zod';

export const dayOfWeekOptions = [
  { label: 'Segunda-feira', value: 'monday' },
  { label: 'Terça-feira', value: 'tuesday' },
  { label: 'Quarta-feira', value: 'wednesday' },
  { label: 'Quinta-feira', value: 'thursday' },
  { label: 'Sexta-feira', value: 'friday' },
  { label: 'Sábado', value: 'saturday' },
  { label: 'Domingo', value: 'sunday' },
];

export const createGroupSchema = z.object({
  name: z.string().min(3, 'O nome deve ter ao menos 3 caracteres'),
  objective: z.string().optional(),
  targetAudience: z.string().optional(),
  daysOfWeek: z.array(z.string()).min(1, 'Selecione ao menos um dia da semana'),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Horário inválido'),
  durationMinutes: z.coerce.number().min(1, 'Duração inválida'),
});

export const groupSessionSchema = z.object({
  sessionDate: z.string(),
  summary: z.string().optional(),
});

export const attendanceSchema = z.object({
  patientId: z.string().uuid(),
  isPresent: z.boolean(),
  participationNotes: z.string().optional(),
  outcomes: z.string().optional(),
});
