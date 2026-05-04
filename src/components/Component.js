/**
 * TLM Finance - Base Component Class
 * ==================================
 * Base class for all Pathways Home components
 * Provides common functionality: state management, lifecycle, events
 *
 * Usage:
 *   class MyComponent extends Component {
 *     constructor(container, route) {
 *       super(container, route);
 *       this.state = { count: 0 };
 *     }
 *
 *     template() {
 *       return `<div>Count: ${this.state.count}</div>`;
 *     }
 *   }
 */

export class Component {
  constructor(container, route = {}) {
    this.container = container;
    this.route = route;
    this.state = {};
    this.listeners = [];
    this.subscriptions = [];
    this.refs = {};
    this._mounted = false;
  }

  /**
   * Lifecycle: Render the component
   */
  async render() {
    // Call beforeRender hook
    if (this.beforeRender) {
      await this.beforeRender();
    }

    // Clean up old event listeners before re-render
    this._cleanupListeners();

    // Get template HTML
    const html = await this.template();

    // Render to container
    if (this.container) {
      this.container.innerHTML = html;
    }

    // Store refs
    this._collectRefs();

    // Bind event listeners
    this._bindEvents();

    // Mark as mounted
    this._mounted = true;

    // Call mounted hook
    if (this.mounted) {
      await this.mounted();
    }
  }

  /**
   * Clean up event listeners
   * @private
   */
  _cleanupListeners() {
    this.listeners.forEach(({ element, event, handler, options }) => {
      element?.removeEventListener(event, handler, options);
    });
    this.listeners = [];
  }

  /**
   * Template method - override in child class
   * @returns {string} HTML template
   */
  template() {
    return '<div>Component</div>';
  }

  /**
   * Update component state and re-render
   * @param {Object} newState - Partial state to merge
   */
  setState(newState) {
    const oldState = { ...this.state };
    this.state = { ...this.state, ...newState };

    // Call update hook if provided
    if (this.shouldUpdate) {
      const shouldUpdate = this.shouldUpdate(this.state, oldState);
      if (!shouldUpdate) return;
    }

    // Re-render
    if (this._mounted) {
      this.render();
    }
  }

  /**
   * Get state
   * @returns {Object} Current state
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Collect refs (elements with data-ref attribute)
   * @private
   */
  _collectRefs() {
    if (!this.container) return;

    this.refs = {};
    const refElements = this.container.querySelectorAll('[data-ref]');

    refElements.forEach(el => {
      const refName = el.getAttribute('data-ref');
      this.refs[refName] = el;
    });
  }

  /**
   * Bind event listeners
   * Called after render, override in child class
   * @private
   */
  _bindEvents() {
    if (this.events) {
      this.events();
    }
  }

  /**
   * Add event listener and track for cleanup
   * @param {HTMLElement} element - Element to attach listener to
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @param {Object} options - Event listener options
   */
  addEventListener(element, event, handler, options = {}) {
    if (!element) return;

    element.addEventListener(event, handler, options);

    // Track for cleanup
    this.listeners.push({ element, event, handler, options });
  }

  /**
   * Emit custom event
   * @param {string} name - Event name
   * @param {*} detail - Event detail
   */
  emit(name, detail = null) {
    const event = new CustomEvent(name, { detail });
    window.dispatchEvent(event);
  }

  /**
   * Listen to custom event
   * @param {string} name - Event name
   * @param {Function} handler - Event handler
   */
  on(name, handler) {
    this.addEventListener(window, name, handler);
  }

  /**
   * Subscribe to Supabase real-time channel
   * @param {Object} channel - Supabase channel
   * @returns {Object} Subscription
   */
  subscribe(channel) {
    const subscription = channel.subscribe();
    this.subscriptions.push(subscription);
    return subscription;
  }

  /**
   * Query selector within component
   * @param {string} selector - CSS selector
   * @returns {HTMLElement|null}
   */
  $(selector) {
    return this.container?.querySelector(selector) || null;
  }

