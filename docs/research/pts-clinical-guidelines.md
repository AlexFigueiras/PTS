O Projeto Terapêutico Singular (PTS) é um dispositivo clínico-político voltado para a cogestão do cuidado de sujeitos em situação de grave vulnerabilidade, complexidade clínica ou sofrimento mental acentuado . Ao contrário dos planos de cuidados padronizados e unidimensionais, o PTS fundamenta-se na interdisciplinaridade, na intersetorialidade e na centralidade do sujeito, operando como um arranjo dinâmico que articula os determinantes sociais de saúde à prática terapêutica cotidiana .
A operacionalização do PTS em sistemas modernos de informação em saúde exige o desenvolvimento de arquiteturas de dados que superem a rigidez dos prontuários eletrônicos tradicionais, os quais historicamente priorizam registros biomédicos estruturados em detrimento das variáveis sociais e subjetivas . Para que o PTS cumpra seu papel de ordenador do cuidado e integrador de redes, torna-se indispensável delinear uma estrutura digital de formulário capaz de capturar a complexidade do indivíduo, definir fluxos de encaminhamento inteligentes e possibilitar a extração rica de dados para fins de planejamento populacional e inteligência clínica .
Arquitetura Estrutural do Formulário de PTS
A tradução metodológica do PTS para um ambiente digital estruturado requer uma interface que espelhe as quatro etapas fundamentais de sua elaboração clínica: o diagnóstico multidimensional, a pactuação de metas, a divisão de responsabilidades e o processo de reavaliação periódica . A captura desses dados deve ocorrer de forma fluida, combinando campos altamente estruturados (para fins de interoperabilidade e indicadores quantitativos) com campos de texto livre semanticamente ricos (para a preservação da narrativa do usuário e das percepções da equipe) .
Módulo do Formulário
Campo de Entrada
Tipo de Dado
Regra de Validação / Interoperabilidade
Finalidade Terapêutica e Analítica
I. Diagnóstico Multidimensional
Identificação social e territorial; histórico clínico e psicossocial; rede de suporte familiar e comunitária; determinantes sociais prioritários ``.
Misto (Texto livre estruturado por eixos e variáveis categóricas).
Mapeamento com vocabulários controlados (ex: CID-11, CIAP-2) e tags de vulnerabilidade social ``.
Compreender o sujeito em sua totalidade singular, conectando suas patologias orgânicas ao contexto habitacional, financeiro e afetivo ``.
II. Definição de Metas (Pactuação)
Objetivos terapêuticos de curto, médio e longo prazo; desejos e projetos de vida manifestados pelo usuário ``.
Texto livre enriquecido com metadados de categorização (clínico, social, habitacional, de autonomia).
Associação obrigatória de cada meta a pelo menos um determinante de saúde identificado no Módulo I ``.
Garantir que o plano de cuidado seja corresponsabilizado e respeite a autonomia do sujeito, alinhando as intervenções biomédicas aos seus desejos subjetivos ``.
III. Divisão de Responsabilidades
Ações de cuidado específicas; prazos de execução; designação do Profissional de Referência (tutor do caso); corresponsáveis externos ``.
Chaves estrangeiras (IDs de profissionais e serviços); datas; texto descritivo curto.
Validação de prazos ativos e atribuição de responsabilidades vinculadas ao cadastro nacional de estabelecimentos de saúde (CNES) ``.
Evitar a dispersão de responsabilidades e organizar a divisão do trabalho clínico, estabelecendo um ponto central de contato e monitoramento do caso ``.
IV. Reavaliação e Monitoramento
Evolução das metas pactuadas; intercorrências clínicas ou sociais; data da próxima reunião de equipe para revisão do plano ``.
Escalas ordinais (progresso da meta); datas; notas de evolução clínica e psicossocial.
Atualização dinâmica do status da meta (Concluída, Em Andamento, Suspensa, Modificada) com histórico de alterações ``.
Prover flexibilidade ao projeto, assegurando que o plano de cuidados mude de acordo com a evolução do estado de saúde e das condições sociais do usuário ``.
O formulário digital deve ser concebido para mitigar o retrabalho dos profissionais de saúde, extraindo automaticamente do prontuário eletrônico geral do paciente os dados demográficos básicos e o histórico de consultas prévias . Com isso, a equipe pode concentrar esforços no preenchimento das variáveis qualitativas que compõem o diagnóstico multidimensional e a pactuação de metas .
Matriz de Coleta de Dados Multidimensionais: Integração de Demandas de Saúde e Sociais
Para identificar com precisão as demandas de saúde, de assistência social e de outras interfaces setoriais, o formulário de PTS precisa estruturar a coleta de dados de modo que as vulnerabilidades sejam visibilizadas sob uma perspectiva integrada . A fragmentação histórica dos sistemas de informação governamentais impede que a saúde enxergue a extrema pobreza de um usuário, ou que a assistência social perceba o impacto de um transtorno mental severo na dinâmica familiar . O preenchimento da matriz de coleta de dados do PTS atua como uma ponte de interoperabilidade conceitual e operacional ``.
Eixo Analítico
Variáveis e Dados Necessários
Escala ou Instrumento de Apoio Integrado
Impacto na Identificação de Demandas e Intervenção
Eixo de Saúde Mental e Uso de Substâncias
Diagnósticos prévios; histórico de internações e crises; padrão de uso de álcool e outras drogas; histórico de autoextermínio; adesão a psicofármacos ``.
Instrumentos validados como AUDIT, ASSIST e SRQ-20, além de escalas de avaliação de risco de violência auto ou heteroindigida ``.
Identificar o grau de severidade do sofrimento psíquico para modular a intensidade das intervenções psicossociais e a necessidade de acompanhamento especializado (CAPS) ``.
Eixo de Saúde Física e Funcionalidade
Doenças crônicas não transmissíveis (DCNTs); limitações de mobilidade ou autocuidado; dependência para atividades cotidianas; barreiras de acesso físico ``.
Índice de Katz (independência em atividades básicas) ou WHODAS 2.0 (escala de incapacidade da OMS) ``.
Dimensionar o suporte físico necessário no território, agendar visitas domiciliares sistemáticas e acionar serviços de reabilitação motora ou cognitiva ``.
Eixo de Determinantes Sociais e Habitação
Situação habitacional (rua, aluguel social, moradia precária); acesso a água tratada e saneamento; segurança alimentar; renda per capita familiar ``.
Escala Brasileira de Insegurança Alimentar (EBIA) e indicadores de extrema pobreza baseados no Cadastro Único (CadÚnico) ``.
Acionar a rede socioassistencial para concessão de benefícios pecuniários, inclusão em programas de habitação social ou fornecimento de cestas de alimentos ``.
Eixo de Vínculos e Rede de Suporte
Dinâmica familiar (conflitos, violência doméstica, abandono); presença de cuidadores; vínculos comunitários, religiosos ou associativos ``.
Genograma digitalizado e Ecomapa estruturado, com representação gráfica dos vínculos fortes, fragilizados ou conflituosos ``.
Mapear se o usuário possui rede de apoio informal capaz de sustentar o plano de cuidado em seu território, reduzindo o isolamento social ``.
Eixo Jurídico e de Direitos
Situação penal (egresso do sistema prisional, medidas socioeducativas); pendências civis (ausência de registro civil); violação ativa de direitos humanos ``.
Triagem de pendências de documentação básica e registro de judicialização ativa de tratamentos ou vagas de acolhimento ``.
Acionar a defensoria pública, conselhos tutelares ou centros de referência em direitos humanos para assegurar a cidadania formal do indivíduo ``.
A coleta sistemática dessas variáveis fornece uma base informacional robusta . Ao correlacionar essas dimensões, os profissionais conseguem discernir, por exemplo, se a baixa adesão a um tratamento farmacológico (Eixo de Saúde Mental) decorre de uma barreira cognitiva individual, da ausência de alimentação adequada para a ingestão do medicamento (Eixo de Determinantes Sociais), ou da ausência de um cuidador para supervisionar as tomadas (Eixo de Vínculos) .
Dinâmica de Fluxos e Governança de Encaminhamento Intersetorial
A fragmentação dos fluxos de encaminhamento na rede de atenção à saúde e na rede intersetorial é um dos maiores gargalos para a eficácia do cuidado integral . Em modelos tradicionais, o usuário é submetido a um ciclo burocrático de encaminhamentos passivos guiados por papéis físicos, que frequentemente resultam em barreiras de acesso e perda de seguimento terapêutico .
A dinâmica de encaminhamento proposta para o PTS rompe com essa lógica reativa por meio do conceito de governança ativa e compartilhada de redes de cuidado . O encaminhamento deixa de ser um ato burocrático de transferência de responsabilidades e passa a ser configurado como uma transição qualificada e acompanhada de cuidado (*warm handoff*), na qual o serviço de origem permanece corresponsável pelo usuário até que o vínculo com o serviço de destino seja plenamente estabelecido .
                    [ Fluxo de Governança Intersetorial ]
                    
                      +------------------------------+
                      |  Atenção Primária (APS/eMulti)| <---+
                      +---------------+--------------+      |
                                      |                     |
                   Pactuação de       | Matriciamento       | Contrarreferência
                   Casos Complexos    | e Apoio Técnico     | Ativa de Cuidado
                                      v                     |
                      +---------------+--------------+      |
                      |  Atenção Especializada (CAPS)| -----+
                      +---------------+--------------+
                                      |
                     Articulação      | Encaminhamento
                     Intersetorial    | Qualificado (CRAS/CREAS)
                                      v
                      +---------------+--------------+
                      | Assistência Social / Justiça |
                      +------------------------------+
