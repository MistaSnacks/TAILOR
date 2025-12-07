-- Add city, state, zip and remote_preference columns to profiles table
-- for job search location preferences

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS zip text,
ADD COLUMN IF NOT EXISTS remote_preference text DEFAULT 'any' CHECK (remote_preference IN ('any', 'remote_only', 'hybrid', 'onsite'));

-- Create index on location fields for potential location-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_city ON profiles(city);
CREATE INDEX IF NOT EXISTS idx_profiles_state ON profiles(state);

COMMENT ON COLUMN profiles.city IS 'User city for job search location';
COMMENT ON COLUMN profiles.state IS 'User state (2-letter code) for job search location';
COMMENT ON COLUMN profiles.zip IS 'User ZIP code for job search location';
COMMENT ON COLUMN profiles.remote_preference IS 'User work location preference: any, remote_only, hybrid, onsite';


