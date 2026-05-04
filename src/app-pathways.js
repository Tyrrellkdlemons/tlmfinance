/**
 * TLM Finance - Pathways Home Application Entry Point
 * ====================================================
 * Initializes the SPA router and configures all routes
 * No build step - pure vanilla JavaScript ES6 modules
 */

import { router, authGuard, enrollmentGuard, coachGuard } from './router.js';
import { store } from './store.js';
import { Dashboard } from './components/Dashboard.js';
import { EnrollmentWizard } from './components/EnrollmentWizard.js';

// Make store available globally for auth integration
window.store = store;

/**
 * Initialize the Pathways Home application
 */
async function initPathwaysApp() {
  console.log('🚀 Initializing Pathways Home App...');

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    await new Promise(resolve => {
      document.addEventListener('DOMContentLoaded', resolve);
    });
  }

  // Check if app container exists
  if (!document.getElementById('app')) {
    console.error('❌ No #app element found. Creating one...');
    const appContainer = document.createElement('div');
    appContainer.id = 'app';
    document.body.appendChild(appContainer);
  }

  // Configure routes
  configureRoutes();

  // Initialize auth state
  await initializeAuth();

  // Add global navigation guard for analytics/logging
  router.addGuard(async (to, from, next) => {
    console.log(`📍 Navigating: ${from?.path || '/'} → ${to.path}`);
    return true;
  });

  console.log('✅ Pathways Home App initialized');
}

/**
 * Configure all application routes
 */
