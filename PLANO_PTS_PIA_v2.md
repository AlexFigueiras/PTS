# Plano de Implantação — Orquestrador Intersetorial de PTS/PIA (v2)

> Documento de engenharia e produto. Consolida todas as decisões tomadas ao longo do projeto.
> **Esta versão (v2) é a fonte da verdade.** Incorpora os ajustes derivados da validação com a especialista em PTS: o eixo central é transformar o PTS de um *registro de ações* em **produção de cuidado** — com prazos fechados, reavaliação sistemática, alertas de descumprimento e protagonismo do usuário.
> Objetivo: se tudo aqui for executado, você termina com **um protótipo apresentável e vendável**, e com a **fundação técnica reutilizável** para a operação real pós-contrato.

---

## 0. O que é o sistema (escopo estrito)

Um **orquestrador intersetorial de PTS (Projeto Terapêutico Singular) / PIA (Plano Individual de Atendimento)**. Ele articula o cuidado de um cidadão entre as redes de **Saúde** (UBS, CAPS, UPA) e **Assistência Social** (CRAS, CREAS) de um município.

O que ele **é**:
- Uma camada de **coordenação** entre esferas que hoje não se comunicam.
- Um leitor de dados das duas redes, que a **IA analisa** para montar um retrato do cidadão e **propor** objetivos, metas e ações intersetoriais.
- Uma ferramenta de **gestão do ciclo de vida das ações pactuadas** (quem faz o quê, **em que prazo, com que frequência, com reavaliação sistemática**), com sinalização cruzada inteligente entre unidades **e alerta de descumprimento**.

O que ele **NÃO é**:
- Não é prontuário eletrônico (EHR). Não substitui o sistema clínico do município.
- Não envia dados ao governo federal. Todo "envio" é para o **próprio backend** (a inteligência da IA).
- Não faz digitação de prontuário clínico. A única escrita interativa em campo é o ciclo de vida de metas/ações.
- **Não é um rol de atividades.** Registrar que "o cidadão foi encaminhado ao CAPS, à UBS" não é PTS — é relato de caso. PTS é acompanhar: **foi? foi quando? quantas vezes? teve continuidade? sustentou o tratamento?** — com reavaliação das metas pactuadas.

**Tese de valor (a frase que vende):** *unificar saúde e assistência em torno do cidadão, antecipando crises (ex.: reinternação) e disparando articulação entre as unidades antes que o problema agrave.* A antecipação só é real porque o sistema **cobra prazos e dispara busca ativa quando o cuidado não acontece** — em vez de descobrir o paciente descompensado na UPA.

**Princípio que rege toda a UX e a lógica do produto:** os registros podem ser excelentes, mas isso **precisa virar produção de cuidado**. Consolidar dados não é cuidar; o diferencial é a reavaliação sistemática e a continuidade.

---

## 1. Decisões de arquitetura de informação (fundamento)

### 1.1. As cinco Dimensões
O PTS clássico (Política Nacional de Humanização) organiza o cuidado em quatro **momentos** — **acolhimento/diagnóstico → pactuação de metas → divisão de responsabilidades → reavaliação das metas** — e o diagnóstico olha três âmbitos: **orgânico, psicológico e social**. Estes quatro momentos não são decorativos: o sistema precisa materializar cada um deles, com ênfase especial na **reavaliação** (o momento que mais se perde na prática).

Este sistema adota uma **expansão intersetorial** desse modelo, com cinco Dimensões:
**Saúde, Social, Psíquico, Jurídico, Educação.**

Isto é uma **adaptação legítima e deliberada** (não um protocolo oficial fechado): o PTS canônico é centrado em saúde mental/CAPS e embute Jurídico e Educação dentro de "social". Como o produto une saúde **e** assistência, destacar essas dimensões é o diferencial. **Apresentar sempre como "adaptação intersetorial do PTS", nunca como invenção do conceito.**

### 1.2. Modelo de visibilidade (resolve o sigilo sem complicar)
O PTS é, por natureza, **interdisciplinar e compartilhado**. Logo:

- **Dimensões → visíveis a TODOS os profissionais do caso** (Saúde e Assistência). É o coração do PTS; é para isso que ele existe.
- **Relato clínico/assistencial bruto → NÃO atravessa as esferas.** A evolução detalhada que o médico escreveu, o registro de sessão, o relato do CRAS — isso fica na **esfera de origem** e **nunca entra no PTS**. Ele só alimenta a IA no momento da ingestão.
- **Exceção única e estreita — conteúdo psiquiátrico sensível:** diagnóstico nominal, medicação e conteúdo de sessão **não** aparecem cru na Dimensão Psíquico. Esta exibe apenas a **vulnerabilidade e a necessidade de ação** de forma resumida/abstrata. **Regra fixa por dimensão, decidida pelo sistema — não pela IA**, para ser previsível e auditável.

Princípio que rege tudo: **compartilha-se a necessidade de coordenação, não o dado clínico que a justifica.** Um alerta ao CRAS diz "paciente com risco aumentado de reinternação, articular suporte social" — nunca "médico relatou surto em tal data".

### 1.3. Duas camadas de dado
- **Camada-fonte (sensível, bruta):** o que vem de cada rede. Lida pela IA na ingestão; visível só à esfera de origem.
- **Camada-derivada (Dimensão):** abstração produzida pela IA — estado, fragilidade, potencialidade, risco. É o que o PTS exibe e compartilha.

A IA **lê tudo** e **expõe só o derivado**, classificado pela regra fixa de sensibilidade da seção 1.2.

### 1.4. PTS e PIA — dois planos, não um (distinção legal)
PTS e PIA **não são a mesma ferramenta**, e o sistema precisa respeitar isso na operação real:

