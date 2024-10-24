CREATE TABLE IF NOT EXISTS "organisations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"access_token" text NOT NULL,
	"auth_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"domain" text NOT NULL,
	"refresh_token" text NOT NULL,
	"portal_id" integer NOT NULL,
	"timezone" text NOT NULL,
	"region" text NOT NULL
);
