/**
 * TLM Finance - Participant Dashboard Component
 * =============================================
 * Main dashboard for Pathways Home participants
 * Clean, focused design with key information at a glance
 */

import { Component, html, formatDate, formatPercentage } from './Component.js';
import { store, getters } from '../store.js';
import { router } from '../router.js';

export class Dashboard extends Component {
  constructor(container, route) {
    super(container, route);

    this.state = {
      enrollment: null,
      currentQuarter: null,
      quarterlyProgress: [],
      milestones: [],
      financialPlan: null,
      loading: true
    };
  }

  async beforeRender() {
    // Get data from store
    const enrollment = store.getState('enrollment');

    // If no enrollment data, load it
    if (!enrollment) {
      await store.dispatch('loadEnrollment');
    }

    this.setState({
      enrollment: store.getState('enrollment'),
      currentQuarter: store.getState('currentQuarter'),
      quarterlyProgress: store.getState('quarterlyProgress'),
      milestones: store.getState('milestones'),
      financialPlan: store.getState('financialPlan'),
      loading: false
    });
  }

  async mounted() {
    // Subscribe to store updates
    this.unsubEnrollment = store.subscribe('enrollment', (enrollment) => {
      this.setState({ enrollment });
    });

    this.unsubQuarter = store.subscribe('currentQuarter', (currentQuarter) => {
      this.setState({ currentQuarter });
    });

    this.unsubMilestones = store.subscribe('milestones', (milestones) => {
      this.setState({ milestones });
    });

    // Set up real-time subscriptions
    await this._setupRealtimeSubscriptions();
  }

