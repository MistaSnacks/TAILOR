-- ============================================================
-- Add atomic function to replace recommended jobs
-- Prevents race conditions by deleting and inserting in a single transaction
-- ============================================================

-- Function to atomically replace all recommended jobs for a user
-- Returns JSON with success status and count of inserted jobs
CREATE OR REPLACE FUNCTION replace_recommended_jobs_atomic(
  p_user_id UUID,
  p_job_records JSONB[]
)
RETURNS JSON AS $$
DECLARE
  v_inserted_count INTEGER;
BEGIN
  -- Delete existing recommended jobs for user (within transaction)
  DELETE FROM recommended_jobs
  WHERE user_id = p_user_id;

  -- Insert new recommended jobs (within same transaction)
  -- Each job_record is a JSONB object with 'job_data' field
  INSERT INTO recommended_jobs (user_id, job_data)
  SELECT 
    p_user_id,
    job_record->'job_data'
  FROM unnest(p_job_records) AS job_record;

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

  RETURN json_build_object(
    'success', true,
    'count', v_inserted_count
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role (handled via SECURITY DEFINER)
COMMENT ON FUNCTION replace_recommended_jobs_atomic IS 'Atomically replaces all recommended jobs for a user in a single transaction';
