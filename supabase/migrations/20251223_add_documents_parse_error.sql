-- Add parse error details to documents for better debugging/UX
-- Stores a small JSON payload like: { code: 'PARSE_FAILED', message: '...' }
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS parse_error JSONB;


