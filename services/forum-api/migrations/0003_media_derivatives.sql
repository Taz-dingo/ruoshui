CREATE TABLE media_asset_derivatives (
  media_asset_id TEXT NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  variant TEXT NOT NULL CHECK (variant IN ('thumbnail')),
  object_key TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (media_asset_id, variant)
);

CREATE UNIQUE INDEX media_asset_derivatives_object_key_idx
  ON media_asset_derivatives(object_key);
