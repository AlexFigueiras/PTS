CREATE TABLE "pts_evolutions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pts_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"version" integer DEFAULT 2 NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"scores" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pts_documents" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "pts_documents" ADD COLUMN "is_locked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "pts_documents" ADD COLUMN "review_period_days" integer DEFAULT 30;--> statement-breakpoint
ALTER TABLE "pts_documents" ADD COLUMN "next_review_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pts_responses" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "pts_responses" ADD COLUMN "is_locked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "pts_responses" ADD COLUMN "review_period_days" integer DEFAULT 30;--> statement-breakpoint
ALTER TABLE "pts_responses" ADD COLUMN "next_review_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pts_evolutions" ADD CONSTRAINT "pts_evolutions_pts_id_pts_responses_id_fk" FOREIGN KEY ("pts_id") REFERENCES "public"."pts_responses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pts_evolutions" ADD CONSTRAINT "pts_evolutions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pts_evolutions" ADD CONSTRAINT "pts_evolutions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pts_evolutions_pts_idx" ON "pts_evolutions" USING btree ("pts_id");--> statement-breakpoint
CREATE INDEX "pts_evolutions_patient_idx" ON "pts_evolutions" USING btree ("patient_id");