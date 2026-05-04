# Pathways Home - Implementation Strategy

## Overview

Transform TLM Finance from a static single-plan application into a **structured 12-month quarterly program** based on the Pathways Home Rental Assistance Program requirements.

**Technology Stack:** Vanilla JavaScript (no build step, maintains current architecture)

---

## Program Requirements (from PDFs)

### 4 Quarters Structure

**Quarter 1 (Months 1-3): Stabilization & Foundation**
- Secure stable housing
- Complete reentry stabilization plan (ID, bank account, services)
- Track housing compliance

**Quarter 2 (Months 4-6): Employment & System Navigation**
- Financial literacy course completion
- Employment stabilization
- System navigation milestones

**Quarter 3 (Months 7-9): Financial Growth & Career Development**
- Professional development course
- Budget planning tools
- Career advancement tracking

**Quarter 4 (Months 10-12): Transition to Independence**
- Build 2-year financial plan
- Housing stability plan for next year
- Create long-term template

### 2-Year Financial Plan (Built in Q4)

15-section comprehensive plan covering:
1. Vision & Commitments
2. Starting point snapshot
3. Year 1 income plan (quarterly milestones)
4. Year 2 income plan
5. Monthly budgets (Year 1 & 2)
6. Emergency fund plan
7. Debt payoff plan
8. Credit building plan
9. Insurance & healthcare
10. Long-term savings & retirement
11. Career development roadmap
12. Quarterly check-in schedule
13. Support system
14. Contingency plans
15. Commitment signature

---

## Database Architecture

### New Schema Design

