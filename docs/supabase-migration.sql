-- =====================================================
-- TLM Finance - Data Migration Script
-- =====================================================
-- Purpose: Migrate existing tlm_plans data to new Pathways Home schema
--          while preserving all historical financial plans
-- Version: 1.0
-- Date: 2026-05-02
--
-- IMPORTANT:
-- 1. Backup your database before running this migration
-- 2. Run supabase-pathways-schema.sql FIRST
-- 3. Then run this migration script
-- 4. Test thoroughly before deploying to production
-- =====================================================

-- =====================================================
-- STEP 1: Add legacy flag to existing tlm_plans table
-- =====================================================

-- Add column to mark plans as migrated
ALTER TABLE tlm_plans
  ADD COLUMN IF NOT EXISTS migrated_to_pathways BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS migrated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pathways_plan_id UUID REFERENCES financial_plans(id) ON DELETE SET NULL;

COMMENT ON COLUMN tlm_plans.migrated_to_pathways IS 'Indicates if this legacy plan was migrated to Pathways Home system';
COMMENT ON COLUMN tlm_plans.pathways_plan_id IS 'Links to the new financial_plans record if migrated';

-- Create index for migration tracking
CREATE INDEX IF NOT EXISTS idx_tlm_plans_migrated ON tlm_plans(migrated_to_pathways);

-- =====================================================
-- STEP 2: Migration function for existing plans
-- =====================================================

CREATE OR REPLACE FUNCTION migrate_legacy_plan_to_pathways(p_legacy_plan_id UUID)
RETURNS UUID AS $$
DECLARE
  v_legacy_plan RECORD;
  v_enrollment_id UUID;
  v_plan_id UUID;
  v_version_id UUID;
  v_plan_data JSONB;
BEGIN
  -- Get the legacy plan
  SELECT * INTO v_legacy_plan
  FROM tlm_plans
  WHERE id = p_legacy_plan_id;

  IF v_legacy_plan IS NULL THEN
    RAISE EXCEPTION 'Legacy plan not found: %', p_legacy_plan_id;
  END IF;

  -- Check if already migrated
  IF v_legacy_plan.migrated_to_pathways THEN
    RAISE EXCEPTION 'Plan already migrated: %', p_legacy_plan_id;
  END IF;

  -- Create enrollment (not in active program, but for historical tracking)
  INSERT INTO pathways_enrollments (
    user_id,
    program_start_date,
    current_quarter,
    program_status,
    completion_percentage,
    notes
  ) VALUES (
    v_legacy_plan.user_id,
    COALESCE(v_legacy_plan.created_at::DATE, CURRENT_DATE),
    'COMPLETED', -- Mark as completed since these are legacy plans
    'ARCHIVED', -- Archive status for legacy data
    100, -- Consider legacy plans as "complete" for their purpose
    'Migrated from legacy tlm_plans table on ' || NOW()::TEXT
  )
  RETURNING id INTO v_enrollment_id;

  -- Create financial plan
  INSERT INTO financial_plans (
    enrollment_id,
    user_id,
    plan_name,
    plan_type,
    plan_start_date,
    plan_end_date,
    status,
    created_at,
    updated_at
  ) VALUES (
    v_enrollment_id,
    v_legacy_plan.user_id,
    COALESCE(v_legacy_plan.name, 'Legacy Financial Plan'),
    'LEGACY_TLM', -- Mark as legacy type
    COALESCE(v_legacy_plan.created_at::DATE, CURRENT_DATE),
    COALESCE(v_legacy_plan.created_at::DATE + INTERVAL '2 years', CURRENT_DATE + INTERVAL '2 years'),
    'ARCHIVED',
    v_legacy_plan.created_at,
    v_legacy_plan.updated_at
  )
  RETURNING id INTO v_plan_id;

  -- Convert legacy plan_data to new structure
  v_plan_data := jsonb_build_object(
    'legacy_data', v_legacy_plan.plan_data,
    'migrated_from', 'tlm_plans',
    'original_plan_id', v_legacy_plan.id,
    'migration_date', NOW(),
    'migration_note', 'This plan was created before the Pathways Home program and has been preserved for historical reference'
  );

  -- Create plan version
  INSERT INTO plan_versions (
    financial_plan_id,
    version_number,
    is_current,
    plan_data,
    created_at,
    created_by,
    change_description
  ) VALUES (
    v_plan_id,
    1,
    TRUE,
    v_plan_data,
    v_legacy_plan.created_at,
    v_legacy_plan.user_id,
    'Migrated from legacy tlm_plans table'
  )
  RETURNING id INTO v_version_id;

  -- Update legacy plan to mark as migrated
  UPDATE tlm_plans
  SET migrated_to_pathways = TRUE,
      migrated_at = NOW(),
      pathways_plan_id = v_plan_id
  WHERE id = p_legacy_plan_id;

  RETURN v_plan_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION migrate_legacy_plan_to_pathways IS 'Migrates a single legacy plan from tlm_plans to new Pathways Home structure';

-- =====================================================
-- STEP 3: Batch migration for all existing plans
-- =====================================================

