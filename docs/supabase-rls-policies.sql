-- =====================================================
-- TLM Finance - Row-Level Security (RLS) Policies
-- =====================================================
-- Purpose: Secure Pathways Home database with proper access control
-- Version: 1.0
-- Date: 2026-05-02
--
-- Security Model:
-- - PARTICIPANTS: Can view/edit their own data
-- - COACHES: Can view all assigned participants, edit with limitations
-- - ADMINS: Full access to all data
--
-- IMPORTANT: Run AFTER supabase-pathways-schema.sql
-- =====================================================

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE pathways_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE quarterly_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE quarterly_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_activities ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTIONS FOR ROLE DETECTION
-- =====================================================

-- Check if user is a coach
CREATE OR REPLACE FUNCTION is_coach(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Coaches have a role in user metadata
  -- Adjust this query based on your auth.users metadata structure
  RETURN EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = user_id
      AND raw_user_meta_data->>'role' = 'coach'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is an admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = user_id
      AND raw_user_meta_data->>'role' = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is assigned as coach to an enrollment
CREATE OR REPLACE FUNCTION is_assigned_coach(user_id UUID, enrollment_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM pathways_enrollments
    WHERE id = enrollment_id
      AND assigned_coach_id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user owns an enrollment
CREATE OR REPLACE FUNCTION owns_enrollment(user_id UUID, enrollment_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM pathways_enrollments
    WHERE id = enrollment_id
      AND user_id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 1. PATHWAYS_ENROLLMENTS POLICIES
-- =====================================================

-- Participants can view their own enrollments
CREATE POLICY "Participants can view own enrollments"
  ON pathways_enrollments
  FOR SELECT
  USING (auth.uid() = user_id);

-- Coaches can view enrollments they're assigned to
CREATE POLICY "Coaches can view assigned enrollments"
  ON pathways_enrollments
  FOR SELECT
  USING (
    is_coach(auth.uid())
    AND assigned_coach_id = auth.uid()
  );

-- Admins can view all enrollments
CREATE POLICY "Admins can view all enrollments"
  ON pathways_enrollments
  FOR SELECT
  USING (is_admin(auth.uid()));

-- Participants cannot create their own enrollments (admin/coach only)
-- This is intentional - enrollment is a formal process

-- Participants can update limited fields of their own enrollment
CREATE POLICY "Participants can update own enrollment notes"
  ON pathways_enrollments
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    -- Only allow updating notes field
    AND (
      NEW.user_id = OLD.user_id
      AND NEW.enrolled_at = OLD.enrolled_at
      AND NEW.program_start_date = OLD.program_start_date
      AND NEW.current_quarter = OLD.current_quarter
      AND NEW.program_status = OLD.program_status
      AND NEW.assigned_coach_id = OLD.assigned_coach_id
    )
  );

-- Coaches can update enrollments they're assigned to
CREATE POLICY "Coaches can update assigned enrollments"
  ON pathways_enrollments
  FOR UPDATE
  USING (
    is_coach(auth.uid())
    AND assigned_coach_id = auth.uid()
  )
  WITH CHECK (
    is_coach(auth.uid())
    AND assigned_coach_id = auth.uid()
  );

-- Admins can do everything
CREATE POLICY "Admins can insert enrollments"
  ON pathways_enrollments
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update all enrollments"
  ON pathways_enrollments
  FOR UPDATE
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete enrollments"
  ON pathways_enrollments
  FOR DELETE
  USING (is_admin(auth.uid()));

-- =====================================================
-- 2. QUARTERLY_PROGRESS POLICIES
-- =====================================================

-- Participants can view their own progress
CREATE POLICY "Participants can view own quarterly progress"
  ON quarterly_progress
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pathways_enrollments e
      WHERE e.id = quarterly_progress.enrollment_id
        AND e.user_id = auth.uid()
    )
  );

-- Coaches can view progress for assigned enrollments
CREATE POLICY "Coaches can view assigned quarterly progress"
  ON quarterly_progress
  FOR SELECT
  USING (
    is_coach(auth.uid())
    AND EXISTS (
      SELECT 1 FROM pathways_enrollments e
      WHERE e.id = quarterly_progress.enrollment_id
        AND e.assigned_coach_id = auth.uid()
    )
  );