- **PTS (Projeto Terapêutico Singular)** — instrumento da **Saúde** (Política Nacional de Humanização/SUS, forte no CAPS). Momentos: acolhimento/diagnóstico (orgânico/psíquico/social) → pactuação de metas → divisão de responsabilidades → **reavaliação**.
- **PIA (Plano Individual de Atendimento)** — instrumento da **Assistência** (SUAS), com base legal própria: Lei 12.594/2012 (SINASE) e ECA art. 101 (serviços de acolhimento de crianças e adolescentes); usado na Proteção Social Especial (Resolução CNAS 109/2009). Estrutura mínima exigida em lei: resultados da avaliação interdisciplinar do estudo diagnóstico, compromissos assumidos pela família/responsáveis, e previsão das atividades a desenvolver — **centrado na família**, com **medida protetiva/legal e prazos de reavaliação obrigatórios**.

Ambos são interdisciplinares e já preveem articulação intersetorial por norma (o PIA convoca CAPS/UBS; o PTS convoca a Assistência). O sistema é exatamente a ponte que as duas normas pedem.

**Decisão de modelagem:** o caso é **um cidadão** sobre o qual podem existir **dois contêineres de plano** — um **PTS (dono: Referência Técnica da Saúde)** e um **PIA (dono: equipe de referência do CREAS/serviço)** — que **compartilham as mesmas 5 Dimensões** e trocam sinalizações. Não se fundem num plano só, para respeitar as duas bases legais.

**O que isso muda na prática (mínimo):**
- **Telas/formulários são praticamente idênticos.** A tela de Ação (responsável, prazo, frequência, reavaliação, status) é **a mesma** para Saúde e Assistência. As 5 Dimensões são as mesmas e compartilhadas.
- **Muda apenas:** (a) uma **aba/etiqueta** PTS vs. PIA no caso; (b) **dois donos** em vez de um (alerta de origem clínica → RT da Saúde valida; de origem assistencial → referência do CREAS valida); (c) **um campo extra só no PIA** — medida protetiva/legal + data de reavaliação obrigatória.

**No protótipo:** usar **plano único compartilhado** — demonstra a integração de forma mais limpa para o gestor e é mais simples. A separação PTS/PIA entra na **operação real**, quando a conformidade do SUAS passa a importar.

---

## 2. Arquitetura técnica alvo

```
┌──────────────────────────────────────────────────────────────────┐
│  CLIENTE (web/mobile) — online (sem offline)                       │
│  • Dimensões = cartões READ-ONLY (contexto da IA, compartilhado)   │
│  • Único módulo de ESCRITA: Metas & Ações (ciclo de vida temporal) │
│  • Semáforo de cumprimento por ação (verde/amarelo/vermelho)       │
│  • Caixa de entrada de Sinalizações / Alertas (inclui atrasos)     │
└──────────────▲───────────────────────────────┬───────────────────┘
               │ requisições                    │
┌──────────────┴───────────────────────────────▼───────────────────┐
│  BACKEND (Supabase + Next.js)                                     │
│  • Domínio: Caso/Plano, Dimensões, Objetivos, Metas, Ações,       │
│    Reavaliações, Encontros (articulação vs. reunião de PTS)       │
│  • Auth + RBAC via RLS (Admin → Gerente → Profissional; RT dona)  │
│  • Motor de Sinalização Cruzada (humano-no-loop)                  │
│  • Motor de Prazos & Reavaliação (semáforo + alertas escalonados) │
│  • Camada de IA (ingestão lê tudo → deriva Dimensões → sugere)    │
│  • Auditoria imutável (LGPD)                                      │
└───────▲────────────────────────────────────────────▲─────────────┘
        │ ADAPTER de ingestão (plugável, isolado)     │
┌───────┴───────────────┐                   ┌─────────┴─────────────┐
│ FONTE SAÚDE (fictícia  │                   │ FONTE ASSISTÊNCIA      │
│ no protótipo; sistema  │                   │ (fictícia no protótipo;│
│ municipal real depois) │                   │ sistema municipal      │
│ → normaliza p/ Dimensão│                   │ real depois)           │
└────────────────────────┘                   └────────────────────────┘
```

**Princípio inegociável:** os adapters de ingestão são **plugáveis e isolados**. O núcleo conhece apenas o **modelo normalizado de Dimensão** — nunca a fonte. Trocar a fonte fictícia pela fonte municipal real **não toca o núcleo**. Por isso o trabalho do protótipo não é descartável: vira a fundação do adapter de produção.

> **Decisão:** o sistema é **online** (sem offline-first). Sem WatermelonDB, sem SyncService, sem resolução de conflito — simplificação adotada para protótipo e operação.

### 2.1. Stack tecnológica (definida)

**Núcleo**
- **Next.js (App Router) + TypeScript** — framework e tipagem ponta a ponta.
- **Tailwind + shadcn/ui** — UI rápida e consistente (acelera muito a demo).
- **Supabase** — Postgres + Auth + **RLS** (Row Level Security). **Sem ORM:** acesso via **`supabase-js`** (o RLS funciona nativamente com o SDK; um ORM exigiria padrão de dois clientes e `prepare:false`, complexidade desnecessária aqui). Migrations via **Supabase CLI**.
- **Zod** — validação na borda (entradas, payloads de ingestão, formulários). **Inclui as regras de obrigatoriedade de prazo/frequência/reavaliação ao pactuar uma ação — ver 5.6.**
- **React Hook Form** — formulários (tela de Ação, onboarding).
- **Resend** — e-mails transacionais dos convites em cascata (Admin → Gerente → Profissional) **e dos alertas de descumprimento/reavaliação pendente (ver 5.7).**
- **Agendamento de prazos (motor de reavaliação/alerta)** — checagem temporal periódica (Supabase scheduled function / cron) que recalcula o semáforo das ações e dispara os alertas escalonados. É infraestrutura do coração do produto, não YAGNI.