```sql
-- Core program enrollment
CREATE TABLE pathways_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  current_quarter TEXT CHECK (current_quarter IN ('Q1', 'Q2', 'Q3', 'Q4', 'COMPLETED')),
  program_start_date DATE NOT NULL,
  program_end_date DATE,
  completion_percentage DECIMAL(5,2) DEFAULT 0,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  coach_id UUID REFERENCES auth.users(id),
  status TEXT CHECK (status IN ('ACTIVE', 'PAUSED', 'COMPLETED', 'WITHDRAWN')) DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quarterly progression tracking
CREATE TABLE quarterly_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID REFERENCES pathways_enrollments(id) ON DELETE CASCADE,
  quarter TEXT CHECK (quarter IN ('Q1', 'Q2', 'Q3', 'Q4')) NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  milestones JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  coach_notes TEXT,
  completion_percentage DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(enrollment_id, quarter)
);

-- Quarterly check-ins
CREATE TABLE quarterly_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID REFERENCES pathways_enrollments(id) ON DELETE CASCADE,
  quarter TEXT CHECK (quarter IN ('Q1', 'Q2', 'Q3', 'Q4')) NOT NULL,
  checkin_date DATE NOT NULL,

  -- Income & Career
  monthly_net_income DECIMAL(10,2),
  career_milestone_hit BOOLEAN,
  career_milestone_notes TEXT,
  next_career_action TEXT,
  next_career_deadline DATE,

  -- Budget
  stayed_within_budget BOOLEAN,
  budget_overrun_category TEXT,
  budget_changes_planned TEXT,

  -- Savings & Debt
  emergency_fund_balance DECIMAL(10,2),
  emergency_fund_goal DECIMAL(10,2),
  debt_remaining DECIMAL(10,2),
  retirement_contributions_ytd DECIMAL(10,2),

  -- Credit
  credit_score INT,
  missed_payments BOOLEAN,
  missed_payments_reason TEXT,

  -- Wellbeing
  wellbeing_score INT CHECK (wellbeing_score >= 1 AND wellbeing_score <= 10),
  wellbeing_notes TEXT,
  support_contacts_active BOOLEAN,

  -- Reflection
  proudest_achievement TEXT,
  next_quarter_change TEXT,

  -- Coach review
  coach_reviewed BOOLEAN DEFAULT FALSE,
  coach_notes TEXT,
  coach_reviewed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Financial plans (versioned)
CREATE TABLE financial_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID REFERENCES pathways_enrollments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type TEXT CHECK (plan_type IN ('INITIAL_90DAY', 'TWO_YEAR', 'CUSTOM')) DEFAULT 'INITIAL_90DAY',
  created_in_quarter TEXT CHECK (created_in_quarter IN ('Q1', 'Q2', 'Q3', 'Q4')),
  is_current BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Plan versions (historical tracking)
CREATE TABLE plan_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  financial_plan_id UUID REFERENCES financial_plans(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  quarter_context TEXT CHECK (quarter_context IN ('Q1', 'Q2', 'Q3', 'Q4')),

  -- Complete plan data (stores all 15 sections)
  plan_data JSONB NOT NULL,

  -- Quick access fields
  vision_statement TEXT,
  monthly_net_income DECIMAL(10,2),
  emergency_fund_target DECIMAL(10,2),
  total_debt DECIMAL(10,2),
  credit_score_target INT,

  -- Tracking
  coach_approved BOOLEAN DEFAULT FALSE,
  coach_approved_by UUID REFERENCES auth.users(id),
  coach_approved_at TIMESTAMPTZ,
  coach_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(financial_plan_id, version_number)
);

-- Milestone tracking (granular goals)
CREATE TABLE milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID REFERENCES pathways_enrollments(id) ON DELETE CASCADE,
  quarter TEXT CHECK (quarter IN ('Q1', 'Q2', 'Q3', 'Q4')) NOT NULL,
  category TEXT CHECK (category IN (
    'HOUSING', 'EMPLOYMENT', 'FINANCIAL_LITERACY',
    'CAREER_DEV', 'SAVINGS', 'DEBT', 'CREDIT',
    'PLAN_COMPLETION', 'EDUCATION', 'OTHER'
  )) NOT NULL,

  title TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  completed_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED')) DEFAULT 'NOT_STARTED',

  -- Evidence/notes
  completion_notes TEXT,
  evidence_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Keep legacy table for backward compatibility (temporary)
-- tlm_plans stays as-is during transition

-- Coach activity log
CREATE TABLE coach_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES auth.users(id),
  participant_id UUID REFERENCES auth.users(id),
  enrollment_id UUID REFERENCES pathways_enrollments(id),
  activity_type TEXT CHECK (activity_type IN (
    'CHECKIN_REVIEW', 'PLAN_REVIEW', 'NOTE_ADDED',
    'MILESTONE_APPROVED', 'CONTACT', 'OTHER'
  )) NOT NULL,
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Indexes

```sql
-- Performance indexes
CREATE INDEX idx_enrollments_user ON pathways_enrollments(user_id);
CREATE INDEX idx_enrollments_quarter ON pathways_enrollments(current_quarter);
CREATE INDEX idx_enrollments_coach ON pathways_enrollments(coach_id);
CREATE INDEX idx_checkins_enrollment ON quarterly_checkins(enrollment_id);
CREATE INDEX idx_checkins_quarter ON quarterly_checkins(quarter);
CREATE INDEX idx_plan_versions_plan ON plan_versions(financial_plan_id);
CREATE INDEX idx_milestones_enrollment ON milestones(enrollment_id);
CREATE INDEX idx_milestones_quarter ON milestones(quarter);
CREATE INDEX idx_coach_activities_coach ON coach_activities(coach_id);
CREATE INDEX idx_coach_activities_participant ON coach_activities(participant_id);
```

### Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE pathways_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE quarterly_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE quarterly_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_activities ENABLE ROW LEVEL SECURITY;

-- Participants can see their own data
CREATE POLICY "Users can view own enrollment" ON pathways_enrollments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own progress" ON quarterly_progress
  FOR SELECT USING (
    enrollment_id IN (SELECT id FROM pathways_enrollments WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view own checkins" ON quarterly_checkins
  FOR SELECT USING (
    enrollment_id IN (SELECT id FROM pathways_enrollments WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert own checkins" ON quarterly_checkins
  FOR INSERT WITH CHECK (
    enrollment_id IN (SELECT id FROM pathways_enrollments WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view own plans" ON financial_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own plan versions" ON plan_versions
  FOR SELECT USING (
    financial_plan_id IN (SELECT id FROM financial_plans WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create plan versions" ON plan_versions
  FOR INSERT WITH CHECK (
    financial_plan_id IN (SELECT id FROM financial_plans WHERE user_id = auth.uid())
  );

-- Coaches can see their assigned participants
CREATE POLICY "Coaches can view assigned enrollments" ON pathways_enrollments
  FOR SELECT USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can update assigned enrollments" ON pathways_enrollments
  FOR UPDATE USING (auth.uid() = coach_id);

-- Admin policies (add role checking as needed)
```

---

## Data Migration Strategy

### Phase 1: Create New Tables

```sql
-- Run new schema creation (see above)
```

### Phase 2: Migrate Existing Plans