-- Admins can view all progress
CREATE POLICY "Admins can view all quarterly progress"
  ON quarterly_progress
  FOR SELECT
  USING (is_admin(auth.uid()));

-- Coaches can update progress for assigned enrollments
CREATE POLICY "Coaches can update assigned quarterly progress"
  ON quarterly_progress
  FOR UPDATE
  USING (
    is_coach(auth.uid())
    AND EXISTS (
      SELECT 1 FROM pathways_enrollments e
      WHERE e.id = quarterly_progress.enrollment_id
        AND e.assigned_coach_id = auth.uid()
    )
  );

-- Admins can manage all progress
CREATE POLICY "Admins can manage quarterly progress"
  ON quarterly_progress
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- =====================================================
-- 3. QUARTERLY_CHECKINS POLICIES
-- =====================================================

-- Participants can view their own check-ins
CREATE POLICY "Participants can view own checkins"
  ON quarterly_checkins
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pathways_enrollments e
      WHERE e.id = quarterly_checkins.enrollment_id
        AND e.user_id = auth.uid()
    )
  );

-- Participants can create their own check-ins
CREATE POLICY "Participants can create own checkins"
  ON quarterly_checkins
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pathways_enrollments e
      WHERE e.id = quarterly_checkins.enrollment_id
        AND e.user_id = auth.uid()
    )
    AND submitted_by = auth.uid()
  );

-- Participants can update their own UNREVIEWED check-ins
CREATE POLICY "Participants can update own unreviewed checkins"
  ON quarterly_checkins
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pathways_enrollments e
      WHERE e.id = quarterly_checkins.enrollment_id
        AND e.user_id = auth.uid()
    )
    AND reviewed_by_coach = FALSE
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pathways_enrollments e
      WHERE e.id = quarterly_checkins.enrollment_id
        AND e.user_id = auth.uid()
    )
    AND reviewed_by_coach = FALSE
  );

-- Coaches can view check-ins for assigned enrollments
CREATE POLICY "Coaches can view assigned checkins"
  ON quarterly_checkins
  FOR SELECT
  USING (
    is_coach(auth.uid())
    AND EXISTS (
      SELECT 1 FROM pathways_enrollments e
      WHERE e.id = quarterly_checkins.enrollment_id
        AND e.assigned_coach_id = auth.uid()
    )
  );

-- Coaches can review (update) check-ins for assigned enrollments
CREATE POLICY "Coaches can review assigned checkins"
  ON quarterly_checkins
  FOR UPDATE
  USING (
    is_coach(auth.uid())
    AND EXISTS (
      SELECT 1 FROM pathways_enrollments e
      WHERE e.id = quarterly_checkins.enrollment_id
        AND e.assigned_coach_id = auth.uid()
    )
  );

-- Admins can manage all check-ins
CREATE POLICY "Admins can manage checkins"
  ON quarterly_checkins
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- =====================================================
-- 4. FINANCIAL_PLANS POLICIES
-- =====================================================

-- Participants can view their own plans
CREATE POLICY "Participants can view own plans"
  ON financial_plans
  FOR SELECT
  USING (auth.uid() = user_id);

-- Participants can create their own plans
CREATE POLICY "Participants can create own plans"
  ON financial_plans
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM pathways_enrollments e
      WHERE e.id = financial_plans.enrollment_id
        AND e.user_id = auth.uid()
    )
  );

-- Participants can update their own plans
CREATE POLICY "Participants can update own plans"
  ON financial_plans
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Coaches can view plans for assigned enrollments
CREATE POLICY "Coaches can view assigned plans"
  ON financial_plans
  FOR SELECT
  USING (
    is_coach(auth.uid())
    AND EXISTS (
      SELECT 1 FROM pathways_enrollments e
      WHERE e.id = financial_plans.enrollment_id
        AND e.assigned_coach_id = auth.uid()
    )
  );

-- Coaches can update plans IF coach_can_edit is TRUE
CREATE POLICY "Coaches can update editable assigned plans"
  ON financial_plans
  FOR UPDATE
  USING (
    is_coach(auth.uid())
    AND coach_can_edit = TRUE
    AND EXISTS (
      SELECT 1 FROM pathways_enrollments e
      WHERE e.id = financial_plans.enrollment_id
        AND e.assigned_coach_id = auth.uid()
    )
  );

