CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"password" text,
	"profile_image" text DEFAULT '',
	"role" text DEFAULT 'member' NOT NULL,
	"bio" text DEFAULT '',
	"favorite_genres" text[] DEFAULT '{}' NOT NULL,
	"favorite_tracks_ids" text[] DEFAULT '{}' NOT NULL,
	"playlists_ids" text[] DEFAULT '{}' NOT NULL,
	"following_ids" text[] DEFAULT '{}' NOT NULL,
	"followers_ids" text[] DEFAULT '{}' NOT NULL,
	"last_login" timestamp with time zone DEFAULT now() NOT NULL,
	"total_plays" integer DEFAULT 0 NOT NULL,
	"total_likes" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"username" text NOT NULL,
	"intro" text DEFAULT '' NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"website" text,
	"phone" text,
	"birthdate" timestamp with time zone,
	"military_info" jsonb,
	"skills" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"projects" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"experience" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"education" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"social_links" jsonb,
	"recent_posts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"likes_received" integer DEFAULT 0 NOT NULL,
	"project_count" integer DEFAULT 0 NOT NULL,
	"followers" text[] DEFAULT '{}' NOT NULL,
	"following" text[] DEFAULT '{}' NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"show_email" boolean DEFAULT false NOT NULL,
	"show_phone" boolean DEFAULT false NOT NULL,
	"allow_comments" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "profiles_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "bookmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"description" text,
	"icon" text DEFAULT '🔗',
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "card_drops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"card_id" text NOT NULL,
	"drop_type" text NOT NULL,
	"dropped_at" timestamp with time zone DEFAULT now() NOT NULL,
	"daily_drop_count" integer NOT NULL,
	"crafting_attempt" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"card_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"rarity" text NOT NULL,
	"description" text NOT NULL,
	"image_url" text NOT NULL,
	"member" text,
	"year" integer,
	"period" text,
	"is_group_card" boolean DEFAULT false NOT NULL,
	"drop_rate" double precision NOT NULL,
	"max_copies" integer,
	"can_be_used_for_crafting" boolean DEFAULT false NOT NULL,
	"crafting_recipe" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cards_card_id_unique" UNIQUE("card_id")
);
--> statement-breakpoint
CREATE TABLE "user_card_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"last_drop_date" timestamp with time zone DEFAULT now() NOT NULL,
	"daily_drops_used" integer DEFAULT 0 NOT NULL,
	"total_drops_used" integer DEFAULT 0 NOT NULL,
	"total_cards_owned" integer DEFAULT 0 NOT NULL,
	"unique_cards_owned" integer DEFAULT 0 NOT NULL,
	"total_cards_collected" integer DEFAULT 0 NOT NULL,
	"basic_cards_owned" integer DEFAULT 0 NOT NULL,
	"rare_cards_owned" integer DEFAULT 0 NOT NULL,
	"epic_cards_owned" integer DEFAULT 0 NOT NULL,
	"legendary_cards_owned" integer DEFAULT 0 NOT NULL,
	"material_cards_owned" integer DEFAULT 0 NOT NULL,
	"crafting_attempts" integer DEFAULT 0 NOT NULL,
	"successful_crafts" integer DEFAULT 0 NOT NULL,
	"failed_crafts" integer DEFAULT 0 NOT NULL,
	"year_card_completion" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"achievements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_card_stats_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"card_id" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"acquired_at" timestamp with time zone DEFAULT now() NOT NULL,
	"acquired_by" text DEFAULT 'drop' NOT NULL,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"is_locked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discord_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discord_id" text NOT NULL,
	"discord_username" text,
	"discord_avatar" text,
	"member_id" text,
	"member_linked_at" timestamp with time zone,
	"wiki_user_id" uuid,
	"wiki_username" text,
	"wiki_linked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discord_links_discord_id_unique" UNIQUE("discord_id")
);
--> statement-breakpoint
CREATE TABLE "images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" text NOT NULL,
	"original_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"data" text NOT NULL,
	"uploaded_by" text NOT NULL,
	"uploaded_by_id" text NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"description" text,
	"is_public" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "images_filename_unique" UNIQUE("filename")
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"original_path" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"category" text DEFAULT 'other' NOT NULL,
	"grid_fs_id" text NOT NULL,
	"description" text,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"checksum" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_assets_original_path_unique" UNIQUE("original_path")
);
--> statement-breakpoint
CREATE TABLE "spotlight_slides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"src_path" text NOT NULL,
	"poster_path" text,
	"order" integer DEFAULT 0 NOT NULL,
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content" text NOT NULL,
	"user_id" text NOT NULL,
	"user_by_id" text NOT NULL,
	"username" text NOT NULL,
	"track_id" text,
	"playlist_id" text,
	"parent_comment_id" text,
	"replies_ids" text[] DEFAULT '{}' NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"is_edited" boolean DEFAULT false NOT NULL,
	"edited_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_name" text DEFAULT 'Rangu.fam' NOT NULL,
	"site_description" text DEFAULT '네 친구들의 소중한 공간' NOT NULL,
	"formation_date" timestamp with time zone NOT NULL,
	"complete_date" timestamp with time zone NOT NULL,
	"site_creation_date" timestamp with time zone NOT NULL,
	"events" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"milestones" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"stats" jsonb,
	"planned_events" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"version_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_drops" ADD CONSTRAINT "card_drops_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_card_stats" ADD CONSTRAINT "user_card_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_cards" ADD CONSTRAINT "user_cards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookmarks_user_order_idx" ON "bookmarks" USING btree ("user_id","order");--> statement-breakpoint
