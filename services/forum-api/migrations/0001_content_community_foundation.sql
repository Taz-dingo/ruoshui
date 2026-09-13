PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  display_name TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_identities (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('email')),
  subject TEXT NOT NULL,
  verified_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS auth_identities_provider_subject_idx
  ON auth_identities(provider, subject);
CREATE INDEX IF NOT EXISTS auth_identities_user_id_idx
  ON auth_identities(user_id);

CREATE TABLE IF NOT EXISTS auth_otp_challenges (
  id TEXT PRIMARY KEY NOT NULL,
  subject TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('login', 'change_email_current', 'change_email_new')),
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS auth_otp_subject_idx
  ON auth_otp_challenges(subject);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS sessions_token_hash_idx
  ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx
  ON sessions(user_id);

CREATE TABLE IF NOT EXISTS places (
  id TEXT PRIMARY KEY NOT NULL,
  scene_id TEXT REFERENCES scenes(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  intro TEXT,
  marker_x REAL NOT NULL,
  marker_y REAL NOT NULL,
  marker_z REAL NOT NULL,
  camera_x REAL NOT NULL,
  camera_y REAL NOT NULL,
  camera_z REAL NOT NULL,
  camera_target_x REAL NOT NULL,
  camera_target_y REAL NOT NULL,
  camera_target_z REAL NOT NULL,
  camera_fov_deg REAL CHECK (camera_fov_deg IS NULL OR (camera_fov_deg >= 20 AND camera_fov_deg <= 100)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS places_scene_id_idx ON places(scene_id);
CREATE UNIQUE INDEX IF NOT EXISTS places_scene_name_idx ON places(scene_id, name);

CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY NOT NULL,
  author_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unpublished', 'deleted')),
  published_revision_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS stories_author_user_id_idx ON stories(author_user_id);

CREATE TABLE IF NOT EXISTS story_revisions (
  id TEXT PRIMARY KEY NOT NULL,
  story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  created_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'published', 'changes_requested', 'rejected')),
  title TEXT CHECK (title IS NULL OR length(title) <= 160),
  body TEXT CHECK (body IS NULL OR length(body) <= 20000),
  memory_time TEXT CHECK (memory_time IS NULL OR length(memory_time) <= 120),
  location_kind TEXT NOT NULL DEFAULT 'none' CHECK (location_kind IN ('none', 'place', 'anchor')),
  place_id TEXT REFERENCES places(id) ON DELETE SET NULL,
  anchor_marker_x REAL,
  anchor_marker_y REAL,
  anchor_marker_z REAL,
  anchor_camera_x REAL,
  anchor_camera_y REAL,
  anchor_camera_z REAL,
  anchor_target_x REAL,
  anchor_target_y REAL,
  anchor_target_z REAL,
  anchor_fov_deg REAL CHECK (anchor_fov_deg IS NULL OR (anchor_fov_deg >= 20 AND anchor_fov_deg <= 100)),
  moderation_note TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CHECK (
    (location_kind = 'none' AND place_id IS NULL
      AND anchor_marker_x IS NULL AND anchor_marker_y IS NULL AND anchor_marker_z IS NULL
      AND anchor_camera_x IS NULL AND anchor_camera_y IS NULL AND anchor_camera_z IS NULL
      AND anchor_target_x IS NULL AND anchor_target_y IS NULL AND anchor_target_z IS NULL)
    OR
    (location_kind = 'place' AND place_id IS NOT NULL
      AND anchor_marker_x IS NULL AND anchor_marker_y IS NULL AND anchor_marker_z IS NULL
      AND anchor_camera_x IS NULL AND anchor_camera_y IS NULL AND anchor_camera_z IS NULL
      AND anchor_target_x IS NULL AND anchor_target_y IS NULL AND anchor_target_z IS NULL)
    OR
    (location_kind = 'anchor' AND place_id IS NULL
      AND anchor_marker_x IS NOT NULL AND anchor_marker_y IS NOT NULL AND anchor_marker_z IS NOT NULL
      AND anchor_camera_x IS NOT NULL AND anchor_camera_y IS NOT NULL AND anchor_camera_z IS NOT NULL
      AND anchor_target_x IS NOT NULL AND anchor_target_y IS NOT NULL AND anchor_target_z IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS story_revisions_story_id_idx ON story_revisions(story_id);
CREATE INDEX IF NOT EXISTS story_revisions_status_idx ON story_revisions(status);
CREATE INDEX IF NOT EXISTS story_revisions_place_id_idx ON story_revisions(place_id);

CREATE TABLE IF NOT EXISTS story_revision_media (
  story_revision_id TEXT NOT NULL REFERENCES story_revisions(id) ON DELETE CASCADE,
  media_asset_id TEXT NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
  sort_order INTEGER NOT NULL CHECK (sort_order >= 0 AND sort_order < 12),
  PRIMARY KEY (story_revision_id, media_asset_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS story_revision_media_order_idx
  ON story_revision_media(story_revision_id, sort_order);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY NOT NULL,
  story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  author_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  root_comment_id TEXT,
  reply_to_comment_id TEXT,
  body TEXT NOT NULL CHECK (length(trim(body)) > 0 AND length(body) <= 2000),
  status TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'hidden', 'deleted')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS comments_story_id_idx ON comments(story_id);
CREATE INDEX IF NOT EXISTS comments_root_comment_id_idx ON comments(root_comment_id);

CREATE TABLE IF NOT EXISTS story_likes (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, story_id)
);

CREATE TABLE IF NOT EXISTS comment_likes (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment_id TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, comment_id)
);
