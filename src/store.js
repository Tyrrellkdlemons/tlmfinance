/**
 * TLM Finance - Centralized State Management
 * ==========================================
 * Simple reactive state store for Pathways Home
 * No dependencies, pure vanilla JavaScript
 *
 * Features:
 * - Reactive state updates
 * - Subscribe to state changes
 * - Namespaced modules
 * - Actions for async operations
 * - Getters for computed values
 * - localStorage persistence
 *
 * Usage:
 *   import { store } from './store.js';
 *   store.subscribe('user', (newUser) => console.log(newUser));
 *   store.setState({ user: { name: 'John' } });
 */

class Store {
  constructor() {
    this.state = {
      // Auth
      user: null,
      session: null,
      isAuthenticated: false,

      // Pathways enrollment
      enrollment: null,
      currentQuarter: null,
      quarterlyProgress: [],

      // Financial plan
      financialPlan: null,
      currentPlanVersion: null,

      // Milestones
      milestones: [],

      // Coach (if user is a coach)
      assignedParticipants: [],
      coachActivities: [],

      // UI state
      loading: false,
      error: null,
      notifications: [],

      // Real-time connection
      realtimeConnected: false
    };

    this.subscribers = new Map();
    this.persistKeys = ['user', 'session', 'isAuthenticated'];

    // Load persisted state
    this._loadPersistedState();

    // Listen for auth changes
    this._initAuthListener();
  }

  /**
   * Get current state
   * @param {string} key - Optional key to get specific state
   * @returns {*} State value
   */
  getState(key = null) {
    if (key) {
      return this._getNestedValue(this.state, key);
    }
    return { ...this.state };
  }

  /**
   * Set state
   * @param {Object|string} updates - State updates or key
   * @param {*} value - Value (if key is string)
   */
  setState(updates, value = undefined) {
    let changes = {};

    // Single key update: setState('user.name', 'John')
    if (typeof updates === 'string' && value !== undefined) {
      this._setNestedValue(this.state, updates, value);
      changes[updates.split('.')[0]] = this._getNestedValue(this.state, updates.split('.')[0]);
    }
    // Multiple updates: setState({ user: {...}, enrollment: {...} })
    else if (typeof updates === 'object') {
      Object.keys(updates).forEach(key => {
        this.state[key] = updates[key];
        changes[key] = updates[key];
      });
    }

    // Notify subscribers
    this._notify(changes);

    // Persist to localStorage
    this._persistState();
  }

  /**
   * Subscribe to state changes
   * @param {string} key - State key to watch (null for all changes)
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(key, callback) {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, []);
    }

    this.subscribers.get(key).push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(key);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Notify subscribers of changes
   * @private
   */
  _notify(changes) {
    // Notify specific key subscribers
    Object.keys(changes).forEach(key => {
      if (this.subscribers.has(key)) {
        this.subscribers.get(key).forEach(callback => {
          callback(changes[key], this.state);
        });
      }
    });

    // Notify wildcard subscribers (listening to all changes)
    if (this.subscribers.has('*')) {
      this.subscribers.get('*').forEach(callback => {
        callback(changes, this.state);
      });
    }
  }

  /**
   * Get nested value from object
   * @private
   */
  _getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Set nested value in object
   * @private
   */
  _setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * Load persisted state from localStorage
   * @private
   */
  _loadPersistedState() {
    try {
      this.persistKeys.forEach(key => {
        const stored = localStorage.getItem(`tlm_state_${key}`);
        if (stored) {
          this.state[key] = JSON.parse(stored);
        }
      });
    } catch (error) {
      console.error('Store: Error loading persisted state', error);
    }
  }

  /**
   * Persist state to localStorage
   * @private
   */
  _persistState() {
    try {
      this.persistKeys.forEach(key => {
        if (this.state[key] !== null && this.state[key] !== undefined) {
          localStorage.setItem(`tlm_state_${key}`, JSON.stringify(this.state[key]));
        } else {
          localStorage.removeItem(`tlm_state_${key}`);
        }
      });
    } catch (error) {
      console.error('Store: Error persisting state', error);
    }
  }

