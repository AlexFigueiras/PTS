-- Rename enum value 'viewer' → 'assistant' (RBAC oficial do sistema clínico).
-- Estratégia: converter para text → migrar dados → recriar enum → converter de volta.
-- O USING no final falharia em rows com 'viewer', por isso o UPDATE antes do DROP.

ALTER TABLE "tenant_members" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "tenant_members" ALTER COLUMN "role" SET DEFAULT 'assistant'::text;--> statement-breakpoint
UPDATE "tenant_members" SET "role" = 'assistant' WHERE "role" = 'viewer';--> statement-breakpoint
DROP TYPE "public"."tenant_role";--> statement-breakpoint
CREATE TYPE "public"."tenant_role" AS ENUM('owner', 'admin', 'professional', 'assistant');--> statement-breakpoint
ALTER TABLE "tenant_members" ALTER COLUMN "role" SET DEFAULT 'assistant'::"public"."tenant_role";--> statement-breakpoint
ALTER TABLE "tenant_members" ALTER COLUMN "role" SET DATA TYPE "public"."tenant_role" USING "role"::"public"."tenant_role";
