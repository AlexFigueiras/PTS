# Plano de Implantação — Orquestrador Intersetorial de PTS/PIA

> Documento de engenharia e produto. Consolida todas as decisões tomadas ao longo do projeto.
> Objetivo: se tudo aqui for executado, você termina com **um protótipo apresentável e vendável**, e com a **fundação técnica reutilizável** para a operação real pós-contrato.

---

## 0. O que é o sistema (escopo estrito)

Um **orquestrador intersetorial de PTS (Projeto Terapêutico Singular) / PIA (Plano Individual de Atendimento)**. Ele articula o cuidado de um cidadão entre as redes de **Saúde** (UBS, CAPS, UPA) e **Assistência Social** (CRAS, CREAS) de um município.

O que ele **é**:
- Uma camada de **coordenação** entre esferas que hoje não se comunicam.
- Um leitor de dados das duas redes, que a **IA analisa** para montar um retrato do cidadão e **propor** objetivos, metas e ações intersetoriais.
- Uma ferramenta de **gestão do ciclo de vida das ações pactuadas** (quem faz o quê, prazo, andamento), com sinalização cruzada inteligente entre unidades.

O que ele **NÃO é**:
- Não é prontuário eletrônico (EHR). Não substitui o sistema clínico do município.
- Não envia dados ao governo federal. Todo "envio" é para o **próprio backend** (a inteligência da IA).
- Não faz digitação de prontuário clínico. A única escrita interativa em campo é o ciclo de vida de metas/ações.

**Tese de valor (a frase que vende):** *unificar saúde e assistência em torno do cidadão, antecipando crises (ex.: reinternação) e disparando articulação entre as unidades antes que o problema agrave.*

---

## 1. Decisões de arquitetura de informação (fundamento)

### 1.1. As cinco Dimensões
O PTS clássico (Política Nacional de Humanização) organiza o cuidado em quatro **momentos** — diagnóstico, metas, divisão de responsabilidades, reavaliação — e o diagnóstico olha três âmbitos: **orgânico, psicológico e social**.

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

- **PTS (Projeto Terapêutico Singular)** — instrumento da **Saúde** (Política Nacional de Humanização/SUS, forte no CAPS). Momentos: diagnóstico (orgânico/psíquico/social) → metas → divisão de responsabilidades → reavaliação.
- **PIA (Plano Individual de Atendimento)** — instrumento da **Assistência** (SUAS), com base legal própria: Lei 12.594/2012 (SINASE) e ECA art. 101 (serviços de acolhimento de crianças e adolescentes); usado na Proteção Social Especial (Resolução CNAS 109/2009). Estrutura mínima exigida em lei: resultados da avaliação interdisciplinar do estudo diagnóstico, compromissos assumidos pela família/responsáveis, e previsão das atividades a desenvolver — **centrado na família**, com **medida protetiva/legal e prazos de reavaliação obrigatórios**.

Ambos são interdisciplinares e já preveem articulação intersetorial por norma (o PIA convoca CAPS/UBS; o PTS convoca a Assistência). O sistema é exatamente a ponte que as duas normas pedem.

**Decisão de modelagem:** o caso é **um cidadão** sobre o qual podem existir **dois contêineres de plano** — um **PTS (dono: Referência Técnica da Saúde)** e um **PIA (dono: equipe de referência do CREAS/serviço)** — que **compartilham as mesmas 5 Dimensões** e trocam sinalizações. Não se fundem num plano só, para respeitar as duas bases legais.

**O que isso muda na prática (mínimo):**
- **Telas/formulários são praticamente idênticos.** A tela de Ação (responsável, prazo, status) é **a mesma** para Saúde e Assistência. As 5 Dimensões são as mesmas e compartilhadas.
- **Muda apenas:** (a) uma **aba/etiqueta** PTS vs. PIA no caso; (b) **dois donos** em vez de um (alerta de origem clínica → RT da Saúde valida; de origem assistencial → referência do CREAS valida); (c) **um campo extra só no PIA** — medida protetiva/legal + data de reavaliação obrigatória.

**No protótipo:** usar **plano único compartilhado** — demonstra a integração de forma mais limpa para o gestor e é mais simples. A separação PTS/PIA entra na **operação real**, quando a conformidade do SUAS passa a importar.

---

## 2. Arquitetura técnica alvo

