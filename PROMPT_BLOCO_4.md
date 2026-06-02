# Bloco 4 — Protagonismo do usuário

Dependência: Bloco 1 concluído (modelo de Plano/Ação existe).
Fonte da verdade: `PLANO_PTS_PIA_v2.md` §5.9.

## O que fazer

1. **Migration — nova tabela `encontros`**:
   - `id`, `plano_id` FK, `tipo` enum (`articulacao_rede`, `reuniao_pts`), `data`, `participantes` (array de profissional_id), `usuario_presente` boolean, `created_by`, `created_at`
   - `reuniao_pts` exige `usuario_presente = true` — validar no backend.

2. **Migration — campo no `Plano`**:
   - `participacao_usuario` enum (`presente`, `representado_familia`, `dispensado_por_incapacidade`)
   - `participacao_justificativa` text (obrigatório se `dispensado_por_incapacidade`)

3. **Gate de ativação do Plano** — ao tentar mover o status do plano de `rascunho`/`proposta` para `ativo`/`pactuado`, validar (Zod + backend) que `participacao_usuario` está preenchido. Se `dispensado_por_incapacidade`, exigir `participacao_justificativa`. Bloquear sem isso. Mensagem: *"PTS não existe sem o usuário. Registre a participação antes de ativar."*

4. **`aceite_usuario` por meta/ação** (campo já criado no Bloco 1) — na tela de Ação, ao registrar `recusa` ou `repactuar`, bloquear status `pactuada`: a ação vai para `bloqueada` com nota de repactuação pendente.

5. **UI**:
   - Tela/modal de registro de encontro com distinção clara entre os dois tipos.
   - Indicador no cabeçalho do Plano mostrando se a participação do usuário está registrada.

## Pronto quando
- PTS não ativa sem participação do usuário registrada (ou exceção justificada).
- Ação recusada pelo usuário não vira adesão.
- Reunião de articulação e reunião de PTS são distintas no sistema.

## Não mudar
RLS, humano-no-loop, tela de Ação idêntica entre esferas. Stack.