A governança desse ecossistema apoia-se no Apoio Matricial e na atuação das equipes multiprofissionais de apoio (como as equipes eMulti na Atenção Primária) . Quando um caso apresenta complexidade que extrapola a capacidade de resposta do serviço local, a equipe de saúde não "despacha" o usuário para um especialista; em vez disso, solicita um matriciamento, que consiste em uma discussão conjunta de caso para a construção coletiva do PTS .
Cenário de Transição de Cuidado
Serviço de Origem
Serviço de Destino
Dispositivo de Pactuação e Comunicação
Indicador de Monitoramento do Fluxo
Acolhimento na Crise Aguda
Atenção Primária à Saúde (APS) ou CAPS.
Rede de Urgência (UPA, Hospital Geral ou Leito de Saúde Mental) ``.
Contato imediato entre os profissionais de referência dos serviços; compartilhamento eletrônico em tempo real do PTS resumido ``.
Tempo decorrido entre o acionamento da rede e o início do manejo clínico estruturado; taxa de retorno do usuário em até 72 horas para a APS/CAPS ``.
Alta Hospitalar e Reinserção
Unidade de Internação Hospitalar Geral ou Psiquiátrica ``.
CAPS de Referência ou Equipe de Saúde da Família (APS) ``.
Planejamento de alta em conjunto pelas equipes, com realização de visita domiciliar ou agendamento de consulta no serviço territorial no dia seguinte à alta ``.
Intervalo de tempo entre a alta hospitalar e o primeiro contato no território; taxa de reinternação em 30 dias por descompensação terapêutica ``.
Apoio Socioassistencial e Renda
Equipe de Saúde da Família (APS) ou CAPS ``.
Centro de Referência de Assistência Social (CRAS) ou CREAS ``.
Reuniões intersetoriais periódicas de território; inserção do caso no sistema compartilhado de assistência e saúde ``.
Percentual de usuários sob acompanhamento de PTS inseridos ativamente em programas de transferência de renda ou habitação social ``.
Desinstitucionalização e Moradia
Hospitais de Custódia ou Internações Psiquiátricas de Longa Permanência ``.
Serviços de Residência Terapêutica (SRT) ou Unidades de Acolhimento ``.
Comitês de desinstitucionalização locais; audiências de mediação com a defensoria pública e o poder judiciário ``.
Tempo de permanência institucional residual após a liberação médica ou jurídica para reinserção comunitária ``.
Para que essas transições operem com eficácia, as plataformas digitais de saúde devem dispor de mecanismos de alertas e notificações automatizadas de transição de cuidados . Por exemplo, caso um paciente com PTS ativo dê entrada em uma Unidade de Pronto Atendimento (UPA) devido a uma crise decorrente do uso de álcool e outras drogas, o sistema deve disparar uma notificação instantânea para o CAPS de referência e para o enfermeiro da sua Unidade de Saúde da Família, informando o evento e disponibilizando os dados clínicos da admissão .
Esse fluxo de informação contínuo assegura que o Profissional de Referência (tutor) assuma a coordenação do percurso terapêutico do paciente na rede de serviços, evitando que o sujeito se perca nas barreiras administrativas do sistema público ou privado de saúde ``.
Extração Rica de Dados e Inteligência de Sistemas de Saúde
A consolidação de formulários estruturados de PTS e o tráfego de dados ao longo das transições de cuidado criam um repositório valioso para a aplicação de ferramentas de inteligência analítica . A maior riqueza de informações sobre as demandas reais de saúde e assistência social de um indivíduo encontra-se nas anotações subjetivas, nos diários de evolução clínica e nas atas de reuniões de matriciamento, elementos tipicamente compostos por dados não estruturados (texto livre) . O desafio da extração rica de dados consiste em converter essa massa textual em dados estruturados, acionáveis e preditivos ``.
Processamento de Linguagem Natural (PLN) na Saúde Mental e Social
A implementação de algoritmos de Processamento de Linguagem Natural (PLN), especificamente modelos de aprendizado de máquina ajustados para termos biomédicos e de assistência social (como modelos BERT clínicos), possibilita analisar retroativamente ou em tempo real as anotações textuais registradas pelas equipes no PTS . Através do Reconhecimento de Entidades Nomeadas (NER) e da Extração de Relações, o sistema de informação é capaz de rastrear, catalogar e sinalizar eventos críticos que não constam em códigos estruturados de diagnóstico (como o CID) .
O processamento textual identifica padrões ocultos nas evoluções, tais como:
Menções semânticas a ideação suicida ou tentativas de autoextermínio veladas pelas expressões dos familiares no domicílio ``.
Termos que apontam para dinâmicas de violência doméstica, negligência infantil ou abandono de idosos ``.
Padrões linguísticos indicativos de desorientação mental, agitação psicomotora recorrente ou sintomas psicóticos persistentes nas evoluções de campo realizadas por agentes comunitários de saúde ``.
Ao mapear essas entidades textuais e cruzar as informações com os dados demográficos estruturados, o sistema extrai informações que permitem inferir determinantes sociais de saúde locais e direcionar preventivamente as estratégias das equipes territoriais de saúde e assistência social ``.
Modelagem Preditiva: Índice de Vulnerabilidade e Complexidade (IVC)
Com base nas variáveis estruturadas de saúde mental, funcionalidade física, condições de moradia, renda familiar e suporte social coletadas na matriz do PTS, o sistema de informação pode calcular dinamicamente o Índice de Vulnerabilidade e Complexidade (IVC) de cada paciente . O IVC é estruturado de modo a mensurar o risco cumulativo ao qual o indivíduo está submetido, orientando os gestores públicos sobre a urgência de intervenção matricial e permitindo que as equipes estratifiquem suas carteiras de serviços .
O cálculo do IVC é definido pela seguinte expressão matemática, que pondera os três pilares essenciais de vulnerabilidade identificados na literatura de saúde coletiva:
IVC=α⋅I 
cl
​
 +β⋅I 
