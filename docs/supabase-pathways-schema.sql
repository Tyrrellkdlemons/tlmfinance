-- =====================================================
-- TLM Finance - Pathways Home Database Schema
-- =====================================================
-- Purpose: Transform static financial planning into
--          quarterly-based Pathways Home rental assistance program
-- Version: 1.0
-- Date: 2026-05-02
--
-- IMPORTANT: Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. PATHWAYS ENROLLMENTS
-- =====================================================
-- Core table tracking participant enrollment in the program
-- Each user gets ONE active enrollment at a time

CREATE TABLE IF NOT EXISTS pathways_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Program metadata
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  program_start_date DATE NOT NULL,
  expected_completion_date DATE GENERATED ALWAYS AS (program_start_date + INTERVAL '2 years') STORED,
  actual_completion_date DATE,

  -- Current state
  current_quarter TEXT CHECK (current_quarter IN ('Q1', 'Q2', 'Q3', 'Q4', 'COMPLETED', 'WITHDRAWN')) DEFAULT 'Q1',
  program_status TEXT CHECK (program_status IN ('ACTIVE', 'ON_HOLD', 'COMPLETED', 'WITHDRAWN')) DEFAULT 'ACTIVE',

  -- Progress tracking
  completion_percentage DECIMAL(5,2) DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  quarters_completed INTEGER DEFAULT 0 CHECK (quarters_completed >= 0 AND quarters_completed <= 4),

  -- Coach assignment
  assigned_coach_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  coach_assigned_at TIMESTAMPTZ,

  -- Administrative
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(user_id, program_status)
    WHERE program_status = 'ACTIVE', -- Only one active enrollment per user

  -- Indexes
  CHECK (actual_completion_date IS NULL OR actual_completion_date >= program_start_date)
);

CREATE INDEX idx_enrollments_user ON pathways_enrollments(user_id);
CREATE INDEX idx_enrollments_coach ON pathways_enrollments(assigned_coach_id);
CREATE INDEX idx_enrollments_status ON pathways_enrollments(program_status);
CREATE INDEX idx_enrollments_quarter ON pathways_enrollments(current_quarter);

-- =====================================================
-- 2. QUARTERLY PROGRESS
-- =====================================================
-- Tracks progress through each of the 4 quarters
-- One row per quarter per enrollment

CREATE TABLE IF NOT EXISTS quarterly_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID REFERENCES pathways_enrollments(id) ON DELETE CASCADE,

  -- Quarter identification
  quarter_number INTEGER CHECK (quarter_number IN (1, 2, 3, 4)),
  quarter_name TEXT CHECK (quarter_name IN ('Q1', 'Q2', 'Q3', 'Q4')),

  -- Timeline
  quarter_start_date DATE NOT NULL,
  quarter_end_date DATE NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Status
  status TEXT CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED')) DEFAULT 'NOT_STARTED',

  -- Quarter-specific goals (from Pathways Home docs)
  primary_goal TEXT NOT NULL, -- e.g., "Stabilize housing & secure income"
  goal_description TEXT,

  -- Progress metrics
  milestones_completed INTEGER DEFAULT 0,
  milestones_total INTEGER DEFAULT 0,
  completion_percentage DECIMAL(5,2) DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),

  -- Check-in tracking
  checkin_completed BOOLEAN DEFAULT FALSE,
  checkin_completed_at TIMESTAMPTZ,

  -- Coach feedback
  coach_notes TEXT,
  coach_approved BOOLEAN DEFAULT FALSE,
  coach_approved_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(enrollment_id, quarter_number),
  CHECK (quarter_end_date > quarter_start_date),
  CHECK (completed_at IS NULL OR completed_at >= started_at)
);

CREATE INDEX idx_quarterly_progress_enrollment ON quarterly_progress(enrollment_id);
CREATE INDEX idx_quarterly_progress_status ON quarterly_progress(status);
CREATE INDEX idx_quarterly_progress_quarter ON quarterly_progress(quarter_number);

-- =====================================================
-- 3. QUARTERLY CHECK-INS
-- =====================================================
-- Stores answers to quarterly check-in questions
-- 15 questions per quarter (from Pathways Home template)

