-- ============================================================
-- Scheduled Deletions Table Migration
-- Tracks user accounts scheduled for deletion with grace period
-- ============================================================

-- Scheduled deletions table
CREATE TABLE IF NOT EXISTS scheduled_deletions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMPTZ NOT NULL,
  cancellation_token UUID NOT NULL DEFAULT uuid_generate_v4(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'cancelled', 'completed')),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_deletions_user_id ON scheduled_deletions(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_deletions_status ON scheduled_deletions(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_deletions_scheduled_for ON scheduled_deletions(scheduled_for);

-- Add comment for clarity
COMMENT ON TABLE scheduled_deletions IS 'Tracks user accounts scheduled for deletion with a grace period';
COMMENT ON COLUMN scheduled_deletions.scheduled_for IS 'Date when the account will be permanently deleted';
COMMENT ON COLUMN scheduled_deletions.cancellation_token IS 'Token used to verify cancellation requests';
COMMENT ON COLUMN scheduled_deletions.status IS 'pending = awaiting deletion, cancelled = user cancelled, completed = deleted';
