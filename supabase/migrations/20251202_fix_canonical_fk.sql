-- Fix FK constraints on canonical tables to point to public.users instead of auth.users
-- 
-- ROOT CAUSE:
-- The canonical tables (canonical_experiences, canonical_experience_bullets, canonical_skills)
-- had foreign key constraints pointing to auth.users, but our application uses a public.users table
-- that syncs from NextAuth sessions. This mismatch caused "Key (user_id) is not present in table users"
-- errors when inserting canonical data.
--
-- CONTEXT:
-- - NextAuth creates users in auth.users (Supabase Auth)
-- - Our app syncs these to public.users table for application data
-- - Canonical tables need to reference public.users, not auth.users
-- - This migration explicitly sets the FK to public.users schema

-- Drop existing FK constraints
ALTER TABLE canonical_experiences 
  DROP CONSTRAINT IF EXISTS canonical_experiences_user_id_fkey;

ALTER TABLE canonical_experience_bullets 
  DROP CONSTRAINT IF EXISTS canonical_experience_bullets_user_id_fkey;

ALTER TABLE canonical_skills 
  DROP CONSTRAINT IF EXISTS canonical_skills_user_id_fkey;

-- Re-add FK constraints explicitly pointing to public.users
ALTER TABLE canonical_experiences 
  ADD CONSTRAINT canonical_experiences_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE canonical_experience_bullets 
  ADD CONSTRAINT canonical_experience_bullets_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE canonical_skills 
  ADD CONSTRAINT canonical_skills_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

