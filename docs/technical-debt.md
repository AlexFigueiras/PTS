# Technical Debt

## TD-001 — Ledger de migrações inconsistente

**Tabela:** `drizzle.__drizzle_migrations`  
**Status:** Aberto  
**Prioridade:** Alta

### Contexto

O journal local (`_journal.json`) tem 12+ entradas, mas o ledger no banco só registra 8. Migrações 0005, 0006, 0009–0011 foram aplicadas manualmente via scripts avulsos, quebrando a paridade.

### Impacto

- `drizzle-kit migrate` não pode ser usado com segurança — tentaria reaplicar DDL já existente.
- Novos devs que rodem `db:migrate` vão quebrar o banco.

### Mitigação atual

- Script `scripts/apply-pending-migrations.mjs` com lista manual de arquivos.
- Documentado em `docs/SYSTEM.md` §10.4.

### Resolução ideal

Reconciliar o ledger: inserir as linhas faltantes em `__drizzle_migrations` para que o journal e o banco fiquem em paridade.

---

## TD-002 — Criptografia a nível de coluna para dados sensíveis do PTS

**Tabela:** `pts_responses` (campos de domínio), `patients` (CPF, NIS, CNS)  
**Status:** Aberto  
**Prioridade:** Média

### Contexto

O Supabase aplica criptografia AES-256 em repouso no volume de disco. Porém, qualquer acesso direto ao banco (roles, backups, conexões de emergência) lê dados sensíveis sem restrição adicional.

Para dados sob LGPD (Art. 46), o nível de proteção esperado vai além da criptografia em volume.

### O que falta

- Criptografia a nível de coluna no serviço de aplicação antes de persistir.
- Alternativa: `pgsodium` (disponível no Supabase) com chaves gerenciadas pelo Vault.
- Decriptação centralizada no mapper para não vazar para a stack.

### Impacto de não endereçar

- Vazamento de dados sensíveis em caso de dump ou acesso indevido a credenciais.
- Risco de conformidade LGPD.

---

## TD-003 — `tenant_members.role` vestigial

**Tabela:** `tenant_members`  
**Status:** Aberto  
**Prioridade:** Baixa

### Contexto

O RBAC canônico usa `profiles.role` (enum `user_role`: ADMIN, MANAGER, PROFESSIONAL). O campo `tenant_members.role` (enum `tenant_role`: owner, admin, professional, assistant) é um legado da Fase 2 que ainda existe no schema mas **não é usado para autorização**.

### Impacto

- Confusão para novos devs — dois sistemas de roles no mesmo banco.
- O trigger `handle_new_user` ainda grava `tenant_members.role = 'owner'` no bootstrap.

### Resolução ideal

Migrar para remover a coluna `tenant_members.role` e o enum `tenant_role`, simplificando o schema.

---

*Última atualização: 2026-05-25*
