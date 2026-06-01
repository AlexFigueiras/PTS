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

  // 2. Criar novo usuário na autenticação
  const { data: createdUser, error: createErr } = await supabase.auth.admin.createUser({
    email: cleanEmail,
    password: DEFAULT_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName }
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
  console.log('Limpando dados antigos de pacientes do tenant (limpeza total)...');
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
  await supabase.from('patients').insert({
    id: mariaId,
    tenant_id: tenantId,
    fullName: 'Maria da Conceição Santos',
    cpf: '000.000.000-00',
    birthDate: '1972-03-14',
    gender: 'feminino',
    full_address: 'Rua das Acácias, 142, Jardim Novo Horizonte',
    phone: '(11) 91234-5678',
  });

  // Garantir caso ativo para Maria
  const caseMariaId = randomUUID();
  await supabase.from('pts_cases').insert({
    id: caseMariaId,
    tenant_id: tenantId,
    patient_id: mariaId,
    status: 'pts_ativo',
  });

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
  await supabase.from('source_health_records').insert(mariaHealth);

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
  await supabase.from('source_social_records').insert(mariaSocial);
  console.log('✓ Registros de saúde e sociais criados para Dona Maria.');


  // --- 4. PACIENTE 2: SEU JOÃO (EM OBSERVAÇÃO/TRIAGEM) ---
  console.log('\nSeeding Paciente 2: Seu João (João da Silva)...');

  const joaoId = randomUUID();
  await supabase.from('patients').insert({
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

  // Garantir caso ativo para João em estado de "observacao"
  const caseJoaoId = randomUUID();
  await supabase.from('pts_cases').insert({
    id: caseJoaoId,
    tenant_id: tenantId,
    patient_id: joaoId,
    status: 'observacao', // Em triagem/observação
  });

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
      raw_text: 'Consulta de retorno clínico geral de acompanhamento. HAS e Diabetes mellitus tipo 2 diagnosticadas em 2024. Paciente relata que suspendeu por conta própria o uso de metformina e enalapril há mais de 3 meses. Refere dores crônicas nos pés e episódios frequentes de tontura. Visivelmente descorado e com hálito etílico. Relatou que não vê utilidade em tomar os remédios pois "sua vida acabou". Sinais vitais: PA 165/100 mmHg, glicemia capilar de jejum 240 mg/dL. Encaminhado com urgência para reavaliação de receitas e agendamento de consulta de saúde mental no CAPS.',
    }
  ];
  await supabase.from('source_health_records').insert(joaoHealth);

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
  await supabase.from('source_social_records').insert(joaoSocial);
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
      priority: 'imediata',
      status: 'encaminhada', // Imediata cai direto como encaminhada na fila do CREAS!
      abstract_reason: 'Risco iminente de violência intrafamiliar física e psicológica sob efeito de álcool na presença de filhos adolescentes. Necessário acompanhamento do PAEFI.',
    }
  ];

  for (const sig of signals) {
    const { error } = await supabase.from('pts_signals').insert(sig);
    if (error) console.warn(`Aviso sinalização: ${error.message}`);
  }
  console.log(`✓ 3 Sinalizações Cruzadas criadas para a fila de Seu João.`);

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
  console.log('\nPróximo Passo: Proponha ao usuário o guia detalhado do roteiro de uso real!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
