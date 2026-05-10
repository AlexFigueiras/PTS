CREATE TYPE "public"."record_type" AS ENUM('session_note', 'assessment', 'evolution');--> statement-breakpoint
CREATE TYPE "public"."record_status" AS ENUM('draft', 'finalized');--> statement-breakpoint
CREATE TABLE "clinical_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "patient_id" uuid NOT NULL,
  "professional_id" uuid NOT NULL,
  "type" "record_type" NOT NULL DEFAULT 'session_note',
  "title" text,
  "content" text NOT NULL,
  "session_date" date NOT NULL,
  "status" "record_status" NOT NULL DEFAULT 'draft',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);--> statement-breakpoint
ALTER TABLE "clinical_records" ADD CONSTRAINT "clinical_records_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_records" ADD CONSTRAINT "clinical_records_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_records" ADD CONSTRAINT "clinical_records_professional_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "records_tenant_idx" ON "clinical_records" ("tenant_id");--> statement-breakpoint
CREATE INDEX "records_patient_idx" ON "clinical_records" ("tenant_id", "patient_id");--> statement-breakpoint
CREATE INDEX "records_session_date_idx" ON "clinical_records" ("tenant_id", "patient_id", "session_date" DESC);
