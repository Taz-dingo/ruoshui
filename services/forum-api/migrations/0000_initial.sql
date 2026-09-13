PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS scenes (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  asset_url TEXT,
  preview_image TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS forum_posts (
  id TEXT PRIMARY KEY NOT NULL,
  scene_id TEXT REFERENCES scenes(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  body TEXT NOT NULL,
  cover_asset_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS scene_pins (
  id TEXT PRIMARY KEY NOT NULL,
  scene_id TEXT NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  post_id TEXT REFERENCES forum_posts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  summary TEXT,
  position_x REAL NOT NULL,
  position_y REAL NOT NULL,
  position_z REAL NOT NULL,
  target_x REAL,
  target_y REAL,
  target_z REAL,
  metadata TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY NOT NULL,
  scene_id TEXT REFERENCES scenes(id) ON DELETE SET NULL,
  post_id TEXT REFERENCES forum_posts(id) ON DELETE SET NULL,
  object_key TEXT NOT NULL,
  bucket TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'failed')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS forum_posts_scene_id_idx ON forum_posts(scene_id);
CREATE UNIQUE INDEX IF NOT EXISTS media_assets_object_key_idx ON media_assets(object_key);
CREATE INDEX IF NOT EXISTS media_assets_post_id_idx ON media_assets(post_id);
CREATE INDEX IF NOT EXISTS scene_pins_scene_id_idx ON scene_pins(scene_id);
CREATE UNIQUE INDEX IF NOT EXISTS scene_pins_scene_title_idx ON scene_pins(scene_id, title);