-- Admins can manage all plans
CREATE POLICY "Admins can manage plans"
  ON financial_plans
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- =====================================================
-- 5. PLAN_VERSIONS POLICIES
-- =====================================================

-- Participants can view their own plan versions
CREATE POLICY "Participants can view own plan versions"
  ON plan_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM financial_plans fp
      WHERE fp.id = plan_versions.financial_plan_id
        AND fp.user_id = auth.uid()
    )
  );

-- Participants can create versions for their own plans
CREATE POLICY "Participants can create own plan versions"
  ON plan_versions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM financial_plans fp
      WHERE fp.id = plan_versions.financial_plan_id
        AND fp.user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- Participants can update their own plan versions
CREATE POLICY "Participants can update own plan versions"
  ON plan_versions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM financial_plans fp
      WHERE fp.id = plan_versions.financial_plan_id
        AND fp.user_id = auth.uid()
    )
  );

-- Coaches can view versions for assigned plans
CREATE POLICY "Coaches can view assigned plan versions"
  ON plan_versions
  FOR SELECT
  USING (
    is_coach(auth.uid())
    AND EXISTS (
      SELECT 1 FROM financial_plans fp
      JOIN pathways_enrollments e ON e.id = fp.enrollment_id
      WHERE fp.id = plan_versions.financial_plan_id
        AND e.assigned_coach_id = auth.uid()
    )
  );

-- Coaches can create versions for editable assigned plans
CREATE POLICY "Coaches can create versions for editable plans"
  ON plan_versions
  FOR INSERT
  WITH CHECK (
    is_coach(auth.uid())
    AND EXISTS (
      SELECT 1 FROM financial_plans fp
      JOIN pathways_enrollments e ON e.id = fp.enrollment_id
      WHERE fp.id = plan_versions.financial_plan_id
        AND e.assigned_coach_id = auth.uid()
        AND fp.coach_can_edit = TRUE
    )
    AND created_by = auth.uid()
  );

-- Admins can manage all versions
CREATE POLICY "Admins can manage plan versions"
  ON plan_versions
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- =====================================================
-- 6. MILESTONES POLICIES
-- =====================================================

-- Participants can view their own milestones
CREATE POLICY "Participants can view own milestones"
  ON milestones
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pathways_enrollments e
      WHERE e.id = milestones.enrollment_id
        AND e.user_id = auth.uid()
    )
  );

-- Participants can create their own milestones
CREATE POLICY "Participants can create own milestones"
  ON milestones
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pathways_enrollments e
      WHERE e.id = milestones.enrollment_id
        AND e.user_id = auth.uid()
    )
  );

-- Participants can update their own milestones
CREATE POLICY "Participants can update own milestones"
  ON milestones
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pathways_enrollments e
      WHERE e.id = milestones.enrollment_id
        AND e.user_id = auth.uid()
    )
  );

-- Participants can delete their own milestones
CREATE POLICY "Participants can delete own milestones"
  ON milestones
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM pathways_enrollments e
      WHERE e.id = milestones.enrollment_id
        AND e.user_id = auth.uid()
    )
  );

-- Coaches can view milestones for assigned enrollments
CREATE POLICY "Coaches can view assigned milestones"
  ON milestones
  FOR SELECT
  USING (
    is_coach(auth.uid())
    AND EXISTS (
      SELECT 1 FROM pathways_enrollments e
      WHERE e.id = milestones.enrollment_id
        AND e.assigned_coach_id = auth.uid()
    )
  );

-- Coaches can create milestones for assigned enrollments
CREATE POLICY "Coaches can create assigned milestones"
  ON milestones
  FOR INSERT
  WITH CHECK (
    is_coach(auth.uid())
    AND EXISTS (
      SELECT 1 FROM pathways_enrollments e
      WHERE e.id = milestones.enrollment_id
        AND e.assigned_coach_id = auth.uid()
    )
  );