CREATE INDEX "card_drops_user_dropped_idx" ON "card_drops" USING btree ("user_id","dropped_at");--> statement-breakpoint
CREATE INDEX "card_drops_user_type_dropped_idx" ON "card_drops" USING btree ("user_id","drop_type","dropped_at");--> statement-breakpoint
CREATE INDEX "cards_type_rarity_idx" ON "cards" USING btree ("type","rarity");--> statement-breakpoint
CREATE INDEX "cards_member_year_period_idx" ON "cards" USING btree ("member","year","period");--> statement-breakpoint
CREATE INDEX "cards_drop_rate_idx" ON "cards" USING btree ("drop_rate");--> statement-breakpoint
CREATE INDEX "ucs_total_cards_idx" ON "user_card_stats" USING btree ("total_cards_owned");--> statement-breakpoint
CREATE INDEX "ucs_unique_cards_idx" ON "user_card_stats" USING btree ("unique_cards_owned");--> statement-breakpoint
CREATE UNIQUE INDEX "user_cards_user_card_unique" ON "user_cards" USING btree ("user_id","card_id");--> statement-breakpoint
CREATE INDEX "user_cards_user_fav_idx" ON "user_cards" USING btree ("user_id","is_favorite");--> statement-breakpoint
CREATE INDEX "user_cards_user_acquired_idx" ON "user_cards" USING btree ("user_id","acquired_at");--> statement-breakpoint
CREATE INDEX "images_uploaded_by_idx" ON "images" USING btree ("uploaded_by_id");--> statement-breakpoint
CREATE INDEX "images_category_idx" ON "images" USING btree ("category");--> statement-breakpoint
CREATE INDEX "images_created_at_idx" ON "images" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "images_mime_type_idx" ON "images" USING btree ("mime_type");--> statement-breakpoint
CREATE INDEX "media_category_created_idx" ON "media_assets" USING btree ("category","created_at");--> statement-breakpoint
CREATE INDEX "media_tags_idx" ON "media_assets" USING btree ("tags");--> statement-breakpoint
CREATE INDEX "media_checksum_idx" ON "media_assets" USING btree ("checksum");--> statement-breakpoint
CREATE INDEX "spotlight_active_order_idx" ON "spotlight_slides" USING btree ("is_active","order");--> statement-breakpoint
CREATE INDEX "spotlight_src_path_idx" ON "spotlight_slides" USING btree ("src_path");--> statement-breakpoint
CREATE INDEX "comments_track_created_idx" ON "comments" USING btree ("track_id","created_at");--> statement-breakpoint
CREATE INDEX "comments_playlist_created_idx" ON "comments" USING btree ("playlist_id","created_at");--> statement-breakpoint
CREATE INDEX "comments_user_by_id_idx" ON "comments" USING btree ("user_by_id");--> statement-breakpoint
CREATE INDEX "comments_parent_idx" ON "comments" USING btree ("parent_comment_id");