**A definir (peças que faltam e são do coração do produto)**
- **Provider de IA — Google Gemini (API).** Modelo local descartado (sem infra). Uso seguro obrigatório (ver 6C).
- **Geração de PDF — `@react-pdf/renderer`** (ver 6B/6C). Escolhido sobre Puppeteer: roda bem em serverless (sem o binário Chromium de ~100MB), suficiente para documento de texto jurídico e com acentuação UTF-8 correta. Puppeteer só se algum dia exigir fidelidade pixel-perfect de layout complexo.

**Adiado (YAGNI — só quando houver necessidade real)**
- **Sentry** — observabilidade; útil em produção, não no protótipo.
- **Upstash Redis** — sem caso de uso atual (sem rate-limit/fila/cache crítico na demo).
- **ORM (Drizzle/Prisma)** — adicionar só se a falta de type-safety em queries complexas doer. Prisma **não** resolveria a questão de RLS melhor que Drizzle; ambos exigiriam o mesmo cuidado. Por isso, nenhum ORM por ora.
- **Offline-first (PowerSync/WatermelonDB/RxDB)** — descartado por decisão; não entra nem na operação real.

---

## 3. Modelo de dados (domínio mínimo)

- **Município:** tenant raiz. Todo o resto pende dele (multi-tenant desde o início).
- **Unidade:** tipo (UBS/CAPS/UPA/CRAS/CREAS...), esfera (Saúde/Assistência), **componente da rede** (qual componente RAPS/SUAS ela atende), território de referência.
- **Componente da rede (catálogo):** os 7 componentes da RAPS + serviços do SUAS (ver 5.5). Cada componente mapeia os **tipos de necessidade** que atende — base do roteamento inteligente.
- **Profissional:** identidade, esfera, unidade, papel; pode ser **Referência Técnica (RT)** de casos.
- **Cidadão (indivíduo/família):** identificadores (CPF/CNS **tokenizados/cifrados**), demografia básica.
- **Caso:** cidadão + município + status + território + **nível de intensidade do cuidado** (ver 5.8). É o agregador; sobre ele pendem um ou dois **Planos**.
- **Plano:** tipo (**PTS** ou **PIA**), dono (PTS → Referência Técnica da Saúde; PIA → equipe de referência do CREAS), e — **só no PIA** — medida protetiva/legal + data de reavaliação obrigatória. **Campo `participacao_usuario`** (ver 5.9): `presente` / `representado_familia` / `dispensado_por_incapacidade` (+ justificativa). *No protótipo: um único Plano compartilhado.*
- **Dimensão:** tipo (Saúde/Social/Psíquico/Jurídico/Educação), payload **derivado** read-only, nível de sensibilidade (regra fixa), origem (fonte + timestamp), hash de versão. **Compartilhada pelo caso** (ambos os planos a leem).
- **Objetivo → Meta → Ação:** hierarquia dentro de cada Plano.
  - **Ação** é a única entidade de escrita em campo. Campos:
    - unidade responsável, profissional atribuído (quando houver)
    - **`data_inicio`** (date, obrigatória ao pactuar)
    - **`prazo_fim` / horizonte** (date, obrigatório — a data até a qual a ação vale: "por seis meses", "por quatro meses até estabilização")
    - **`frequencia`** (estruturada: `semanal` / `quinzenal` / `mensal` / etc. + detalhe de cadência livre, ex.: "1ª e 3ª quinta do mês") — substitui texto solto como "quinzenais"
    - **`proximo_retorno`** (date — derivado da frequência, editável)
    - **`data_proxima_reavaliacao`** (date, obrigatória — distinta do prazo_fim)
    - **`horizonte_tipo`** (enum: `curto_prazo` / `medio_prazo` / `longo_prazo`)
    - **`aceite_usuario`** (enum: `aceita` / `recusa` / `repactuar` — captura o "real" vs. "ideal")
    - status (`pactuada` / `em_andamento` / `concluida` / `bloqueada`), evolução (notas)
    - **`status_temporal` derivado (não armazenado cru):** verde / amarelo / vermelho — computado a partir de prazos e comparecimento (ver 5.7).
    - **Tela idêntica para Saúde e Assistência.**
- **Reavaliação:** entidade ligada a Meta/Ação — `data`, `resultado` (`cumpriu` / `cumpriu_parcial` / `nao_cumpriu`), `nota`, `proxima_acao` (`continuar` / `repactuar` / `encerrar` / `escalar`). O sistema agenda automaticamente a próxima na `data_proxima_reavaliacao`.
- **Encontro/Reunião:** `tipo` (`articulacao_rede` / `reuniao_pts`), data, participantes, **presença do usuário registrada** (obrigatória em `reuniao_pts`). Ver 5.9.
- **Documento legal:** minuta gerada por IA (PIA ou PTS formal) a partir do relato-fonte, editável pelo profissional dono, versionada, exportável em PDF, restrita à esfera de origem. Inclui a lista de compromissos pactuados por unidade/responsável com prazos (ver 6B).
- **Sinalização cruzada:** evento da IA entre unidades — origem, **componente/unidade destino** (não pessoa), tipo de necessidade roteado, severidade, motivo abstrato, status (sugerida / validada pelo dono / encaminhada / recebida / em tratamento / resolvida). **Inclui o subtipo `alerta_descumprimento` (ver 5.7).**
- **Auditoria:** trilha imutável — quem viu/alterou/encaminhou/exportou o quê e quando.

