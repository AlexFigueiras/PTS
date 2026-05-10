-- Rename enum value 'viewer' → 'assistant' sem alterar a coluna.
-- ALTER TYPE RENAME VALUE (PostgreSQL 10+) opera no catálogo do tipo diretamente,
-- não passa pelo DDL de coluna — logo não conflita com RLS policies existentes.
ALTER TYPE "public"."tenant_role" RENAME VALUE 'viewer' TO 'assistant';--> statement-breakpoint
ALTER TABLE "tenant_members" ALTER COLUMN "role" SET DEFAULT 'assistant';
