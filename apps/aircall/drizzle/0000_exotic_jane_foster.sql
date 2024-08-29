CREATE TABLE IF NOT EXISTS "organisations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"region" text NOT NULL,
	"access_token" text NOT NULL,
	"auth_user_id" text NOT NULL
);
