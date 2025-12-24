-- ============================================================
-- Enable Row Level Security (RLS) on all application tables
-- ============================================================
-- 
-- This migration enables RLS as a security hardening measure.
-- Since this app uses NextAuth (not Supabase Auth), auth.uid() is not available.
-- All database access goes through API routes using the Service Role key,
-- which bypasses RLS. This means:
--   1. API routes continue to work normally (Service Role bypasses RLS).
--   2. The anon key becomes useless for querying data (security improvement).
--   3. No RLS policies are needed since we rely on application-level auth.
-- ============================================================

-- Core NextAuth tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_tokens ENABLE ROW LEVEL SECURITY;

-- Application tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ats_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Atomic RAG tables
ALTER TABLE experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience_bullets ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience_bullet_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience_skills ENABLE ROW LEVEL SECURITY;

-- Canonical profile layer tables
ALTER TABLE canonical_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE canonical_experience_bullets ENABLE ROW LEVEL SECURITY;
ALTER TABLE canonical_skills ENABLE ROW LEVEL SECURITY;

-- Education and certifications
ALTER TABLE canonical_education ENABLE ROW LEVEL SECURITY;
ALTER TABLE canonical_certifications ENABLE ROW LEVEL SECURITY;

-- Account management tables
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_uses ENABLE ROW LEVEL SECURITY;

-- Job features tables
ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommended_jobs ENABLE ROW LEVEL SECURITY;

-- Scheduled operations
ALTER TABLE scheduled_deletions ENABLE ROW LEVEL SECURITY;

-- Document chunks (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'document_chunks') THEN
    EXECUTE 'ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- Enriched bullet candidates (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'enriched_bullet_candidates') THEN
    EXECUTE 'ALTER TABLE enriched_bullet_candidates ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;
