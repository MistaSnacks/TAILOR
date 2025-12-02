-- Add source_resume_id column to documents table to track which resume a document was generated from
-- This allows us to prevent duplicate ingestion and maintain lineage

-- Add column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'source_resume_id'
    ) THEN
        ALTER TABLE documents ADD COLUMN source_resume_id uuid REFERENCES resume_versions(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create index for faster lookups
-- Note: CONCURRENTLY cannot be used with IF NOT EXISTS, so we check existence first
-- In production, consider running: CREATE INDEX CONCURRENTLY idx_documents_source_resume_id ON documents(source_resume_id) WHERE source_resume_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_source_resume_id ON documents(source_resume_id) WHERE source_resume_id IS NOT NULL;

-- Update document_type check to include generated_resume
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_document_type_check;
ALTER TABLE documents ADD CONSTRAINT documents_document_type_check 
    CHECK (document_type = ANY (ARRAY['resume'::text, 'job_description'::text, 'template'::text, 'unknown'::text, 'generated_resume'::text]));

-- Allow NULL storage_path for generated documents (they don't have a file)
ALTER TABLE documents ALTER COLUMN storage_path DROP NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN documents.source_resume_id IS 'Reference to the resume_version this document was generated from (for Add to Docs feature)';

