-- Migration: Add personal information fields to profiles table
-- Date: 2025-01-21

-- Add personal information columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS portfolio_url TEXT;

-- Add check constraint for LinkedIn URL format (if not empty)
ALTER TABLE profiles
ADD CONSTRAINT linkedin_url_format CHECK (
  linkedin_url IS NULL OR 
  linkedin_url = '' OR 
  linkedin_url ~ '^https?://(www\.)?linkedin\.com/.*'
);

-- Add check constraint for Portfolio URL format (if not empty)  
ALTER TABLE profiles
ADD CONSTRAINT portfolio_url_format CHECK (
  portfolio_url IS NULL OR 
  portfolio_url = '' OR 
  portfolio_url ~ '^https?://.*'
);

-- Create index for faster lookups (optional, but good practice)
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