```sql
-- Migration script to move tlm_plans → new structure
-- This assumes existing plans are "completed" and should be Q4
INSERT INTO pathways_enrollments (user_id, current_quarter, program_start_date, completion_percentage)
SELECT
  user_id,
  'Q4' as current_quarter,
  COALESCE(created_at, NOW() - INTERVAL '12 months') as program_start_date,
  100 as completion_percentage
FROM tlm_plans;

-- Create financial plan records
INSERT INTO financial_plans (enrollment_id, user_id, plan_type, created_in_quarter, is_current)
SELECT
  e.id as enrollment_id,
  e.user_id,
  'INITIAL_90DAY' as plan_type,
  'Q4' as created_in_quarter,
  TRUE as is_current
FROM pathways_enrollments e;

-- Migrate plan data to versions
INSERT INTO plan_versions (financial_plan_id, version_number, quarter_context, plan_data)
SELECT
  fp.id as financial_plan_id,
  1 as version_number,
  'Q4' as quarter_context,
  tp.plan as plan_data
FROM financial_plans fp
JOIN pathways_enrollments e ON fp.enrollment_id = e.id
JOIN tlm_plans tp ON tp.user_id = e.user_id;
```

### Phase 3: Keep tlm_plans Temporarily

- Do NOT delete `tlm_plans`
- Mark as deprecated in code
- Redirect reads to new tables
- Remove after 90 days

---

## Frontend Architecture (Vanilla JS)

### Client-Side Router

Create `src/router.js`:

```javascript
// Simple hash-based SPA router
class PathwaysRouter {
  constructor() {
    this.routes = new Map();
    this.currentRoute = null;

    window.addEventListener('hashchange', () => this.handleRoute());
    window.addEventListener('load', () => this.handleRoute());
  }

  register(path, handler) {
    this.routes.set(path, handler);
  }

  navigate(path) {
    window.location.hash = path;
  }

  async handleRoute() {
    const hash = window.location.hash.slice(1) || '/';
    const [route, ...params] = hash.split('/');

    const handler = this.routes.get('/' + route) || this.routes.get('/404');
    if (handler) {
      this.currentRoute = route;
      await handler(params);
    }
  }
}

export const router = new PathwaysRouter();
```

### Component Structure

```
src/
├── router.js                    # Client-side routing
├── pathways/
│   ├── enrollment.js            # Enrollment check & initialization
│   ├── dashboard.js             # Main participant dashboard
│   ├── quarter-view.js          # Quarter-specific view
│   ├── checkin-form.js          # Quarterly check-in wizard
│   ├── plan-builder.js          # 2-year plan builder (15 sections)
│   ├── progress-tracker.js      # Visual progress display
│   ├── milestone-manager.js     # Milestone CRUD
│   └── coach/
│       ├── coach-dashboard.js   # Coach overview
│       ├── participant-list.js  # Assigned participants
│       └── review-panel.js      # Review check-ins & plans
├── utils/
│   ├── supabase-client.js       # Realtime subscriptions
│   ├── quarter-calculator.js    # Date → Quarter logic
│   └── plan-validator.js        # 2-year plan validation
└── components/
    ├── wizard.js                # Multi-step form component
    ├── progress-bar.js          # Progress visualization
    └── milestone-card.js        # Milestone display
```

---

## User Flows

### Participant Flow

```
1. Sign In → Check Enrollment Status
   ├─ NOT ENROLLED → Show "Apply to Program" or redirect
   ├─ ENROLLED → Load Dashboard

2. Dashboard View
   ├─ Hero: Current Quarter Badge + Progress Ring
   ├─ This Quarter's Milestones (cards with checkboxes)
   ├─ Upcoming Check-In Alert (if due)
   ├─ Quick Stats: Emergency Fund, Debt, Credit Score
   ├─ Career Roadmap Timeline
   └─ CTA: "Start Quarterly Check-In" or "Continue Building Plan"

3. Quarterly Check-In (Wizard)
   ├─ Step 1: Income & Career
   ├─ Step 2: Budget Review
   ├─ Step 3: Savings & Debt
   ├─ Step 4: Credit Update
   ├─ Step 5: Wellbeing Check
   ├─ Step 6: Reflection
   └─ Submit → Notify Coach

4. 2-Year Plan Builder (Q4 Only)
   ├─ 15-Step Wizard (matches PDF template)
   ├─ Auto-save on each step
   ├─ Review & Submit for Coach Approval
   └─ Digital Signature
```

### Coach Flow

```
1. Coach Dashboard
   ├─ My Participants (list view)
   │   ├─ Filter by Quarter
   │   ├─ Sort by Last Activity
   │   └─ Alert badges (check-in pending, plan needs review)
   │
   ├─ Pending Reviews
   │   ├─ Check-Ins Awaiting Review
   │   └─ Plans Awaiting Approval
   │
   └─ Analytics
       ├─ Completion Rates by Quarter
       ├─ Average Wellbeing Scores
       └─ Milestone Completion %

2. Participant Detail View
   ├─ Timeline: All 4 Quarters with Status
   ├─ Latest Check-In (expandable)
   ├─ Current Plan Version (with diff view)
   ├─ Milestones Grid
   ├─ Coach Notes (private)
   └─ Actions: Approve, Request Changes, Add Note
```

---

