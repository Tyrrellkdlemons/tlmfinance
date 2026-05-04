/**
 * TLM Finance - Client-Side Router
 * ================================
 * Hash-based SPA router for Pathways Home transformation
 * No build step, pure vanilla JavaScript
 *
 * Features:
 * - Hash-based routing (#/route/path)
 * - Nested routes support
 * - Route parameters (/user/:id)
 * - Navigation guards (auth check, enrollment check)
 * - Browser history integration
 * - Dynamic component loading
 * - 404 handling
 *
 * Usage:
 *   import { router } from './router.js';
 *   router.addRoute('/plan', PlanComponent);
 *   router.navigate('/plan');
 */

class Router {
  constructor() {
    this.routes = new Map();
    this.guards = [];
    this.currentRoute = null;
    this.currentComponent = null;
    this.params = {};
    this.query = {};

    // Default 404 handler
    this.notFoundHandler = () => {
      const appElement = document.getElementById('app');
      if (appElement) {
        appElement.innerHTML = `
          <div class="error-page">
            <h1>404 - Page Not Found</h1>
            <p>The page you're looking for doesn't exist.</p>
            <a href="#/" class="btn btn--primary">Go Home</a>
          </div>
        `;
      }
    };

    // Initialize
    this._init();
  }

  /**
   * Initialize router - set up event listeners
   * @private
   */
  _init() {
    // Listen for hash changes
    window.addEventListener('hashchange', () => this._handleRouteChange());

    // Listen for popstate (back/forward buttons)
    window.addEventListener('popstate', () => this._handleRouteChange());

    // Handle initial route on page load
    window.addEventListener('DOMContentLoaded', () => this._handleRouteChange());

    // Intercept all link clicks for internal navigation
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#/"]');
      if (link) {
        e.preventDefault();
        const path = link.getAttribute('href').substring(1); // Remove #
        this.navigate(path);
      }
    });
  }

  /**
   * Add a route to the router
   * @param {string} path - Route path (e.g., '/plan' or '/user/:id')
   * @param {Function|Object} component - Component class or render function
   * @param {Object} options - Route options (guards, meta, etc.)
   */
  addRoute(path, component, options = {}) {
    const pattern = this._pathToRegex(path);
    this.routes.set(path, {
      path,
      pattern,
      paramNames: this._extractParamNames(path),
      component,
      guards: options.guards || [],
      meta: options.meta || {},
      name: options.name || path
    });
  }

  /**
   * Add multiple routes at once
   * @param {Array} routes - Array of route objects
   */
  addRoutes(routes) {
    routes.forEach(route => {
      this.addRoute(route.path, route.component, route);
    });
  }

  /**
   * Add a global navigation guard
   * @param {Function} guard - Guard function (to, from, next)
   */
  addGuard(guard) {
    this.guards.push(guard);
  }

  /**
   * Navigate to a route
   * @param {string} path - Path to navigate to
   * @param {Object} options - Navigation options
   */
  navigate(path, options = {}) {
    const { replace = false } = options;

    // Update hash
    if (replace) {
      window.location.replace(`#${path}`);
    } else {
      window.location.hash = path;
    }
  }

  /**
   * Go back in history
   */
  back() {
    window.history.back();
  }

  /**
   * Go forward in history
   */
  forward() {
    window.history.forward();
  }

  /**
   * Set custom 404 handler
   * @param {Function} handler - Handler function or component
   */
  setNotFoundHandler(handler) {
    this.notFoundHandler = handler;
  }

  /**
   * Handle route changes
   * @private
   */
  async _handleRouteChange() {
    const hash = window.location.hash.substring(1) || '/'; // Remove #
    const [path, queryString] = hash.split('?');

    // Parse query parameters
    this.query = this._parseQuery(queryString);

    // Find matching route
    const matchedRoute = this._matchRoute(path);

    if (!matchedRoute) {
      this._renderNotFound();
      return;
    }

    // Extract route params
    this.params = this._extractParams(matchedRoute, path);

    // Create route context
    const to = {
      path,
      params: this.params,
      query: this.query,
      meta: matchedRoute.meta,
      name: matchedRoute.name
    };

    const from = this.currentRoute;

    // Run navigation guards
    const guardsPassed = await this._runGuards(to, from);

    if (!guardsPassed) {
      return; // Guard blocked navigation
    }

    // Update current route
    this.currentRoute = to;

    // Render component
    await this._renderComponent(matchedRoute.component, to);
  }

  /**
   * Match path to route
   * @private
   */
  _matchRoute(path) {
    for (const [routePath, route] of this.routes) {
      if (route.pattern.test(path)) {
        return route;
      }
    }
    return null;
  }

  /**
   * Convert path to regex pattern
   * @private
   */
  _pathToRegex(path) {
    const pattern = path
      .replace(/\//g, '\\/')
      .replace(/:([^\/]+)/g, '([^\\/]+)');
    return new RegExp(`^${pattern}$`);
  }

  /**
   * Extract parameter names from path
   * @private
   */
  _extractParamNames(path) {
    const matches = path.match(/:([^\/]+)/g);
    return matches ? matches.map(m => m.substring(1)) : [];
  }

  /**
   * Extract parameter values from path
   * @private
   */
  _extractParams(route, path) {
    const params = {};
    const matches = path.match(route.pattern);

    if (matches) {
      route.paramNames.forEach((name, index) => {
        params[name] = matches[index + 1];
      });
    }

    return params;
  }

  /**
   * Parse query string
   * @private
   */
  _parseQuery(queryString) {
    if (!queryString) return {};

    const query = {};
    queryString.split('&').forEach(param => {
      const [key, value] = param.split('=');
      query[decodeURIComponent(key)] = decodeURIComponent(value || '');
    });

    return query;
  }

  /**
   * Run navigation guards
   * @private
   */
  async _runGuards(to, from) {
    // Global guards
    for (const guard of this.guards) {
      const result = await guard(to, from, (path) => {
        if (path) this.navigate(path, { replace: true });
      });

      if (result === false) {
        return false;
      }
    }

    // Route-specific guards
    const matchedRoute = this._matchRoute(to.path);
    if (matchedRoute && matchedRoute.guards) {
      for (const guard of matchedRoute.guards) {
        const result = await guard(to, from, (path) => {
          if (path) this.navigate(path, { replace: true });
        });

        if (result === false) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Render component
   * @private
   */
  async _renderComponent(component, route) {
    const appElement = document.getElementById('app');

    if (!appElement) {
      console.error('Router: No #app element found');
      return;
    }

    // Clean up previous component
    if (this.currentComponent && typeof this.currentComponent.destroy === 'function') {
      this.currentComponent.destroy();
    }

    // Render new component
    try {
      if (typeof component === 'function') {
        // Class-based component
        if (component.prototype && component.prototype.render) {
          this.currentComponent = new component(appElement, route);
          await this.currentComponent.render();
        }
        // Function component
        else {
          const html = await component(route);
          appElement.innerHTML = html;
          this.currentComponent = null;
        }
      }
      // Object with render method
      else if (component && typeof component.render === 'function') {
        this.currentComponent = component;
        await component.render(appElement, route);
      }
      // Plain HTML string
      else {
        appElement.innerHTML = component;
        this.currentComponent = null;
      }

      // Scroll to top after navigation
      window.scrollTo(0, 0);

      // Emit route change event
      window.dispatchEvent(new CustomEvent('route-changed', { detail: route }));

    } catch (error) {
      console.error('Router: Error rendering component', error);
      this._renderNotFound();
    }
  }

  /**
   * Render 404 page
   * @private
   */
  _renderNotFound() {
    const appElement = document.getElementById('app');
    if (appElement) {
      if (typeof this.notFoundHandler === 'function') {
        this.notFoundHandler();
      } else {
        appElement.innerHTML = this.notFoundHandler;
      }
    }
  }

  /**
   * Get current route
   */
  getCurrentRoute() {
    return this.currentRoute;
  }

  /**
   * Get route params
   */
  getParams() {
    return this.params;
  }

  /**
   * Get query params
   */
  getQuery() {
    return this.query;
  }
}

// =====================================================
// GLOBAL ROUTER INSTANCE
// =====================================================

export const router = new Router();

// =====================================================
// NAVIGATION GUARDS
// =====================================================

/**
 * Authentication guard
 * Redirects to login if user is not authenticated
 */
export const authGuard = async (to, from, next) => {
  // Check if user is authenticated (using your existing auth)
  const { supabaseClient } = await import('./supabase-client.js');
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    console.log('Auth guard: No session, redirecting to login');
    // Prevent redirect loop - only redirect if not already on home
    if (to !== '/' && !to.includes('showAuth')) {
      next('/?showAuth=true');
      return false;
    }
    return false;
  }

  return true;
};

/**
 * Pathways enrollment guard
 * Redirects to enrollment page if user is not enrolled
 */
export const enrollmentGuard = async (to, from, next) => {
  const { supabaseClient } = await import('./supabase-client.js');
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    // Prevent redirect loop
    if (to !== '/' && !to.includes('showAuth')) {
      next('/?showAuth=true');
      return false;
    }
    return false;
  }

  // Check if user has an active Pathways enrollment
  const { data: enrollment, error } = await supabaseClient
    .from('pathways_enrollments')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('program_status', 'ACTIVE')
    .single();

  if (error || !enrollment) {
    console.log('Enrollment guard: No active enrollment, redirecting to enrollment');
    // Prevent redirect loop - only redirect if not already on enroll page
    if (to !== '/enroll') {
      next('/enroll');
      return false;
    }
    return false;
  }

  return true;
};

/**
 * Coach guard
 * Restricts access to coaches only
 */
export const coachGuard = async (to, from, next) => {
  const { supabaseClient } = await import('./supabase-client.js');
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    next('/?showAuth=true');
    return false;
  }

  // Check if user is a coach
  const isCoach = session.user.user_metadata?.role === 'coach' ||
                  session.user.user_metadata?.role === 'admin';

  if (!isCoach) {
    console.log('Coach guard: User is not a coach');
    next('/dashboard');
    return false;
  }

  return true;
};

