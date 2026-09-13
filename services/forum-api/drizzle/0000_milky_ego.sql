CREATE TYPE "public"."media_status" AS ENUM('pending', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."post_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TABLE "forum_posts" (
	"id" varchar(120) PRIMARY KEY NOT NULL,
	"scene_id" varchar(120),
	"title" varchar(160) NOT NULL,
	"excerpt" varchar(280),
	"body" text NOT NULL,
	"cover_asset_id" varchar(120),
	"status" "post_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" varchar(120) PRIMARY KEY NOT NULL,
	"scene_id" varchar(120),
	"post_id" varchar(120),
	"object_key" varchar(512) NOT NULL,
	"bucket" varchar(120) NOT NULL,
	"mime_type" varchar(120) NOT NULL,
	"size_bytes" integer NOT NULL,
	"width" integer,
	"height" integer,
	"status" "media_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scene_pins" (
	"id" varchar(120) PRIMARY KEY NOT NULL,
	"scene_id" varchar(120) NOT NULL,
	"post_id" varchar(120),
	"title" varchar(120) NOT NULL,
	"summary" varchar(240),
	"position_x" real NOT NULL,
	"position_y" real NOT NULL,
	"position_z" real NOT NULL,
	"target_x" real,
	"target_y" real,
	"target_z" real,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scenes" (
	"id" varchar(120) PRIMARY KEY NOT NULL,
	"title" varchar(160) NOT NULL,
	"description" text,
	"asset_url" text,
	"preview_image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_scene_id_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_scene_id_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_post_id_forum_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."forum_posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_pins" ADD CONSTRAINT "scene_pins_scene_id_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_pins" ADD CONSTRAINT "scene_pins_post_id_forum_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."forum_posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "forum_posts_scene_id_idx" ON "forum_posts" USING btree ("scene_id");--> statement-breakpoint
CREATE UNIQUE INDEX "media_assets_object_key_idx" ON "media_assets" USING btree ("object_key");--> statement-breakpoint
CREATE INDEX "media_assets_post_id_idx" ON "media_assets" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "scene_pins_scene_id_idx" ON "scene_pins" USING btree ("scene_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scene_pins_scene_title_idx" ON "scene_pins" USING btree ("scene_id","title");