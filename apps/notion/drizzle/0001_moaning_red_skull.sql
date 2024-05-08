ALTER TABLE "organisations" ADD COLUMN "workspace_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "organisations" DROP COLUMN IF EXISTS "refresh_token";