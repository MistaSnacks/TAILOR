-- Migration: Add parsed_job_context cache column to jobs table
-- This caches the Gemini-parsed job description to avoid re-parsing on regeneration
-- Saves ~8-20 seconds per resume regeneration for the same job

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS parsed_job_context JSONB DEFAULT NULL;

-- Add a comment explaining the column
COMMENT ON COLUMN jobs.parsed_job_context IS 'Cached ParsedJobDescription from Gemini to avoid re-parsing. Contains normalizedTitle, hardSkills, softSkills, keyPhrases, queries, etc.';

-- Index for quick lookup (optional, jobs are already queried by id)
-- CREATE INDEX IF NOT EXISTS idx_jobs_has_parsed_context ON jobs ((parsed_job_context IS NOT NULL));




