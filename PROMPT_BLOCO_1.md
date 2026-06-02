# Bloco 1 — Ciclo de vida temporal da Ação

Fonte da verdade: `PLANO_PTS_PIA_v2.md` §3 e §5.6.
Stack: Next.js App Router + TS, Supabase (RLS, `supabase-js`, migrations via CLI), Tailwind/shadcn, Zod, React Hook Form.

## O que fazer

1. **Migration Supabase** — adicionar à tabela `acoes`:
   - `data_inicio` date NOT NULL ao pactuar
   - `prazo_fim` date NOT NULL
   - `frequencia_tipo` enum (`semanal`, `quinzenal`, `mensal`, `outro`)
   - `frequencia_detalhe` text (ex.: "1ª e 3ª quinta do mês")
   - `proximo_retorno` date
   - `data_proxima_reavaliacao` date NOT NULL
   - `horizonte_tipo` enum (`curto_prazo`, `medio_prazo`, `longo_prazo`)
   - `aceite_usuario` enum (`aceita`, `recusa`, `repactuar`)

2. **Nova tabela `reavaliacoes`**:
   - `id`, `acao_id` FK, `data` date, `resultado` enum (`cumpriu`, `cumpriu_parcial`, `nao_cumpriu`), `nota` text, `proxima_acao` enum (`continuar`, `repactuar`, `encerrar`, `escalar`), `created_by`, `created_at`
   - RLS: mesmas regras da `acoes` (esfera/unidade de origem).

3. **Zod** — ao pactuar uma ação (status → `pactuada`), validar que `data_inicio`, `prazo_fim`, `frequencia_tipo` e `data_proxima_reavaliacao` estão presentes. Bloquear submit se faltarem. Mensagem: *"Toda ação pactuada precisa de prazo, frequência e data de reavaliação."*

4. **Tela de Ação** (Saúde e Assistência — mesma tela) — adicionar os campos acima com React Hook Form. Manter tudo que já existe.

5. **Agendamento da próxima reavaliação** — ao criar/editar uma `Reavaliacao` com `proxima_acao = continuar`, calcular e gravar a próxima `data_proxima_reavaliacao` na `acao`.

## Pronto quando
- Não é possível pactuar ação sem prazo fechado, frequência e data de reavaliação.
- Cada ação tem histórico de reavaliações datadas com resultado e próxima ação.

## Não mudar
Arquitetura, RLS, humano-no-loop, tela idêntica entre esferas, stack. Sem ORM.
