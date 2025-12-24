-- ============================================================
-- Legacy User Support & Bonus Generation Expiration
-- Adds is_legacy flag for grandfathered users with full access
-- Adds is_admin flag for admin panel access
-- Adds bonus generation expiration date
-- ============================================================

-- Add is_legacy flag for grandfathered users with full access
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_legacy BOOLEAN DEFAULT false;

-- Add is_admin flag for admin panel access
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Add expiration for bonus generations (1 month from when earned)
ALTER TABLE users ADD COLUMN IF NOT EXISTS bonus_generations_expires_at TIMESTAMPTZ;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_users_is_legacy ON users(is_legacy);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);

-- Grant admin access to specified users
UPDATE users SET is_admin = true 
WHERE email IN ('cmcmath89@gmail.com', 'camren@gettailor.ai');

-- Grant legacy access to ALL existing users
-- This grandfathers everyone who signed up before Stripe integration
UPDATE users SET is_legacy = true;
