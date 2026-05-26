import { describe, it, expect } from 'vitest';
import { isValidCpf, isValidCns, isValidCnes, isValidCbo } from '../utils/validators';
import { patientSchema, racSchema } from '../dto/rac.dto';
import { RacMapper } from '../mapper/rac.mapper';
import { FhirComposition } from '../types/fhir-r4.types';

describe('RNDS Validators', () => {
  it('deve validar CPFs corretamente', () => {
    expect(isValidCpf('12345678900')).toBe(false); // CPF inválido
    expect(isValidCpf('11111111111')).toBe(false); // Todos iguais
    expect(isValidCpf('12345678909')).toBe(true);  // CPF válido
  });

  it('deve validar CNS corretamente', () => {
    expect(isValidCns('123456789012345')).toBe(false); // CNS inválido
    expect(isValidCns('100000000000001')).toBe(false); // Checksum incorreto
    expect(isValidCns('209867911680018')).toBe(true);  // CNS definitivo válido (começa com 2)
    expect(isValidCns('708603502805339')).toBe(true);  // CNS provisório válido (começa com 7)
  });

  it('deve validar CNES e CBO', () => {
    expect(isValidCnes('1234567')).toBe(true);
    expect(isValidCnes('123456')).toBe(false);
    expect(isValidCbo('251510')).toBe(true); // CBO Psicólogo Clínico
    expect(isValidCbo('2515')).toBe(false);
  });
});

describe('Zod Patient Schema (SUS Contingency Rules)', () => {
  it('deve aceitar paciente identificado apenas com CPF válido', () => {
    const data = {
      fullName: 'Afonso da Silva',
      cpf: '12345678909',
      raceCode: '01'
    };
    const result = patientSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('deve rejeitar paciente com CPF inválido', () => {
    const data = {
      fullName: 'Afonso da Silva',
      cpf: '12345678900',
      raceCode: '01'
    };
    const result = patientSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('deve aceitar paciente identificado apenas com CNS válido', () => {
    const data = {
      fullName: 'Afonso da Silva',
      cns: '209867911680018',
      raceCode: '01'
    };
    const result = patientSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('deve rejeitar se não houver CPF/CNS e faltarem dados demográficos de contingência', () => {
    const data = {
      fullName: 'Afonso da Silva',
      raceCode: '01'
    };
    const result = patientSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const errorPaths = result.error.issues.map(err => err.path[0]);
      expect(errorPaths).toContain('motherName');
      expect(errorPaths).toContain('birthDate');
      expect(errorPaths).toContain('gender');
      expect(errorPaths).toContain('birthCountryCode');
      expect(errorPaths).toContain('birthCityCode');
    }
  });

  it('deve aceitar se não houver CPF/CNS mas todos os dados demográficos de contingência estiverem preenchidos', () => {
    const data = {
      fullName: 'Afonso da Silva',
      motherName: 'Maria da Silva',
      birthDate: '1995-05-15',
      gender: 'male',
      birthCountryCode: 'BRA',
      birthCityCode: '3550308',
      raceCode: '01'
    };
    const result = patientSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});

describe('RacMapper', () => {
  const mockDto = {
    status: 'final' as const,
    categoryCode: '1',
    date: '2026-05-26T12:00:00Z',
    title: 'Registro de Atendimento Clínico',
    patient: {
      fullName: 'Alex Figueiras',
      cpf: '12345678909',
      raceCode: '01'
    },
    encounter: {
      status: 'finished' as const,
      priorityCode: '1',
      periodStart: '2026-05-26T10:00:00Z',
      periodEnd: '2026-05-26T11:00:00Z',
      cnes: '1234567',
      participant: {
        fullName: 'Dr. Roberto',
        cnsOrCpf: '12345678909',
        cbo: '251510'
      }
    },
    diagnosticos: [
      {
        code: 'F41.1',
        display: 'Ansiedade Generalizada',
        system: 'http://hl7.org/fhir/sid/cid-10' as const,
        type: 'primary' as const
      }
    ],
    sinaisVitais: [
      {
        type: 'pressure-systolic' as const,
        value: 120,
        unit: 'mmHg'
      },
      {
        type: 'pressure-diastolic' as const,
        value: 80,
        unit: 'mmHg'
      }
    ],
    alergias: [
      {
        code: '300910009',
        display: 'Alergia a Penicilina',
        criticality: 'high' as const,
        category: 'medication' as const
      }
    ],
    prescricoes: [
      {
        medicationCode: '900012',
        medicationDisplay: 'Paracetamol 500mg',
        dosageInstruction: 'Tomar 1 comprimido de 8 em 8 horas se dor ou febre',
        quantity: 1,
        unit: 'Caixa'
      }
    ]
  };

  it('deve mapear o DTO para um FHIR Bundle do tipo document com todas as referências cruzadas corretas', () => {
    // Valida o DTO primeiro
    const parseResult = racSchema.safeParse(mockDto);
    expect(parseResult.success).toBe(true);

    const fhirBundle = RacMapper.toFhirBundle(parseResult.data!);
    
    expect(fhirBundle.resourceType).toBe('Bundle');
    expect(fhirBundle.type).toBe('document');
    
    // Devem existir: Composition (1), Patient (1), Encounter (1), Condition (1), Observation (2), Allergy (1), MedicationRequest (1) = 8 recursos
    expect(fhirBundle.entry.length).toBe(8);

    // O primeiro recurso deve ser a Composition
    const compositionEntry = fhirBundle.entry[0];
    expect(compositionEntry.resource.resourceType).toBe('Composition');
    const composition = compositionEntry.resource as FhirComposition;

    // A Composition deve apontar para o Patient e Encounter corretos
    const patientRef = composition.subject.reference;
    const encounterRef = composition.encounter?.reference;

    expect(patientRef).toContain('urn:uuid:');
    expect(encounterRef).toContain('urn:uuid:');

    // Verifica se as entradas do Patient e Encounter estão no Bundle com a mesma URL temporária
    const patientEntry = fhirBundle.entry.find(e => e.fullUrl === patientRef);
    const encounterEntry = fhirBundle.entry.find(e => e.fullUrl === encounterRef);

    expect(patientEntry).toBeDefined();
    expect(patientEntry?.resource.resourceType).toBe('Patient');

    expect(encounterEntry).toBeDefined();
    expect(encounterEntry?.resource.resourceType).toBe('Encounter');

    // Verifica referências cruzadas das seções da Composition
    const sections = composition.section;
    
    // Contato Assistencial
    const contactSection = sections.find(s => s.code.coding?.[0]?.code === 'informacoesContatoAssistencial');
    expect(contactSection?.entry[0].reference).toBe(encounterRef);

    // Diagnósticos
    const diagSection = sections.find(s => s.code.coding?.[0]?.code === 'problemasDiagnosticosAvaliados');
    expect(diagSection?.entry.length).toBe(1);
    
    // Sinais Vitais
    const obsSection = sections.find(s => s.code.coding?.[0]?.code === 'observacoes');
    expect(obsSection?.entry.length).toBe(2);

    // Alergias
    const allergySection = sections.find(s => s.code.coding?.[0]?.code === 'alergiaReacaoAdversa');
    expect(allergySection?.entry.length).toBe(1);

    // Prescrições
    const prescSection = sections.find(s => s.code.coding?.[0]?.code === 'prescricao');
    expect(prescSection?.entry.length).toBe(1);
  });
});
