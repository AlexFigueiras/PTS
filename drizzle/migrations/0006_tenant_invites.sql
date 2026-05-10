CREATE TABLE "tenant_invites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "email" text NOT NULL,
  "role" "tenant_role" NOT NULL DEFAULT 'assistant',
  "token" uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  "expires_at" timestamp with time zone NOT NULL,
  "accepted_at" timestamp with time zone,
  "invited_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "tenant_invites" ADD CONSTRAINT "tenant_invites_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_invites" ADD CONSTRAINT "tenant_invites_invited_by_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invites_tenant_idx" ON "tenant_invites" ("tenant_id");--> statement-breakpoint
CREATE INDEX "invites_token_idx" ON "tenant_invites" ("token");--> statement-breakpoint
CREATE INDEX "invites_email_tenant_idx" ON "tenant_invites" ("tenant_id", "email");