CREATE TABLE IF NOT EXISTS quarterly_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quarterly_progress_id UUID REFERENCES quarterly_progress(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES pathways_enrollments(id) ON DELETE CASCADE,

  -- Identification
  quarter_number INTEGER CHECK (quarter_number IN (1, 2, 3, 4)),

  -- Check-in data (JSONB for flexibility with 15+ questions)
  checkin_data JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Structure example:
  -- {
  --   "housing_status": "stable",
  --   "employment_status": "employed_fulltime",
  --   "income_monthly": 3500,
  --   "expenses_monthly": 2800,
  --   "savings_current": 1200,
  --   "debt_current": 5000,
  --   "goals_achieved": ["found_job", "opened_savings"],
  --   "challenges": "Need help with credit repair",
  --   "support_needed": ["financial_literacy", "credit_counseling"],
  --   ...
  -- }

  -- Submission metadata
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Review tracking
  reviewed_by_coach BOOLEAN DEFAULT FALSE,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  coach_feedback TEXT,

  -- Version control (in case participant updates answers)
  version INTEGER DEFAULT 1,
  is_latest BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_checkins_progress ON quarterly_checkins(quarterly_progress_id);
CREATE INDEX idx_checkins_enrollment ON quarterly_checkins(enrollment_id);
CREATE INDEX idx_checkins_quarter ON quarterly_checkins(quarter_number);
CREATE INDEX idx_checkins_latest ON quarterly_checkins(is_latest) WHERE is_latest = TRUE;
CREATE INDEX idx_checkins_data ON quarterly_checkins USING GIN(checkin_data);

-- =====================================================
-- 4. FINANCIAL PLANS
-- =====================================================
-- Metadata for 2-year financial plans
-- References the versioned plan data in plan_versions table

CREATE TABLE IF NOT EXISTS financial_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID REFERENCES pathways_enrollments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Plan metadata
  plan_name TEXT DEFAULT 'My 2-Year Financial Plan',
  plan_type TEXT CHECK (plan_type IN ('PATHWAYS_HOME', 'LEGACY_TLM')) DEFAULT 'PATHWAYS_HOME',

  -- Timeline
  plan_start_date DATE NOT NULL,
  plan_end_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Version tracking
  current_version INTEGER DEFAULT 1,
  total_versions INTEGER DEFAULT 1,
  last_edited_at TIMESTAMPTZ DEFAULT NOW(),
  last_edited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Status
  status TEXT CHECK (status IN ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED')) DEFAULT 'DRAFT',

  -- Sharing & collaboration
  shared_with_coach BOOLEAN DEFAULT TRUE,
  coach_can_edit BOOLEAN DEFAULT FALSE,

  -- Constraints
  UNIQUE(enrollment_id), -- One plan per enrollment
  CHECK (plan_end_date > plan_start_date)
);

CREATE INDEX idx_financial_plans_enrollment ON financial_plans(enrollment_id);
CREATE INDEX idx_financial_plans_user ON financial_plans(user_id);
CREATE INDEX idx_financial_plans_status ON financial_plans(status);

-- =====================================================
-- 5. PLAN VERSIONS
-- =====================================================
-- Stores versioned snapshots of financial plan data
-- Allows historical tracking and rollback

CREATE TABLE IF NOT EXISTS plan_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  financial_plan_id UUID REFERENCES financial_plans(id) ON DELETE CASCADE,

  -- Version identification
  version_number INTEGER NOT NULL,
  is_current BOOLEAN DEFAULT FALSE,

  -- Plan data (JSONB for 15 sections from Pathways Home template)
  plan_data JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Structure example:
  -- {
  --   "personal_info": {...},
  --   "current_income": {...},
  --   "current_expenses": {...},
  --   "current_assets": {...},
  --   "current_debts": {...},
  --   "monthly_budget": {...},
  --   "savings_goals": {...},
  --   "debt_payoff_plan": {...},
  --   "emergency_fund": {...},
  --   "credit_improvement": {...},
  --   "housing_stability": {...},
  --   "income_growth": {...},
  --   "long_term_goals": {...},
  --   "action_steps": {...},
  --   "quarterly_milestones": {...}
  -- }

  -- Change tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  change_description TEXT,
  changed_sections TEXT[], -- Array of section names that changed

  -- Metadata
  completeness_score DECIMAL(5,2) DEFAULT 0 CHECK (completeness_score >= 0 AND completeness_score <= 100),
  sections_completed INTEGER DEFAULT 0,
  sections_total INTEGER DEFAULT 15,

  -- Constraints
  UNIQUE(financial_plan_id, version_number)
);

CREATE INDEX idx_plan_versions_plan ON plan_versions(financial_plan_id);
CREATE INDEX idx_plan_versions_current ON plan_versions(is_current) WHERE is_current = TRUE;
CREATE INDEX idx_plan_versions_data ON plan_versions USING GIN(plan_data);

-- =====================================================
-- 6. MILESTONES
-- =====================================================
-- Granular goal tracking within each quarter
-- Allows coaches and participants to break down quarterly goals

