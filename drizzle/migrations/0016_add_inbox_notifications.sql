DO $$ BEGIN
 CREATE TYPE "public"."notification_type" AS ENUM('info', 'warning', 'error');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "inbox_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" "notification_type" DEFAULT 'info' NOT NULL,
	"read_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inbox_notifications_user_read_idx" ON "inbox_notifications" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inbox_notifications_tenant_idx" ON "inbox_notifications" USING btree ("tenant_id");--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "inbox_notifications" ADD CONSTRAINT "inbox_notifications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "inbox_notifications" ADD CONSTRAINT "inbox_notifications_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