CREATE OR REPLACE FUNCTION migrate_all_legacy_plans()
RETURNS TABLE (
  legacy_plan_id UUID,
  new_plan_id UUID,
  user_id UUID,
  success BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_plan RECORD;
  v_new_plan_id UUID;
BEGIN
  FOR v_plan IN
    SELECT id, user_id
    FROM tlm_plans
    WHERE migrated_to_pathways = FALSE OR migrated_to_pathways IS NULL
  LOOP
    BEGIN
      v_new_plan_id := migrate_legacy_plan_to_pathways(v_plan.id);

      RETURN QUERY SELECT
        v_plan.id,
        v_new_plan_id,
        v_plan.user_id,
        TRUE,
        NULL::TEXT;
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT
        v_plan.id,
        NULL::UUID,
        v_plan.user_id,
        FALSE,
        SQLERRM;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION migrate_all_legacy_plans IS 'Batch migrates all unmigrated plans from tlm_plans table';

-- =====================================================
-- STEP 4: Helper function to check migration status
-- =====================================================

CREATE OR REPLACE FUNCTION get_migration_status()
RETURNS TABLE (
  total_plans BIGINT,
  migrated_plans BIGINT,
  pending_migration BIGINT,
  migration_percentage DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_plans,
    COUNT(*) FILTER (WHERE migrated_to_pathways = TRUE)::BIGINT AS migrated_plans,
    COUNT(*) FILTER (WHERE migrated_to_pathways = FALSE OR migrated_to_pathways IS NULL)::BIGINT AS pending_migration,
    ROUND(
      (COUNT(*) FILTER (WHERE migrated_to_pathways = TRUE)::DECIMAL /
       NULLIF(COUNT(*), 0) * 100), 2
    ) AS migration_percentage
  FROM tlm_plans;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_migration_status IS 'Returns migration statistics for legacy plans';

-- =====================================================
-- STEP 5: View for accessing legacy plans alongside new plans
-- =====================================================

CREATE OR REPLACE VIEW all_financial_plans_unified AS
SELECT
  fp.id,
  fp.user_id,
  fp.plan_name,
  fp.plan_type,
  fp.status,
  fp.plan_start_date,
  fp.plan_end_date,
  fp.created_at,
  fp.updated_at,
  pv.plan_data,
  e.program_status,
  e.current_quarter,
  e.completion_percentage,
  'pathways_home' AS source
FROM financial_plans fp
LEFT JOIN plan_versions pv ON pv.financial_plan_id = fp.id AND pv.is_current = TRUE
LEFT JOIN pathways_enrollments e ON e.id = fp.enrollment_id

UNION ALL

SELECT
  tp.id,
  tp.user_id,
  tp.name AS plan_name,
  'LEGACY_TLM' AS plan_type,
  CASE
    WHEN tp.migrated_to_pathways THEN 'ARCHIVED'
    ELSE 'ACTIVE'
  END AS status,
  tp.created_at::DATE AS plan_start_date,
  (tp.created_at::DATE + INTERVAL '2 years') AS plan_end_date,
  tp.created_at,
  tp.updated_at,
  tp.plan_data,
  NULL AS program_status,
  NULL AS current_quarter,
  NULL AS completion_percentage,
  'legacy_tlm_plans' AS source
FROM tlm_plans tp
WHERE tp.migrated_to_pathways = FALSE OR tp.migrated_to_pathways IS NULL;

COMMENT ON VIEW all_financial_plans_unified IS 'Unified view of both legacy and Pathways Home financial plans';

-- =====================================================
-- STEP 6: Migration execution instructions
-- =====================================================

/*
TO RUN THE MIGRATION:

1. Check current status:
   SELECT * FROM get_migration_status();

2. Test migration with a single plan:
   SELECT migrate_legacy_plan_to_pathways('your-plan-id-here');

3. Run full migration:
   SELECT * FROM migrate_all_legacy_plans();

4. Verify migration results:
   SELECT * FROM get_migration_status();

5. Review migrated data:
   SELECT * FROM all_financial_plans_unified ORDER BY created_at DESC;

6. Check for any errors:
   SELECT * FROM migrate_all_legacy_plans() WHERE success = FALSE;

ROLLBACK (if needed):
If you need to undo the migration:

   -- Remove migrated records
   DELETE FROM plan_versions WHERE financial_plan_id IN (
     SELECT id FROM financial_plans WHERE plan_type = 'LEGACY_TLM'
   );

   DELETE FROM financial_plans WHERE plan_type = 'LEGACY_TLM';

   DELETE FROM pathways_enrollments WHERE program_status = 'ARCHIVED'
     AND notes LIKE 'Migrated from legacy tlm_plans%';

   -- Reset migration flags
   UPDATE tlm_plans
   SET migrated_to_pathways = FALSE,
       migrated_at = NULL,
       pathways_plan_id = NULL;

NOTES:
- Legacy plans are marked as 'ARCHIVED' and 'LEGACY_TLM' type
- Original tlm_plans table is NOT deleted (preserved for safety)
- Users can still access legacy plans through all_financial_plans_unified view
- New Pathways Home enrollments will use the full quarterly program structure
*/

-- =====================================================
-- STEP 7: Create example enrollment for testing
-- =====================================================

/*
To create a test Pathways Home enrollment:

SELECT enroll_user_in_pathways(
  p_user_id := auth.uid(), -- Replace with actual user ID
  p_start_date := CURRENT_DATE,
  p_coach_id := NULL -- Or UUID of a coach
);

This will:
1. Create the enrollment
2. Create all 4 quarters (Q1 starts as IN_PROGRESS)
3. Create a financial plan
4. Create initial plan version
*/

-- =====================================================
-- END OF MIGRATION SCRIPT
-- =====================================================
