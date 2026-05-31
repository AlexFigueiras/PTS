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
  // --- 1. Paciente dona Maria ---
  const { data: existing } = await supabase
    .from('patients')
    .select('id')
    .eq('tenant_id', tenantId)
    .ilike('full_name', '%Maria da Conceição%')
    .maybeSingle();

  let patientId = existing?.id;

  if (!patientId) {
    patientId = randomUUID();
    const { error } = await supabase.from('patients').insert({
      id: patientId,
      tenant_id: tenantId,
      full_name: 'Maria da Conceição Santos',
      cpf: '000.000.000-00',
      birth_date: '1972-03-14',
      gender: 'feminino',
      address: 'Rua das Acácias, 142, Jardim Novo Horizonte',
      phone: '(11) 91234-5678',
    });
    if (error) throw new Error(`Erro ao criar paciente: ${error.message}`);
    console.log(`✓ Paciente criado: ${patientId}`);
  } else {
    console.log(`✓ Paciente já existe: ${patientId}`);
  }

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
