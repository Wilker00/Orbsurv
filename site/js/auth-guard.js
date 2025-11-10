/**
 * Centralized authentication guard for protected pages
 * Provides consistent auth checking, token validation, and redirect handling
 */

(function() {
  'use strict';

  const AUTH_CHECK_INTERVAL = 60000; // Check auth every minute
  let authCheckInterval = null;

  /**
   * Check if user is authenticated
   * @returns {boolean} True if authenticated, false otherwise
   */
  function isAuthenticated() {
    if (!window.OrbsurvAuth || typeof window.OrbsurvAuth.getTokens !== 'function') {
      return false;
    }

    try {
      const tokens = window.OrbsurvAuth.getTokens();
      return tokens && tokens.accessToken && !window.OrbsurvAuth.isTokenExpired(tokens.accessToken);
    } catch (error) {
      console.warn('Auth check failed:', error);
      return false;
    }
  }

  /**
   * Check if user has DEV role
   * @returns {boolean} True if user has DEV role
   */
  function hasDevRole() {
    if (!window.OrbsurvAuth || typeof window.OrbsurvAuth.getTokens !== 'function') {
      return false;
    }

    try {
      const tokens = window.OrbsurvAuth.getTokens();
      return tokens && tokens.role === 'dev';
    } catch (error) {
      console.warn('Role check failed:', error);
      return false;
    }
  }

  /**
   * Ensure user has DEV role, redirect if not
   * @param {boolean} allowRedirect - Whether to redirect if not DEV role
   * @returns {Promise<boolean>} True if user has DEV role
   */
  async function ensureDevRole(allowRedirect = true) {
    const authenticated = await ensureAuth(allowRedirect);
    if (!authenticated) {
      return false;
    }

    if (hasDevRole()) {
      return true;
    }

    if (allowRedirect) {
      console.warn('DEV role required, redirecting to login');
      redirectToLogin();
    }

    return false;
  }

  /**
   * Redirect to login page with return URL
   * @param {string} returnPath - Path to return to after login
   */
  function redirectToLogin(returnPath = null) {
    const currentPath = returnPath || window.location.pathname;
    const url = new URL('login.html', window.location.origin);
    if (currentPath && currentPath !== '/login.html') {
      url.searchParams.set('redirect', currentPath);
    }
    window.location.href = url.toString();
  }

  /**
   * Ensure user is authenticated, redirect if not
   * @param {boolean} allowRedirect - Whether to redirect if not authenticated
   * @returns {Promise<boolean>} True if authenticated
   */
  async function ensureAuth(allowRedirect = true) {
    if (isAuthenticated()) {
      return true;
    }

    // Try to refresh token if available
    if (window.OrbsurvAuth && typeof window.OrbsurvAuth.getAccessToken === 'function') {
      try {
        const token = await window.OrbsurvAuth.getAccessToken({ allowRefresh: true });
        if (token) {
          return true;
        }
      } catch (error) {
        console.warn('Token refresh failed:', error);
      }
    }

    if (allowRedirect) {
      redirectToLogin();
    }

    return false;
  }

  /**
   * Handle API errors and redirect on 401
   * @param {Error} error - The error object
   */
  function handleAuthError(error) {
    if (error && (error.status === 401 || error.statusCode === 401)) {
      console.warn('Unauthorized access detected, redirecting to login');
      redirectToLogin();
    }
  }

  /**
   * Start periodic auth checking
   */
  function startAuthMonitoring() {
    if (authCheckInterval) {
      return;
    }

    authCheckInterval = setInterval(() => {
      if (!isAuthenticated()) {
        console.warn('Auth check failed, redirecting to login');
        redirectToLogin();
        stopAuthMonitoring();
      }
    }, AUTH_CHECK_INTERVAL);
  }

  /**
   * Stop periodic auth checking
   */
  function stopAuthMonitoring() {
    if (authCheckInterval) {
      clearInterval(authCheckInterval);
      authCheckInterval = null;
    }
  }

  /**
   * Initialize auth guard on page load
   * @param {Object} options - Configuration options
   * @param {boolean} options.requireAuth - Whether to require auth (default: true)
   * @param {boolean} options.monitorAuth - Whether to monitor auth status (default: true)
   * @param {boolean} options.redirectOnFail - Whether to redirect on auth failure (default: true)
   */
  async function initAuthGuard(options = {}) {
    const {
      requireAuth = true,
      monitorAuth = true,
      redirectOnFail = true
    } = options;

    if (requireAuth) {
      const authenticated = await ensureAuth(redirectOnFail);
      if (!authenticated && redirectOnFail) {
        return false;
      }
    }

    if (monitorAuth && requireAuth) {
      startAuthMonitoring();
    }

    // Handle page unload
    window.addEventListener('beforeunload', stopAuthMonitoring);

    return true;
  }

  // Export to window
  window.AuthGuard = {
    isAuthenticated,
    hasDevRole,
    ensureAuth,
    ensureDevRole,
    redirectToLogin,
    handleAuthError,
    startAuthMonitoring,
    stopAuthMonitoring,
    init: initAuthGuard
  };

  // Auto-initialize if data-require-auth attribute is present
  if (document.documentElement.hasAttribute('data-require-auth')) {
    document.addEventListener('DOMContentLoaded', () => {
      initAuthGuard({
        requireAuth: true,
        monitorAuth: true,
        redirectOnFail: true
      });
    });
  }

  // Auto-initialize if data-require-dev attribute is present
  if (document.documentElement.hasAttribute('data-require-dev')) {
    document.addEventListener('DOMContentLoaded', async () => {
      const hasDev = await ensureDevRole(true);
      if (hasDev) {
        startAuthMonitoring();
        window.addEventListener('beforeunload', stopAuthMonitoring);
      }
    });
  }
})();