---

## 4. Hierarquia de acesso e onboarding

Três níveis, com convite por e-mail/link em cascata:

1. **Admin (Gestor municipal ou TI responsável).**
   - Cadastra as **Unidades** (UBS, CAPS, UPA, CRAS, CREAS).
   - Cadastra os **Gerentes** de cada unidade e envia **convite por e-mail**.
   - Visão de toda a rede do município; não atua em casos.
2. **Gerente de Unidade.**
   - Aceita o convite, cadastra os **Profissionais** da sua unidade e envia **convite com link**.
   - **Distribui** as ações/sinalizações que chegam à fila da unidade (atribui a um profissional). Mantido **simples e manual** — uma fila, um botão de atribuir.
3. **Profissional.**
   - Aceita o convite por link, atua nos casos da sua unidade/território.
   - Pode ser **Referência Técnica (RT)** de casos específicos.
   - **Ao aceitar um caso/sinalização, é responsável por preencher prazo, frequência e reavaliação das ações da sua unidade** — não basta "aceitar o caso". A unidade que aceita assume o compromisso temporal.

**Referência Técnica (RT):** papel reconhecido na prática do SUS/SUAS. Cada caso (paciente) tem **uma RT fixa**, dona do PTS. É quem **valida e encaminha** as sugestões críticas da IA, **e acompanha o cumprimento das metas pactuadas**. O sistema reflete a realidade do serviço, não inventa um "criador" genérico.

**RBAC efetivo:** profissional só acessa casos da sua **unidade/território**; Dimensões do caso são compartilhadas entre as esferas envolvidas naquele caso; relato-fonte bruto restrito à esfera de origem.

---

## 5. Fluxo de funcionamento (o miolo do produto)

Regra mestra: **humano-no-loop sempre. A IA sugere; um humano pactua — e o usuário participa.** Nenhum encaminhamento clínico/social sai sozinho — isso é risco jurídico, risco clínico e mata a confiança do profissional. E nenhum PTS se pactua sem o sujeito (ver 5.9).

### 5.1. Severidade graduada
- **Crítico:** passa pela **RT** para validação antes de qualquer encaminhamento.
- **Rotineiro:** entra direto na **fila da unidade destino** como sugestão, sem travar na RT.

### 5.2. Fluxo crítico (exemplo CAPS → CRAS)
1. Profissional do CAPS faz uma anotação / chega um dado novo na ingestão.
2. **IA processa**, atualiza o **estado** do caso e as Dimensões, e gera uma **sugestão de ação** (rascunho) — sem expor relato bruto.
3. Sendo crítica, dispara **alerta à RT do caso** (in-app + e-mail).
4. **RT revisa.** Concordando, **encaminha à unidade CRAS de referência do território** — para a **unidade (papel)**, nunca a uma pessoa nominal (rotatividade no serviço público gera "ação órfã" se endereçada a indivíduo que sai).
5. Cai na **fila da unidade CRAS**. O **gerente distribui** a um profissional.
6. Vira **Ação com responsável, prazo, frequência e data de reavaliação** (obrigatórios — ver 5.6); entra no loop de evolução e de semáforo, **visível às duas esferas**.

> **Importante:** este fluxo (rede articulando) é a **reunião de articulação**. A pactuação efetiva das metas do PTS exige a **reunião de PTS, com o usuário presente** (ver 5.9). A rede propõe; o sujeito pactua.

### 5.3. Por que "unidade, não pessoa"
Encaminhar ao papel/unidade evita ação órfã e reflete como os serviços operam. A pessoalização acontece **dentro** da unidade, pela mão do gerente.

### 5.4. Caixa de entrada
Cada unidade tem uma fila/caixa de sinalizações. Cada profissional vê suas ações atribuídas. A RT vê os alertas críticos que aguardam validação **e os alertas de descumprimento dos seus casos**. A fila prioriza os itens **vermelhos** (atrasados). UX: poucos estados, ações de um clique (validar, encaminhar, atribuir, evoluir, **reavaliar**, **abrir busca ativa**).

### 5.5. Roteamento inteligente pela rede (o ponto-ouro: descentralizar o CAPS)
**Problema real:** hoje tudo sobra para o CAPS porque ninguém mapeia que **cada necessidade tem um componente certo da rede**. A IA resolve isso se conhecer o mapa da rede.

**Catálogo de componentes** — o sistema modela os serviços por **tipo/componente**, não como "unidade genérica". Referências:

- **RAPS — Rede de Atenção Psicossocial** (Portaria GM 3.088/2011), 7 componentes:
  1. **Atenção Básica** — UBS, NASF (Núcleo de Apoio à Saúde da Família), Consultório na Rua, Centros de Convivência e Cultura.
  2. **Atenção Psicossocial Estratégica** — CAPS (em suas modalidades).
  3. **Urgência e Emergência** — SAMU 192, Sala de Estabilização, UPA 24h e portas hospitalares.
  4. **Atenção Residencial de Caráter Transitório** — Unidade de Acolhimento, Serviço de Atenção em Regime Residencial.
  5. **Atenção Hospitalar** — enfermaria especializada em Hospital Geral, serviço hospitalar de referência.
  6. **Desinstitucionalização** — Serviços Residenciais Terapêuticos, Programa de Volta para Casa.
  7. **Reabilitação Psicossocial** — geração de trabalho e renda, empreendimentos solidários, cooperativas sociais.
- **SUAS** — CRAS (proteção básica/PAIF), CREAS (proteção especial/PAEFI), Unidades de Acolhimento, serviços socioeducativos.