  /**
   * Clear persisted state
   */
  clearPersistedState() {
    this.persistKeys.forEach(key => {
      localStorage.removeItem(`tlm_state_${key}`);
    });
  }

  /**
   * Initialize Supabase auth listener
   * @private
   */
  async _initAuthListener() {
    const { supabaseClient } = await import('./supabase-client.js');

    supabaseClient.auth.onAuthStateChange((event, session) => {
      console.log('Store: Auth state changed', event);

      this.setState({
        session,
        user: session?.user || null,
        isAuthenticated: !!session
      });

      // Clear enrollment data on logout
      if (event === 'SIGNED_OUT') {
        this.setState({
          enrollment: null,
          currentQuarter: null,
          quarterlyProgress: [],
          financialPlan: null,
          currentPlanVersion: null,
          milestones: [],
          assignedParticipants: [],
          coachActivities: []
        });
      }

      // Load enrollment data on login
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        this.dispatch('loadEnrollment');
      }
    });
  }

  /**
   * Reset store to initial state
   */
  reset() {
    this.state = {
      user: null,
      session: null,
      isAuthenticated: false,
      enrollment: null,
      currentQuarter: null,
      quarterlyProgress: [],
      financialPlan: null,
      currentPlanVersion: null,
      milestones: [],
      assignedParticipants: [],
      coachActivities: [],
      loading: false,
      error: null,
      notifications: [],
      realtimeConnected: false
    };

    this.clearPersistedState();
    this._notify(this.state);
  }

  /**
   * Dispatch async actions
   * @param {string} action - Action name
   * @param {*} payload - Action payload
   */
  async dispatch(action, payload = null) {
    const actions = {
      // Load user's enrollment data
      loadEnrollment: async () => {
        const { supabaseClient } = await import('./supabase-client.js');
        const session = this.getState('session');

        if (!session) return;

        this.setState({ loading: true, error: null });

        try {
          // Get enrollment
          const { data: enrollment, error: enrollmentError } = await supabaseClient
            .from('pathways_enrollments')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('program_status', 'ACTIVE')
            .single();

          if (enrollmentError) throw enrollmentError;

          // Get quarterly progress
          const { data: progress, error: progressError } = await supabaseClient
            .from('quarterly_progress')
            .select('*')
            .eq('enrollment_id', enrollment.id)
            .order('quarter_number', { ascending: true });

          if (progressError) throw progressError;

          // Get current quarter
          const currentQuarter = progress.find(q => q.status === 'IN_PROGRESS');

          // Get financial plan
          const { data: plan, error: planError } = await supabaseClient
            .from('financial_plans')
            .select(`
              *,
              plan_versions!inner(*)
            `)
            .eq('enrollment_id', enrollment.id)
            .eq('plan_versions.is_current', true)
            .single();

          if (planError && planError.code !== 'PGRST116') {
            console.warn('Store: No financial plan found', planError);
          }

          // Get milestones for current quarter
          let milestones = [];
          if (currentQuarter) {
            const { data: milestonesData, error: milestonesError } = await supabaseClient
              .from('milestones')
              .select('*')
              .eq('quarterly_progress_id', currentQuarter.id)
              .order('display_order', { ascending: true });

            if (!milestonesError) {
              milestones = milestonesData;
            }
          }

          this.setState({
            enrollment,
            currentQuarter,
            quarterlyProgress: progress,
            financialPlan: plan || null,
            currentPlanVersion: plan?.plan_versions?.[0] || null,
            milestones,
            loading: false
          });

        } catch (error) {
          console.error('Store: Error loading enrollment', error);
          this.setState({
            error: error.message,
            loading: false
          });
        }
      },

      // Load coach's assigned participants
      loadCoachData: async () => {
        const { supabaseClient } = await import('./supabase-client.js');
        const session = this.getState('session');

        if (!session) return;

        this.setState({ loading: true, error: null });

        try {
          // Get assigned participants
          const { data: participants, error: participantsError } = await supabaseClient
            .from('pathways_enrollments')
            .select(`
              *,
              quarterly_progress(*)
            `)
            .eq('assigned_coach_id', session.user.id)
            .eq('program_status', 'ACTIVE')
            .order('enrolled_at', { ascending: false });

          if (participantsError) throw participantsError;

          // Get recent activities
          const { data: activities, error: activitiesError } = await supabaseClient
            .from('coach_activities')
            .select('*')
            .eq('coach_id', session.user.id)
            .order('occurred_at', { ascending: false })
            .limit(50);

          if (activitiesError) throw activitiesError;

          this.setState({
            assignedParticipants: participants,
            coachActivities: activities,
            loading: false
          });

        } catch (error) {
          console.error('Store: Error loading coach data', error);
          this.setState({
            error: error.message,
            loading: false
          });
        }
      },

      // Refresh current quarter data
      refreshQuarter: async () => {
        const { supabaseClient } = await import('./supabase-client.js');
        const currentQuarter = this.getState('currentQuarter');

        if (!currentQuarter) return;

        try {
          const { data, error } = await supabaseClient
            .from('quarterly_progress')
            .select('*')
            .eq('id', currentQuarter.id)
            .single();

          if (error) throw error;

          this.setState({ currentQuarter: data });

        } catch (error) {
          console.error('Store: Error refreshing quarter', error);
        }
      },

      // Add notification
      addNotification: (notification) => {
        const notifications = this.getState('notifications');
        this.setState({
          notifications: [...notifications, {
            id: Date.now(),
            timestamp: new Date(),
            ...notification
          }]
        });

        // Auto-remove after 5 seconds
        setTimeout(() => {
          this.dispatch('removeNotification', notification.id || Date.now());
        }, 5000);
      },

      // Remove notification
      removeNotification: (id) => {
        const notifications = this.getState('notifications');
        this.setState({
          notifications: notifications.filter(n => n.id !== id)
        });
      }
    };

    if (actions[action]) {
      return await actions[action](payload);
    } else {
      console.warn(`Store: Unknown action "${action}"`);
    }
  }
}

