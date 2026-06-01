/**
 * Seed demo: "Dona Maria" — roteiro Fase 3.
 *
 * Cria (se não existir) um paciente fictício com histórico clínico e assistencial
 * coerente para demonstração do split antes/depois.
 *
 * Uso:
 *   node scripts/seed-demo-dona-maria.mjs <tenantId>
 *
 * O tenantId deve ser o UUID do tenant de demonstração no banco.
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
  console.error('NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.');
  process.exit(1);
}

const tenantId = process.argv[2];
if (!tenantId) {
  console.error('Uso: node scripts/seed-demo-dona-maria.mjs <tenantId>');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  // --- 0.5. Criar Unidades de Serviço e Vínculos ---
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
      full_address: 'Rua das Acácias, 150, Jardim Novo Horizonte',
    }
  ];

  for (const unit of units) {
    const { error } = await supabase
      .from('service_units')
      .upsert(unit, { onConflict: 'id', ignoreDuplicates: true });
    if (error) console.warn(`Aviso unidade: ${error.message}`);
  }
  console.log(`✓ ${units.length} unidades do serviço criadas.`);

  const { data: members } = await supabase
    .from('tenant_members')
    .select('user_id')
    .eq('tenant_id', tenantId);

  if (members && members.length > 0) {
    for (const member of members) {
      await supabase
        .from('professionals_to_units')
        .delete()
        .eq('professional_id', member.user_id);

      const links = units.map((unit, index) => ({
        professional_id: member.user_id,
        unit_id: unit.id,
        is_primary: index === 0,
      }));

      const { error: linkErr } = await supabase
        .from('professionals_to_units')
        .insert(links);
      if (linkErr) console.warn(`Aviso ao vincular profissional ${member.user_id}: ${linkErr.message}`);
    }
    console.log(`✓ Profissionais vinculados às unidades com sucesso.`);
  }

  // --- 1. Paciente dona Maria ---
  const { data: existing } = await supabase
    .from('patients')
    .select('id')
    .eq('tenant_id', tenantId)
    .ilike('fullName', '%Maria da Conceição%')
    .maybeSingle();

  let patientId = existing?.id;

  if (!patientId) {
    patientId = randomUUID();
    const { error } = await supabase.from('patients').insert({
      id: patientId,
      tenant_id: tenantId,
      fullName: 'Maria da Conceição Santos',
      cpf: '000.000.000-00',
      birthDate: '1972-03-14',
      gender: 'feminino',
      full_address: 'Rua das Acácias, 142, Jardim Novo Horizonte',
      phone: '(11) 91234-5678',
    });
    if (error) throw new Error(`Erro ao criar paciente: ${error.message}`);
    console.log(`✓ Paciente criado: ${patientId}`);
  } else {
    console.log(`✓ Paciente já existe: ${patientId}`);
  }

  // --- 1.5. Caso ativo ---
  const { data: existingCase } = await supabase
    .from('pts_cases')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('patient_id', patientId)
    .in('status', ['radar', 'observacao', 'acompanhamento', 'pts_ativo', 'pia_ativo'])
    .maybeSingle();

  let caseId = existingCase?.id;

  if (!caseId) {
    caseId = randomUUID();
    const { error } = await supabase.from('pts_cases').insert({
      id: caseId,
      tenant_id: tenantId,
      patient_id: patientId,
      status: 'pts_ativo',
    });
    if (error) throw new Error(`Erro ao criar caso: ${error.message}`);
    console.log(`✓ Caso ativo criado: ${caseId}`);
  } else {
    console.log(`✓ Caso ativo já existe: ${caseId}`);
  }

  // --- 1.8. Limpeza de registros anteriores (evita duplicados) ---
  const { error: deleteHealthError } = await supabase
    .from('source_health_records')
    .delete()
    .eq('patient_id', patientId);
  if (deleteHealthError) console.warn(`Aviso ao limpar registros de saúde: ${deleteHealthError.message}`);

  const { error: deleteSocialError } = await supabase
    .from('source_social_records')
    .delete()
    .eq('patient_id', patientId);
  if (deleteSocialError) console.warn(`Aviso ao limpar registros sociais: ${deleteSocialError.message}`);

  // --- 2. Registros-fonte Saúde ---
  const healthRecords = [
    {
      id: randomUUID(),
      tenant_id: tenantId,
      patient_id: patientId,
      recorded_at: new Date('2024-01-10').toISOString(),
      unit_label: 'CAPS II — Pinheiros',
      raw_text:
        'Paciente Maria, 51 anos, acompanhada no CAPS desde 2020. Diagnóstico de transtorno afetivo bipolar tipo I. Relata episódios de humor instável, dificuldade de sono e isolamento progressivo. Última internação em UPA em novembro/2023 por episódio maníaco com comportamento de risco. Mora sozinha desde separação conjugal em 2022. Filha reside em outro estado. Sem renda formal. Usa o benefício BPC-LOAS. Compareceu às consultas irregularmente nos últimos 3 meses.',
    },
    {
      id: randomUUID(),
      tenant_id: tenantId,
      patient_id: patientId,
      recorded_at: new Date('2024-03-05').toISOString(),
      unit_label: 'UBS — Jardim Novo Horizonte',
      raw_text:
        'Paciente encaminhada pelo CAPS para acompanhamento clínico geral. HAS e diabetes tipo 2 controladas. Queixa de dores articulares. Solicita revisão medicamentosa. Relatou que "não tem mais motivo pra sair de casa". Sem sinais de ideação suicida no momento. Orientada a retornar em 30 dias.',
    },
    {
      id: randomUUID(),
      tenant_id: tenantId,
      patient_id: patientId,
      recorded_at: new Date('2024-05-20').toISOString(),
      unit_label: 'UPA 24h — Centro',
      raw_text:
        'Atendimento de urgência. Paciente Maria trazida por vizinha. Estado de agitação psicomotora com discurso desorganizado. Nega uso de substâncias. Administrado medicamento ansiolítico. Estabilizada. Encaminhada ao CAPS de referência. Terceira ocorrência em 18 meses.',
    },
  ];

  for (const rec of healthRecords) {
    const { error } = await supabase
      .from('source_health_records')
      .upsert(rec, { onConflict: 'id', ignoreDuplicates: true });
    if (error) console.warn(`Aviso saúde: ${error.message}`);
  }
  console.log(`✓ ${healthRecords.length} registros de saúde inseridos.`);

  // --- 3. Registros-fonte Assistência Social ---
  const socialRecords = [
    {
      id: randomUUID(),
      tenant_id: tenantId,
      patient_id: patientId,
      recorded_at: new Date('2024-02-14').toISOString(),
      unit_label: 'CRAS — Jardim Novo Horizonte',
      raw_text:
        'Família monoparental. Maria vive sozinha, sem rede de apoio local. Recebe BPC-LOAS por condição de saúde mental. Reside em imóvel alugado com risco de despejo; aluguel em atraso há 2 meses. Filhos adultos residem fora. Referenciada para o PAIF. Encaminhamento para Bolsa Família avaliado.',
    },
    {
      id: randomUUID(),
      tenant_id: tenantId,
      patient_id: patientId,
      recorded_at: new Date('2024-04-30').toISOString(),
      unit_label: 'CRAS — Jardim Novo Horizonte',
      raw_text:
        'Visita domiciliar realizada. Condições de moradia precárias. Alimentação irregular. Maria refere dificuldade de pagar contas básicas. BPC-LOAS mantido. Benefício Bolsa Família: cadastro desatualizado, bloqueado por inconsistência do CadÚnico. Orientada a atualizar cadastro. Compromisso de retorno em 15 dias — paciente não compareceu.',
    },
    {
      id: randomUUID(),
      tenant_id: tenantId,
      patient_id: patientId,
      recorded_at: new Date('2024-06-18').toISOString(),
      unit_label: 'CRAS — Jardim Novo Horizonte',
      raw_text:
        'NOVO EVENTO: Família perdeu o Bolsa Família. Benefício cancelado por ausência de atualização do CadÚnico. Maria em situação de vulnerabilidade alimentar grave. Sem renda exceto BPC-LOAS. Pagamento de aluguel novamente em risco. Risco de situação de rua em curto prazo se não houver intervenção. Encaminhamento urgente ao CAPS solicitado. Contato com Defensoria Pública para regularização habitacional iniciado.',
    },
  ];

  for (const rec of socialRecords) {
    const { error } = await supabase
      .from('source_social_records')
      .upsert(rec, { onConflict: 'id', ignoreDuplicates: true });
    if (error) console.warn(`Aviso social: ${error.message}`);
  }
  console.log(`✓ ${socialRecords.length} registros sociais inseridos.`);

  console.log(`\n✅ Seed dona Maria concluído. patientId=${patientId}`);
  console.log(`   Use este patientId na rota /demo/${patientId} para o roteiro.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