**Roteamento por necessidade → componente correto.** A IA deixa de sugerir "manda pro CAPS/CRAS" genérico e passa a mapear o tipo de necessidade ao componente adequado. Exemplos:
- pessoa em situação de rua → **Consultório na Rua** (Atenção Básica), não CAPS.
- pós-internação sem moradia → **Atenção Residencial Transitória / Acolhimento**.
- estabilização clínica aguda → **Urgência/Emergência (UPA/SAMU)**.
- geração de renda / reinserção → **Reabilitação Psicossocial**.
- vulnerabilidade social da família → **CRAS/PAIF**; violação de direitos → **CREAS/PAEFI**.
- **descompensação clínica de comorbidade (ex.: diabetes/hipertensão) em paciente psíquico → Atenção Básica (UBS/eSF), não vaga psiquiátrica.** O sistema deve reconhecer que a condição clínica que desestabiliza o quadro psíquico é **vaga clínica**, e pactuar acompanhamento da eSF (visita, aferição, revisão de receita) — não tratá-la como problema do CAPS.

Isso enriquece o motor de sinalização (5.1–5.4): o encaminhamento vira **"componente certo da rede"**, distribuindo o caso pela rede em vez de concentrá-lo no CAPS. O humano-no-loop permanece — a IA propõe o componente, a RT confirma o destino.

**No protótipo:** já incluir a IA **roteando a partir do texto bruto** dos relatos fictícios — é instrução/regra para a IA e impressiona ao vivo. **Ressalva:** com relatos fictícios controlados o acerto é alto; na operação real, texto livre variado faz a IA errar mais do que parece. Portanto, **a RT sempre confirma/corrige o componente sugerido com um clique** — nunca apresentar como roteamento automático infalível.

### 5.6. Pactuação de ação exige prazo fechado (regra dura)
Uma ação **não pode ser pactuada** sem: `data_inicio`, `prazo_fim`, `frequencia` e `data_proxima_reavaliacao`. A validação (Zod + React Hook Form) bloqueia o submit e exibe mensagem educativa: *"Toda ação pactuada precisa de prazo, frequência e data de reavaliação — sem isso vira rol de atividades, não PTS."*

Isso elimina o problema das ações abertas ("sessões quinzenais" sem horizonte). Toda meta é **factível de reavaliar**: tem começo, cadência, horizonte e data marcada de revisão. Exemplo de meta bem-formada: *"passou na unidade em 01/06, próximo retorno 01/07, acompanhamento por 4 meses até estabilização do quadro; reavaliação mensal."*

### 5.7. Semáforo de cumprimento e alertas de descumprimento
Cada ação exibe um **`status_temporal` derivado**, recalculado pelo motor de prazos:
- **Verde:** em dia / cumprida no prazo.
- **Amarelo:** aproximando do vencimento (janela configurável).
- **Vermelho:** vencida / não cumprida / sem comparecimento no período.

**Alertas escalonados de não comparecimento:** a checagem temporal dispara alertas em marcos (referência: **1 mês, 2 meses, 3 meses** de não cumprimento). Cada disparo:
1. notifica a RT/profissional responsável (in-app + e-mail via Resend);
2. **gera uma "ação de busca ativa" sugerida** (humano-no-loop) — o sistema não apenas registra "não compareceu", ele **responde à pergunta "e quais as ações quando ele não compareceu?"**;
3. entra no mesmo motor de sinalização da seção 5 (crítico → RT; rotineiro → fila), sem criar sistema paralelo.

**Por que isso importa:** sem busca ativa, o paciente "vai duas vezes e some", e só reaparece descompensado na UPA. O alerta é o mecanismo que materializa a tese de valor — antecipar a crise antes da reinternação.

### 5.8. Classificação de risco por horizonte temporal (intensivo → semestral → anual)
O Caso/Plano carrega `nivel_intensidade`: `intensivo` / `manutencao_semestral` / `manutencao_anual` / `alta_continuidade`. A cadência de reavaliação deriva do nível:
- `intensivo` → reavaliação **mensal** (tipicamente o primeiro trimestre);
- `manutencao_semestral` → reavaliação a cada 6 meses;
- `manutencao_anual` → reavaliação anual.

Quando todas as metas do período são cumpridas, o sistema **sugere "esticar"** o intervalo (ex.: trimestre intensivo cumprido → propor manutenção semestral). **Humano-no-loop:** o sistema propõe, a RT confirma.

**Desafogo na UI:** casos em `manutencao_*` saem da fila/tela de cuidado intensivo e vão para uma visão menos quente. A classificação de risco vira ferramenta de gestão de carga — não tudo no mesmo balaio.

**Fim do PTS:** a "alta por continuidade" é estado terminal explícito, alcançável após cumprimento sustentado (ex.: ~1 ano em manutenção cumprida). O caso é **arquivado com trilha**, nunca deletado.

### 5.9. Protagonismo do usuário — PTS não existe sem o sujeito
**Princípio inegociável:** para sujeito de direito com cognição preservada, **não existe PTS sem o usuário presente na pactuação**. Articular a rede e depois "apresentar o pronto" ao usuário **não é PTS** — é imposição. As metas têm que refletir o que o sujeito **pode** e **quer** (o real, não só o ideal).

**Dois tipos de encontro, distintos no modelo:**
- **Reunião de articulação de rede (`articulacao_rede`):** discute o caso antes de propor; pode ocorrer sem o usuário.
- **Reunião de PTS (`reuniao_pts`):** **exige presença do usuário** (ou família/representante na exceção abaixo). É onde as metas são efetivamente pactuadas.

