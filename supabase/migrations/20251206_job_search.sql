-- Job Search Feature Tables
-- Adds saved jobs, search history, saved searches, and job preferences

-- ============================================================
-- Job Preferences Table
-- Stores user preferences for personalized job feed
-- ============================================================
CREATE TABLE IF NOT EXISTS job_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  titles TEXT[] DEFAULT '{}',
  locations TEXT[] DEFAULT '{}',
  remote_preferred BOOLEAN DEFAULT false,
  skills TEXT[] DEFAULT '{}',
  seniority TEXT[] DEFAULT '{}',
  employment_types TEXT[] DEFAULT '{}',
  min_salary INTEGER,
  salary_period TEXT CHECK (salary_period IN ('hourly', 'monthly', 'yearly')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_preferences_user_id ON job_preferences(user_id);

-- ============================================================
-- Saved Jobs Table
-- Stores jobs that users have bookmarked
-- ============================================================
CREATE TABLE IF NOT EXISTS saved_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL, -- source:source_id format (e.g., "linkedin:123456")
  job_data JSONB NOT NULL, -- Full normalized job data
  notes TEXT,
  applied BOOLEAN DEFAULT false,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_id ON saved_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_applied ON saved_jobs(user_id, applied);

-- ============================================================
-- Job Search History Table
-- Records user searches for recent searches feature
-- ============================================================
CREATE TABLE IF NOT EXISTS job_search_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  search_params JSONB NOT NULL, -- JobSearchParams
  result_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_search_history_user_id ON job_search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_job_search_history_created_at ON job_search_history(user_id, created_at DESC);

-- ============================================================
-- Saved Searches Table (Alerts)
-- Stores saved search queries for alerts/quick access
-- ============================================================
CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  search_params JSONB NOT NULL, -- JobSearchParams
  notify_email BOOLEAN DEFAULT false,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON saved_searches(user_id);

-- ============================================================
-- Triggers for updated_at
-- ============================================================
CREATE TRIGGER update_job_preferences_updated_at BEFORE UPDATE ON job_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_jobs_updated_at BEFORE UPDATE ON saved_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_searches_updated_at BEFORE UPDATE ON saved_searches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Add parsed_job_context column to jobs table (for caching)
-- ============================================================
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS parsed_job_context JSONB;