soc
​
 +γ⋅I 
psic
​
 
Onde cada componente é descrito sistematicamente conforme os parâmetros clínico-assistenciais:
I 
cl
​
  representa o subíndice de complexidade clínica do paciente, computado a partir do número de comorbidades crônicas registradas no sistema de informação, o número de medicamentos de uso contínuo prescritos e a frequência de admissões em serviços de urgência e emergência nos últimos doze meses ``.
I 
soc
​
  expressa o subíndice de vulnerabilidade social do indivíduo e de sua família, calculado a partir de variáveis de habitação (com peso máximo atribuído à situação de rua ou de abrigo provisório), ausência de renda fixa de subsistência e isolamento social extremo mensurado pela escassez de contatos no ecomapa ``.
I 
psic
​
  reflete o subíndice de sofrimento psicológico e de demandas de saúde mental, parametrizado pelos resultados de escalas integradas de triagem (como o SRQ-20) e histórico de crises documentadas pelo CAPS de referência ``.
Os pesos atribuídos a cada subíndice são denotados pelos parâmetros $\alpha, \beta, \gamma \in $, calibrados por meio de modelos estatísticos de regressão logística com base no histórico de óbitos evitáveis, internações psiquiátricas recorrentes e abandono de tratamento na rede local de saúde, sob a restrição normativa de normalização:
α+β+γ=1
O monitoramento preditivo decorrente desse índice permite que o gestor filtre, em um painel analítico (dashboard), quais indivíduos do território de saúde da família apresentam as maiores taxas de variação incremental no IVC no último trimestre . Essa oscilação positiva aciona um sinalizador visual de alerta no prontuário eletrônico da equipe de saúde local, recomendando formalmente o agendamento de um matriciamento e a atualização ou elaboração emergencial de um PTS .
Painéis Analíticos de Gestão e Monitoramento de Indicadores Chave (KPIs)
Para subsidiar a gestão em saúde na alocação de recursos humanos, orçamentários e de equipamentos, a extração de dados do PTS deve alimentar painéis de visualização integrados . Esses painéis agregam dados a nível municipal ou regional para monitorar a efetividade das políticas de redução de danos, saúde mental e reinserção social .
Os indicadores de desempenho clínico e de rede que devem ser estruturados nos painéis incluem:
Taxa de Efetividade Terapêutica do PTS: Razão entre as metas declaradas como concluídas ou resolvidas no Módulo IV e o total de metas pactuadas no período analisado ``.
Proporção de Casos Complexos sob Acompanhamento Intersetorial Ativo: Percentual de indivíduos com IVC elevado que possuem um PTS contendo ações ativas divididas com o CRAS ou CREAS ``.
Índice de Retenção e Engajamento de Usuários de Alta Complexidade: Taxa de permanência dos usuários com PTS ativo nos serviços territoriais, contraposta à taxa de abandono do tratamento ou retorno ao isolamento social ``.
Redução no Impacto Orçamentário de Urgências: Diferença percentual nos custos de internação e atendimentos de pronto-socorro antes e depois da instituição do PTS para os indivíduos de alta vulnerabilidade ``.
A visualização geoespacial desses KPIs em mapas de calor do município permite identificar quais territórios demandam a ampliação de equipes eMulti, a construção de novos CAPS ou o redirecionamento de programas de assistência social e geração de renda ``.
Governança de Dados, Privacidade e Considerações Ético-Clínicas
A consolidação de informações altamente sensíveis — englobando detalhes de transtornos mentais, orientação sexual, histórico de uso de substâncias psicoativas ilícitas, situação penal, condições de moradia precárias e dinâmicas de conflito familiar — exige o desenho de políticas rígidas de governança de dados e proteção da privacidade . A coleta sistemática e o compartilhamento de tais dados entre diferentes serviços e profissionais, embora clinicamente necessários para o cuidado compartilhado, impõem um risco ético significativo de estigmatização, discriminação institucional e quebra de sigilo profissional .
Alinhamento com a Legislação de Proteção de Dados (LGPD)
No contexto brasileiro, a implementação de sistemas de prontuários eletrônicos intersetoriais e ferramentas de inteligência para o PTS deve estar em estrita conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD), a qual classifica os dados relativos à saúde, vida sexual, convicções religiosas e opiniões políticas como dados pessoais sensíveis ``.
A arquitetura dos formulários de PTS e os fluxos de extração ricos de dados devem incorporar os seguintes critérios técnicos de privacidade desde a concepção do sistema (privacy by design) ``:
Gestão Fina de Controle de Acessos (RBAC): Os perfis de acesso aos sistemas de informação devem ser granulares. Um assistente social de um CRAS, por exemplo, não deve possuir acesso aos detalhes de prontuários médicos estritamente clínicos (como exames laboratoriais ou terapias farmacológicas finas), assim como um médico da atenção primária não deve visualizar anotações confidenciais de vulnerabilidades jurídicas que corram em segredo de justiça no CREAS . O compartilhamento de informações limita-se ao mínimo necessário para a execução do plano de cuidado coletivo pactuado no PTS .
Consentimento Informado e Compartilhado: O formulário de PTS em ambiente digital deve incluir uma etapa formal de registro do consentimento livre e esclarecido do usuário para o compartilhamento de suas informações cruciais entre os pontos da rede de atenção e assistência intersetorial . A recusa do usuário em compartilhar determinadas esferas da sua história pessoal não deve atuar como barreira para o recebimento de cuidados médicos ou assistência social básica .
Anonimização de Dados para Fins de Pesquisa e Gestão: Toda extração rica de dados destinada ao cálculo de indicadores agregados, predições epidemiológicas territoriais ou análises estatísticas para formulação de políticas públicas deve passar por processos rigorosos de anonimização e pseudonimização irreversible na base de dados analítica . Isso garante a preservação do sigilo médico e social do sujeito singular mesmo diante de cruzamentos complexos de bases governamentais .
A observância estrita desses limites éticos e jurídicos não representa uma barreira à integração dos serviços; pelo contrário, constitui um elemento essencial para o estabelecimento de uma relação de confiança duradoura entre o usuário em situação de vulnerabilidade e os profissionais das equipes de saúde e assistência do território ``.
Diretrizes para Viabilidade Operacional e Sustentabilidade da Rede
A implementação prática do arranjo tecnológico e metodológico do PTS deve seguir um cronograma estruturado de viabilização institucional, focado em mitigar o risco de burocratização do preenchimento e na qualificação permanente das equipes de ponta . O redesenho de processos operacionais constitui o núcleo para garantir a sustentabilidade das práticas no cotidiano do serviço de saúde e de assistência social .
Formação Continuada e Redes de Conversação
A inserção de novos formulários e softwares em saúde sem o respectivo processo de capacitação metodológica e sensibilização política das equipes resulta em baixa adesão ao preenchimento e em registros de dados superficiais e puramente cartoriais . Recomenda-se que a gestão municipal institua oficinas permanentes de educação em saúde voltadas para a metodologia do PTS, estimulando a cultura do cuidado centrado no sujeito e a compreensão das variáveis multidimensionais como ferramentas clínicas dinâmicas, e não meras obrigações administrativas .
Essas oficinas devem contar com a presença articulada de profissionais da saúde e do SUAS, promovendo a aproximação de linguagens técnicas e a sedimentação de espaços híbridos de matriciamento nos territórios ``.
Monitoramento de Usabilidade das Interfaces Digitais
A governança de tecnologia da informação deve monitorar continuamente a usabilidade dos sistemas informados por meio de testes de experiência do usuário com os profissionais de referência . Se o tempo exigido para o preenchimento inicial de um PTS for excessivo, as equipes criarão atalhos cognitivos que comprometerão a qualidade dos dados extraídos semanticamente .
O software deve prever a possibilidade de preenchimento descentralizado (por exemplo, registros parciais por agentes comunitários de saúde diretamente em dispositivos móveis durante a visita domiciliar), permitindo a construção coletiva e assíncrona do diagnóstico multidimensional do indivíduo . A tecnologia deve atuar como um facilitador do cuidado direto, promovendo a aproximação dos saberes interdisciplinares para a produção de autonomia e saúde mental de sujeitos complexos e historicamente marginalizados pelo sistema social .