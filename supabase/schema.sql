-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================
-- NextAuth Adapter Tables
-- Required for NextAuth authentication with Supabase adapter
-- ============================================================

-- Users table (NextAuth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  email TEXT UNIQUE,
  email_verified TIMESTAMPTZ,
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Accounts table (NextAuth - stores OAuth provider info)
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, provider_account_id)
);

-- Sessions table (NextAuth)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_token TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verification tokens table (NextAuth - for email verification)
CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- Indexes for NextAuth tables
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_session_token ON sessions(session_token);

-- ============================================================
-- Application Tables
-- ============================================================

-- Profiles table (links to NextAuth users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone_number TEXT,
  address TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  gemini_store_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  parsed_content JSONB,
  document_type TEXT NOT NULL DEFAULT 'unknown' CHECK (document_type IN ('resume', 'job_description', 'template', 'unknown')),
  has_placeholder_content BOOLEAN NOT NULL DEFAULT false,
  placeholder_summary JSONB DEFAULT '{}'::jsonb,
  parse_status TEXT NOT NULL DEFAULT 'pending' CHECK (parse_status IN ('pending', 'processing', 'completed', 'failed')),
  gemini_file_uri TEXT,
  chunk_count INTEGER DEFAULT 0,
  last_chunked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document chunks table (for File Search + embeddings)
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  chunk_size INTEGER NOT NULL,
  chunk_mime_type TEXT DEFAULT 'text/plain',
  gemini_file_uri TEXT,
  embedding vector(768),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jobs table
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  company TEXT,
  description TEXT NOT NULL,
  required_skills TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resume versions table
CREATE TABLE resume_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  template TEXT NOT NULL CHECK (template IN ('modern', 'classic', 'technical')),
  content JSONB NOT NULL,
  docx_url TEXT,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ATS scores table
CREATE TABLE ats_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resume_version_id UUID NOT NULL REFERENCES resume_versions(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  keyword_match INTEGER NOT NULL CHECK (keyword_match >= 0 AND keyword_match <= 100),
  semantic_similarity INTEGER NOT NULL CHECK (semantic_similarity >= 0 AND semantic_similarity <= 100),
  analysis JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat threads table
CREATE TABLE chat_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages table
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_parse_status ON documents(parse_status);
CREATE INDEX idx_document_chunks_document_id ON document_chunks(document_id);
-- Vector similarity index (requires pgvector extension)
CREATE INDEX idx_document_chunks_embedding ON document_chunks
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_resume_versions_user_id ON resume_versions(user_id);
CREATE INDEX idx_resume_versions_job_id ON resume_versions(job_id);
CREATE INDEX idx_ats_scores_resume_version_id ON ats_scores(resume_version_id);
CREATE INDEX idx_chat_threads_user_id ON chat_threads(user_id);
CREATE INDEX idx_chat_messages_thread_id ON chat_messages(thread_id);

-- ============================================================
-- Row Level Security (RLS) Policies
-- NOTE: With NextAuth, auth.uid() is not available
-- Authorization should be handled in API routes using NextAuth session
-- RLS is DISABLED for now - enable after implementing custom auth function
-- ============================================================

-- Uncomment these when implementing custom RLS with NextAuth
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE resume_versions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE ats_scores ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Profiles policies (DISABLED - auth.uid() not available with NextAuth)
-- CREATE POLICY "Users can view own profile" ON profiles
--   FOR SELECT USING (auth.uid() = user_id);
-- CREATE POLICY "Users can update own profile" ON profiles
--   FOR UPDATE USING (auth.uid() = user_id);
-- CREATE POLICY "Users can insert own profile" ON profiles
--   FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Documents policies (DISABLED)
-- CREATE POLICY "Users can view own documents" ON documents
--   FOR SELECT USING (auth.uid() = user_id);
-- CREATE POLICY "Users can insert own documents" ON documents
--   FOR INSERT WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "Users can update own documents" ON documents
--   FOR UPDATE USING (auth.uid() = user_id);
-- CREATE POLICY "Users can delete own documents" ON documents
--   FOR DELETE USING (auth.uid() = user_id);

-- Jobs policies (DISABLED)
-- CREATE POLICY "Users can view own jobs" ON jobs
--   FOR SELECT USING (auth.uid() = user_id);
-- CREATE POLICY "Users can insert own jobs" ON jobs
--   FOR INSERT WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "Users can update own jobs" ON jobs
--   FOR UPDATE USING (auth.uid() = user_id);
-- CREATE POLICY "Users can delete own jobs" ON jobs
--   FOR DELETE USING (auth.uid() = user_id);

-- Resume versions policies (DISABLED)
-- CREATE POLICY "Users can view own resume versions" ON resume_versions
--   FOR SELECT USING (auth.uid() = user_id);
-- CREATE POLICY "Users can insert own resume versions" ON resume_versions
--   FOR INSERT WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "Users can update own resume versions" ON resume_versions
--   FOR UPDATE USING (auth.uid() = user_id);
-- CREATE POLICY "Users can delete own resume versions" ON resume_versions
--   FOR DELETE USING (auth.uid() = user_id);

-- ATS scores policies (DISABLED)
-- CREATE POLICY "Users can view ats scores for own resumes" ON ats_scores
--   FOR SELECT USING (
--     EXISTS (
--       SELECT 1 FROM resume_versions
--       WHERE resume_versions.id = ats_scores.resume_version_id
--       AND resume_versions.user_id = auth.uid()
--     )
--   );

-- Chat threads policies (DISABLED)
-- CREATE POLICY "Users can view own chat threads" ON chat_threads
--   FOR SELECT USING (auth.uid() = user_id);
-- CREATE POLICY "Users can insert own chat threads" ON chat_threads
--   FOR INSERT WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "Users can update own chat threads" ON chat_threads
--   FOR UPDATE USING (auth.uid() = user_id);
-- CREATE POLICY "Users can delete own chat threads" ON chat_threads
--   FOR DELETE USING (auth.uid() = user_id);

-- Chat messages policies (DISABLED)
-- CREATE POLICY "Users can view messages in own threads" ON chat_messages
--   FOR SELECT USING (
--     EXISTS (
--       SELECT 1 FROM chat_threads
--       WHERE chat_threads.id = chat_messages.thread_id
--       AND chat_threads.user_id = auth.uid()
--     )
--   );
-- CREATE POLICY "Users can insert messages in own threads" ON chat_messages
--   FOR INSERT WITH CHECK (
--     EXISTS (
--       SELECT 1 FROM chat_threads
--       WHERE chat_threads.id = chat_messages.thread_id
--       AND chat_threads.user_id = auth.uid()
--     )
--   );

-- ============================================================
-- Atomic RAG Tables (Experiences, Skills, Bullets)
-- ============================================================
CREATE TABLE IF NOT EXISTS experiences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  title TEXT NOT NULL,
  location TEXT,
  start_date TEXT,
  end_date TEXT,
  is_current BOOLEAN DEFAULT false,
  source_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_experiences_user_id ON experiences(user_id);

CREATE TABLE IF NOT EXISTS experience_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  original_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_experience_sources_experience_id ON experience_sources(experience_id);
CREATE INDEX IF NOT EXISTS idx_experience_sources_document_id ON experience_sources(document_id);

CREATE TABLE IF NOT EXISTS experience_bullets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(768),
  importance_score INTEGER DEFAULT 0,
  source_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_experience_bullets_experience_id ON experience_bullets(experience_id);
CREATE INDEX IF NOT EXISTS idx_experience_bullets_embedding
  ON experience_bullets USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE TABLE IF NOT EXISTS experience_bullet_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bullet_id UUID NOT NULL REFERENCES experience_bullets(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_experience_bullet_sources_bullet_id ON experience_bullet_sources(bullet_id);

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
CREATE INDEX IF NOT EXISTS idx_skills_embedding
  ON skills USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE TABLE IF NOT EXISTS skill_aliases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(skill_id, alias)
);

CREATE INDEX IF NOT EXISTS idx_skill_aliases_alias ON skill_aliases(alias);

CREATE TABLE IF NOT EXISTS experience_skills (
  experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  relevance_score DOUBLE PRECISION DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (experience_id, skill_id)
);

-- ============================================================
-- Canonical Profile Layer (Phase 2)
-- ============================================================
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

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_document_chunks_updated_at BEFORE UPDATE ON document_chunks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_experiences_updated_at BEFORE UPDATE ON experiences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_experience_bullets_updated_at BEFORE UPDATE ON experience_bullets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_skills_updated_at BEFORE UPDATE ON skills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_canonical_experiences_updated_at BEFORE UPDATE ON canonical_experiences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_canonical_experience_bullets_updated_at BEFORE UPDATE ON canonical_experience_bullets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_canonical_skills_updated_at BEFORE UPDATE ON canonical_skills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Helper function for semantic search over document chunks
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector(768),
  user_uuid UUID,
  match_count INTEGER DEFAULT 5
)
RETURNS TABLE (
  document_id UUID,
  chunk_id UUID,
  chunk_index INTEGER,
  content TEXT,
  similarity DOUBLE PRECISION,
  gemini_file_uri TEXT,
  chunk_mime_type TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.document_id,
    dc.id AS chunk_id,
    dc.chunk_index,
    dc.content,
    1 - (dc.embedding <=> query_embedding) AS similarity,
    dc.gemini_file_uri,
    dc.chunk_mime_type
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  WHERE d.user_id = user_uuid
    AND dc.embedding IS NOT NULL
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resume_versions_updated_at BEFORE UPDATE ON resume_versions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_threads_updated_at BEFORE UPDATE ON chat_threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Storage bucket for resumes
INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', false);

-- Storage policies (DISABLED - auth.uid() not available with NextAuth)
-- Handle storage authorization in API routes
-- CREATE POLICY "Users can upload own files" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'resumes');
-- CREATE POLICY "Users can view own files" ON storage.objects
--   FOR SELECT USING (bucket_id = 'resumes');
-- CREATE POLICY "Users can update own files" ON storage.objects
--   FOR UPDATE USING (bucket_id = 'resumes');
-- CREATE POLICY "Users can delete own files" ON storage.objects
--   FOR DELETE USING (bucket_id = 'resumes');