## Implementation Phases

### Phase 1: Database & Migration (Week 1)
- [ ] Create new Supabase tables
- [ ] Write migration script
- [ ] Test migration with sample data
- [ ] Set up RLS policies
- [ ] Create Supabase RPC helper functions

### Phase 2: Core Frontend (Week 2)
- [ ] Build router module
- [ ] Create enrollment check flow
- [ ] Build participant dashboard
- [ ] Implement quarter calculation logic
- [ ] Add progress tracking components

### Phase 3: Check-In System (Week 3)
- [ ] Build quarterly check-in wizard
- [ ] Implement form validation
- [ ] Add auto-save functionality
- [ ] Create coach review interface
- [ ] Real-time notifications

### Phase 4: 2-Year Plan Builder (Week 4)
- [ ] 15-section wizard UI
- [ ] Plan validation logic
- [ ] Version history view
- [ ] Digital signature capture
- [ ] PDF export (optional)

### Phase 5: Coach Tools (Week 5)
- [ ] Coach dashboard
- [ ] Participant list with filters
- [ ] Review & approval workflow
- [ ] Coach notes & activity log
- [ ] Analytics & reporting

### Phase 6: Testing & Polish (Week 6)
- [ ] End-to-end testing
- [ ] Data integrity validation
- [ ] Mobile responsive testing
- [ ] Accessibility audit
- [ ] Performance optimization

---

## Technical Decisions

### Why Vanilla JS?

1. **Matches current architecture** - No build step, stays lightweight
2. **Progressive enhancement** - Works offline with service worker
3. **Faster to ship** - No framework setup, bundle config, etc.
4. **Smaller bundle** - Critical for mobile users
5. **Easier deployment** - Same Netlify setup

### Component Pattern

Use ES6 modules with a simple component pattern:

```javascript
// Example: src/pathways/dashboard.js
export class PathwaysDashboard {
  constructor(containerId, enrollmentData) {
    this.container = document.getElementById(containerId);
    this.enrollment = enrollmentData;
  }

  async render() {
    this.container.innerHTML = this.template();
    this.attachEventListeners();
    await this.loadData();
  }

  template() {
    return `
      <div class="pathways-dashboard">
        <div class="quarter-badge" data-quarter="${this.enrollment.current_quarter}">
          Quarter ${this.enrollment.current_quarter.replace('Q', '')}
        </div>
        <div class="progress-ring" data-progress="${this.enrollment.completion_percentage}">
          <!-- SVG progress circle -->
        </div>
        <div id="milestones-container"></div>
      </div>
    `;
  }

  attachEventListeners() {
    // Bind events
  }

  async loadData() {
    // Fetch from Supabase
  }
}
```

### State Management

Use a simple centralized store:

```javascript
// src/pathways/state.js
class PathwaysState {
  constructor() {
    this.enrollment = null;
    this.currentQuarter = null;
    this.milestones = [];
    this.latestPlan = null;
    this.listeners = new Map();
  }

  subscribe(key, callback) {
    if (!this.listeners.has(key)) this.listeners.set(key, []);
    this.listeners.get(key).push(callback);
  }

  set(key, value) {
    this[key] = value;
    if (this.listeners.has(key)) {
      this.listeners.get(key).forEach(cb => cb(value));
    }
  }
}

export const state = new PathwaysState();
```

### Realtime Updates

Use Supabase realtime for coach/participant sync:

```javascript
// src/utils/supabase-client.js
import { createClient } from '@supabase/supabase-js';
import { state } from '../pathways/state.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function subscribeToEnrollment(enrollmentId) {
  return supabase
    .channel(`enrollment:${enrollmentId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'pathways_enrollments',
      filter: `id=eq.${enrollmentId}`
    }, payload => {
      state.set('enrollment', payload.new);
    })
    .subscribe();
}
```

---

## Key Metrics & Success Criteria

### Participant Metrics
- Enrollment completion rate
- On-time check-in submission rate
- 2-year plan completion rate
- Credit score improvement
- Emergency fund growth
- Debt reduction

### Coach Metrics
- Average review turnaround time
- Participant engagement rate
- Milestone completion rate by cohort

### Technical Metrics
- Page load time < 2s
- Works offline (PWA)
- Mobile responsive (< 400px)
- WCAG 2.1 AA compliant

---

## Next Steps

1. **Review & approval** from product owner
2. **Database schema review** with Supabase team
3. **UI/UX mockups** for key screens
4. **Begin Phase 1**: Database setup

---

## Open Questions

1. Should we auto-advance quarters based on dates, or require coach approval?
2. What happens if a participant misses a check-in?
3. Do participants see coach notes?
4. Can participants edit past check-ins?
5. Export formats for plans (PDF, CSV, etc.)?

