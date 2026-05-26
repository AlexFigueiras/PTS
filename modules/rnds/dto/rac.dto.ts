import { z } from 'zod';
import { isValidCpf, isValidCns, isValidCnes, isValidCbo } from '../utils/validators';

/**
 * Schema de validação Zod para os dados demográficos do Cidadão (Patient).
 * Implementa a Regra de Negócio de Contingência SUS (RN01/RN03): na ausência de
 * CPF e CNS, exige-se o preenchimento completo do bloco demográfico alternativo.
 */
export const patientSchema = z.object({
  fullName: z.string().min(1, 'Nome completo é obrigatório'),
  cpf: z.string().optional().nullable(),
  cns: z.string().optional().nullable(),
  motherName: z.string().optional().nullable(),
  birthDate: z.string().optional().nullable(), // Formato YYYY-MM-DD
  gender: z.enum(['male', 'female', 'other', 'unknown']).optional().nullable(),
  birthCountryCode: z.string().optional().nullable(), // ISO 3166-1 alpha-3 (ex: 'BRA')
  birthCityCode: z.string().optional().nullable(),    // Código IBGE (ex: '3550308')
  raceCode: z.string().min(1, 'Código de Raça/Cor RNDS é obrigatório'),
  ethnicityCode: z.string().optional().nullable(),   // Código etnia indígena se aplicável
  postalCode: z.string().optional().nullable(),
  fullAddress: z.string().optional().nullable(),
  cityCode: z.string().optional().nullable(),
  stateCode: z.string().optional().nullable()
}).superRefine((data, ctx) => {
  const hasCpf = !!data.cpf && data.cpf.trim() !== '';
  const hasCns = !!data.cns && data.cns.trim() !== '';

  if (!hasCpf && !hasCns) {
    // Modo Contingência SUS: ambos CPF e CNS estão ausentes.
    // Todos os dados demográficos tornam-se estritamente obrigatórios.
    if (!data.motherName || data.motherName.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['motherName'],
        message: 'Nome da mãe é obrigatório na ausência de CPF e CNS (Contingência SUS)'
      });
    }
    if (!data.birthDate || data.birthDate.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['birthDate'],
        message: 'Data de nascimento é obrigatória na ausência de CPF e CNS (Contingência SUS)'
      });
    }
    if (!data.gender) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['gender'],
        message: 'Sexo/Gênero é obrigatório na ausência de CPF e CNS (Contingência SUS)'
      });
    }
    if (!data.birthCountryCode || data.birthCountryCode.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['birthCountryCode'],
        message: 'País de nascimento é obrigatório na ausência de CPF e CNS (Contingência SUS)'
      });
    }
    if (!data.birthCityCode || data.birthCityCode.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['birthCityCode'],
        message: 'Município de nascimento é obrigatório na ausência de CPF e CNS (Contingência SUS)'
      });
    }
  } else {
    // Se informados, valida-se o checksum rigorosamente
    if (hasCpf && !isValidCpf(data.cpf!)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cpf'],
        message: 'CPF informado é inválido'
      });
    }
    if (hasCns && !isValidCns(data.cns!)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cns'],
        message: 'CNS informado é inválido'
      });
    }
  }
});

export type PatientDto = z.infer<typeof patientSchema>;

/**
 * Schema de validação Zod para os metadados administrativos do Contato Assistencial (Encounter).
 */
export const encounterSchema = z.object({
  status: z.enum(['finished', 'entered-in-error']).default('finished'),
  priorityCode: z.string().min(1, 'Caráter do atendimento (código RNDS) é obrigatório'),
  periodStart: z.string().min(1, 'Data/Hora de início do atendimento é obrigatória'),
  periodEnd: z.string().min(1, 'Data/Hora de término do atendimento é obrigatória'),
  cnes: z.string().min(1, 'CNES do estabelecimento é obrigatório').refine(isValidCnes, 'CNES deve conter exatamente 7 dígitos numéricos'),
  participant: z.object({
    fullName: z.string().min(1, 'Nome do profissional é obrigatório'),
    cnsOrCpf: z.string().min(1, 'CPF ou CNS do profissional é obrigatório').refine(
      (val) => isValidCpf(val) || isValidCns(val),
      'Identificador do profissional deve ser um CPF ou CNS válido'
    ),
    cbo: z.string().min(1, 'CBO do profissional é obrigatório').refine(isValidCbo, 'CBO deve conter exatamente 6 dígitos numéricos')
  })
});