/**
 * Admin guard
 * Restricts access to admins only
 */
export const adminGuard = async (to, from, next) => {
  const { supabaseClient } = await import('./supabase-client.js');
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    next('/?showAuth=true');
    return false;
  }

  // Check if user is an admin
  const isAdmin = session.user.user_metadata?.role === 'admin';

  if (!isAdmin) {
    console.log('Admin guard: User is not an admin');
    next('/dashboard');
    return false;
  }

  return true;
};

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Build a route path with params
 * @param {string} path - Path template (e.g., '/user/:id')
 * @param {Object} params - Params object (e.g., { id: '123' })
 * @returns {string} - Built path
 */
export function buildPath(path, params = {}) {
  let builtPath = path;
  Object.keys(params).forEach(key => {
    builtPath = builtPath.replace(`:${key}`, params[key]);
  });
  return builtPath;
}

/**
 * Build a route with query params
 * @param {string} path - Base path
 * @param {Object} query - Query params object
 * @returns {string} - Path with query string
 */
export function buildQuery(path, query = {}) {
  const queryString = Object.keys(query)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`)
    .join('&');

  return queryString ? `${path}?${queryString}` : path;
}

/**
 * Navigate with both params and query
 * @param {string} path - Path template
 * @param {Object} params - Route params
 * @param {Object} query - Query params
 */
export function navigateTo(path, params = {}, query = {}) {
  const builtPath = buildPath(path, params);
  const fullPath = buildQuery(builtPath, query);
  router.navigate(fullPath);
}

// =====================================================
// EXPORT DEFAULT
// =====================================================

export default router;