// =====================================================
// GLOBAL STORE INSTANCE
// =====================================================

export const store = new Store();

// =====================================================
// GETTERS (COMPUTED VALUES)
// =====================================================

export const getters = {
  isEnrolled: () => {
    const enrollment = store.getState('enrollment');
    return enrollment && enrollment.program_status === 'ACTIVE';
  },

  isCoach: () => {
    const user = store.getState('user');
    return user?.user_metadata?.role === 'coach' || user?.user_metadata?.role === 'admin';
  },

  isAdmin: () => {
    const user = store.getState('user');
    return user?.user_metadata?.role === 'admin';
  },

  currentQuarterNumber: () => {
    const quarter = store.getState('currentQuarter');
    return quarter?.quarter_number || 1;
  },

  quarterProgress: () => {
    const quarter = store.getState('currentQuarter');
    return quarter?.completion_percentage || 0;
  },

  programProgress: () => {
    const enrollment = store.getState('enrollment');
    return enrollment?.completion_percentage || 0;
  },

  hasActivePlan: () => {
    const plan = store.getState('financialPlan');
    return plan && (plan.status === 'DRAFT' || plan.status === 'IN_PROGRESS');
  },

  pendingMilestones: () => {
    const milestones = store.getState('milestones');
    return milestones.filter(m => m.status === 'NOT_STARTED' || m.status === 'IN_PROGRESS');
  },

  completedMilestones: () => {
    const milestones = store.getState('milestones');
    return milestones.filter(m => m.status === 'COMPLETED');
  }
};

// =====================================================
// EXPORT DEFAULT
// =====================================================

export default store;