export type EncounterDto = z.infer<typeof encounterSchema>;

/**
 * Schema de validação Zod para a seção clínica de Problemas / Diagnósticos Avaliados.
 */
export const diagnosticoSchema = z.object({
  code: z.string().min(1, 'Código do diagnóstico é obrigatório'),
  display: z.string().optional(),
  system: z.enum([
    'http://hl7.org/fhir/sid/cid-10',
    'http://hl7.org/fhir/sid/ciap-2'
  ]).default('http://hl7.org/fhir/sid/cid-10'),
  type: z.enum(['primary', 'secondary']).default('primary')
});

export type DiagnosticoDto = z.infer<typeof diagnosticoSchema>;

/**
 * Schema de validação Zod para a seção clínica de Sinais Vitais e Antropometria.
 */
export const sinalVitalSchema = z.object({
  type: z.enum([
    'pressure-systolic',
    'pressure-diastolic',
    'weight',
    'height',
    'temperature',
    'heart-rate',
    'respiratory-rate'
  ]),
  value: z.number().positive('O valor da aferição deve ser positivo'),
  unit: z.string().min(1, 'Unidade de medida é obrigatória (ex: mmHg, kg, cm, C)'),
  bodySite: z.string().optional().nullable()
});

export type SinalVitalDto = z.infer<typeof sinalVitalSchema>;

/**
 * Schema de validação Zod para a seção clínica de Alergias e Reações Adversas.
 */
export const alergiaSchema = z.object({
  code: z.string().min(1, 'Código do alérgeno (SNOMED-CT / CIAP-2) é obrigatório'),
  display: z.string().min(1, 'Descrição do alérgeno é obrigatória'),
  criticality: z.enum(['low', 'high', 'unable-to-assess']).default('unable-to-assess'),
  category: z.enum(['food', 'medication', 'environment', 'biologic']).optional().nullable()
});

export type AlergiaDto = z.infer<typeof alergiaSchema>;

/**
 * Schema de validação Zod para a seção clínica de Prescrição de Medicamentos.
 */
export const prescricaoSchema = z.object({
  medicationCode: z.string().min(1, 'Código do medicamento (CATMAT / SNOMED) é obrigatório'),
  medicationDisplay: z.string().min(1, 'Nome do medicamento é obrigatório'),
  dosageInstruction: z.string().min(1, 'Instrução de uso/dosagem é obrigatória'),
  quantity: z.number().positive().optional().nullable(),
  unit: z.string().optional().nullable()
});

export type PrescricaoDto = z.infer<typeof prescricaoSchema>;

/**
 * Schema principal hierárquico e estruturado para o Registro de Atendimento Clínico (RAC).
 */
export const racSchema = z.object({
  status: z.enum(['final', 'entered-in-error']).default('final'),
  categoryCode: z.string().min(1, 'Código da modalidade assistencial (RNDS) é obrigatório'),
  date: z.string().min(1, 'Data/Hora de geração do documento é obrigatória'),
  title: z.string().default('Registro de Atendimento Clínico'),
  patient: patientSchema,
  encounter: encounterSchema,
  diagnosticos: z.array(diagnosticoSchema).default([]),
  sinaisVitais: z.array(sinalVitalSchema).default([]),
  alergias: z.array(alergiaSchema).default([]),
  prescricoes: z.array(prescricaoSchema).default([])
});

export type RacDto = z.infer<typeof racSchema>;