**Gate de ativação do Plano:** um PTS **não sai de rascunho/proposta para `ativo`/`pactuado`** sem `participacao_usuario` preenchido:
- `presente` — o sujeito participou;
- `representado_familia` — caso pediátrico, a família representa;
- `dispensado_por_incapacidade` — **só** quando há rebaixamento/déficit cognitivo instalado, **com justificativa obrigatória**. Nesse caso a rede pode se responsabilizar.

Mensagem de bloqueio: *"PTS não existe sem o usuário. Registre a participação do sujeito (ou família/representante) antes de ativar."*

**Aceite por meta:** cada meta carrega `aceite_usuario` (`aceita` / `recusa` / `repactuar`). Ações recusadas pelo usuário **não** são pactuadas como adesão — são repactuadas. (Ex.: oficina de marcenaria que ele nunca frequenta → não serve, repactuar; não impor mudança de profissão ou afastamento de filhos que o sujeito recusa.)

---

## 6. Camada de IA (a inteligência do negócio)

1. **Entrada (ingestão):** a IA lê **todo** o dado-fonte das duas redes (sensível, bruto).
2. **Derivação:** produz as **Dimensões** — fragilidades e potencialidades — aplicando a **regra fixa de sensibilidade** (Psíquico/conteúdo sensível sai abstraído).
3. **Indicação seletiva de PTS:** a IA identifica **quais casos precisam de PTS** (recorrentes, travados, de risco — ex.: reinternações repetidas) e sinaliza. **PTS é para casos críticos, não para todos** — o gatilho deve permanecer seletivo.
4. **Proposição:** cruza dimensões e **sugere** Objetivos → Metas → Ações intersetoriais, cada ação com esfera/unidade responsável, **e com sugestão de prazo, frequência e horizonte** (que o humano fecha na pactuação).
5. **Saída = sugestão, não decisão:** toda proposta é rascunho; a RT/profissional **pactua ou descarta**, e o usuário participa da pactuação. A escrita final é sempre humana — mantém o sistema fora da decisão clínica automatizada.
6. **Sinalizações inteligentes:** regras/IA disparam alertas cruzados (ex.: risco de reinternação, **descumprimento de prazo, não comparecimento**) à unidade da outra esfera, sempre via o fluxo humano-no-loop da seção 5.
7. **Rastreabilidade:** registrar **quais dados embasaram cada sugestão** (auditável), sem expor o dado sensível a quem não pode vê-lo.

---

## 6B. Geração de documento legal (PIA/PTS formal em PDF)

Necessidade real: juízes, Ministério Público e Conselho Tutelar solicitam o **PIA** ou o **PTS formal** — documento extenso, em parágrafos, com dinâmica familiar completa, histórico, compromissos e fundamentação. **As Dimensões não servem para isso** (são abstrações curtas de coordenação). O documento legal é outro artefato, com outra profundidade.

**Decisão: botão "Gerar minuta com IA" → profissional edita → assina → exporta PDF.** Princípios:

1. **A IA redige a minuta a partir do relato-fonte bruto** (rico), **não** das Dimensões (curtas). É a mesma fonte sensível da ingestão, agora usada para montar texto completo. Destino diferente: Dimensão = resumo compartilhado; documento legal = texto completo que **fica na esfera de origem** e só sai por decisão do profissional dono.
2. **Template correto por tipo de plano.** O PIA segue a estrutura legal do SUAS/ECA (avaliação interdisciplinar, compromissos da família, atividades previstas, medida e prazos). O PTS segue sua própria forma. **Cada contêiner (PTS/PIA) gera seu próprio documento, com seu template e seu dono** — mais um motivo para separá-los na operação real.
3. **Documento de compromisso da rede.** Quando um cidadão é chamado para PTS, o documento materializa os **compromissos pactuados por unidade/responsável, com prazos** — o registro formal a que cada ponto da rede se vincula. Serve de instrumento de cobrança ("vai cobrar, vai mostrar"), reforçando a responsabilização que o sistema já exerce via semáforo e alertas.
4. **Editor embutido.** A minuta cai num editor de texto no sistema; o profissional revisa, completa o que a IA não tinha e corrige.
5. **IA gera rascunho, nunca documento final automático.** Documento que vai a juízo carrega responsabilidade técnica (às vezes fé pública) e exige um humano assumindo autoria. O botão economiza ~80% da digitação; os ~20% de revisão são obrigatórios e são onde mora a responsabilidade legal.
6. **Sigilo no template.** A IA não despeja relato clínico/psiquiátrico dentro de um PIA que vai ao juízo da infância, salvo inclusão consciente pelo profissional daquela esfera.

**No protótipo:** opcional, mas é um forte argumento de venda ("o sistema redige o PIA para o juiz em segundos, o técnico só revisa"). Se incluir, basta um caso gerando uma minuta editável e exportável em PDF.

## 6C. Uso seguro da IA (Google Gemini)

Modelo local é inviável (sem CPU/GPU/infra). Decisão: Google Gemini via API. O cuidado de LGPD se estrutura em três camadas:

1. **Tokenização de identificadores (não criptografia).** O CPF/CNS/nome nunca saem do servidor. Antes de enviar: substituir identificadores diretos por um rótulo neutro descartável (ex.: `Paciente_4F2A`), guardando no banco local o vínculo `4F2A → cidadão real`. Enviar à IA apenas o texto pseudonimizado + o token. A IA responde referenciando `Paciente_4F2A`. No backend, reassociar o token ao cidadão real. Pseudonimizar **reduz, não elimina** o risco — o conteúdo sensível vai junto; o vínculo identidade↔token vive só no servidor.
2. **Tier de não-treino + DPA.** Usar o tier/configuração da API que **não usa os dados para treino**, com Data Processing Agreement assinado.
3. **Minimização.** Enviar à IA apenas o necessário para a tarefa; nada de "despejar tudo".

