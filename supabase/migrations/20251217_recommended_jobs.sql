-- Recommended Jobs Table
-- Stores personalized job recommendations for each user
-- Populated on first resume generation, refreshed weekly

CREATE TABLE IF NOT EXISTS recommended_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_recommended_jobs_user_id ON recommended_jobs(user_id);

-- Index for sorting by recency
CREATE INDEX IF NOT EXISTS idx_recommended_jobs_updated_at ON recommended_jobs(updated_at DESC);

-- RLS Policies
ALTER TABLE recommended_jobs ENABLE ROW LEVEL SECURITY;

-- Users can read their own recommended jobs
CREATE POLICY "Users can view own recommended jobs"
  ON recommended_jobs FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage all (for cron/API)
CREATE POLICY "Service role full access"
  ON recommended_jobs FOR ALL
  USING (auth.role() = 'service_role');

-- Add comment for documentation
COMMENT ON TABLE recommended_jobs IS 'Personalized job recommendations populated on first resume and refreshed weekly';
