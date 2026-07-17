CREATE TABLE "tactics_presence" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"state" text DEFAULT 'lobby' NOT NULL,
	"last_heartbeat_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tactics_presence" ADD CONSTRAINT "tactics_presence_user_id_wiki_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."wiki_users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "tp_last_heartbeat_idx" ON "tactics_presence" USING btree ("last_heartbeat_at");
