-- Phase 2: Canonical Profile Layer
-- Adds canonicalized experience, bullet, and skill tables used for the resume pipeline.

CREATE TABLE IF NOT EXISTS canonical_experiences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  normalized_company TEXT NOT NULL,
  display_company TEXT NOT NULL,
  primary_title TEXT,
  title_progression TEXT[] DEFAULT '{}'::TEXT[],
  primary_location TEXT,
  locations TEXT[] DEFAULT '{}'::TEXT[],
  start_date TEXT,
  end_date TEXT,
  is_current BOOLEAN DEFAULT false,
  source_experience_ids UUID[] DEFAULT '{}'::UUID[],
  source_count INTEGER DEFAULT 0,
  bullet_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_canonical_experiences_user_id ON canonical_experiences(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_canonical_experiences_key
  ON canonical_experiences(user_id, normalized_company, start_date, end_date);

CREATE TABLE IF NOT EXISTS canonical_experience_bullets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  canonical_experience_id UUID NOT NULL REFERENCES canonical_experiences(id) ON DELETE CASCADE,
  representative_bullet_id UUID REFERENCES experience_bullets(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  source_bullet_ids UUID[] DEFAULT '{}'::UUID[],
  source_count INTEGER DEFAULT 1,
  avg_similarity DOUBLE PRECISION DEFAULT 1,
  embedding vector(768),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_canonical_experience_bullets_user_id
  ON canonical_experience_bullets(user_id);
CREATE INDEX IF NOT EXISTS idx_canonical_experience_bullets_exp_id
  ON canonical_experience_bullets(canonical_experience_id);

CREATE TABLE IF NOT EXISTS canonical_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  controlled_key TEXT NOT NULL,
  label TEXT NOT NULL,
  category TEXT NOT NULL,
  source_skill_ids UUID[] DEFAULT '{}'::UUID[],
  source_count INTEGER DEFAULT 0,
  weight DOUBLE PRECISION DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, controlled_key)
);

CREATE INDEX IF NOT EXISTS idx_canonical_skills_user_id ON canonical_skills(user_id);

CREATE TRIGGER update_canonical_experiences_updated_at BEFORE UPDATE ON canonical_experiences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_canonical_experience_bullets_updated_at BEFORE UPDATE ON canonical_experience_bullets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_canonical_skills_updated_at BEFORE UPDATE ON canonical_skills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();