CREATE TABLE IF NOT EXISTS milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quarterly_progress_id UUID REFERENCES quarterly_progress(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES pathways_enrollments(id) ON DELETE CASCADE,

  -- Milestone details
  title TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('HOUSING', 'INCOME', 'SAVINGS', 'DEBT', 'CREDIT', 'EDUCATION', 'OTHER')),

  -- Timeline
  due_date DATE,
  completed_at TIMESTAMPTZ,

  -- Status
  status TEXT CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED')) DEFAULT 'NOT_STARTED',

  -- Priority & ordering
  priority TEXT CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')) DEFAULT 'MEDIUM',
  display_order INTEGER DEFAULT 0,

  -- Owner
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Notes
  participant_notes TEXT,
  coach_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_milestones_progress ON milestones(quarterly_progress_id);
CREATE INDEX idx_milestones_enrollment ON milestones(enrollment_id);
CREATE INDEX idx_milestones_status ON milestones(status);
CREATE INDEX idx_milestones_category ON milestones(category);
CREATE INDEX idx_milestones_assigned ON milestones(assigned_to);

-- =====================================================
-- 7. COACH ACTIVITIES
-- =====================================================
-- Activity log for coach interactions and oversight
-- Helps track coach engagement and support provided

CREATE TABLE IF NOT EXISTS coach_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES pathways_enrollments(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Activity details
  activity_type TEXT CHECK (activity_type IN (
    'CHECKIN_REVIEW',
    'PLAN_REVIEW',
    'MILESTONE_UPDATE',
    'NOTE_ADDED',
    'MEETING_SCHEDULED',
    'MEETING_COMPLETED',
    'GOAL_ADJUSTMENT',
    'RESOURCE_SHARED',
    'OTHER'
  )),

  activity_title TEXT NOT NULL,
  activity_description TEXT,

  -- References (optional)
  related_checkin_id UUID REFERENCES quarterly_checkins(id) ON DELETE SET NULL,
  related_plan_id UUID REFERENCES financial_plans(id) ON DELETE SET NULL,
  related_milestone_id UUID REFERENCES milestones(id) ON DELETE SET NULL,

  -- Metadata
  activity_data JSONB DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ DEFAULT NOW(),

  -- Visibility
  visible_to_participant BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_coach_activities_coach ON coach_activities(coach_id);
CREATE INDEX idx_coach_activities_enrollment ON coach_activities(enrollment_id);
CREATE INDEX idx_coach_activities_participant ON coach_activities(participant_id);
CREATE INDEX idx_coach_activities_type ON coach_activities(activity_type);
CREATE INDEX idx_coach_activities_occurred ON coach_activities(occurred_at DESC);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pathways_enrollments_updated_at
  BEFORE UPDATE ON pathways_enrollments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quarterly_progress_updated_at
  BEFORE UPDATE ON quarterly_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quarterly_checkins_updated_at
  BEFORE UPDATE ON quarterly_checkins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_plans_updated_at
  BEFORE UPDATE ON financial_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_milestones_updated_at
  BEFORE UPDATE ON milestones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coach_activities_updated_at
  BEFORE UPDATE ON coach_activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RPC HELPER FUNCTIONS
-- =====================================================

-- Function to enroll a user in Pathways Home program
CREATE OR REPLACE FUNCTION enroll_user_in_pathways(
  p_user_id UUID,
  p_start_date DATE DEFAULT CURRENT_DATE,
  p_coach_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_enrollment_id UUID;
  v_quarter_id UUID;
  v_quarter_start DATE;
  v_plan_id UUID;
BEGIN
  -- Create enrollment
  INSERT INTO pathways_enrollments (
    user_id,
    program_start_date,
    assigned_coach_id,
    coach_assigned_at
  ) VALUES (
    p_user_id,
    p_start_date,
    p_coach_id,
    CASE WHEN p_coach_id IS NOT NULL THEN NOW() ELSE NULL END
  )
  RETURNING id INTO v_enrollment_id;

  -- Create all 4 quarters
  FOR i IN 1..4 LOOP
    v_quarter_start := p_start_date + ((i - 1) * INTERVAL '6 months');

    INSERT INTO quarterly_progress (
      enrollment_id,
      quarter_number,
      quarter_name,
      quarter_start_date,
      quarter_end_date,
      primary_goal,
      status
    ) VALUES (
      v_enrollment_id,
      i,
      'Q' || i,
      v_quarter_start,
      v_quarter_start + INTERVAL '6 months' - INTERVAL '1 day',
      CASE i
        WHEN 1 THEN 'Stabilize housing & secure income'
        WHEN 2 THEN 'Build emergency savings & reduce debt'
        WHEN 3 THEN 'Improve credit & increase income'
        WHEN 4 THEN 'Achieve housing independence & long-term stability'
      END,
      CASE WHEN i = 1 THEN 'IN_PROGRESS' ELSE 'NOT_STARTED' END
    );
  END LOOP;

  -- Create financial plan
  INSERT INTO financial_plans (
    enrollment_id,
    user_id,
    plan_start_date,
    plan_end_date
  ) VALUES (
    v_enrollment_id,
    p_user_id,
    p_start_date,
    p_start_date + INTERVAL '2 years'
  )
  RETURNING id INTO v_plan_id;

  -- Create initial plan version
  INSERT INTO plan_versions (
    financial_plan_id,
    version_number,
    is_current,
    created_by
  ) VALUES (
    v_plan_id,
    1,
    TRUE,
    p_user_id
  );

  RETURN v_enrollment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to advance to next quarter
CREATE OR REPLACE FUNCTION advance_to_next_quarter(p_enrollment_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_quarter INTEGER;
  v_completion_pct DECIMAL;
BEGIN
  -- Get current quarter
  SELECT
    CAST(SUBSTRING(current_quarter FROM 2) AS INTEGER),
    completion_percentage
  INTO v_current_quarter, v_completion_pct
  FROM pathways_enrollments
  WHERE id = p_enrollment_id;

  -- Verify current quarter is complete
  IF v_completion_pct < 100 THEN
    RAISE EXCEPTION 'Current quarter must be 100%% complete before advancing';
  END IF;

  -- Mark current quarter as completed
  UPDATE quarterly_progress
  SET status = 'COMPLETED',
      completed_at = NOW()
  WHERE enrollment_id = p_enrollment_id
    AND quarter_number = v_current_quarter;

  -- Advance to next quarter
  IF v_current_quarter < 4 THEN
    UPDATE pathways_enrollments
    SET current_quarter = 'Q' || (v_current_quarter + 1),
        quarters_completed = v_current_quarter,
        completion_percentage = (v_current_quarter::DECIMAL / 4) * 100
    WHERE id = p_enrollment_id;

    UPDATE quarterly_progress
    SET status = 'IN_PROGRESS',
        started_at = NOW()
    WHERE enrollment_id = p_enrollment_id
      AND quarter_number = v_current_quarter + 1;
  ELSE
    -- Program completed
    UPDATE pathways_enrollments
    SET current_quarter = 'COMPLETED',
        program_status = 'COMPLETED',
        quarters_completed = 4,
        completion_percentage = 100,
        actual_completion_date = CURRENT_DATE
    WHERE id = p_enrollment_id;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate quarter completion percentage
CREATE OR REPLACE FUNCTION calculate_quarter_completion(p_quarterly_progress_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_total_milestones INTEGER;
  v_completed_milestones INTEGER;
  v_checkin_completed BOOLEAN;
  v_completion DECIMAL;
BEGIN
  -- Get milestone counts
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'COMPLETED')
  INTO v_total_milestones, v_completed_milestones
  FROM milestones
  WHERE quarterly_progress_id = p_quarterly_progress_id;

  -- Get check-in status
  SELECT checkin_completed
  INTO v_checkin_completed
  FROM quarterly_progress
  WHERE id = p_quarterly_progress_id;

  -- Calculate: 70% milestones + 30% check-in
  v_completion := 0;

  IF v_total_milestones > 0 THEN
    v_completion := v_completion + ((v_completed_milestones::DECIMAL / v_total_milestones) * 70);
  END IF;

  IF v_checkin_completed THEN
    v_completion := v_completion + 30;
  END IF;

  -- Update the quarterly_progress record
  UPDATE quarterly_progress
  SET completion_percentage = v_completion,
      milestones_completed = v_completed_milestones,
      milestones_total = v_total_milestones
  WHERE id = p_quarterly_progress_id;

  RETURN v_completion;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE pathways_enrollments IS 'Core enrollment tracking for Pathways Home participants';
COMMENT ON TABLE quarterly_progress IS 'Tracks progress through each of 4 program quarters';
COMMENT ON TABLE quarterly_checkins IS 'Stores quarterly check-in question answers (15 questions per quarter)';
COMMENT ON TABLE financial_plans IS 'Metadata for 2-year financial plans';
COMMENT ON TABLE plan_versions IS 'Versioned snapshots of financial plan data (15 sections)';
COMMENT ON TABLE milestones IS 'Granular goal tracking within quarters';
COMMENT ON TABLE coach_activities IS 'Activity log for coach interactions and oversight';

COMMENT ON FUNCTION enroll_user_in_pathways IS 'Enrolls a user and creates all 4 quarters + financial plan';
COMMENT ON FUNCTION advance_to_next_quarter IS 'Marks current quarter complete and advances to next';
COMMENT ON FUNCTION calculate_quarter_completion IS 'Calculates quarter completion based on milestones + check-in';

-- =====================================================
-- END OF SCHEMA
-- =====================================================