function configureRoutes() {
  // ==========================================
  // PUBLIC ROUTES (No auth required)
  // ==========================================

  // Home / Landing
  router.addRoute('/', async (route) => {
    const user = store.getState('user');
    const enrollment = store.getState('enrollment');

    // If logged in and enrolled, go to dashboard
    if (user && enrollment && enrollment.program_status === 'ACTIVE') {
      router.navigate('/dashboard', { replace: true });
      return '';
    }

    // Render the landing page
    const appElement = document.getElementById('app');
    if (!appElement) return '';

    appElement.innerHTML = `
      <div class="landing-page">
        <div class="landing-hero">
          <h1>Welcome to Pathways Home</h1>
          <p class="hero-tagline">Your journey to housing independence and financial stability</p>

          ${user ? `
            <div class="landing-actions">
              <a href="#/enroll" class="btn btn--primary btn--lg">Enroll in Program</a>
              ${enrollment ? `<a href="#/dashboard" class="btn btn--secondary btn--lg">View Dashboard</a>` : ''}
            </div>
          ` : `
            <div class="landing-actions">
              <button class="btn btn--primary btn--lg" id="getStartedBtn">Get Started</button>
              <a href="#/about" class="btn btn--secondary btn--lg">Learn More</a>
            </div>
          `}
        </div>

        <div class="landing-features">
          <div class="feature-card">
            <div class="feature-icon">🏠</div>
            <h3>Housing Stability</h3>
            <p>Achieve permanent, stable housing through our 2-year guided program</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">💰</div>
            <h3>Financial Planning</h3>
            <p>Build a comprehensive 2-year financial plan with expert guidance</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">🎯</div>
            <h3>Milestone Tracking</h3>
            <p>Track your progress through 4 quarters with clear, achievable goals</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">👥</div>
            <h3>Coach Support</h3>
            <p>Get personalized coaching and quarterly check-ins throughout your journey</p>
          </div>
        </div>
      </div>
    `;

    // Add event listener to Get Started button (only if not logged in)
    if (!user) {
      const getStartedBtn = document.getElementById('getStartedBtn');
      if (getStartedBtn) {
        getStartedBtn.addEventListener('click', () => {
          // Trigger the auth button in pathways.html navbar
          const authButton = document.getElementById('authButton');
          if (authButton) {
            authButton.click();
          }
        });
      }
    }

    return ''; // Return empty string since we already rendered
  }, {
    name: 'home',
    meta: { title: 'Pathways Home - TLM Finance' }
  });

  // ==========================================
  // AUTHENTICATED ROUTES
  // ==========================================

  // Dashboard (requires auth + enrollment)
  router.addRoute('/dashboard', Dashboard, {
    name: 'dashboard',
    guards: [authGuard, enrollmentGuard],
    meta: { title: 'Dashboard - Pathways Home' }
  });

  // Enrollment Wizard (requires auth only)
  router.addRoute('/enroll', EnrollmentWizard, {
    name: 'enroll',
    guards: [authGuard],
    meta: { title: 'Enroll - Pathways Home' }
  });

  // Milestones (requires auth + enrollment)
  router.addRoute('/milestones', async (route) => {
    return `
      <div class="milestones-page">
        <h1>Your Milestones</h1>
        <p>Full milestones page coming soon...</p>
        <a href="#/dashboard" class="btn btn--secondary">← Back to Dashboard</a>
      </div>
    `;
  }, {
    name: 'milestones',
    guards: [authGuard, enrollmentGuard],
    meta: { title: 'Milestones - Pathways Home' }
  });

  // Quarterly Check-in (requires auth + enrollment)
  router.addRoute('/checkin/:quarterlyProgressId', async (route) => {
    const { quarterlyProgressId } = route.params;

    return `
      <div class="checkin-page">
        <h1>Quarterly Check-In</h1>
        <p>Check-in form for quarter ${quarterlyProgressId} coming soon...</p>
        <a href="#/dashboard" class="btn btn--secondary">← Back to Dashboard</a>
      </div>
    `;
  }, {
    name: 'checkin',
    guards: [authGuard, enrollmentGuard],
    meta: { title: 'Quarterly Check-In - Pathways Home' }
  });

  // Financial Plan - View
  router.addRoute('/plan/view', async (route) => {
    return `
      <div class="plan-view-page">
        <h1>Your Financial Plan</h1>
        <p>Plan viewer coming soon...</p>
        <a href="#/dashboard" class="btn btn--secondary">← Back to Dashboard</a>
      </div>
    `;
  }, {
    name: 'plan-view',
    guards: [authGuard, enrollmentGuard],
    meta: { title: 'View Plan - Pathways Home' }
  });

  // Financial Plan - Edit
  router.addRoute('/plan/edit', async (route) => {
    return `
      <div class="plan-edit-page">
        <h1>Edit Your Financial Plan</h1>
        <p>Plan editor coming soon...</p>
        <a href="#/dashboard" class="btn btn--secondary">← Back to Dashboard</a>
      </div>
    `;
  }, {
    name: 'plan-edit',
    guards: [authGuard, enrollmentGuard],
    meta: { title: 'Edit Plan - Pathways Home' }
  });

  // Financial Plan - Create
  router.addRoute('/plan/create', async (route) => {
    return `
      <div class="plan-create-page">
        <h1>Create Your Financial Plan</h1>
        <p>Plan creator coming soon...</p>
        <a href="#/dashboard" class="btn btn--secondary">← Back to Dashboard</a>
      </div>
    `;
  }, {
    name: 'plan-create',
    guards: [authGuard, enrollmentGuard],
    meta: { title: 'Create Plan - Pathways Home' }
  });

  // ==========================================
  // COACH ROUTES
  // ==========================================

  // Coach Dashboard
  router.addRoute('/coach', async (route) => {
    return `
      <div class="coach-dashboard-page">
        <h1>Coach Dashboard</h1>
        <p>Coach dashboard coming soon...</p>
        <a href="#/dashboard" class="btn btn--secondary">← Back to Dashboard</a>
      </div>
    `;
  }, {
    name: 'coach-dashboard',
    guards: [authGuard, coachGuard],
    meta: { title: 'Coach Dashboard - Pathways Home' }
  });

  // ==========================================
  // UTILITY ROUTES
  // ==========================================

  // About
  router.addRoute('/about', async (route) => {
    return `
      <div class="about-page">
        <h1>About Pathways Home</h1>
        <p>Information about the program...</p>
        <a href="#/" class="btn btn--secondary">← Back to Home</a>
      </div>
    `;
  }, {
    name: 'about',
    meta: { title: 'About - Pathways Home' }
  });

  // Resources
  router.addRoute('/resources', async (route) => {
    return `
      <div class="resources-page">
        <h1>Resources</h1>
        <p>Educational materials and resources...</p>
        <a href="#/dashboard" class="btn btn--secondary">← Back to Dashboard</a>
      </div>
    `;
  }, {
    name: 'resources',
    guards: [authGuard],
    meta: { title: 'Resources - Pathways Home' }
  });

  // Messages
  router.addRoute('/messages', async (route) => {
    return `
      <div class="messages-page">
        <h1>Messages</h1>
        <p>Messaging system coming soon...</p>
        <a href="#/dashboard" class="btn btn--secondary">← Back to Dashboard</a>
      </div>
    `;
  }, {
    name: 'messages',
    guards: [authGuard],
    meta: { title: 'Messages - Pathways Home' }
  });

  // Profile
  router.addRoute('/profile', async (route) => {
    return `
      <div class="profile-page">
        <h1>Profile Settings</h1>
        <p>Profile settings coming soon...</p>
        <a href="#/dashboard" class="btn btn--secondary">← Back to Dashboard</a>
      </div>
    `;
  }, {
    name: 'profile',
    guards: [authGuard],
    meta: { title: 'Profile - Pathways Home' }
  });

  // 404 Not Found
  router.setNotFoundHandler(() => {
    document.getElementById('app').innerHTML = `
      <div class="not-found-page">
        <div class="not-found-content">
          <h1>404</h1>
          <h2>Page Not Found</h2>
          <p>The page you're looking for doesn't exist.</p>
          <a href="#/" class="btn btn--primary">Go Home</a>
        </div>
      </div>
    `;
  });

  console.log('📋 Routes configured:', router.routes.size);
}

/**
 * Initialize authentication state
 */
async function initializeAuth() {
  try {
    const { supabaseClient } = await import('./supabase-client.js');

    // Get initial session
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (session) {
      console.log('✅ User authenticated:', session.user.email);

      // Load enrollment data if user is authenticated
      await store.dispatch('loadEnrollment');

      // Check if user is a coach
      const isCoach = session.user.user_metadata?.role === 'coach' ||
                      session.user.user_metadata?.role === 'admin';

      if (isCoach) {
        await store.dispatch('loadCoachData');
      }
    } else {
      console.log('ℹ️ No active session');
    }
  } catch (error) {
    console.error('❌ Auth initialization error:', error);
  }
}

/**
 * Update page title based on route
 */
window.addEventListener('route-changed', (e) => {
  const route = e.detail;
  if (route.meta?.title) {
    document.title = route.meta.title;
  }
});

/**
 * Show auth modal (called from landing page)
 */
window.showAuthModal = function() {
  // Check if existing auth UI exists
  const authButton = document.getElementById('authButton');
  if (authButton) {
    authButton.click();
  } else {
    alert('Please sign in using the navigation menu');
  }
};

// Initialize the app
initPathwaysApp().catch(error => {
  console.error('❌ Failed to initialize Pathways Home app:', error);
});

// Export for external use
export { initPathwaysApp };
