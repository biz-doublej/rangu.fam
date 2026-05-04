CREATE TABLE "wiki_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_name" text DEFAULT '이랑위키' NOT NULL,
	"site_description" text DEFAULT 'Rangu.fam의 지식 공유 공간' NOT NULL,
	"site_url" text,
	"default_theme" text DEFAULT 'light' NOT NULL,
	"allow_anonymous_editing" boolean DEFAULT false NOT NULL,
	"require_email_verification" boolean DEFAULT true NOT NULL,
	"auto_approve_edits" boolean DEFAULT true NOT NULL,
	"edit_conflict_resolution" text DEFAULT 'manual' NOT NULL,
	"max_edit_summary_length" integer DEFAULT 200 NOT NULL,
	"warn_on_large_edits" integer DEFAULT 5000 NOT NULL,
	"captcha_threshold" integer DEFAULT 3 NOT NULL,
	"rate_limit_edits" integer DEFAULT 10 NOT NULL,
	"ip_block_duration" integer DEFAULT 24 NOT NULL,
	"email_notifications" jsonb DEFAULT '{"watchlistChanges":true,"mentions":true,"discussions":true}'::jsonb NOT NULL,
	"search_engine" text DEFAULT 'postgres' NOT NULL,
	"index_categories" boolean DEFAULT true NOT NULL,
	"index_discussions" boolean DEFAULT true NOT NULL,
	"auto_backup" jsonb DEFAULT '{"enabled":true,"frequency":"daily","retention":30}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wiki_discussions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" uuid NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"author" text NOT NULL,
	"author_id" uuid,
	"category" text DEFAULT 'general' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"replies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"participants" text[] DEFAULT '{}' NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"is_locked" boolean DEFAULT false NOT NULL,
	"locked_by" text,
	"lock_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wiki_namespaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"prefix" text NOT NULL,
	"permissions" jsonb DEFAULT '{"read":[],"edit":[],"create":[],"delete":[]}'::jsonb NOT NULL,
	"allow_subpages" boolean DEFAULT true NOT NULL,
	"is_content_namespace" boolean DEFAULT true NOT NULL,
	"has_discussion" boolean DEFAULT true NOT NULL,
	"page_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wiki_namespaces_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "wiki_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"namespace" text DEFAULT 'main' NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"summary" text,
	"categories" text[] DEFAULT '{}' NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"aliases" text[] DEFAULT '{}' NOT NULL,
	"creator" text NOT NULL,
	"creator_id" uuid,
	"last_editor" text,
	"last_editor_id" uuid,
	"last_edit_date" timestamp with time zone DEFAULT now() NOT NULL,
	"last_edit_summary" text,
	"current_revision" integer DEFAULT 1 NOT NULL,
	"protection" jsonb DEFAULT '{"level":"none","allowedRoles":[]}'::jsonb NOT NULL,
	"is_redirect" boolean DEFAULT false NOT NULL,
	"redirect_target" text,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_by" text,
	"delete_reason" text,
	"is_stub" boolean DEFAULT false NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"unique_views" integer DEFAULT 0 NOT NULL,
	"edits" integer DEFAULT 0 NOT NULL,
	"watchers" text[] DEFAULT '{}' NOT NULL,
	"incoming_links" text[] DEFAULT '{}' NOT NULL,
	"outgoing_links" text[] DEFAULT '{}' NOT NULL,
	"table_of_contents" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"template_info" jsonb DEFAULT '{"isTemplate":false,"parameters":[]}'::jsonb NOT NULL,
	"edit_lock" jsonb DEFAULT '{"isLocked":false,"lockReason":"editing"}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wiki_pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "wiki_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" uuid NOT NULL,
	"revision_number" integer NOT NULL,
	"content" text NOT NULL,
	"summary" text,
	"author" text NOT NULL,
	"author_id" uuid,
	"author_ip" text,
	"edit_type" text DEFAULT 'edit' NOT NULL,
	"is_minor_edit" boolean DEFAULT false NOT NULL,
	"is_automated" boolean DEFAULT false NOT NULL,
	"content_length" integer NOT NULL,
	"size_change" integer DEFAULT 0 NOT NULL,
	"is_reverted" boolean DEFAULT false NOT NULL,
	"reverted_by" text,
	"revert_reason" text,
	"is_verified" boolean DEFAULT false NOT NULL,
	"verified_by" text,
	"timestamp_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wiki_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reason" text,
	"namespace" text DEFAULT 'main' NOT NULL,
	"target_title" text NOT NULL,
	"target_slug" text NOT NULL,
	"page_id" uuid,
	"content" text NOT NULL,
	"summary" text,
	"edit_summary" text,
	"categories" text[] DEFAULT '{}' NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"expected_revision" integer,
	"author" text NOT NULL,
	"author_id" uuid NOT NULL,
	"reviewed_by" text,
	"reviewer_id" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wiki_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"sso_subject" text,
	"discord_id" text,
	"discord_username" text,
	"discord_avatar" text,
	"display_name" text,
	"avatar" text,
	"bio" text,
	"signature" text,
	"role" text DEFAULT 'editor' NOT NULL,
	"permissions" jsonb DEFAULT '{"canEdit":true,"canDelete":false,"canProtect":false,"canBan":false,"canManageUsers":false}'::jsonb NOT NULL,
	"edits" integer DEFAULT 0 NOT NULL,
	"pages_created" integer DEFAULT 0 NOT NULL,
	"discussion_posts" integer DEFAULT 0 NOT NULL,
	"reputation" integer DEFAULT 0 NOT NULL,
	"preferences" jsonb DEFAULT '{"theme":"auto","timezone":"Asia/Seoul","emailNotifications":true,"showEmail":false,"autoWatchPages":true}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"ban_status" jsonb,
	"warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_login" timestamp with time zone,
	"last_activity" timestamp with time zone,
	"main_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wiki_users_username_unique" UNIQUE("username"),
	CONSTRAINT "wiki_users_email_unique" UNIQUE("email"),
	CONSTRAINT "wiki_users_sso_subject_unique" UNIQUE("sso_subject"),
	CONSTRAINT "wiki_users_discord_id_unique" UNIQUE("discord_id")
);
--> statement-breakpoint
CREATE TABLE "wiki_workshop_statements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "wiki_discussions" ADD CONSTRAINT "wiki_discussions_page_id_wiki_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."wiki_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiki_revisions" ADD CONSTRAINT "wiki_revisions_page_id_wiki_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."wiki_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wiki_discussions_page_idx" ON "wiki_discussions" USING btree ("page_id");--> statement-breakpoint
CREATE INDEX "wiki_discussions_status_idx" ON "wiki_discussions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "wiki_discussions_category_idx" ON "wiki_discussions" USING btree ("category");--> statement-breakpoint
CREATE INDEX "wiki_pages_namespace_idx" ON "wiki_pages" USING btree ("namespace");--> statement-breakpoint
CREATE INDEX "wiki_pages_categories_idx" ON "wiki_pages" USING btree ("categories");--> statement-breakpoint
CREATE INDEX "wiki_pages_views_idx" ON "wiki_pages" USING btree ("views");--> statement-breakpoint
CREATE INDEX "wiki_pages_last_edit_idx" ON "wiki_pages" USING btree ("last_edit_date");--> statement-breakpoint
CREATE UNIQUE INDEX "wiki_revisions_page_revnum_unique" ON "wiki_revisions" USING btree ("page_id","revision_number");--> statement-breakpoint
CREATE INDEX "wiki_revisions_author_idx" ON "wiki_revisions" USING btree ("author");--> statement-breakpoint
CREATE INDEX "wiki_revisions_timestamp_idx" ON "wiki_revisions" USING btree ("timestamp_at");--> statement-breakpoint
CREATE INDEX "wiki_submissions_status_created_idx" ON "wiki_submissions" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "wiki_submissions_target_slug_status_idx" ON "wiki_submissions" USING btree ("target_slug","status");--> statement-breakpoint
CREATE INDEX "wiki_users_role_idx" ON "wiki_users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "wiki_users_active_idx" ON "wiki_users" USING btree ("is_active");