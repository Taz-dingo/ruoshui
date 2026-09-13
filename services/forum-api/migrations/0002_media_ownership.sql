ALTER TABLE media_assets ADD COLUMN owner_user_id TEXT REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS media_assets_owner_user_id_idx
  ON media_assets(owner_user_id);