  async _setupRealtimeSubscriptions() {
    const { supabaseClient } = await import('../supabase-client.js');
    const { enrollment } = this.state;

    if (!enrollment) return;

    // Subscribe to enrollment changes
    const enrollmentChannel = supabaseClient
      .channel(`enrollment_${enrollment.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pathways_enrollments',
        filter: `id=eq.${enrollment.id}`
      }, (payload) => {
        console.log('Dashboard: Enrollment updated', payload);
        store.dispatch('loadEnrollment');
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'quarterly_progress',
        filter: `enrollment_id=eq.${enrollment.id}`
      }, (payload) => {
        console.log('Dashboard: Quarter progress updated', payload);
        store.dispatch('refreshQuarter');
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'milestones',
        filter: `enrollment_id=eq.${enrollment.id}`
      }, (payload) => {
        console.log('Dashboard: Milestones updated', payload);
        store.dispatch('loadEnrollment');
      });

    this.subscribe(enrollmentChannel);
  }

  template() {
    const { loading, enrollment, currentQuarter, quarterlyProgress, milestones, financialPlan } = this.state;

    if (loading) {
      return html`
        <div class="dashboard loading">
          <div class="spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      `;
    }

    if (!enrollment) {
      return html`
        <div class="dashboard-empty">
          <div class="empty-card">
            <h2>Welcome to Pathways Home</h2>
            <p>Start your journey to housing independence and financial stability.</p>
            <a href="#/enroll" class="btn btn--primary">Enroll in Program</a>
          </div>
        </div>
      `;
    }

    const pendingMilestones = milestones.filter(m => m.status !== 'COMPLETED' && m.status !== 'CANCELLED');
    const completedMilestones = milestones.filter(m => m.status === 'COMPLETED');

    return html`
      <div class="dashboard">
        <!-- Hero Section -->
        <section class="dashboard-hero">
          <div class="hero-content">
            <h1>Welcome back, ${store.getState('user')?.user_metadata?.full_name || 'Participant'}!</h1>
            <p class="hero-subtitle">You're in Quarter ${currentQuarter?.quarter_number || 1} of your journey</p>
          </div>
          <div class="hero-stats">
            <div class="stat-card">
              <div class="stat-value">${formatPercentage(enrollment.completion_percentage, 0)}</div>
              <div class="stat-label">Program Complete</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${enrollment.quarters_completed}/4</div>
              <div class="stat-label">Quarters Done</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${this._getDaysInProgram(enrollment.program_start_date)}</div>
              <div class="stat-label">Days in Program</div>
            </div>
          </div>
        </section>

        <!-- Current Quarter Focus -->
        ${currentQuarter ? html`
          <section class="current-quarter">
            <div class="quarter-card">
              <div class="quarter-header">
                <div>
                  <span class="quarter-badge">Quarter ${currentQuarter.quarter_number}</span>
                  <h2 class="quarter-title">${currentQuarter.primary_goal}</h2>
                  <p class="quarter-dates">${this._getQuarterDateRange(currentQuarter)}</p>
                </div>
                ${!currentQuarter.checkin_completed ? html`
                  <a href="#/checkin/${currentQuarter.id}" class="btn btn--primary">
                    Complete Check-In
                  </a>
                ` : html`
                  <div class="checkin-complete">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    <span>Check-in Complete</span>
                  </div>
                `}
              </div>

              <div class="quarter-progress-section">
                <div class="progress-info">
                  <span class="progress-label">Quarter Progress</span>
                  <span class="progress-percentage">${formatPercentage(currentQuarter.completion_percentage, 0)}</span>
                </div>
                <div class="progress-bar-modern">
                  <div class="progress-fill" style="width: ${currentQuarter.completion_percentage}%"></div>
                </div>
                <div class="progress-meta">
                  <span>${currentQuarter.milestones_completed} of ${currentQuarter.milestones_total} milestones</span>
                </div>
              </div>

              ${currentQuarter.coach_notes ? html`
                <div class="coach-message">
                  <div class="coach-avatar">💬</div>
                  <div class="coach-content">
                    <span class="coach-label">Message from your coach</span>
                    <p>${currentQuarter.coach_notes}</p>
                  </div>
                </div>
              ` : ''}
            </div>
          </section>
        ` : ''}

        <!-- Two Column Layout -->
        <div class="dashboard-grid">
          <!-- Left Column: Milestones -->
          <section class="milestones-section">
            <div class="section-header">
              <h3>Active Milestones</h3>
              <a href="#/milestones" class="link-view-all">View all →</a>
            </div>

            ${pendingMilestones.length > 0 ? html`
              <div class="milestone-list">
                ${pendingMilestones.slice(0, 4).map(milestone => html`
                  <div class="milestone-card">
                    <div class="milestone-checkbox">
                      <input
                        type="checkbox"
                        id="milestone-${milestone.id}"
                        data-milestone-id="${milestone.id}"
                        ${milestone.status === 'COMPLETED' ? 'checked' : ''}
                      />
                      <label for="milestone-${milestone.id}"></label>
                    </div>
                    <div class="milestone-info">
                      <h4 class="milestone-title">${milestone.title}</h4>
                      ${milestone.due_date ? html`
                        <span class="milestone-due">Due ${formatDate(milestone.due_date, 'short')}</span>
                      ` : ''}
                    </div>
                    <span class="milestone-category-badge ${milestone.category.toLowerCase()}">
                      ${this._getCategoryIcon(milestone.category)}
                    </span>
                  </div>
                `).join('')}
              </div>
              ${completedMilestones.length > 0 ? html`
                <div class="milestones-completed">
                  ✓ ${completedMilestones.length} completed
                </div>
              ` : ''}
            ` : html`
              <div class="empty-milestones">
                <p>No active milestones yet.</p>
                <a href="#/milestones" class="btn btn--secondary btn--sm">Add Milestone</a>
              </div>
            `}
          </section>

          <!-- Right Column: Financial Plan -->
          <section class="plan-section">
            <div class="section-header">
              <h3>2-Year Financial Plan</h3>
            </div>

            ${financialPlan ? html`
              <div class="plan-card">
                <div class="plan-status-badge ${financialPlan.status.toLowerCase()}">
                  ${financialPlan.status.replace('_', ' ')}
                </div>
                <p class="plan-updated">Updated ${formatDate(financialPlan.updated_at, 'relative')}</p>
                <div class="plan-actions">
                  <a href="#/plan/edit" class="btn btn--primary btn--block">Continue Plan</a>
                  <a href="#/plan/view" class="btn btn--secondary btn--block">View Details</a>
                </div>
              </div>
            ` : html`
              <div class="plan-card plan-empty">
                <div class="plan-empty-icon">📊</div>
                <h4>Create Your Financial Plan</h4>
                <p>Build your roadmap to financial independence with our step-by-step plan builder.</p>
                <a href="#/plan/create" class="btn btn--primary btn--block">Start Planning</a>
              </div>
            `}

            <!-- Quick Actions -->
            <div class="quick-actions">
              <a href="#/resources" class="quick-action">
                <span class="action-icon">📚</span>
                <span>Resources</span>
              </a>
              <a href="#/messages" class="quick-action">
                <span class="action-icon">💬</span>
                <span>Messages</span>
              </a>
              <a href="#/profile" class="quick-action">
                <span class="action-icon">⚙️</span>
                <span>Settings</span>
              </a>
            </div>
          </section>
        </div>

        <!-- Program Timeline (Collapsed) -->
        <section class="timeline-section">
          <details class="timeline-details">
            <summary class="timeline-summary">
              <h3>View Program Timeline</h3>
              <svg class="chevron" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/>
              </svg>
            </summary>
            <div class="timeline-content">
              ${quarterlyProgress.map((quarter, index) => html`
                <div class="timeline-item ${quarter.status === 'COMPLETED' ? 'completed' : ''} ${quarter.status === 'IN_PROGRESS' ? 'active' : ''}">
                  <div class="timeline-marker">
                    ${quarter.status === 'COMPLETED' ? '✓' : index + 1}
                  </div>
                  <div class="timeline-info">
                    <h4>Q${quarter.quarter_number}: ${quarter.primary_goal}</h4>
                    <p class="timeline-dates">${this._getQuarterDateRange(quarter)}</p>
                    ${quarter.status === 'COMPLETED' ? html`
                      <span class="timeline-status completed">Completed ${formatDate(quarter.completed_at, 'short')}</span>
                    ` : quarter.status === 'IN_PROGRESS' ? html`
                      <div class="timeline-progress">
                        <div class="timeline-progress-bar">
                          <div class="timeline-progress-fill" style="width: ${quarter.completion_percentage}%"></div>
                        </div>
                        <span class="timeline-percentage">${formatPercentage(quarter.completion_percentage, 0)}</span>
                      </div>
                    ` : html`
                      <span class="timeline-status upcoming">Upcoming</span>
                    `}
                  </div>
                </div>
              `).join('')}
            </div>
          </details>
        </section>
      </div>
    `;
  }

