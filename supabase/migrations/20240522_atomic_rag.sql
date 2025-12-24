-- Atomic RAG Schema Migration

-- ============================================================
-- Experiences
-- ============================================================
CREATE TABLE IF NOT EXISTS experiences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  title TEXT NOT NULL,
  location TEXT,
  start_date TEXT, -- YYYY-MM or YYYY
  end_date TEXT,   -- YYYY-MM, YYYY, or 'Present'
  is_current BOOLEAN DEFAULT false,
  source_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_experiences_user_id ON experiences(user_id);

-- Experience Sources (Link to Documents)
CREATE TABLE IF NOT EXISTS experience_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  original_text TEXT, -- The raw text block for this experience from this doc
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_experience_sources_experience_id ON experience_sources(experience_id);
CREATE INDEX IF NOT EXISTS idx_experience_sources_document_id ON experience_sources(document_id);

-- ============================================================
-- Bullets
-- ============================================================
CREATE TABLE IF NOT EXISTS experience_bullets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(768), -- For semantic search
  importance_score INTEGER DEFAULT 0,
  source_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_experience_bullets_experience_id ON experience_bullets(experience_id);
-- IVFFlat index for vector similarity search
-- IMPORTANT: IVFFlat indexes require sufficient data for proper centroid initialization.
-- This index is conditionally created only if the table has >= 100000 non-null embeddings.
-- If skipped, run VACUUM ANALYZE experience_bullets after data load, then create the index manually
-- or in a follow-up migration. For empty tables, creating IVFFlat indexes produces poor clustering.
-- Tuning notes:
--   - lists parameter: recommended value is rows/1000 for datasets < 1M vectors
--   - Lists is computed dynamically as GREATEST(1, CEIL(embedding_count / 1000.0))
--   - For datasets > 1M vectors, consider switching to HNSW index type
--   - To retune after data growth: DROP INDEX and recreate with adjusted lists value
--   - HNSW alternative: USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64)
DO $$
DECLARE
    embedding_count INTEGER;
    computed_lists INTEGER;
BEGIN
    SELECT COUNT(*) INTO embedding_count
    FROM experience_bullets
    WHERE embedding IS NOT NULL;
    
    IF embedding_count >= 100000 THEN
        -- Compute lists dynamically: rows/1000, minimum 1
        computed_lists := GREATEST(1, CEIL(embedding_count / 1000.0));
        CREATE INDEX IF NOT EXISTS idx_experience_bullets_embedding 
        ON experience_bullets USING ivfflat (embedding vector_cosine_ops) WITH (lists = computed_lists);
        RAISE NOTICE 'Created IVFFlat index for experience_bullets with % lists (computed from % embeddings)', computed_lists, embedding_count;
    ELSE
        RAISE NOTICE 'Skipping IVFFlat index creation for experience_bullets: table has % non-null embeddings (minimum 100000 required). To create the index later: run VACUUM ANALYZE experience_bullets, then CREATE INDEX idx_experience_bullets_embedding ON experience_bullets USING ivfflat (embedding vector_cosine_ops) WITH (lists = GREATEST(1, CEIL((SELECT COUNT(*) FROM experience_bullets WHERE embedding IS NOT NULL) / 1000.0)));', embedding_count;
    END IF;
END $$;

-- Bullet Sources
CREATE TABLE IF NOT EXISTS experience_bullet_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bullet_id UUID NOT NULL REFERENCES experience_bullets(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_experience_bullet_sources_bullet_id ON experience_bullet_sources(bullet_id);
CREATE INDEX IF NOT EXISTS idx_experience_bullet_sources_document_id ON experience_bullet_sources(document_id);

-- ============================================================
-- Skills
-- ============================================================
CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  canonical_name TEXT NOT NULL,
  embedding vector(768),
  source_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, canonical_name)
);

CREATE INDEX IF NOT EXISTS idx_skills_user_id ON skills(user_id);
-- IVFFlat index for vector similarity search
-- IMPORTANT: IVFFlat indexes require sufficient data for proper centroid initialization.
-- This index creation is deferred - it should be created after the skills table has been populated.
-- Create it manually or in a follow-up migration after bulk inserts, ensuring the table contains
-- data before running CREATE INDEX USING ivfflat. Optionally run ANALYZE on the table beforehand.
-- For empty tables, creating IVFFlat indexes produces poor clustering.
-- See experience_bullets index above for tuning guidance and conditional creation pattern.
-- To create after data load:
--   CREATE INDEX idx_skills_embedding ON skills USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Skill Aliases (e.g. "React.js" -> "React")
CREATE TABLE IF NOT EXISTS skill_aliases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(skill_id, alias)
);

CREATE INDEX IF NOT EXISTS idx_skill_aliases_alias ON skill_aliases(alias);

-- ============================================================
-- Junctions
-- ============================================================
-- Experience Skills (Skills demonstrated in an experience)
CREATE TABLE IF NOT EXISTS experience_skills (
  experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  relevance_score DOUBLE PRECISION DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (experience_id, skill_id)
);

-- ============================================================
-- Functions & Triggers
-- ============================================================
CREATE TRIGGER update_experiences_updated_at BEFORE UPDATE ON experiences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_experience_bullets_updated_at BEFORE UPDATE ON experience_bullets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_skills_updated_at BEFORE UPDATE ON skills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Helper function to match bullets
CREATE OR REPLACE FUNCTION match_experience_bullets(
  query_embedding vector(768),
  match_threshold DOUBLE PRECISION,
  match_count INTEGER,
  filter_user_id UUID
)
RETURNS TABLE (
  id UUID,
  experience_id UUID,
  content TEXT,
  similarity DOUBLE PRECISION
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    eb.id,
    eb.experience_id,
    eb.content,
    1 - (eb.embedding <=> query_embedding) AS similarity
  FROM experience_bullets eb
  JOIN experiences e ON eb.experience_id = e.id
  WHERE e.user_id = filter_user_id
    AND 1 - (eb.embedding <=> query_embedding) > match_threshold
  ORDER BY eb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Helper function to match skills
CREATE OR REPLACE FUNCTION match_skills(
  query_embedding vector(768),
  match_threshold DOUBLE PRECISION,
  match_count INTEGER,
  filter_user_id UUID
)
RETURNS TABLE (
  id UUID,
  canonical_name TEXT,
  similarity DOUBLE PRECISION
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.canonical_name,
    1 - (s.embedding <=> query_embedding) AS similarity
  FROM skills s
  WHERE s.user_id = filter_user_id
    AND 1 - (s.embedding <=> query_embedding) > match_threshold
  ORDER BY s.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
