-- ============================================================
-- Fix invites table foreign key constraint
-- 
-- ROOT CAUSE:
-- The invites table's created_by FK was pointing to auth.users (Supabase Auth)
-- instead of public.users (NextAuth users table). This caused FK violations
-- when creating invites because NextAuth users don't exist in auth.users.
--
-- SOLUTION:
-- Drop the existing FK constraint and recreate it pointing to public.users
-- ============================================================

-- Drop the incorrect FK constraint (pointing to auth.users)
ALTER TABLE invites 
  DROP CONSTRAINT IF EXISTS invites_created_by_fkey;

-- Also drop the used_by FK if it exists and has the same issue
ALTER TABLE invites 
  DROP CONSTRAINT IF EXISTS invites_used_by_fkey;

-- Re-add FK constraints explicitly pointing to public.users
ALTER TABLE invites 
  ADD CONSTRAINT invites_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;

-- Only add used_by FK if the column exists and should reference public.users
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invites' AND column_name = 'used_by'
  ) THEN
    ALTER TABLE invites 
      ADD CONSTRAINT invites_used_by_fkey 
      FOREIGN KEY (used_by) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Verify the fix
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_schema AS foreign_table_schema,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'invites' 
  AND tc.constraint_type = 'FOREIGN KEY';
