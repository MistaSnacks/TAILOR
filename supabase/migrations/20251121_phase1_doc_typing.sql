-- Phase 1 – Document typing & placeholder flags

ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS document_type TEXT NOT NULL DEFAULT 'unknown' CHECK (document_type IN ('resume', 'job_description', 'template', 'unknown'));

ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS has_placeholder_content BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS placeholder_summary JSONB DEFAULT '{}'::jsonb;




