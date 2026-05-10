# Technical Debt

## TD-001 — Conteúdo de registros clínicos sem criptografia a nível de aplicação

**Tabela:** `clinical_records.content`, `clinical_records.title`  
**Status:** Aberto  
**Fase alvo:** 6

### Contexto

O Supabase já aplica criptografia AES-256 em repouso no volume de disco (padrão da plataforma). O risco aqui é diferente: qualquer usuário com acesso direto ao banco (roles do Supabase, conexões de emergência, backups exportados) lê o conteúdo clínico sem restrição adicional.

Para prontuários sob LGPD, o nível de proteção esperado vai além da criptografia em volume — exige que dados sensíveis sejam ilegíveis fora do contexto da aplicação.

### O que falta

- Criptografia a nível de coluna no serviço de aplicação antes de persistir no banco.
- Alternativa: `pgsodium` (disponível no Supabase) com chaves gerenciadas pelo Vault.
- Decriptação centralizada no mapper (`record.mapper.ts`) para não vazar para o restante da stack.

### Impacto de não endereçar

- Vazamento de dados clínicos em caso de dump de banco ou acesso indevido a credenciais de DB.
- Risco de conformidade com LGPD (Art. 46 — medidas de segurança técnicas adequadas).

### Notas de implementação para Fase 6

- Avaliar `pgsodium` + Supabase Vault antes de implementação própria com AES-256 no servidor.
- A chave de criptografia **não deve** residir no mesmo ambiente que o banco.
- Requer migração de dados existentes (registros criados antes da Fase 6 precisam ser re-encriptados).
