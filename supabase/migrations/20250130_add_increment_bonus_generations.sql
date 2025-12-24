-- ============================================================
-- Add atomic increment function for bonus_generations
-- Prevents race conditions when awarding referral bonuses
-- ============================================================

-- Function to atomically increment bonus_generations
CREATE OR REPLACE FUNCTION increment_bonus_generations(
  p_user_id UUID,
  p_amount INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET bonus_generations = bonus_generations + p_amount
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql;



