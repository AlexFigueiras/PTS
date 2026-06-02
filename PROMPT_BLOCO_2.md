# Bloco 2 — Semáforo + alertas de descumprimento

Dependência: Bloco 1 concluído (campos temporais na `acoes` existem).
Fonte da verdade: `PLANO_PTS_PIA_v2.md` §5.7.

## O que fazer

1. **`status_temporal` derivado por ação** — campo computado (não armazenado cru), calculado no backend a partir de `proximo_retorno` / `data_proxima_reavaliacao` vs. data atual e do último comparecimento registrado:
   - `verde` — em dia
   - `amarelo` — faltam ≤ 7 dias para o próximo retorno/reavaliação
   - `vermelho` — vencido ou sem comparecimento no período

2. **Scheduled function / cron (Supabase)** — roda diariamente:
   - Para cada ação `pactuada` ou `em_andamento`, calcula o atraso em meses desde o último comparecimento.
   - Em 1, 2 e 3 meses de não cumprimento: cria uma sinalização do tipo `alerta_descumprimento` (subtipo novo no motor existente, §5 do plano). Reaproveitar o motor de sinalização — não criar paralelo.
   - Crítico (caso intensivo) → alerta vai para a RT. Rotineiro → fila da unidade.
   - Cada alerta **gera uma "ação de busca ativa" sugerida** (status `sugerida`, humano-no-loop).
   - Dispara e-mail via Resend ao RT/responsável (reaproveitar o canal de e-mail existente).

3. **UI**:
   - Semáforo (dot verde/amarelo/vermelho) no cartão de cada ação.
   - Fila/caixa de entrada da unidade ordena vermelhos primeiro.

## Pronto quando
- Ação atrasada fica vermelha automaticamente.
- Em 1/2/3 meses, RT recebe alerta + sugestão de busca ativa para validar.
- Demo consegue mostrar a dona Maria "ficando vermelha" antes de chegar na UPA.

## Não mudar
Motor de sinalização existente (estender, não substituir). RLS. Stack. Sem Redis.
