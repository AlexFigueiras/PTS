require('dotenv').config({ path: '.env.local' });
const postgres = require('postgres');

async function main() {
  const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });
  try {
    console.log('Creating predefined_actions table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "predefined_actions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "category" text NOT NULL,
        "title" text NOT NULL,
        "description" text NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `;
    
    console.log('Seeding predefined_actions...');
    const actions = [
      { category: 'Psicologia', title: 'Psicoterapia Individual', description: 'Sessões semanais para abordagem de traumas e regulação emocional.' },
      { category: 'Psicologia', title: 'Grupo de Apoio Mútuo', description: 'Participação em grupos focados em partilha de experiências e suporte social.' },
      { category: 'Enfermagem', title: 'Monitoramento de Medicação', description: 'Acompanhamento da adesão ao tratamento medicamentoso e efeitos colaterais.' },
      { category: 'Enfermagem', title: 'Cuidado de Feridas/Curativos', description: 'Atendimento clínico para lesões físicas decorrentes do uso ou negligência.' },
      { category: 'Social', title: 'Encaminhamento para CRAS', description: 'Acesso a benefícios sociais e suporte à vulnerabilidade econômica.' },
      { category: 'Social', title: 'Reativação de Vínculos Familiares', description: 'Mediação de conflitos e reuniões com a rede de apoio familiar.' },
      { category: 'Médico', title: 'Consulta Psiquiátrica', description: 'Avaliação para ajuste de psicofármacos e diagnóstico diferencial.' },
      { category: 'Médico', title: 'Desintoxicação Ambulatorial', description: 'Protocolo de redução de danos e manejo de abstinência.' },
      { category: 'Ocupacional', title: 'Oficina de Geração de Renda', description: 'Inclusão em atividades produtivas para autonomia financeira.' },
      { category: 'Educação Física', title: 'Atividade Física Monitorada', description: 'Melhoria da disposição física e redução de ansiedade via exercícios.' }
    ];

    for (const action of actions) {
      await sql`
        INSERT INTO "predefined_actions" (category, title, description)
        VALUES (${action.category}, ${action.title}, ${action.description})
        ON CONFLICT DO NOTHING
      `;
    }

    console.log('Done!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sql.end();
  }
}

main();
