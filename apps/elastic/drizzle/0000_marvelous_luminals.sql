CREATE TABLE IF NOT EXISTS "organisations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"region" text NOT NULL,
	"apiKey" text NOT NULL
);
