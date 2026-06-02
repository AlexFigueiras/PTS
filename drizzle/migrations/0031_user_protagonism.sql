DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'encontros_tipo') THEN
    CREATE TYPE "public"."encontros_tipo" AS ENUM('articulacao_rede', 'reuniao_pts');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'participacao_usuario') THEN
    CREATE TYPE "public"."participacao_usuario" AS ENUM('presente', 'representado_familia', 'dispensado_por_incapacidade');
  END IF;
END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "encontros" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"plano_id" uuid NOT NULL,
	"tipo" "encontros_tipo" NOT NULL,
	"data" timestamp with time zone NOT NULL,
	"participantes" uuid[] NOT NULL,
	"usuario_presente" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "encontros" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "encontros" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

DROP POLICY IF EXISTS "encontros_tenant_select" ON "encontros";--> statement-breakpoint
CREATE POLICY "encontros_tenant_select" ON "encontros"
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()));--> statement-breakpoint

DROP POLICY IF EXISTS "encontros_tenant_insert" ON "encontros";--> statement-breakpoint
CREATE POLICY "encontros_tenant_insert" ON "encontros"
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT get_my_tenant_ids()));--> statement-breakpoint

DROP POLICY IF EXISTS "encontros_tenant_update" ON "encontros";--> statement-breakpoint
CREATE POLICY "encontros_tenant_update" ON "encontros"
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT get_my_tenant_ids()));--> statement-breakpoint

DROP POLICY IF EXISTS "encontros_tenant_delete" ON "encontros";--> statement-breakpoint
CREATE POLICY "encontros_tenant_delete" ON "encontros"
  FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT get_my_admin_tenant_ids()));--> statement-breakpoint

ALTER TABLE "pts_plans" ADD COLUMN IF NOT EXISTS "participacao_usuario" "participacao_usuario";--> statement-breakpoint
ALTER TABLE "pts_plans" ADD COLUMN IF NOT EXISTS "participacao_justificativa" text;--> statement-breakpoint

ALTER TABLE "encontros" DROP CONSTRAINT IF EXISTS "encontros_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "encontros" ADD CONSTRAINT "encontros_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encontros" DROP CONSTRAINT IF EXISTS "encontros_plano_id_pts_plans_id_fk";
--> statement-breakpoint
ALTER TABLE "encontros" ADD CONSTRAINT "encontros_plano_id_pts_plans_id_fk" FOREIGN KEY ("plano_id") REFERENCES "public"."pts_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encontros" DROP CONSTRAINT IF EXISTS "encontros_created_by_profiles_id_fk";
--> statement-breakpoint
ALTER TABLE "encontros" ADD CONSTRAINT "encontros_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_encontros_plano" ON "encontros" USING btree ("plano_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_encontros_tenant" ON "encontros" USING btree ("tenant_id");
