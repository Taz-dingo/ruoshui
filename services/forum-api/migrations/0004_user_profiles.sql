CREATE TABLE user_profiles (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  avatar_object_key TEXT,
  alumni_enrollment_year INTEGER CHECK (alumni_enrollment_year IS NULL OR alumni_enrollment_year BETWEEN 1950 AND 2100),
  alumni_graduation_year INTEGER CHECK (alumni_graduation_year IS NULL OR alumni_graduation_year BETWEEN 1950 AND 2100),
  alumni_department TEXT,
  alumni_major TEXT,
  updated_at INTEGER NOT NULL
);