-- Coaches can update milestones for assigned enrollments
CREATE POLICY "Coaches can update assigned milestones"
  ON milestones
  FOR UPDATE
  USING (
    is_coach(auth.uid())
    AND EXISTS (
      SELECT 1 FROM pathways_enrollments e
      WHERE e.id = milestones.enrollment_id
        AND e.assigned_coach_id = auth.uid()
    )
  );

-- Admins can manage all milestones
CREATE POLICY "Admins can manage milestones"
  ON milestones
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- =====================================================
-- 7. COACH_ACTIVITIES POLICIES
-- =====================================================

-- Participants can view activities visible to them
CREATE POLICY "Participants can view own activities"
  ON coach_activities
  FOR SELECT
  USING (
    participant_id = auth.uid()
    AND visible_to_participant = TRUE
  );

-- Coaches can view their own activities
CREATE POLICY "Coaches can view own activities"
  ON coach_activities
  FOR SELECT
  USING (coach_id = auth.uid());

-- Coaches can create activities for assigned enrollments
CREATE POLICY "Coaches can create activities"
  ON coach_activities
  FOR INSERT
  WITH CHECK (
    is_coach(auth.uid())
    AND coach_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM pathways_enrollments e
      WHERE e.id = coach_activities.enrollment_id
        AND e.assigned_coach_id = auth.uid()
    )
  );

-- Coaches can update their own activities
CREATE POLICY "Coaches can update own activities"
  ON coach_activities
  FOR UPDATE
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

-- Coaches can delete their own activities
CREATE POLICY "Coaches can delete own activities"
  ON coach_activities
  FOR DELETE
  USING (coach_id = auth.uid());

-- Admins can manage all activities
CREATE POLICY "Admins can manage coach activities"
  ON coach_activities
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- =====================================================
-- GRANT PUBLIC ACCESS TO HELPER FUNCTIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION is_coach TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION is_assigned_coach TO authenticated;
GRANT EXECUTE ON FUNCTION owns_enrollment TO authenticated;

-- =====================================================
-- TESTING QUERIES
-- =====================================================

/*
TO TEST RLS POLICIES:

1. As participant (logged in user):
   -- Should see own enrollment
   SELECT * FROM pathways_enrollments WHERE user_id = auth.uid();

   -- Should see own progress
   SELECT * FROM quarterly_progress WHERE enrollment_id IN (
     SELECT id FROM pathways_enrollments WHERE user_id = auth.uid()
   );

2. As coach (user with role='coach' in metadata):
   -- Should see assigned enrollments
   SELECT * FROM pathways_enrollments WHERE assigned_coach_id = auth.uid();

   -- Should see milestones for assigned participants
   SELECT m.* FROM milestones m
   JOIN pathways_enrollments e ON e.id = m.enrollment_id
   WHERE e.assigned_coach_id = auth.uid();

3. As admin (user with role='admin' in metadata):
   -- Should see ALL data
   SELECT COUNT(*) FROM pathways_enrollments;
   SELECT COUNT(*) FROM quarterly_progress;
   SELECT COUNT(*) FROM milestones;

4. Test cross-user access (should fail):
   -- Try to view another user's enrollment
   SELECT * FROM pathways_enrollments WHERE user_id != auth.uid();
   -- Should return no rows unless you're a coach/admin

5. Test update permissions:
   -- Participant tries to update own notes (should work)
   UPDATE pathways_enrollments SET notes = 'Test note' WHERE user_id = auth.uid();

   -- Participant tries to change coach assignment (should fail)
   UPDATE pathways_enrollments SET assigned_coach_id = 'some-uuid' WHERE user_id = auth.uid();
*/

-- =====================================================
-- NOTES ON ROLE ASSIGNMENT
-- =====================================================

/*
To assign roles to users, update their metadata in auth.users:

1. Make a user a coach:
   UPDATE auth.users
   SET raw_user_meta_data = raw_user_meta_data || '{"role": "coach"}'::jsonb
   WHERE id = 'user-uuid-here';

2. Make a user an admin:
   UPDATE auth.users
   SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb
   WHERE id = 'user-uuid-here';

3. Check a user's role:
   SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = 'user-uuid-here';

Alternatively, you can create a separate "roles" or "profiles" table
and modify the is_coach() and is_admin() functions to query that table instead.
*/

-- =====================================================
-- END OF RLS POLICIES
-- =====================================================