  /**
   * Query selector all within component
   * @param {string} selector - CSS selector
   * @returns {NodeList}
   */
  $$(selector) {
    return this.container?.querySelectorAll(selector) || [];
  }

  /**
   * Show loading state
   * @param {string} message - Loading message
   */
  showLoading(message = 'Loading...') {
    if (this.container) {
      this.container.innerHTML = `
        <div class="loading-state">
          <div class="spinner"></div>
          <p>${message}</p>
        </div>
      `;
    }
  }

  /**
   * Show error state
   * @param {string} message - Error message
   */
  showError(message = 'An error occurred') {
    if (this.container) {
      this.container.innerHTML = `
        <div class="error-state">
          <p class="error-message">${message}</p>
          <button class="btn btn--secondary" onclick="location.reload()">Retry</button>
        </div>
      `;
    }
  }

  /**
   * Show empty state
   * @param {string} message - Empty state message
   */
  showEmpty(message = 'No data found') {
    if (this.container) {
      this.container.innerHTML = `
        <div class="empty-state">
          <p>${message}</p>
        </div>
      `;
    }
  }

  /**
   * Lifecycle: Cleanup when component is destroyed
   */
  destroy() {
    // Call beforeDestroy hook
    if (this.beforeDestroy) {
      this.beforeDestroy();
    }

    // Remove all event listeners
    this.listeners.forEach(({ element, event, handler, options }) => {
      element?.removeEventListener(event, handler, options);
    });
    this.listeners = [];

    // Unsubscribe from all real-time channels
    this.subscriptions.forEach(sub => {
      if (sub && typeof sub.unsubscribe === 'function') {
        sub.unsubscribe();
      }
    });
    this.subscriptions = [];

    // Clear refs
    this.refs = {};

    // Mark as unmounted
    this._mounted = false;

    // Clear container
    if (this.container) {
      this.container.innerHTML = '';
    }

    // Call destroyed hook
    if (this.destroyed) {
      this.destroyed();
    }
  }
}

/**
 * Create a functional component (simpler alternative to class components)
 * @param {Function} renderFn - Render function that returns HTML
 * @returns {Function} Component function
 */
export function createComponent(renderFn) {
  return async (route) => {
    return await renderFn(route);
  };
}

/**
 * HTML template literal tag for syntax highlighting
 * @param {Array} strings - Template strings
 * @param  {...any} values - Template values
 * @returns {string} HTML string
 */
export function html(strings, ...values) {
  return strings.reduce((result, string, i) => {
    const value = values[i] !== undefined ? values[i] : '';
    return result + string + value;
  }, '');
}

/**
 * Escape HTML to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') return str;

  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Format date for display
 * @param {Date|string} date - Date to format
 * @param {string} format - Format type ('short', 'long', 'relative')
 * @returns {string} Formatted date
 */
export function formatDate(date, format = 'short') {
  const d = new Date(date);

  if (isNaN(d.getTime())) {
    return 'Invalid date';
  }

  switch (format) {
    case 'short':
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

    case 'long':
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });

    case 'relative': {
      const now = new Date();
      const diff = now - d;
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 30) return formatDate(d, 'short');
      if (days > 0) return `${days} day${days === 1 ? '' : 's'} ago`;
      if (hours > 0) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
      if (minutes > 0) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
      return 'Just now';
    }

    default:
      return d.toLocaleDateString();
  }
}

/**
 * Format currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code
 * @returns {string} Formatted currency
 */
export function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount);
}

/**
 * Format percentage
 * @param {number} value - Value to format (0-100)
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage
 */
export function formatPercentage(value, decimals = 0) {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Debounce function
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(fn, delay = 300) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Throttle function
 * @param {Function} fn - Function to throttle
 * @param {number} limit - Limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(fn, limit = 300) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export default Component;