Exigências da operação real; o protótipo usa dados fictícios.

---

## 7. As três telas e o roteiro de demonstração

*(mantém o roteiro split "antes/depois" do plano original; abaixo, o roteiro ajustado ao novo fluxo de cuidado.)*

**Caso-âncora (dona Maria, 51 anos):** conhecida na UPA, transtorno bipolar, mora sozinha, três internações de emergência em dois anos; comorbidades clínicas (diabetes/hipertensão) que descompensam o quadro. Cada internação custa caro e não resolve o problema crônico.

**Roteiro:**
1. A IA, lendo os relatos fictícios, **identifica que o caso é recorrente e travado** e que ações avulsas não bastam → **indica abrir um PTS** (gatilho seletivo).
2. A unidade que acompanha agenda uma **reunião de articulação de rede** (CAPS, UBS, CRAS, Defensoria) — discute o caso.
3. **Reunião de PTS com a dona Maria presente:** pactuam-se metas integradas — cada ação com responsável, prazo, frequência e reavaliação; cada meta com o aceite dela.
4. **Split antes/depois:** alterar um fator numa fonte fictícia (ex.: glicemia descompensada) atualiza o estado e **dispara sinalização cruzada** para a Atenção Básica (vaga clínica, não psiquiátrica), na mesma tela.
5. **Semáforo ao vivo:** uma ação sem comparecimento "fica vermelha"; o sistema dispara alerta (1/2/3 meses) e propõe **busca ativa** — antes de a paciente reaparecer na UPA.
6. **Reavaliação e desafogo:** trimestre cumprido → o sistema propõe esticar para manutenção semestral; o caso sai da fila intensiva.

A frase de fechamento: *se dependêssemos só da saúde, a dona Maria seguiria surtando e voltando à UPA; só da assistência, ficaria sem remédios. Com a governança intersetorial — CAPS, CRAS, UBS, Defensoria pactuando metas na mesma mesa, com a usuária — descentraliza-se o cuidado, garante-se eficiência pública e constrói-se uma cidade que acolhe de verdade.*

---

## 8. Fases de implementação

### FASE 0 — Fundação
- Projeto Next.js + Supabase + Auth + RLS; multi-tenant por município; shadcn/ui.
- Modelo de dados da seção 3 (incluindo Reavaliação, Encontro, campos temporais e de participação do usuário).

### FASE 1 — Caso compartilhado e ciclo de vida temporal da ação
- Caso/Plano compartilhado; 5 Dimensões read-only.
- **Tela de Ação com campos temporais obrigatórios (5.6) e aceite do usuário.**
- **Entidade Reavaliação + agendamento da próxima reavaliação.**
- **Pronto quando:** dois profissionais (Saúde e Assistência) pactuam ações **com prazo, frequência e reavaliação**, veem as ações um do outro, e não conseguem pactuar uma ação sem prazo fechado.

### FASE 2 — Motor de Sinalização Cruzada + Motor de Prazos
- Catálogo de componentes (RAPS + SUAS) mapeado a tipos de necessidade (5.5).
- Severidade graduada; roteamento inteligente; fila + distribuição pelo gerente.
- **Semáforo verde/amarelo/vermelho por ação (5.7).**
- **Alertas escalonados de descumprimento (1/2/3 meses) gerando busca ativa sugerida (5.7).**
- **Classificação de risco por horizonte (intensivo → semestral → anual → alta) (5.8).**
- Estados da sinalização e trilha de auditoria.
- **Pronto quando:** uma anotação gera sugestão → roteada ao componente certo → alerta à RT → encaminhamento à unidade → ação com prazo → e, se a ação atrasa, o sistema fica vermelho e dispara busca ativa; tudo auditado e visível às duas esferas.

### FASE 3 — Ingestão simulada + Camada de IA + Protagonismo do usuário
- Dois bancos fictícios + endpoint de ingestão como adapter; normalização → Dimensão derivada com regra fixa de sensibilidade.
- IA: lê tudo → deriva Dimensões → **indica PTS seletivamente** → sugere objetivos/metas/ações (com sugestão de prazo) → dispara sinalizações.
- Roteamento por texto bruto, com a RT confirmando em um clique.
- **Distinção reunião de articulação vs. reunião de PTS; gate de participação do usuário (5.9).**
- As três telas e o roteiro split antes/depois da seção 7.
- **[Opcional, forte para venda]** Botão "Gerar minuta" → PIA/PTS formal → editor → PDF (6B).
- **Pronto quando:** alterar uma fonte fictícia atualiza o estado no PTS e dispara sinalização cruzada na mesma tela; e um PTS não ativa sem registro de participação do usuário.

### FASE 4 — Segurança, LGPD e conformidade (transversal, contínua)
- Base legal e consentimento por ingestão; minimização; cifragem em repouso/trânsito; CPF/CNS tokenizados.
- Auditoria imutável; segregação por unidade/papel; regra fixa de sensibilidade do Psíquico testada.
- Política de retenção e expurgo.

---

## 9. Ordem e definição de "protótipo pronto para apresentar"

Ordem: **Fase 0 → Fase 1 → Fase 2 → Fase 3**, com a Fase 4 em paralelo desde o início.