```
┌──────────────────────────────────────────────────────────────────┐
│  CLIENTE (web/mobile) — online (sem offline)                       │
│  • Dimensões = cartões READ-ONLY (contexto da IA, compartilhado)   │
│  • Único módulo de ESCRITA: Metas & Ações (ciclo de vida)          │
│  • Caixa de entrada de Sinalizações / Alertas                      │
└──────────────▲───────────────────────────────┬───────────────────┘
               │ requisições                    │
┌──────────────┴───────────────────────────────▼───────────────────┐
│  BACKEND (Supabase + Next.js)                                     │
│  • Domínio: Caso/Plano, Dimensões, Objetivos, Metas, Ações        │
│  • Auth + RBAC via RLS (Admin → Gerente → Profissional; RT dona)  │
│  • Motor de Sinalização Cruzada (humano-no-loop)                  │
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
- **Zod** — validação na borda (entradas, payloads de ingestão, formulários).
- **React Hook Form** — formulários (tela de Ação, onboarding).
- **Resend** — e-mails transacionais dos convites em cascata (Admin → Gerente → Profissional).

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
- **Caso:** cidadão + município + território + **`case_status`** (`radar` / `observacao` / `acompanhamento` / `pts_ativo` / `pia_ativo` / `alta` / `evasao` / `transferencia` / `obito` / `recusa`) + **dono mínimo** (a partir de `acompanhamento`). É o agregador; sobre ele pendem um ou dois **Planos**. Ciclo de vida completo no §4B.
- **Candidato (observação):** sinalização automática da IA que eleva `radar → observacao` — gatilho que disparou (G1/G2/G3), eventos/dados que o compõem, esferas envolvidas, **porquê obrigatório**, prazo de validade, status (pendente / aceito / descartado / expirado-escalado). Fila por unidade, não por pessoa.
- **Plano:** tipo (**PTS** ou **PIA**), dono (PTS → Referência Técnica da Saúde; PIA → equipe de referência do CREAS), e — **só no PIA** — medida protetiva/legal + data de reavaliação obrigatória. *No protótipo: um único Plano compartilhado.*
- **Dimensão:** tipo (Saúde/Social/Psíquico/Jurídico/Educação), payload **derivado** read-only, nível de sensibilidade (regra fixa), origem (fonte + timestamp), hash de versão. **Compartilhada pelo caso** (ambos os planos a leem).
- **Objetivo → Meta → Ação:** hierarquia dentro de cada Plano.
  - **Ação** é a única entidade de escrita em campo: unidade responsável, profissional atribuído (quando houver), prazo, status (pactuada / em andamento / concluída / bloqueada), evolução (notas). **Tela idêntica para Saúde e Assistência.**
- **Documento legal:** minuta gerada por IA (PIA ou PTS formal) a partir do relato-fonte, editável pelo profissional dono, versionada, exportável em PDF, restrita à esfera de origem.
- **Consentimento / Termo de autorização:** registro da base legal para o cidadão existir no sistema e ter dados cruzados entre esferas (§4B T1). No início da operação: termo escrito assinado pelo cidadão, registrado no caso.
- **Recusa:** flag/estado registrado que **trava novos disparos** daquele tipo, sem apagar o radar (§4B T2).
- **Relato/Evento de ingestão:** a entrada que a IA processa. **Um evento gera N Sinalizações** (§5.6).
- **Sinalização cruzada:** evento da IA entre unidades — referência ao relato de origem, **um único componente/unidade destino** (não pessoa), tipo de necessidade roteado, **prioridade (`imediata`/`pactuada`)**, motivo abstrato, status (`sugerida` / `confirmada-pelo-autor` / `descartada` / `aguardando_validacao_rt` / `encaminhada` / `recebida` / `em_tratamento` / `resolvida`). **Cardinalidade 1 relato → N sinalizações**, cada uma confirmada/descartada individualmente. Gate parametrizado por **(prioridade + papel)** — ver §5.1/§5.6.
- **Auditoria:** trilha imutável — quem viu/alterou/confirmou/encaminhou/exportou o quê e quando.

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

**Referência Técnica (RT):** papel reconhecido na prática do SUS/SUAS. Cada caso (paciente) tem **uma RT fixa**, dona do PTS. É quem **valida e encaminha** as sinalizações da via `pactuada` (§5.1); na via `imediata` recebe ciência sem bloquear. O sistema reflete a realidade do serviço, não inventa um "criador" genérico.

**RBAC efetivo:** profissional só acessa casos da sua **unidade/território**; Dimensões do caso são compartilhadas entre as esferas envolvidas naquele caso; relato-fonte bruto restrito à esfera de origem.

---

## 4B. Ciclo de vida do caso (a espinha dorsal do produto)

> Esta é a parte mais importante do sistema: como uma pessoa entra, sobe os degraus de atenção e sai. As regras abaixo são especificação de implementação.

### Princípio mestre (rege tudo)
**O sistema é generoso para observar e parcimonioso para agir.** Observar é barato (registro + detecção de padrão) e é onde mora a inteligência; agir é caro (tempo humano, IA generativa, confiança da equipe, exposição jurídica). Toda transição mantém essa assimetria: o radar é largo e automático; cada degrau acima custa mais e exige mais decisão humana. Inverter isso — agir a cada toque — é o modo de falha que mata o sistema, por afogamento de alertas de baixo valor.

**Corolário:** o sinal está na composição **temporal e cruzada** de eventos, nunca no evento isolado. Um toque na rede é dado; um padrão de toques é informação.

### Estados (`case_status`)
Cinco de progressão + saída. Um caso ocupa um estado por vez. Subida monotônica em custo: só `radar → observacao` é automática; toda subida a partir de `observacao` exige decisão humana registrada. Descida a estados de saída pode ocorrer de qualquer estado ativo.

### Estado 1 — `radar`
Pura presença: a pessoa tocou a rede; o sistema sabe que existe e passa a observá-la, sem que nada aconteça com ninguém.
- **R1.1** Todo contato com a rede cria/atualiza um caso em `radar`, se não houver caso ativo.
- **R1.2** Se já existe caso em estado mais alto, o contato **não rebaixa** — alimenta o existente e dispara a iluminação (T3).
- **R1.3** Entrada é **silenciosa**: nenhuma notificação a profissional. Custo de atenção humana = zero.
- **R1.4** A IA acumula eventos e roda os detectores de padrão (assíncrono, barato). Única atividade do estado.
- **R1.5** A orientação pontual que o serviço daria acontece normalmente fora do sistema; o sistema não a substitui.
- **R1.6** Não cria tarefa, não encaminha, não abre dimensão. Radar é observação, não intervenção.

### Estado 2 — `observacao`
A IA **suspeita** de necessidade e levantou a mão, mas **nenhum humano assumiu**. Limbo deliberado: amortecedor entre o automático e o humano.

**Gatilhos de elevação `radar → observacao` (automáticos, nunca por evento isolado):**
- **G1 — Recorrência.** N ocorrências da mesma necessidade em janela T (ex.: 3 visitas à UPA pelo mesmo motivo em 60 dias). A repetição revela que a orientação pontual não resolveu.
- **G2 — Abandono/descontinuidade.** Expectativa registrada (acompanhamento, consulta, tratamento) **não cumprida** no prazo. Invisível ao profissional — ninguém nota quem *não* veio; o sistema nota. Alto valor preventivo.
- **G3 — Cruzamento entre esferas.** Coincidência temporal de fatores de risco de **esferas diferentes** (ex.: falta na UBS + perda de benefício no CRAS). O sistema é a única entidade que vê os dois lados — o valor está na **interseção**. É o ouro do produto **e** o de maior sensibilidade jurídica (depende de T1).

**Regras:**
- **R2.1** Toda elevação gera um **candidato** com **porquê explícito obrigatório** (qual gatilho, quais dados, quais esferas). Sem porquê, não há candidato.
- **R2.2** Candidato roteado à fila de observação da **unidade (papel)** pertinente, não a pessoa nominal.
- **R2.3** `observacao` **não tem dono fixo** — é fila, não atribuição.
- **R2.4** Calibração conservadora obrigatória (ver Calibração).
- **R2.5** Cada aceite/descarte **realimenta a calibração**.
- **R2.6 (expiração)** Candidato não-tratado tem prazo de validade (ex.: 30 dias). Ao expirar, **escala para o Gerente da unidade** decidir — não some nem fica eterno na fila.
- **R2.7** Sem expiração+escalonamento, a observação vira cemitério de alertas não-lidos.

**Saídas:** `→ acompanhamento` (humano assume) · `→ radar` (descarte com motivo) · `→ recusa` (T2).

### Estado 3 — `acompanhamento`
Um serviço **assumiu** o caso. Há responsável mínimo, intervenção real, mas **sem** PTS/PIA formal. É onde a maioria dos casos legítimos deve viver.
- **R3.1** Profissional clica "assumir caso"; isso cria o **dono mínimo** no mesmo ato.
- **R3.2** Não existe `acompanhamento` órfão.
- **R3.3** Racional do dono mínimo: sem responsável nesta fase, os casos escorrem na captação precoce — a de maior valor preventivo.
- **R3.4** Permite ações simples (orientação, encaminhamento pontual, agendamento) sem a maquinaria do PTS.
- **R3.5** A IA pode **sugerir** elevação a PTS/PIA, mas **não eleva sozinha**.
- **R3.6** Já participa da iluminação (T3) e do motor de sinalização cruzada (§5).

### Estado 4 — `pts_ativo` / `pia_ativo`
Plano formal: 5 dimensões, objetivos de curto/médio/longo prazo, ações, **pactuação com o cidadão**. Estado mais caro; compromete uma equipe.

**Por que a IA sugere mas não cria:**
- **R4.1** PTS é compromisso de equipe, não documento — a IA não gerencia a equipe, logo não a aloca.
- **R4.2** PTS aberto por IA nasceria órfão ou viraria papel morto.
- **R4.3** A triagem humana é o controle de custo natural (PTS é caro em tempo humano + IA pesada).
- **R4.4** A IA **sinaliza** candidatura a PTS (com porquê); a decisão de criar é humana.
- **R4.5** Decisão deliberada: profissional clica "iniciar PTS/PIA".

**Criação em dois tempos (protagonismo do cidadão sem atrito):**
- **R4.6 — Tempo 1 (pré-produção assíncrona):** ao acionar, a IA preenche as 5 dimensões, levanta vulnerabilidades/potencialidades e propõe objetivos e ações **antes** do encontro, em background, **sem ninguém esperando**.
- **R4.7 — Tempo 1.5 (revisão técnica):** a RT revisa e ajusta a minuta.
- **R4.8 — Tempo 2 (pactuação):** o encontro com o cidadão é para **discutir, concordar, corrigir e assinar** — não para esperar a IA carregar.
- **R4.9** Gerar a análise ao vivo na frente da pessoa é atrito no pior momento; dois tempos respeitam o protagonismo sem transformar a consulta em tela de loading.
- **R4.10** PTS e PIA são contêineres distintos (§1.4), compartilhando as 5 dimensões.
- **R4.11** Opera o motor de sinalização, fan-out e gate por prioridade (§5).
- **R4.12** Reavaliação periódica obrigatória (momento "reavaliação" do PTS; prazos legais do PIA).

### Estado 5 — Saída
Todo caso precisa de caminho de saída tão desenhado quanto o de entrada; sem isso, "casos ativos" infla e a métrica mente.
- **R5.1** `alta` — objetivos atingidos; registra motivo; decisão da RT/equipe.
- **R5.2** `evasao` — perdeu-se o contato. Estado explícito; pode realimentar G2 se reaparecer.
- **R5.3** `transferencia` — mudou de município/competência; encerra local com handoff.
- **R5.4** `obito`.
- **R5.5** `recusa` — a pessoa recusou (T2).
- **R5.6** Saída **não apaga** o caso: histórico fica para auditoria e padrão futuro (alta seguida de retorno em 30 dias é, ela mesma, sinal).
- **R5.7** Novo contato relevante pode **reabrir** o caso, respeitando recusa registrada.

### Regras transversais (qualquer estado)
- **T1 — Consentimento para existir no sistema.** Distinto do consentimento clínico. O cruzamento intersetorial exige base legal — primeira coisa que um promotor questiona. **No início da operação: termo escrito de autorização, assinado pelo cidadão e registrado no caso** (mecanismo simples para legalizar o cruzamento; evolui depois). No protótipo (dados fictícios) é irrelevante; na operação real é bloqueante para o gatilho G3.
- **T2 — Recusa do cidadão.** Recusa é registrada e respeitada; **trava novos disparos** daquele tipo. Não apaga o radar (a pessoa continua existindo), mas impede a ação.
- **T3 — Iluminação de caso existente.** Pessoa com caso em `acompanhamento`/`pts_ativo` que toca qualquer ponto da rede: o profissional daquele ponto vê na hora que há caso ativo e **quem é a RT**. Sem isso, atende no escuro e duplica conduta. Metade do valor do sistema.
- **T4 — Auditoria de toda transição.** Cada mudança de estado e decisão humana é registrada (quem, quando, com base em quê).
- **T5 — Humano-no-loop exceto `radar → observacao`.** A detecção de padrão que eleva ao radar→observação é a única transição automática; todo o resto exige decisão humana registrada.

### Calibração (a variável mais perigosa)
- **C1** Limiares dos gatilhos (N, T; prazos; janelas) **parametrizáveis por município**, não hard-coded.
- **C2** **Começar conservador:** sinalizar de menos. Mais fácil afrouxar depois de ganhar confiança do que recuperar credibilidade depois de virar "caixa de spam".
- **C3** Baixo demais → enxurrada → equipe ignora → morre de irrelevância. Alto demais → só o óbvio → perde a captação precoce. A calibração navega entre os dois fracassos.
- **C4** As decisões humanas sobre candidatos (R2.5) são o sinal de realimentação.

### Nota de protótipo
- **P1** O modelo de 5 estados é a **arquitetura real do fluxo** — consta no plano por inteiro.
- **P2** A **demo encena direto `acompanhamento → pts_ativo`** (caso já em acompanhamento; um fator muda; a IA reage e o PTS responde). O prefeito não precisa atravessar a máquina de estados inteira — precisa ver a dona Maria e a sinalização cruzada. O modelo profundo protege o produto na operação; a demo mostra o momento mágico.

---

## 5. Fluxo de funcionamento (o miolo do produto)

Regra mestra: **humano-no-loop sempre. A IA sugere; um humano pactua.** Nenhum encaminhamento clínico/social sai sozinho — isso é risco jurídico, risco clínico e mata a confiança do profissional.

### 5.1. Prioridade graduada e os dois portões humanos
**O gate segue o TEMPO, não a gravidade.** Gravidade (quão sério) e urgência (quão rápido tem de andar) são eixos distintos; o plano antes os fundia e travava o caso grave na RT — o oposto do que a emergência exige (no caso grave-urgente, *esperar a RT é o próprio risco*). Cada Sinalização carrega uma **prioridade** que a IA propõe e o **autor do relato confirma ou corrige**:

- **`imediata`** (urgência/emergência → UPA/SAMU): o autor confirma e a Sinalização vai **direto à tela da unidade destino**. A **RT é notificada, não bloqueia** — encaminhamento rápido com rastro, não cego. *A via prepara a unidade receptora; **não substitui** o acionamento direto do SAMU 192 numa emergência real.*
- **`pactuada`** (não-urgente → UBS, CRAS de rotina, etc.): o autor propõe → entra em **"aguardando validação da RT"** → RT confirma → encaminha. As duas camadas de coordenação, onde a validação agrega qualidade sem custo de tempo.

Os **dois portões humanos** (humano-no-loop preservado em ambos os caminhos):
- **Portão 1 — autor do relato (origem).** Vê as sugestões inline e **confirma/descarta cada uma**, ajustando a prioridade se a IA errou. Decide *se* a necessidade vira encaminhamento. Sempre presente.
- **Portão 2 — RT do caso.** Só na via **`pactuada`**. Na via `imediata` a RT recebe ciência (auditoria), não trava.

> Quando o autor do relato **é** a RT do caso, os dois portões colapsam num só clique.

O gate é modelado como função de **(prioridade + papel)**, parametrizável — assim a política do protótipo (autor decide; RT só no `pactuada`) e qualquer política mais estrita futura são **troca de regra, não reescrita da FSM**.

### 5.2. Fluxo, por via
**Via `imediata`** (ex.: CAPS detecta quadro agudo → UPA/SAMU):
1. Profissional do CAPS registra o relato; a IA processa e gera sugestão(ões) com prioridade `imediata` proposta.
2. **Autor confirma** (portão 1), ajustando prioridade se necessário.
3. Sinalização vai **direto à tela da unidade destino**; **RT notificada** (ciência + auditoria), sem bloquear.

**Via `pactuada`** (ex.: CAPS → CRAS de rotina):
1. Relato → IA gera sugestão(ões) com prioridade `pactuada`.
2. **Autor confirma** (portão 1).
3. Entra em **"aguardando validação da RT"**; **RT valida** (portão 2) e **encaminha à unidade de referência do território** — para a **unidade (papel)**, nunca pessoa nominal (rotatividade gera "ação órfã").
4. Cai na **fila da unidade**; o **gerente distribui** a um profissional.

Em ambas as vias, a sinalização vira **Ação** com responsável e prazo, e entra no loop de evolução **visível a todas as unidades do caso**.

### 5.3. Por que "unidade, não pessoa"
Encaminhar ao papel/unidade evita ação órfã e reflete como os serviços operam. A pessoalização acontece **dentro** da unidade, pela mão do gerente.

### 5.4. Caixa de entrada
Cada unidade tem uma fila/caixa de sinalizações. Cada profissional vê suas ações atribuídas. A RT vê os alertas críticos que aguardam validação. UX: poucos estados, ações de um clique (validar, encaminhar, atribuir, evoluir).

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

Isso enriquece o motor de sinalização (5.1–5.4): o encaminhamento vira **"componente certo da rede"**, distribuindo o caso pela rede em vez de concentrá-lo no CAPS. O humano-no-loop permanece — a IA propõe o componente, a RT confirma o destino.

**No protótipo:** já incluir a IA **roteando a partir do texto bruto** dos relatos fictícios — é instrução/regra para a IA e impressiona ao vivo. **Ressalva:** com relatos fictícios controlados o acerto é alto; na operação real, texto livre variado faz a IA errar mais do que parece. Portanto, **a RT sempre confirma/corrige o componente sugerido com um clique** — nunca apresentar como roteamento automático infalível.

### 5.6. Fan-out: um relato, múltiplos encaminhamentos simultâneos
Um único relato (ou evento de ingestão) pode revelar mais de uma necessidade ao mesmo tempo. A IA não escolhe um destino só: mapeia **cada** necessidade ao seu componente correto da rede (§5.5) e propõe **N encaminhamentos paralelos**. Ex.: paciente em atendimento no CAPS relata algo que a IA lê como (a) vulnerabilidade social da família → **CRAS/PAIF** e (b) quadro clínico agudo → **Urgência/Emergência (UPA/SAMU)**. O sistema propõe os dois de uma vez.

**Cardinalidade: 1 relato → N Sinalizações.** Cada Sinalização tem **um único destino**; o que muda é que **um evento gera várias Sinalizações**, cada uma com seu componente/unidade, **prioridade** (`imediata`/`pactuada`), e status próprios — confirmadas ou descartadas **individualmente**.

**Confirmação e gate por prioridade (revisa o §5.1):** o gate segue o **tempo**, não a gravidade. Cada Sinalização carrega prioridade `imediata` ou `pactuada`, proposta pela IA e **confirmada ou corrigida pelo autor** do relato:
- `imediata` (urgência/emergência → UPA/SAMU): autor confirma → vai **direto à unidade destino**; **RT notificada, não bloqueia**. Prepara a unidade receptora — **não substitui o SAMU 192**.
- `pactuada` (não-urgente → UBS, CRAS de rotina): autor propõe → **validação da RT** → encaminhamento. Duas camadas.

A **FSM da Sinalização** tem os dois ramos, com o gate **parametrizado por (prioridade + papel)** — endurecer a política na operação real não reescreve a máquina de estados. Estados:
`sugerida → (autor confirma)` → se `imediata`: `encaminhada` direto (RT notificada); se `pactuada`: `aguardando_validacao_rt → (RT) → encaminhada`. Depois, em ambas: `recebida → em_tratamento → resolvida`. Ramo alternativo: `descartada` pelo autor. Tudo auditado (§10).

**Caso compartilhado por N participantes:** conforme encaminhamentos são aceitos, o caso passa a ser compartilhado por **todos** os profissionais/unidades envolvidos — não só duas esferas. "Saúde e Assistência" é o piso, não o teto.

---

## 6. Camada de IA (a inteligência do negócio)

1. **Entrada (ingestão):** a IA lê **todo** o dado-fonte das duas redes (sensível, bruto).
2. **Derivação:** produz as **Dimensões** — fragilidades e potencialidades — aplicando a **regra fixa de sensibilidade** (Psíquico/conteúdo sensível sai abstraído).
3. **Proposição:** cruza dimensões e **sugere** Objetivos → Metas → Ações intersetoriais, cada ação com esfera/unidade responsável sugeridas. Um mesmo relato pode gerar **N sugestões paralelas**, uma por necessidade detectada (§5.6).
4. **Saída = sugestão, não decisão:** toda proposta é rascunho com **prioridade** sugerida; o **autor confirma/descarta e ajusta a prioridade** (portão 1) e, na via `pactuada`, a **RT valida** (portão 2). A escrita final é sempre humana — mantém o sistema fora da decisão clínica automatizada.
5. **Sinalizações inteligentes:** regras/IA disparam alertas cruzados (ex.: risco de reinternação) às unidades pertinentes — **podendo ser várias ao mesmo tempo** (§5.6) —, sempre via o fluxo humano-no-loop da seção 5.
6. **Rastreabilidade:** registrar **quais dados embasaram cada sugestão** (auditável), sem expor o dado sensível a quem não pode vê-lo.

---

## 6B. Geração de documento legal (PIA/PTS formal em PDF)

Necessidade real: juízes, Ministério Público e Conselho Tutelar solicitam o **PIA** ou o **PTS formal** — documento extenso, em parágrafos, com dinâmica familiar completa, histórico, compromissos e fundamentação. **As Dimensões não servem para isso** (são abstrações curtas de coordenação). O documento legal é outro artefato, com outra profundidade.

**Decisão: botão "Gerar minuta com IA" → profissional edita → assina → exporta PDF.** Princípios:

1. **A IA redige a minuta a partir do relato-fonte bruto** (rico), **não** das Dimensões (curtas). É a mesma fonte sensível da ingestão, agora usada para montar texto completo. Destino diferente: Dimensão = resumo compartilhado; documento legal = texto completo que **fica na esfera de origem** e só sai por decisão do profissional dono.
2. **Template correto por tipo de plano.** O PIA segue a estrutura legal do SUAS/ECA (avaliação interdisciplinar, compromissos da família, atividades previstas, medida e prazos). O PTS segue sua própria forma. **Cada contêiner (PTS/PIA) gera seu próprio documento, com seu template e seu dono** — mais um motivo para separá-los na operação real.
3. **Editor embutido.** A minuta cai num editor de texto no sistema; o profissional revisa, completa o que a IA não tinha e corrige.
4. **IA gera rascunho, nunca documento final automático.** Documento que vai a juízo carrega responsabilidade técnica (às vezes fé pública) e exige um humano assumindo autoria. O botão economiza ~80% da digitação; os ~20% de revisão são obrigatórios e são onde mora a responsabilidade legal.
5. **Sigilo no template.** A IA não despeja relato clínico/psiquiátrico dentro de um PIA que vai ao juízo da infância, salvo inclusão consciente pelo profissional daquela esfera.

**No protótipo:** opcional, mas é um **forte argumento de venda** ("o sistema redige o PIA para o juiz em segundos, o técnico só revisa"). Se incluir, basta um caso gerando uma minuta editável e exportável em PDF.

---

## 6C. Uso seguro da IA (Google Gemini)

Modelo local é inviável (sem CPU/GPU/infra). **Decisão: Google Gemini via API.** O cuidado de LGPD se estrutura em três camadas — e é importante entender o que cada uma resolve:

**1. Tokenização de identificadores (não criptografia).**
O CPF/CNS/nome **nunca saem do servidor**, nem cifrados — dado cifrado que sai ainda é dado que saiu, e a IA não o usaria de qualquer forma. O mecanismo é referência por apelido:
- Antes de enviar: substituir identificadores diretos por um **rótulo neutro descartável** (ex.: `Paciente_4F2A`), guardando no banco local o vínculo `4F2A → cidadão real`.
- Enviar à IA **apenas o texto pseudonimizado + o token**.
- A IA responde referenciando `Paciente_4F2A`.
- No backend, **reassociar** o token ao cidadão pela tabela local.
- O vínculo identidade↔token vive **só do seu lado**.

**2. Limite honesto da pseudonimização.**
Tirar nome/CPF/endereço reduz o risco, mas **não o elimina**: o *conteúdo* do relato clínico/psiquiátrico é o dado sensível e **precisa** ir à IA para ela analisar. "Paciente com ideação suicida após perder o benefício" segue sendo dado de saúde sensível mesmo sem nome. Pseudonimizar ≠ anonimizar.

**3. O que de fato protege (contrato + base legal).**
- **Tier pago da API Gemini**, que **não usa o conteúdo para treino** (diferente do app gratuito). Confirmar no contrato/termos.
- **Acordo de tratamento de dados (DPA)** com o Google; verificar **região de processamento e retenção**.
- **Base legal** registrada para o tratamento (operação real).

**No protótipo:** com dados **fictícios**, nada disso bloqueia — pode-se usar o Gemini livremente. A tokenização e o DPA entram como requisito da **operação real**, antes de qualquer dado de cidadão real tocar a API.

---

## 7. O Protótipo de apresentação (a demo que fecha contrato)

Como ainda não há contrato nem credenciamento, o protótipo **simula a ingestão** — e isso é melhor que preenchimento manual para a demo, porque o valor do produto **é** a integração automática. Mostrar alguém digitando seria mostrar exatamente o que o sistema promete eliminar.

### 7.1. Estrutura — três telas
1. **Tela "Fonte Saúde"** (URL própria): página simples de relatórios, com uma **lista de registros clínicos fictícios** do cidadão (atendimentos em UBS, CAPS, UPA). Simula o sistema municipal de saúde.
2. **Tela "Fonte Assistência"** (URL própria): mesma ideia — **registros assistenciais fictícios** (CRAS/CREAS, situação social, benefícios).
3. **Tela "PTS/PIA"** (URL do sistema): mostra a **sinopse do cidadão** e o **estado atual** segundo a IA, com Dimensões, objetivos/metas/ações e sinalizações.

Tecnicamente: as duas fontes são **dois bancos fictícios** (um Saúde, um Assistência) expostos por um **endpoint de ingestão** que o backend consome **como adapter** — a mesma forma do adapter de produção. Não é mock jogado fora: é a fundação real.

### 7.2. O roteiro da demo (o momento "olhos brilhando")
- Use **um caso com nome e história** (uma pessoa real-fictícia — "a dona Maria", não "Paciente 001"). Gestor não se emociona com tabela; se emociona com cidadão.
- Mostre o **antes/depois em split na mesma tela** — fonte de um lado, PTS reagindo do outro. A reação da IA tem que ser **instantânea e no mesmo enquadramento**; trocar de aba mata o impacto.
- **Ato 1:** apresente a sinopse da dona Maria e seu estado atual no PTS.
- **Ato 2:** você **altera um fator** numa das fontes (ex.: na Assistência, "família perdeu o benefício"; ou na Saúde, "faltou à última consulta").
- **Ato 3:** ao vivo, a **IA atualiza o estado**, recalcula a Dimensão afetada e **dispara uma sinalização cruzada** — a alteração na Assistência gera alerta à **unidade de Saúde** sobre risco aumentado (ou vice-versa).
- **Fecho:** "a dona Maria ia reinternar; o sistema viu antes e articulou as duas pontas." O cruzamento entre as esferas é o que ninguém mais faz — é aí que se crava a venda.

### 7.3. Preenchimento manual — recurso real, não da demo
Independente da demo, o sistema **terá** entrada manual de Dimensões como **recurso real de transição**: no início da operação pós-contrato, antes da integração automática estar pronta, a equipe preenche manualmente, com o aviso visível de que **a ingestão automática entra assim que o contrato e a integração com o sistema municipal forem concluídos.** Demo conta a história automática; operação inicial usa o manual como ponte.

---

## 8. Fases de execução

### FASE 0 — Fundação
- Monorepo: `apps/web` + `apps/mobile`, `packages/domain` (regras puras, sem I/O), `packages/adapters` (ingestão).
- Setup Supabase (Postgres + Auth + RLS) + Next.js. `tsc --noEmit` limpo + lint + CI determinístico desde o primeiro commit.
- Multi-tenant por município via **RLS** desde o schema.
- Segredos fora do repo (env). Cifragem em repouso para PII; **tokenização de CPF/CNS**.
- **Pronto quando:** repo compila, CI verde, esqueleto no lugar, RLS de tenant ativa.

### FASE 1 — Núcleo do PTS/PIA (entrega valor sozinho)
- Domínio puro: Caso/Plano/Dimensão/Objetivo/Meta/Ação + regras de transição de status da Ação.
- **Máquina de estados do caso** (§4B): `case_status` e as transições (radar → observação → acompanhamento → PTS/PIA → saída), com dono mínimo criado no "assumir caso". Modelar a FSM parametrizável desde já.
- CRUD + **RBAC via RLS** (Admin → Gerente → Profissional; RT como dona do caso).
- **Onboarding em cascata** (seção 4): convites por e-mail/link (Resend).
- UI: Dimensões como cartões read-only; tela de Metas/Ações como único ponto de escrita; **caixa de sinalizações**; **fila de observação** (candidatos) por unidade.
- **Pronto quando:** dois ou mais profissionais de unidades distintas pactuam e evoluem ações num caso compartilhado e veem as ações uns dos outros. *(O teste de aceite pode ser demonstrado com 2, mas o modelo de dados nasce N-lateral — ver §5.6.)*

### FASE 2 — Motor de Sinalização Cruzada (humano-no-loop)
- **Catálogo de componentes da rede** (RAPS + SUAS) mapeado a tipos de necessidade (seção 5.5).
- **Fan-out 1→N** (§5.6): um relato gera N sinalizações paralelas, confirmadas/descartadas individualmente.
- **Gate por prioridade** (§5.1): `imediata` (autor confirma → direto à unidade, RT notificada) vs. `pactuada` (autor → RT valida → encaminha). FSM com gate parametrizado por (prioridade + papel).
- **Roteamento inteligente:** IA propõe o **componente correto da rede**; encaminhamento à **unidade de referência do território** (papel, não pessoa).
- **Gatilhos de elevação `radar → observacao`** (§4B): detectores de padrão G1 (recorrência), G2 (abandono), G3 (cruzamento entre esferas), com limiares parametrizáveis e candidato com porquê obrigatório. Expiração → escala ao Gerente da unidade.
- Fila da unidade + distribuição pelo gerente + atribuição a profissional.
- Estados da sinalização e trilha de auditoria de cada passo.
- **Pronto quando:** uma anotação gera **uma ou mais** sugestões → autor confirma cada uma → roteadas ao componente certo → crítico passa pela RT → encaminhamento às unidades → distribuição → ações com responsáveis, tudo auditado e visível a todas as unidades do caso.

### FASE 3 — Ingestão simulada + Camada de IA (a demo)
- Dois bancos fictícios (Saúde, Assistência) + **endpoint de ingestão estruturado como adapter**.
- Adapter de normalização: dado-fonte → **Dimensão derivada** com a regra fixa de sensibilidade.
- IA: lê tudo → deriva Dimensões → sugere objetivos/metas/ações → dispara sinalizações.
- **Roteamento por texto bruto incluído:** IA infere a necessidade do relato e propõe o componente certo da rede (5.5), **com a RT confirmando/corrigindo em um clique**.
- As **três telas** e o **roteiro split antes/depois** da seção 7.
- Entrada manual de Dimensões como recurso de transição, com aviso.
- **[Opcional, forte para venda]** Botão "Gerar minuta" → IA redige PIA/PTS formal → editor → PDF (seção 6B).
- **Pronto quando:** a alteração numa fonte fictícia, ao vivo, atualiza o estado no PTS e dispara sinalização cruzada na mesma tela.

### FASE 4 — Segurança, LGPD e conformidade (transversal, contínua)
- Base legal e consentimento registrados por ingestão (relevante na integração real).
- **Termo de autorização (T1):** registro do consentimento do cidadão para existir no sistema e ter dados cruzados entre esferas — termo escrito assinado no início da operação. Bloqueante para G3 com dados reais.
- **Recusa (T2):** flag que trava novos disparos sem apagar o radar.
- **Minimização:** só derivar/expor o necessário ao PTS; nada de "puxar tudo".
- Cifragem em repouso e em trânsito; CPF/CNS tokenizados.
- **Auditoria imutável** de acesso/alteração/encaminhamento.
- Segregação por unidade/papel; regra fixa de sensibilidade do Psíquico aplicada e testada.
- Política de retenção e expurgo.

---

## 9. Ordem e definição de "protótipo pronto para apresentar"

Ordem: **Fase 0 → Fase 1 → Fase 2 → Fase 3**, com a Fase 4 correndo em paralelo desde o início.

**Protótipo pronto para o prefeito quando:**
1. Existe um caso com história (dona Maria) carregado nas duas fontes fictícias.
2. As três telas funcionam e o split antes/depois roda ao vivo.
3. Alterar um fator numa fonte atualiza o estado da IA e **dispara sinalização cruzada** instantânea.
4. O fluxo humano-no-loop (sugestão → RT valida → encaminha à unidade → gerente atribui) é demonstrável.
5. Hierarquia de acesso e visibilidade (Dimensões compartilhadas, relato-fonte restrito, Psíquico abstraído) estão visíveis e explicáveis.

---

## 10. Riscos e decisões a manter no radar
- **[Produto] Não deixar a IA decidir/encaminhar sozinha.** Humano-no-loop é regra, não opção.
- **[Ouro/Risco] O ciclo de vida do caso (§4B) é a espinha dorsal.** Generoso para observar (radar largo, automático, barato), parcimonioso para agir (cada degrau acima exige decisão humana). Inverter isso — agir a cada toque — afoga a equipe em alertas e mata o sistema. Calibração conservadora dos gatilhos é inegociável.
- **[Ouro+Conformidade] O gatilho G3 (cruzamento entre esferas) é o maior diferencial E o maior risco jurídico.** Cruzar dado de saúde com dado de assistência de quem não pediu nada exige base legal (T1). Mitigação inicial: termo escrito de autorização assinado pelo cidadão. Sem isso, G3 não roda com dados reais.
- **[Confiança] Nunca vazar relato-fonte bruto entre esferas, nem em alertas.** Compartilha-se necessidade de coordenação, não o dado clínico.
- **[Engenharia] Adapter isolado.** Núcleo nunca conhece a fonte; troca fictícia→real sem tocar o domínio.
- **[Demo] História humana + split na mesma tela.** Sem isso, perde o impacto.
- **[Conformidade] Regra fixa de sensibilidade por dimensão**, não decisão da IA — previsível e auditável.
- **[Valor] Roteamento pelo componente correto da rede é o ponto-ouro.** A IA distribui o caso pela RAPS/SUAS (descentraliza o CAPS), não concentra. Exige catálogo de componentes mapeado a tipos de necessidade.
- **[Modelo] O sistema é N-lateral, não bilateral.** Um relato gera N encaminhamentos paralelos (§5.6); o caso é compartilhado por todas as unidades envolvidas. Saúde+Assistência é o piso. O modelo de dados (1 relato → N sinalizações) nasce assim, mesmo que a demo use 2.
- **[Fluxo] Gate segue o tempo, não a gravidade.** Prioridade `imediata` (urgência → unidade direto, RT só notificada) vs. `pactuada` (rotina → RT valida antes). Autor sempre confirma/ajusta a prioridade (portão 1); RT é portão 2 só na via `pactuada`. Gate parametrizado por (prioridade + papel), trocável sem reescrever a FSM. **A via imediata prepara a unidade, não substitui o SAMU 192.**
- **[Legal] PTS e PIA são planos distintos com bases legais próprias.** No protótipo, plano único; na operação real, separar para respeitar SUAS/ECA. Cada plano gera seu próprio documento legal.
- **[Legal] Documento gerado por IA é minuta, nunca peça final automática.** Revisão e autoria humana obrigatórias antes de ir a juízo.
- **[LGPD] Gemini API com tokenização de identificadores + tier de não-treino + DPA.** Pseudonimizar reduz, não elimina o risco — o conteúdo sensível vai junto. Vínculo identidade↔token só no lado do servidor. Exigências da operação real; protótipo usa dados fictícios.

---

## OBSERVAÇÃO — Integração real (somente após fechar contrato)

> Tudo abaixo é **fase posterior**, fora do protótipo. Não desenvolver agora.

A maior vantagem do produto — e o argumento de venda — é a integração automática que unifica saúde e assistência em torno do cidadão. Ao fechar contrato, o município, **vendo essa vantagem, tende a fornecer acesso aos seus próprios sistemas**, onde os dados clínicos e psiquiátricos completos de fato residem (os sistemas municipais têm o dado bruto e detalhado; a rede federal só recebe o subconjunto que cada unidade envia a ela).

Caminhos de integração real, em ordem de viabilidade:

1. **Sistema municipal de saúde (prioritário).** É a fonte mais rica — contém os relatos clínicos completos de UBS, CAPS e UPA. Com o contrato, define-se o endpoint/forma de acesso autorizada. O adapter de produção substitui a fonte fictícia da Fase 3 **sem alterar o núcleo**.
2. **Sistema/base de assistência do município.** Fonte rica da Dimensão Social (composição familiar, vulnerabilidade, benefícios), via acesso autorizado sob base legal (Termo de Ciência e Responsabilidade / convênio).
3. **RNDS (Saúde, federal) — complementar.** Leitura sob o **CNES de um estabelecimento municipal credenciado** e seu **certificado A1 ICP-Brasil**. Requer: parceria com o estabelecimento, solicitação de acesso de homologação, e fluxo de autenticação por certificado + token de curta validade. Útil como complemento/consolidação, **não** como fonte principal — não devolve o prontuário completo, apenas o que foi notificado à rede, e dados clínicos ricos dependem de contexto de atendimento + consentimento do cidadão.
4. **CadÚnico (Assistência, federal) — verificação pontual.** A API federal disponível **não atende municípios** e retorna apenas três indicadores por CPF (cadastrado? baixa renda? atualizado?). Serve, no máximo, como verificação — nunca como fonte de perfil socioeconômico. Os dados ricos do CadÚnico vivem nos sistemas operados pelo município/CAIXA.

**Pré-requisitos de credenciamento (a iniciar quando o contrato avançar):** parceria formal com estabelecimento(s) credenciado(s); certificado A1 ICP-Brasil da entidade; instrumento jurídico de acesso e tratamento de dados (LGPD + base legal específica de cada rede). A integração é tanto um projeto **jurídico/de credenciamento** quanto técnico — e o protótipo foi desenhado para **não depender** disso, permitindo fechar contrato antes.
