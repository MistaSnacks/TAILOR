-- ============================================================
-- Add atomic function to process referrals
-- Prevents TOCTOU race conditions by checking status,
-- awarding bonuses, and updating status in a single transaction
-- ============================================================

-- Function to atomically process a referral
-- Returns JSON with success status and error message if failed
CREATE OR REPLACE FUNCTION process_referral_atomic(
  p_referral_code TEXT,
  p_referee_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_referral_id UUID;
  v_referrer_id UUID;
  v_current_status TEXT;
  v_rows_updated INTEGER;
BEGIN
  -- Find the referral and lock the row for update
  SELECT id, referrer_id, status
  INTO v_referral_id, v_referrer_id, v_current_status
  FROM referrals
  WHERE referral_code = p_referral_code
    AND status = 'pending'
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  -- Check if referral exists
  IF v_referral_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid or expired referral code'
    );
  END IF;

  -- Prevent self-referral
  IF v_referrer_id = p_referee_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cannot use your own referral code'
    );
  END IF;

  -- Double-check status (should still be pending due to row lock)
  IF v_current_status != 'pending' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Referral already processed'
    );
  END IF;

  -- Award bonuses atomically (within same transaction)
  -- Award 10 generations to referrer
  UPDATE users
  SET bonus_generations = bonus_generations + 10
  WHERE id = v_referrer_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Referrer not found'
    );
  END IF;

  -- Award 5 generations to referee
  UPDATE users
  SET bonus_generations = bonus_generations + 5
  WHERE id = p_referee_id;

  IF NOT FOUND THEN
    -- Rollback referrer bonus
    UPDATE users
    SET bonus_generations = bonus_generations - 10
    WHERE id = v_referrer_id;
    
    RETURN json_build_object(
      'success', false,
      'error', 'Referee not found'
    );
  END IF;

  -- Update referral status atomically (only if still pending)
  UPDATE referrals
  SET 
    referee_id = p_referee_id,
    status = 'completed',
    completed_at = NOW(),
    referrer_bonus_awarded = true,
    referee_bonus_awarded = true
  WHERE id = v_referral_id
    AND status = 'pending';

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  -- If no rows were updated, another process already completed it
  IF v_rows_updated = 0 THEN
    -- Rollback bonuses
    UPDATE users
    SET bonus_generations = bonus_generations - 10
    WHERE id = v_referrer_id;
    
    UPDATE users
    SET bonus_generations = bonus_generations - 5
    WHERE id = p_referee_id;
    
    RETURN json_build_object(
      'success', false,
      'error', 'Referral already processed by another request'
    );
  END IF;

  -- Success!
  RETURN json_build_object(
    'success', true,
    'referral_id', v_referral_id
  );
END;
$$ LANGUAGE plpgsql;