**Protótipo pronto para o prefeito quando:**
1. Existe um caso com história (dona Maria) carregado nas duas fontes fictícias.
2. As três telas funcionam e o split antes/depois roda ao vivo.
3. Alterar um fator numa fonte atualiza o estado da IA e **dispara sinalização cruzada** instantânea.
4. O fluxo humano-no-loop (sugestão → RT valida → encaminha → gerente atribui) é demonstrável.
5. **As ações têm prazo, frequência e reavaliação; o semáforo funciona; uma ação atrasada dispara alerta e busca ativa.**
6. **O PTS exige a participação do usuário para ser ativado, e há distinção entre reunião de articulação e reunião de PTS.**
7. **A classificação de risco por horizonte (intensivo → semestral → anual) é demonstrável como ferramenta de desafogo.**
8. Hierarquia de acesso e visibilidade (Dimensões compartilhadas, relato-fonte restrito, Psíquico abstraído) estão visíveis e explicáveis.

---

## 10. Riscos e decisões a manter no radar
- **[Cuidado] PTS é produção de cuidado, não registro.** Sem prazo fechado, reavaliação e busca ativa, o sistema vira um "rol de atividades" — relato de caso, não PTS. Esta é a decisão-mãe da v2.
- **[Cuidado] PTS não existe sem o usuário.** Pactuar metas sem o sujeito (exceto criança/incapacidade justificada) descaracteriza o instrumento.
- **[Produto] Não deixar a IA decidir/encaminhar sozinha.** Humano-no-loop é regra, não opção.
- **[Confiança] Nunca vazar relato-fonte bruto entre esferas, nem em alertas.** Compartilha-se necessidade de coordenação, não o dado clínico.
- **[Engenharia] Adapter isolado.** Núcleo nunca conhece a fonte; troca fictícia→real sem tocar o domínio.
- **[Demo] História humana + split na mesma tela + semáforo ficando vermelho.** Sem isso, perde o impacto.
- **[Conformidade] Regra fixa de sensibilidade por dimensão**, não decisão da IA — previsível e auditável.
- **[Valor] Roteamento pelo componente correto da rede é o ponto-ouro.** Distribui o caso pela RAPS/SUAS (descentraliza o CAPS); comorbidade clínica é vaga clínica, não psiquiátrica.
- **[Valor] Seletividade do PTS.** A IA indica PTS para casos críticos, não para todos.
- **[Legal] PTS e PIA são planos distintos com bases legais próprias.** No protótipo, plano único; na operação real, separar. Cada plano gera seu próprio documento legal.
- **[Legal] Documento gerado por IA é minuta, nunca peça final automática.** Revisão e autoria humana obrigatórias antes de ir a juízo.
- **[LGPD] Gemini API com tokenização de identificadores + tier de não-treino + DPA.** Pseudonimizar reduz, não elimina o risco. Exigências da operação real; protótipo usa dados fictícios.

---

## OBSERVAÇÃO — Integração real (somente após fechar contrato)

> Tudo abaixo é **fase posterior**, fora do protótipo. Não desenvolver agora.

A maior vantagem do produto — e o argumento de venda — é a integração automática que unifica saúde e assistência em torno do cidadão. Ao fechar contrato, o município, **vendo essa vantagem, tende a fornecer acesso aos seus próprios sistemas**, onde os dados clínicos e psiquiátricos completos de fato residem (os sistemas municipais têm o dado bruto e detalhado; a rede federal só recebe o subconjunto que cada unidade envia a ela).

Caminhos de integração real, em ordem de viabilidade:

1. **Sistema municipal de saúde (prioritário).** É a fonte mais rica — contém os relatos clínicos completos de UBS, CAPS e UPA. Com o contrato, define-se o endpoint/forma de acesso autorizada. O adapter de produção substitui a fonte fictícia da Fase 3 **sem alterar o núcleo**.
2. **Sistema/base de assistência do município.** Fonte rica da Dimensão Social (composição familiar, vulnerabilidade, benefícios), via acesso autorizado sob base legal (Termo de Ciência e Responsabilidade / convênio).
3. **RNDS (Saúde, federal) — complementar.** Leitura sob o **CNES de um estabelecimento municipal credenciado** e seu **certificado A1 ICP-Brasil**. Útil como complemento/consolidação, **não** como fonte principal — não devolve o prontuário completo, apenas o que foi notificado à rede.
4. **CadÚnico (Assistência, federal) — verificação pontual.** A API federal disponível **não atende municípios** e retorna apenas três indicadores por CPF (cadastrado? baixa renda? atualizado?). Serve, no máximo, como verificação — nunca como fonte de perfil socioeconômico.

**Pré-requisitos de credenciamento (a iniciar quando o contrato avançar):** parceria formal com estabelecimento(s) credenciado(s); certificado A1 ICP-Brasil da entidade; instrumento jurídico de acesso e tratamento de dados (LGPD + base legal específica de cada rede). A integração é tanto um projeto **jurídico/de credenciamento** quanto técnico — e o protótipo foi desenhado para **não depender** disso, permitindo fechar contrato antes.

---

### Registro de versão
**v2** incorpora, como fonte da verdade, os ajustes derivados da validação com a especialista em PTS: ciclo de vida temporal da ação com prazo/frequência/reavaliação obrigatórios (5.6), semáforo e alertas de descumprimento com busca ativa (5.7), classificação de risco por horizonte temporal com desafogo (5.8), protagonismo do usuário com gate de ativação e distinção de reuniões (5.9), comorbidade clínica como vaga clínica no roteamento (5.5), seletividade do PTS (6.3) e documento de compromisso da rede (6B.3). O fundamento validado da v1 — mapeamento/consolidação da rede, roteamento por componente, humano-no-loop, sensibilidade por dimensão, separação PTS/PIA, stack técnica — foi preservado.