  events() {
    // Handle milestone checkbox changes
    this.$$('input[data-milestone-id]').forEach(checkbox => {
      this.addEventListener(checkbox, 'change', async (e) => {
        const milestoneId = e.target.getAttribute('data-milestone-id');
        const isCompleted = e.target.checked;
        await this._toggleMilestone(milestoneId, isCompleted);
      });
    });
  }

  async _toggleMilestone(milestoneId, isCompleted) {
    const { supabaseClient } = await import('../supabase-client.js');

    const newStatus = isCompleted ? 'COMPLETED' : 'IN_PROGRESS';
    const completedAt = isCompleted ? new Date().toISOString() : null;

    const { error } = await supabaseClient
      .from('milestones')
      .update({
        status: newStatus,
        completed_at: completedAt
      })
      .eq('id', milestoneId);

    if (error) {
      console.error('Error updating milestone:', error);
      store.dispatch('addNotification', {
        type: 'error',
        message: 'Failed to update milestone'
      });
    } else {
      store.dispatch('loadEnrollment');
      store.dispatch('addNotification', {
        type: 'success',
        message: isCompleted ? 'Milestone completed!' : 'Milestone reopened'
      });
    }
  }

  _getCategoryIcon(category) {
    const icons = {
      'HOUSING': '🏠',
      'INCOME': '💰',
      'SAVINGS': '💵',
      'DEBT': '📉',
      'CREDIT': '📊',
      'EDUCATION': '📚',
      'OTHER': '📌'
    };
    return icons[category] || '📌';
  }

  _getDaysInProgram(startDate) {
    const start = new Date(startDate);
    const now = new Date();
    const diff = now - start;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  _getQuarterDateRange(quarter) {
    const start = formatDate(quarter.quarter_start_date, 'short');
    const end = formatDate(quarter.quarter_end_date, 'short');
    return `${start} - ${end}`;
  }

  beforeDestroy() {
    // Unsubscribe from store
    if (this.unsubEnrollment) this.unsubEnrollment();
    if (this.unsubQuarter) this.unsubQuarter();
    if (this.unsubMilestones) this.unsubMilestones();
  }
}

export default Dashboard;
