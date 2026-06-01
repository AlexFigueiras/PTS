/**
 * Seed real simulation: Seeding units, complete professional hierarchy (RBAC),
 * and two patients (Dona Maria & Seu João) with deep, realistic multi-sector trajectories.
 *
 * This version performs a COMPLETE reset of all old mock/testing patients, cases, plans,
 * actions, signals, dimensions, consents, and units for the target tenant ID to ensure
 * an absolutely pristine simulation environment.
 *
 * Password for all accounts: Senha123!
 *
 * Usage:
 *   node scripts/seed-real-simulation.mjs <tenantId>
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios no arquivo .env.local.');
  process.exit(1);
}

const tenantId = process.argv[2];
if (!tenantId) {
  console.error('Uso: node scripts/seed-real-simulation.mjs <tenantId>');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// A senha padrão para facilitar o login e teste de todas as contas
const DEFAULT_PASSWORD = 'Senha123!';

async function createOrResetUser(email, fullName, role, jobTitle, registry = null, unitId = null) {
  const cleanEmail = email.toLowerCase().trim();

  // 1. Procurar perfil existente
  const { data: existingProf } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', cleanEmail)
    .maybeSingle();

  let userId;

  if (existingProf) {
    console.log(`Limpando auth user e profile existente: ${cleanEmail}`);
    
    // Remover da tabela professionals_to_units antes
    await supabase.from('professionals_to_units').delete().eq('professional_id', existingProf.id);
    
    // Remover da tabela tenant_members
    await supabase.from('tenant_members').delete().eq('user_id', existingProf.id);

    // Deletar da tabela auth.users do Supabase
    const { error: delAuthErr } = await supabase.auth.admin.deleteUser(existingProf.id);
    if (delAuthErr) {
      console.warn(`Aviso ao deletar usuário do auth (${cleanEmail}): ${delAuthErr.message}`);
    }
    
    // Garantir remoção em profiles
    await supabase.from('profiles').delete().eq('id', existingProf.id);
  }

  // 2. Criar novo usuário na autenticação (com invite_token para evitar gatilho de criação automática de tenant)
  const { data: createdUser, error: createErr } = await supabase.auth.admin.createUser({
    email: cleanEmail,
    password: DEFAULT_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName, invite_token: 'seeded' }
  });

  if (createErr || !createdUser.user) {
    throw new Error(`Erro ao criar usuário auth para ${cleanEmail}: ${createErr?.message}`);
  }

  userId = createdUser.user.id;
  console.log(`✓ Criado usuário auth: ${cleanEmail} (ID: ${userId})`);

  // 3. Atualizar/Inserir na tabela profiles (para governança RBAC)
  const { error: profErr } = await supabase.from('profiles').upsert({
    id: userId,
    email: cleanEmail,
    full_name: fullName,
    role,
    status: 'ACTIVE',
    job_title: jobTitle,
    professional_registry: registry,
  });

  if (profErr) {
    throw new Error(`Erro ao criar perfil em profiles para ${cleanEmail}: ${profErr.message}`);
  }

  // 4. Inserir vínculo em tenant_members
  const { error: memberErr } = await supabase.from('tenant_members').upsert({
    tenant_id: tenantId,
    user_id: userId,
    role: role === 'PROFESSIONAL' ? 'professional' : 'admin',
  });

  if (memberErr) {
    throw new Error(`Erro ao vincular ${cleanEmail} ao tenant: ${memberErr.message}`);
  }

  // 5. Inserir vínculo em professionals_to_units se fornecido
  if (unitId) {
    const { error: unitErr } = await supabase.from('professionals_to_units').upsert({
      professional_id: userId,
      unit_id: unitId,
      is_primary: true,
    });
    if (unitErr) {
      throw new Error(`Erro ao vincular profissional ${cleanEmail} à unidade: ${unitErr.message}`);
    }
  }

  return userId;
}

async function main() {
  console.log(`=== INICIANDO SEED DE SIMULAÇÃO REAL NO TENANT ${tenantId} ===\n`);

  // --- 0. LIMPEZA TOTAL DA BASE DE DADOS (PRISTINE RESET) ---
  console.log('Verificando conflitos de CPF em outros tenants...');
  const targetCpfs = ['000.000.000-00', '111.111.111-11'];
  const { data: existingDupPatients } = await supabase
    .from('patients')
    .select('id')
    .in('cpf', targetCpfs);
  
  if (existingDupPatients && existingDupPatients.length > 0) {
    const dupIds = existingDupPatients.map(p => p.id);
    console.log(`Limpando dependências de pacientes com CPFs duplicados em outros tenants: ${dupIds.join(', ')}`);
    
    // Buscar IDs dos casos e planos para evitar erros de integridade referencial
    const { data: casesData } = await supabase.from('pts_cases').select('id').in('patient_id', dupIds);
    const caseIds = casesData ? casesData.map(c => c.id) : [];
    
    const { data: plansData } = await supabase.from('pts_plans').select('id').in('patient_id', dupIds);
    const planIds = plansData ? plansData.map(p => p.id) : [];

    if (caseIds.length > 0) {
      await supabase.from('pts_signals').delete().in('case_id', caseIds);
    }
    if (planIds.length > 0) {
      await supabase.from('pts_actions').delete().in('plan_id', planIds);
    }
    await supabase.from('pts_plans').delete().in('patient_id', dupIds);
    await supabase.from('pts_dimensions').delete().in('patient_id', dupIds);
    await supabase.from('pts_evolutions').delete().in('patient_id', dupIds);
    await supabase.from('pts_responses').delete().in('patient_id', dupIds);
    await supabase.from('pts_documents').delete().in('patient_id', dupIds);
    await supabase.from('patient_consents').delete().in('patient_id', dupIds);
    await supabase.from('source_health_records').delete().in('patient_id', dupIds);
    await supabase.from('source_social_records').delete().in('patient_id', dupIds);
    await supabase.from('pts_cases').delete().in('patient_id', dupIds);
    await supabase.from('patients').delete().in('id', dupIds);
    console.log('✓ CPFs conflitantes removidos de todos os outros tenants.');
  }

  console.log('\nLimpando dados antigos de pacientes do tenant (limpeza total)...');
  await supabase.from('pts_signals').delete().eq('tenant_id', tenantId);
  await supabase.from('pts_actions').delete().eq('tenant_id', tenantId);
  await supabase.from('pts_plans').delete().eq('tenant_id', tenantId);
  await supabase.from('pts_dimensions').delete().eq('tenant_id', tenantId);
  await supabase.from('pts_evolutions').delete().eq('tenant_id', tenantId);
  await supabase.from('pts_responses').delete().eq('tenant_id', tenantId);
  await supabase.from('pts_documents').delete().eq('tenant_id', tenantId);
  await supabase.from('patient_consents').delete().eq('tenant_id', tenantId);
  await supabase.from('source_health_records').delete().eq('tenant_id', tenantId);
  await supabase.from('source_social_records').delete().eq('tenant_id', tenantId);
  await supabase.from('pts_cases').delete().eq('tenant_id', tenantId);
  await supabase.from('patients').delete().eq('tenant_id', tenantId);
  console.log('✓ Base de dados de pacientes e planos limpa.');

  console.log('\nLimpando unidades de serviço antigas do tenant...');
  const unitIds = [
    'c0de1111-e234-4567-89ab-cdef01234567',
    'c0de2222-e234-4567-89ab-cdef01234567',
    'c0de3333-e234-4567-89ab-cdef01234567',
    'c0de4444-e234-4567-89ab-cdef01234567',
    'c0de5555-e234-4567-89ab-cdef01234567'
  ];
  await supabase.from('professionals_to_units').delete().in('unit_id', unitIds);
  await supabase.from('service_units').delete().eq('tenant_id', tenantId);
  console.log('✓ Unidades e seus vínculos limpos.');


  // --- 1. CRIAR AS UNIDADES DA REDE ---
  const units = [
    {
      id: 'c0de1111-e234-4567-89ab-cdef01234567',
      tenant_id: tenantId,
      name: 'CAPS II — Pinheiros',
      type: 'HEALTH',
      component_id: 'caps',
      full_address: 'Av. Brigadeiro Faria Lima, 1234, Pinheiros',
    },
    {
      id: 'c0de2222-e234-4567-89ab-cdef01234567',
      tenant_id: tenantId,
      name: 'CRAS — Jardim Novo Horizonte',
      type: 'SOCIAL',
      component_id: 'cras_paif',
      full_address: 'Rua das Acácias, 100, Jardim Novo Horizonte',
    },
    {
      id: 'c0de3333-e234-4567-89ab-cdef01234567',
      tenant_id: tenantId,
      name: 'CREAS — Centro',
      type: 'SOCIAL',
      component_id: 'creas_paefi',
      full_address: 'Rua Direita, 200, Sé',
    },
    {
      id: 'c0de4444-e234-4567-89ab-cdef01234567',
      tenant_id: tenantId,
      name: 'UBS — Jardim Novo Horizonte',
      type: 'HEALTH',
      component_id: 'atencao_basica',
      full_address: 'Rua das Acesias, 150, Jardim Novo Horizonte',
    },
    {
      id: 'c0de5555-e234-4567-89ab-cdef01234567',
      tenant_id: tenantId,
      name: 'UPA 24h — Centro',
      type: 'HEALTH',
      component_id: 'urgencia_emergencia',
      full_address: 'Av. Rebouças, 500, Centro',
    }
  ];

  console.log('\nSeeding service units...');
  for (const unit of units) {
    const { error } = await supabase
      .from('service_units')
      .upsert(unit, { onConflict: 'id' });
    if (error) throw new Error(`Erro ao criar unidade de serviço: ${error.message}`);
  }
  console.log(`✓ ${units.length} unidades intersetoriais criadas/atualizadas.`);

  // --- 2. CRIAR A HIERARQUIA DE PROFISSIONAIS (RBAC) ---
  console.log('\nSeeding professional hierarchy (RBAC)...');

  // A. Gestor Municipal / TI (ADMIN)
  const adminId = await createOrResetUser(
    'gestor.municipio@exemplo.com',
    'Carlos Alberto (Gestor Municipal)',
    'ADMIN',
    'Secretário Adjunto de Planejamento e TI'
  );

  // B. CAPS II - Pinheiros
  const mgrCapsId = await createOrResetUser(
    'gerente.caps@exemplo.com',
    'Regina Souza (Gerente CAPS)',
    'MANAGER',
    'Coordenadora de Saúde Mental',
    'CRP 06/1212',
    'c0de1111-e234-4567-89ab-cdef01234567'
  );
  const prof1CapsId = await createOrResetUser(
    'psicologa.caps@exemplo.com',
    'Dra. Ana Flávia (Psicóloga CAPS)',
    'PROFESSIONAL',
    'Psicóloga Clínica',
    'CRP 06/98765',
    'c0de1111-e234-4567-89ab-cdef01234567'
  );
  const prof2CapsId = await createOrResetUser(
    'psiquiatra.caps@exemplo.com',
    'Dr. Bruno Martins (Psiquiatra CAPS)',
    'PROFESSIONAL',
    'Médico Psiquiatra',
    'CRM 123456',
    'c0de1111-e234-4567-89ab-cdef01234567'
  );

  // C. CRAS - Jardim Novo Horizonte
  const mgrCrasId = await createOrResetUser(
    'gerente.cras@exemplo.com',
    'Mariana Lopes (Gerente CRAS)',
    'MANAGER',
    'Coordenadora do CRAS',
    null,
    'c0de2222-e234-4567-89ab-cdef01234567'
  );
  const prof1CrasId = await createOrResetUser(
    'social.cras@exemplo.com',
    'Carla Silva (Assistente Social CRAS)',
    'PROFESSIONAL',
    'Assistente Social de Referência',
    'CRESS 4567',
    'c0de2222-e234-4567-89ab-cdef01234567'
  );
  const prof2CrasId = await createOrResetUser(
    'tecnico.cras@exemplo.com',
    'Daniel Oliveira (Técnico CRAS)',
    'PROFESSIONAL',
    'Psicólogo Social PAIF',
    'CRP 06/11223',
    'c0de2222-e234-4567-89ab-cdef01234567'
  );

  // D. CREAS - Centro
  const mgrCreasId = await createOrResetUser(
    'gerente.creas@exemplo.com',
    'Ricardo Gomes (Gerente CREAS)',
    'MANAGER',
    'Coordenador do CREAS',
    null,
    'c0de3333-e234-4567-89ab-cdef01234567'
  );
  const prof1CreasId = await createOrResetUser(
    'advogada.creas@exemplo.com',
    'Patrícia Lima (Advogada CREAS)',
    'PROFESSIONAL',
    'Advogada de Proteção Social',
    'OAB/SP 443322',
    'c0de3333-e234-4567-89ab-cdef01234567'
  );
  const prof2CreasId = await createOrResetUser(
    'social.creas@exemplo.com',
    'Fabiana Costa (Assistente Social CREAS)',
    'PROFESSIONAL',
    'Assistente Social PAEFI',
    'CRESS 8899',
    'c0de3333-e234-4567-89ab-cdef01234567'
  );

  // E. UBS - Jardim Novo Horizonte
  const mgrUbsId = await createOrResetUser(
    'gerente.ubs@exemplo.com',
    'Dra. Sandra Abreu (Gerente UBS)',
    'MANAGER',
    'Gerente da Unidade de Saúde',
    null,
    'c0de4444-e234-4567-89ab-cdef01234567'
  );
  const prof1UbsId = await createOrResetUser(
    'medico.ubs@exemplo.com',
    'Dr. Eduardo Lima (Médico UBS)',
    'PROFESSIONAL',
    'Médico de Família',
    'CRM 654321',
    'c0de4444-e234-4567-89ab-cdef01234567'
  );
  const prof2UbsId = await createOrResetUser(
    'enfermeira.ubs@exemplo.com',
    'Juliana Rocha (Enfermeira UBS)',
    'PROFESSIONAL',
    'Enfermeira da Família',
    'COREN 998877',
    'c0de4444-e234-4567-89ab-cdef01234567'
  );

  // F. UPA 24h - Centro
  const mgrUpaId = await createOrResetUser(
    'gerente.upa@exemplo.com',
    'Dr. Marcos Viana (Diretor UPA)',
    'MANAGER',
    'Diretor Clínico UPA',
    'CRM 998800',
    'c0de5555-e234-4567-89ab-cdef01234567'
  );
  const prof1UpaId = await createOrResetUser(
    'medica.upa@exemplo.com',
    'Dra. Tereza Dias (Médica UPA)',
    'PROFESSIONAL',
    'Médica Plantonista Emergencista',
    'CRM 998811',
    'c0de5555-e234-4567-89ab-cdef01234567'
  );
  const prof2UpaId = await createOrResetUser(
    'enfermeiro.upa@exemplo.com',
    'Roberto Souza (Enfermeiro UPA)',
    'PROFESSIONAL',
    'Enfermeiro Chefe Emergencista',
    'COREN 112233',
    'c0de5555-e234-4567-89ab-cdef01234567'
  );

  console.log(`✓ Hierarquia completa criada (16 profissionais distribuídos).`);

  // --- 3. PACIENTE 1: DONA MARIA (PTS ATIVO) ---
  console.log('\nSeeding Paciente 1: Dona Maria...');
  
  const mariaId = randomUUID();
  const { error: mariaErr } = await supabase.from('patients').insert({
    id: mariaId,
    tenant_id: tenantId,
    fullName: 'Maria da Conceição Santos',
    cpf: '000.000.000-00',
    birthDate: '1972-03-14',
    gender: 'feminino',
    full_address: 'Rua das Acácias, 142, Jardim Novo Horizonte',
    phone: '(11) 91234-5678',
  });
  if (mariaErr) throw new Error(`Erro ao cadastrar Dona Maria: ${mariaErr.message}`);

  // Garantir caso ativo para Maria
  const caseMariaId = randomUUID();
  const { error: caseMariaErr } = await supabase.from('pts_cases').insert({
    id: caseMariaId,
    tenant_id: tenantId,
    patient_id: mariaId,
    status: 'pts_ativo',
  });
  if (caseMariaErr) throw new Error(`Erro ao criar caso para Dona Maria: ${caseMariaErr.message}`);

  // Inserir registros de saúde
  const mariaHealth = [
    {
      id: randomUUID(),
      tenant_id: tenantId,
      patient_id: mariaId,
      recorded_at: new Date('2026-01-10').toISOString(),
      unit_label: 'CAPS II — Pinheiros',
      raw_text: 'Paciente Maria, 51 anos, acompanhada no CAPS desde 2020. Diagnóstico de transtorno afetivo bipolar tipo I. Relata episódios de humor instável, dificuldade de sono e isolamento progressivo. Última internação em UPA em novembro/2023 por episódio maníaco com comportamento de risco. Mora sozinha desde separação conjugal em 2022. Filha reside em outro estado. Sem renda formal. Usa o benefício BPC-LOAS. Compareceu às consultas irregularmente nos últimos 3 meses.',
    },
    {
      id: randomUUID(),
      tenant_id: tenantId,
      patient_id: mariaId,
      recorded_at: new Date('2026-03-05').toISOString(),
      unit_label: 'UBS — Jardim Novo Horizonte',
      raw_text: 'Paciente encaminhada pelo CAPS para acompanhamento clínico geral. HAS e diabetes tipo 2 controladas. Queixa de dores articulares. Solicita revisão medicamentosa. Relatou que "não tem mais motivo pra sair de casa". Sem sinais de ideação suicida no momento. Orientada a retornar em 30 dias.',
    },
    {
      id: randomUUID(),
      tenant_id: tenantId,
      patient_id: mariaId,
      recorded_at: new Date('2026-05-20').toISOString(),
      unit_label: 'UPA 24h — Centro',
      raw_text: 'Atendimento de urgência. Paciente Maria trazida por vizinha. Estado de agitação psicomotora com discurso desorganizado. Nega uso de substâncias. Administrado medicamento ansiolítico. Estabilizada. Encaminhada ao CAPS de referência. Terceira ocorrência em 18 meses.',
    }
  ];
  const { error: mariaHealthErr } = await supabase.from('source_health_records').insert(mariaHealth);
  if (mariaHealthErr) throw new Error(`Erro ao cadastrar registros de saúde de Dona Maria: ${mariaHealthErr.message}`);

  const mariaSocial = [
    {
      id: randomUUID(),
      tenant_id: tenantId,
      patient_id: mariaId,
      recorded_at: new Date('2026-02-14').toISOString(),
      unit_label: 'CRAS — Jardim Novo Horizonte',
      raw_text: 'Família monoparental. Maria vive sozinha, sem rede de apoio local. Recebe BPC-LOAS por condição de saúde mental. Reside em imóvel alugado com risco de despejo; aluguel em atraso há 2 meses. Filhos adultos residem fora. Referenciada para o PAIF. Encaminhamento para Bolsa Família avaliado.',
    },
    {
      id: randomUUID(),
      tenant_id: tenantId,
      patient_id: mariaId,
      recorded_at: new Date('2026-04-30').toISOString(),
      unit_label: 'CRAS — Jardim Novo Horizonte',
      raw_text: 'Visita domiciliar realizada. Condições de moradia precárias. Alimentação irregular. Maria refere dificuldade de pagar contas básicas. BPC-LOAS mantido. Benefício Bolsa Família: cadastro desatualizado, cadastro bloqueado por inconsistência do CadÚnico. Orientada a atualizar cadastro. Compromisso de retorno em 15 dias — paciente não compareceu.',
    },
    {
      id: randomUUID(),
      tenant_id: tenantId,
      patient_id: mariaId,
      recorded_at: new Date('2026-06-18').toISOString(),
      unit_label: 'CRAS — Jardim Novo Horizonte',
      raw_text: 'NOVO EVENTO: Família perdeu o Bolsa Família. Benefício cancelado por ausência de atualização do CadÚnico. Maria em situação de vulnerabilidade alimentar grave. Sem renda exceto BPC-LOAS. Pagamento de aluguel novamente em risco. Risco de situação de rua em curto prazo se não houver intervenção. Encaminhamento urgente ao CAPS solicitado. Contato com Defensoria Pública para regularização habitacional iniciado.',
    }
  ];
  const { error: mariaSocialErr } = await supabase.from('source_social_records').insert(mariaSocial);
  if (mariaSocialErr) throw new Error(`Erro ao cadastrar registros sociais de Dona Maria: ${mariaSocialErr.message}`);
  console.log('✓ Registros de saúde e sociais criados para Dona Maria.');


  // --- 4. PACIENTE 2: SEU JOÃO (EM OBSERVAÇÃO/TRIAGEM) ---
  console.log('\nSeeding Paciente 2: Seu João (João da Silva)...');

  const joaoId = randomUUID();
  const { error: joaoErr } = await supabase.from('patients').insert({
    id: joaoId,
    tenant_id: tenantId,
    fullName: 'João da Silva (Seu João)',
    cpf: '111.111.111-11',
    birthDate: '1983-08-20',
    gender: 'masculino',
    full_address: 'Rua dos Coqueiros, 25, Jardim Novo Horizonte',
    phone: '(11) 98888-7777',
    nis: '123.45678.90-1',
    cns: '234.5678.9012.3456'
  });
  if (joaoErr) throw new Error(`Erro ao cadastrar Seu João: ${joaoErr.message}`);

  // Garantir caso ativo para João em estado de "observacao"
  const caseJoaoId = randomUUID();
  const { error: caseJoaoErr } = await supabase.from('pts_cases').insert({
    id: caseJoaoId,
    tenant_id: tenantId,
    patient_id: joaoId,
    status: 'observacao', // Em triagem/observação
  });
  if (caseJoaoErr) throw new Error(`Erro ao criar caso para Seu João: ${caseJoaoErr.message}`);

  // Inserir trajetórias de Seu João
  const joaoHealth = [
    {
      id: randomUUID(),
      tenant_id: tenantId,
      patient_id: joaoId,
      recorded_at: new Date('2026-04-15').toISOString(),
      unit_label: 'UPA 24h — Centro',
      raw_text: 'Paciente admitido às 22:30 com quadro de intoxicação alcoólica aguda, agitação e desorientação temporal. Apresentava escoriações leves nos membros superiores após queda da própria altura. Relatou cefaleia intensa e tremores. Administrado soro glicosado e medicação sedativa de suporte. Estabilizado após 6 horas em observação. Refere ingestão diária de cachaça há mais de 1 ano. Nega uso de outras drogas. Orientado a procurar o CAPS AD de referência para dependência química.',
    },
    {
      id: randomUUID(),
      tenant_id: tenantId,
      patient_id: joaoId,
      recorded_at: new Date('2026-04-22').toISOString(),
      unit_label: 'UBS — Jardim Novo Horizonte',
      raw_text: 'Consulta de retorno clínico geral de acompanhamento. HAS e Diabetes mellitus tipo 2 diagnosticadas in 2024. Paciente relata que suspendeu por conta própria o uso de metformina e enalapril há mais de 3 meses. Refere dores crônicas nos pés e episódios frequentes de tontura. Visivelmente descorado e com hálito etílico. Relatou que não vê utilidade em tomar os remédios pois "sua vida acabou". Sinais vitais: PA 165/100 mmHg, glicemia capilar de jejum 240 mg/dL. Encaminhado com urgência para reavaliação de receitas e agendamento de consulta de saúde mental no CAPS.',
    }
  ];
  const { error: joaoHealthErr } = await supabase.from('source_health_records').insert(joaoHealth);
  if (joaoHealthErr) throw new Error(`Erro ao cadastrar registros de saúde de Seu João: ${joaoHealthErr.message}`);

  const joaoSocial = [
    {
      id: randomUUID(),
      tenant_id: tenantId,
      patient_id: joaoId,
      recorded_at: new Date('2026-03-05').toISOString(),
      unit_label: 'CRAS — Jardim Novo Horizonte',
      raw_text: 'Atendimento a família referenciada pelo PAIF. João reside com a companheira e 2 filhos adolescentes em moradia de aluguel (3 meses de atraso). Desempregado desde janeiro/2026 devido a fechamento da empresa metalúrgica local. Relata que a única renda da casa provém de bicos informais de faxina realizados pela companheira. Cadastro único desatualizado desde 2024. Família apresenta grave situação de vulnerabilidade social e insegurança alimentar. Solicitada cesta básica de emergência e iniciado processo de inscrição no Bolsa Família.',
    },
    {
      id: randomUUID(),
      tenant_id: tenantId,
      patient_id: joaoId,
      recorded_at: new Date('2026-05-18').toISOString(),
      unit_label: 'CREAS — Centro',
      raw_text: 'Encaminhado pelo CRAS devido a relato de violência intrafamiliar. A companheira de João compareceu ao serviço relatando que ele, sob efeito constante de álcool, tem episódios frequentes de agressividade verbal e destruição de objetos domésticos na presença dos filhos menores. Família com alto nível de estresse e risco de violência física. João recusa-se a participar dos encontros familiares e a buscar ajuda profissional. Solicitada articulação intersetorial urgente com a rede de saúde (CAPS) para tratamento de dependência química e suporte terapêutico familiar.',
    }
  ];
  const { error: joaoSocialErr } = await supabase.from('source_social_records').insert(joaoSocial);
  if (joaoSocialErr) throw new Error(`Erro ao cadastrar registros sociais de Seu João: ${joaoSocialErr.message}`);
  console.log('✓ Registros de saúde e sociais criados para Seu João.');

  // Criar 3 Sinalizações Cruzadas pré-definidas para Seu João para ilustrar a triagem funcionando de imediato!
  const signals = [
    {
      id: randomUUID(),
      tenant_id: tenantId,
      case_id: caseJoaoId,
      source_unit_id: 'c0de5555-e234-4567-89ab-cdef01234567', // UPA
      author_id: prof1UpaId, // Dra. Tereza
      need_type_id: 'uso_substancias',
      destination_component: 'caps',
      destination_unit_id: 'c0de1111-e234-4567-89ab-cdef01234567', // CAPS
      priority: 'pactuada',
      status: 'sugerida',
      abstract_reason: 'Paciente apresenta dependência de álcool com episódios frequentes de intoxicação aguda e admissões na UPA. Necessidade de acompanhamento especializado de CAPS AD.',
    },
    {
      id: randomUUID(),
      tenant_id: tenantId,
      case_id: caseJoaoId,
      source_unit_id: 'c0de4444-e234-4567-89ab-cdef01234567', // UBS
      author_id: prof1UbsId, // Dr. Eduardo
      need_type_id: 'abandono_tratamento',
      destination_component: 'atencao_basica',
      destination_unit_id: 'c0de4444-e234-4567-89ab-cdef01234567', // UBS
      priority: 'pactuada',
      status: 'aguardando_validacao_rt', // aguardando RT da UBS validar
      abstract_reason: 'Abandono de tratamento de HAS e Diabetes tipo 2. Apresenta grave descontrole clínico (PA 165/100 e Glicose 240) agravado pelo uso abusivo de álcool.',
    },
    {
      id: randomUUID(),
      tenant_id: tenantId,
      case_id: caseJoaoId,
      source_unit_id: 'c0de3333-e234-4567-89ab-cdef01234567', // CREAS
      author_id: prof2CreasId, // Fabiana Costa
      need_type_id: 'violacao_direitos',
      destination_component: 'creas_paefi',
      destination_unit_id: 'c0de3333-e234-4567-89ab-cdef01234567', // CREAS
      assigned_professional_id: prof2CreasId, // Fabiana assume na ponta (popula dashboard do profissional/gerente CREAS)
      priority: 'imediata',
      status: 'encaminhada', // Imediata cai direto como encaminhada na fila do CREAS!
      abstract_reason: 'Risco iminente de violência intrafamiliar física e psicológica sob efeito de álcool na presença de filhos adolescentes. Necessário acompanhamento do PAEFI.',
    }
  ];

  for (const sig of signals) {
    const { error } = await supabase.from('pts_signals').insert(sig);
    if (error) throw new Error(`Erro ao cadastrar sinalização: ${error.message}`);
  }
  console.log(`✓ 3 Sinalizações Cruzadas criadas para a fila de Seu João.`);

  // --- 5. ENRIQUECIMENTO DA DONA MARIA: PTS ATIVO COMPLETO ---
  // Objetivo: as telas do roteiro (Caso, PTS de 4 metas, dashboards e painel do
  // gestor) deixam de aparecer vazias. A Maria é o "caso estabelecido" — já vem
  // pronta. (O Seu João continua sendo a revelação ao vivo do botão "Recalcular
  // com IA" na tela /demo, por isso NÃO pré-derivamos as dimensões dele.)
  console.log('\nEnriquecendo Dona Maria (PTS ativo completo)...');

  const CAPS = 'c0de1111-e234-4567-89ab-cdef01234567';
  const CRAS = 'c0de2222-e234-4567-89ab-cdef01234567';
  const CREAS = 'c0de3333-e234-4567-89ab-cdef01234567';
  const UBS = 'c0de4444-e234-4567-89ab-cdef01234567';
  const UPA = 'c0de5555-e234-4567-89ab-cdef01234567';
  const daysFromNow = (n) => new Date(Date.now() + n * 86400000).toISOString();
  const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

  // 5.1. Baseline multidomínio (pts_responses) — escala 0-4 (maior = melhor).
  const mariaPtsId = randomUUID();
  const mariaScores = { saude: 2.0, social: 1.5, psiquico: 1.5, juridico: 2.0, educacao: 3.0 };
  const { error: mariaRespErr } = await supabase.from('pts_responses').insert({
    id: mariaPtsId,
    tenant_id: tenantId,
    patient_id: mariaId,
    professional_id: prof1CapsId, // Ana Flávia (RT do caso)
    unit_id: CAPS,
    unit_type: 'HEALTH',
    status: 'published',
    version: 1,
    is_locked: true,
    review_period_days: 30,
    next_review_at: daysFromNow(30),
    scores: mariaScores,
    data: { resumo: 'Mulher de 51 anos, transtorno afetivo bipolar I, mora só, BPC-LOAS, risco habitacional e alimentar.' },
    suggested_goals: [],
  });
  if (mariaRespErr) throw new Error(`Erro ao criar baseline PTS de Dona Maria: ${mariaRespErr.message}`);

  // 5.2. Evolução publicada (alimenta o radar de dimensões do dashboard ADMIN).
  const { error: mariaEvoErr } = await supabase.from('pts_evolutions').insert({
    id: randomUUID(),
    pts_id: mariaPtsId,
    tenant_id: tenantId,
    patient_id: mariaId,
    professional_id: prof1CapsId,
    unit_id: CAPS,
    unit_type: 'HEALTH',
    version: 2,
    status: 'published',
    scores: { saude: 2.0, social: 1.5, psiquico: 2.0, juridico: 2.5, educacao: 3.0 },
    data: { nota: 'Reavaliação após pactuação intersetorial; leve melhora psíquica, social ainda crítica.' },
  });
  if (mariaEvoErr) throw new Error(`Erro ao criar evolução de Dona Maria: ${mariaEvoErr.message}`);

  // 5.3. Dimensões derivadas (pts_dimensions) — Psíquico SEMPRE abstraído (regra fixa LGPD).
  const mariaSourceRef = { source: 'health', recordIds: [], derivedAt: new Date().toISOString() };
  const mariaDimensions = [
    {
      dimension: 'saude',
      sensitivity: 'normal',
      payload: {
        estado: 'Doenças crônicas (HAS e diabetes) com adesão irregular; histórico de 3 internações de urgência em 18 meses.',
        fragilidades: ['Adesão medicamentosa irregular', 'Reinternações recorrentes na UPA', 'Acompanhamento clínico descontínuo'],
        potencialidades: ['Vínculo ativo com o CAPS', 'Acompanhamento clínico iniciado na UBS'],
        risco: 'alto',
      },
    },
    {
      dimension: 'social',
      sensitivity: 'normal',
      payload: {
        estado: 'Perda do Bolsa Família por CadÚnico bloqueado; insegurança alimentar grave e risco iminente de despejo.',
        fragilidades: ['Renda apenas do BPC-LOAS', 'CadÚnico desatualizado/bloqueado', 'Aluguel em atraso — risco de situação de rua', 'Ausência de rede de apoio local'],
        potencialidades: ['Acompanhamento ativo pelo PAIF/CRAS', 'Elegível à reativação de benefícios'],
        risco: 'critico',
      },
    },
    {
      dimension: 'psiquico',
      sensitivity: 'abstracted',
      payload: {
        estado: 'Quadro de saúde mental que demanda acompanhamento especializado contínuo.',
        fragilidades: ['Episódios de instabilidade que exigem suporte do CAPS', 'Isolamento social progressivo'],
        potencialidades: ['Resposta positiva ao acompanhamento terapêutico'],
        risco: 'alto',
      },
    },
    {
      dimension: 'juridico',
      sensitivity: 'normal',
      payload: {
        estado: 'Risco de despejo por inadimplência habitacional; necessidade de defesa de direitos.',
        fragilidades: ['Ameaça de despejo', 'Sem assistência jurídica prévia'],
        potencialidades: ['Articulação com Defensoria/CREAS iniciada'],
        risco: 'alto',
      },
    },
    {
      dimension: 'educacao',
      sensitivity: 'normal',
      payload: {
        estado: 'Sem demanda educacional ativa; foco em reinserção e convivência comunitária.',
        fragilidades: ['Baixa participação em atividades de convivência'],
        potencialidades: ['Potencial de reinserção via Centros de Convivência'],
        risco: 'baixo',
      },
    },
  ];
  for (const dim of mariaDimensions) {
    const { error } = await supabase.from('pts_dimensions').insert({
      id: randomUUID(),
      tenant_id: tenantId,
      case_id: caseMariaId,
      dimension: dim.dimension,
      payload: dim.payload,
      sensitivity: dim.sensitivity,
      source_ref: mariaSourceRef,
      version_hash: randomUUID().slice(0, 16),
    });
    if (error) throw new Error(`Erro ao criar dimensão ${dim.dimension} de Dona Maria: ${error.message}`);
  }

  // 5.4. Plano PTS (dono = RT da Saúde, Ana Flávia do CAPS).
  const mariaPlanId = randomUUID();
  const { error: mariaPlanErr } = await supabase.from('pts_plans').insert({
    id: mariaPlanId,
    tenant_id: tenantId,
    case_id: caseMariaId,
    type: 'PTS',
    owner_id: prof1CapsId,
  });
  if (mariaPlanErr) throw new Error(`Erro ao criar plano PTS de Dona Maria: ${mariaPlanErr.message}`);

  // 5.5. As 4 metas/ações intersetoriais do roteiro (cada uma com unidade + profissional).
  const mariaActions = [
    {
      responsible_unit_id: CAPS,
      assigned_professional_id: prof1CapsId, // Ana Flávia (Psicóloga CAPS)
      status: 'em_andamento',
      deadline: daysFromNow(30),
      description: 'Saúde (CAPS II): acompanhamento terapêutico e estabilização psíquica — sessões quinzenais e ajuste de farmacoterapia.',
    },
    {
      responsible_unit_id: UBS,
      assigned_professional_id: prof2UbsId, // Juliana Rocha (Enfermeira UBS)
      status: 'pactuada',
      deadline: daysFromNow(45),
      description: 'Saúde (UBS): revisão das receitas de diabetes/HAS e visitas mensais da enfermagem da família.',
    },
    {
      responsible_unit_id: CRAS,
      assigned_professional_id: prof1CrasId, // Carla Silva (Assistente Social CRAS)
      status: 'em_andamento',
      deadline: daysFromNow(15),
      description: 'Assistência (CRAS): atualização urgente do CadÚnico bloqueado e reativação do Bolsa Família — sem renda e sob risco de despejo.',
    },
    {
      responsible_unit_id: CREAS,
      assigned_professional_id: prof1CreasId, // Patrícia Lima (Advogada CREAS / Defensoria)
      status: 'pactuada',
      deadline: daysFromNow(20),
      description: 'Jurídico/Direitos (Defensoria via CREAS): defesa contra o despejo por aluguel atrasado e articulação de garantia habitacional.',
    },
  ];
  for (const act of mariaActions) {
    const { error } = await supabase.from('pts_actions').insert({
      id: randomUUID(),
      tenant_id: tenantId,
      plan_id: mariaPlanId,
      responsible_unit_id: act.responsible_unit_id,
      assigned_professional_id: act.assigned_professional_id,
      deadline: act.deadline,
      status: act.status,
      description: act.description,
    });
    if (error) throw new Error(`Erro ao criar ação do PTS de Dona Maria: ${error.message}`);
  }

  // 5.6. Sinalizações cruzadas da Maria: histórico resolvido (alimenta KPIs de
  // resolutividade e "economia estimada" do dashboard ADMIN) + 2 ativas (alimentam
  // as caixas de sinalização dos gerentes de CRAS e CREAS).
  const mariaSignals = [
    // Histórico resolvido (loop fechado) — 6 sinalizações
    { need: 'uso_substancias', comp: 'caps', dest: CAPS, src: UPA, author: prof1UpaId, assigned: prof1CapsId, priority: 'pactuada', status: 'resolvida', age: 120, reason: 'Estabilização de crise e reengajamento no acompanhamento do CAPS após internação de urgência.' },
    { need: 'abandono_tratamento', comp: 'atencao_basica', dest: UBS, src: UBS, author: prof1UbsId, assigned: prof2UbsId, priority: 'pactuada', status: 'resolvida', age: 100, reason: 'Busca ativa e retomada do tratamento clínico de HAS/diabetes.' },
    { need: 'uso_substancias', comp: 'caps', dest: CAPS, src: CAPS, author: prof1CapsId, assigned: prof1CapsId, priority: 'pactuada', status: 'resolvida', age: 80, reason: 'Reavaliação medicamentosa concluída em conjunto com a psiquiatria.' },
    { need: 'violacao_direitos', comp: 'cras_paif', dest: CRAS, src: CRAS, author: prof1CrasId, assigned: prof1CrasId, priority: 'pactuada', status: 'resolvida', age: 60, reason: 'Concessão de cesta básica emergencial e referenciamento ao PAIF.' },
    { need: 'abandono_tratamento', comp: 'atencao_basica', dest: UBS, src: UBS, author: prof2UbsId, assigned: prof2UbsId, priority: 'pactuada', status: 'resolvida', age: 40, reason: 'Visita domiciliar de enfermagem realizada; sinais vitais reavaliados.' },
    { need: 'uso_substancias', comp: 'caps', dest: CAPS, src: UPA, author: prof1UpaId, assigned: prof1CapsId, priority: 'imediata', status: 'resolvida', age: 30, reason: 'Acolhimento pós-urgência articulado entre UPA e CAPS de referência.' },
    // Ativas (aparecem nas caixas de sinalização dos gerentes)
    { need: 'violacao_direitos', comp: 'cras_paif', dest: CRAS, src: CRAS, author: prof1CrasId, assigned: prof1CrasId, priority: 'pactuada', status: 'em_tratamento', age: 8, reason: 'Insegurança alimentar grave após cancelamento do Bolsa Família; regularização do CadÚnico em andamento.' },
    { need: 'violacao_direitos', comp: 'creas_paefi', dest: CREAS, src: CRAS, author: prof1CrasId, assigned: prof1CreasId, priority: 'imediata', status: 'encaminhada', age: 3, reason: 'Risco iminente de despejo; necessária defesa jurídica e garantia habitacional.' },
  ];
  for (const sig of mariaSignals) {
    const isResolved = sig.status === 'resolvida';
    const { error } = await supabase.from('pts_signals').insert({
      id: randomUUID(),
      tenant_id: tenantId,
      case_id: caseMariaId,
      source_unit_id: sig.src,
      author_id: sig.author,
      need_type_id: sig.need,
      destination_component: sig.comp,
      destination_unit_id: sig.dest,
      assigned_professional_id: sig.assigned,
      priority: sig.priority,
      status: sig.status,
      abstract_reason: sig.reason,
      resolution_notes: isResolved ? 'Encaminhamento concluído e caso evoluído no loop fechado.' : null,
      resolved_at: isResolved ? daysAgo(sig.age - 5) : null,
      created_at: daysAgo(sig.age),
    });
    if (error) throw new Error(`Erro ao criar sinalização da Dona Maria: ${error.message}`);
  }
  console.log('✓ Dona Maria enriquecida: baseline, evolução, 5 dimensões, plano PTS, 4 metas e 8 sinalizações.');

  console.log('\n======================================================');
  console.log('🎉 SEED COMPLETO E PRONTO PARA A SIMULAÇÃO REAL! 🎉');
  console.log('======================================================');
  console.log(`Tenant ID: ${tenantId}`);
  console.log(`Dona Maria ID: ${mariaId}`);
  console.log(`Seu João ID: ${joaoId}`);
  console.log('\nCredenciais para Login na Plataforma:');
  console.log('------------------------------------------------------');
  console.log('1. Gestor Municipal (ADMIN): gestor.municipio@exemplo.com | Senha: Senha123!');
  console.log('2. Coordenadora CAPS (MANAGER): gerente.caps@exemplo.com | Senha: Senha123!');
  console.log('3. Psicóloga CAPS (PROFESSIONAL): psicologa.caps@exemplo.com | Senha: Senha123!');
  console.log('4. Assistente Social CRAS (PROFESSIONAL): social.cras@exemplo.com | Senha: Senha123!');
  console.log('5. Médico UBS (PROFESSIONAL): medico.ubs@exemplo.com | Senha: Senha123!');
  console.log('6. Assistente Social CREAS (PROFESSIONAL): social.creas@exemplo.com | Senha: Senha123!');
  console.log('------------------------------------------------------');
  console.log('\nROTEIRO DE TELAS (apresentação ao prefeito):');
  console.log('------------------------------------------------------');
  console.log(`CENÁRIO 1 — Seu João (revelação ao vivo da IA):`);
  console.log(`  • Abrir  /demo/${joaoId}  e clicar em "Recalcular com IA" (gera dimensões + alertas ao vivo).`);
  console.log(`  • Depois /patients/${joaoId}/caso  → seção "Sinalizações Cruzadas".`);
  console.log(`  • Logar como gerente.creas@exemplo.com → Dashboard → "Caixa de Sinalizações" (alerta do João).`);
  console.log(`CENÁRIO 2 — Dona Maria (PTS intersetorial já montado):`);
  console.log(`  • Abrir  /patients/${mariaId}/caso  → status PTS Ativo + 5 Dimensões + 4 Ações Pactuadas.`);
  console.log(`  • (NÃO use /triagem para a Maria — ela é pts_ativo, não aparece na fila de observação.)`);
  console.log(`PAINEL DO GESTOR — logar como gestor.municipio@exemplo.com → Dashboard ADMIN`);
  console.log(`  (resolutividade, economia estimada e radar das 5 dimensões já populados).`);
  console.log('------------------------------------------------------');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
