/**
 * Profile settings page functionality
 */

(function() {
  'use strict';

  let apiClient = null;
  let authClient = null;

  document.addEventListener('DOMContentLoaded', async () => {
    apiClient = window.OrbsurvApi || null;
    authClient = window.OrbsurvAuth || null;

    // Ensure authentication
    if (window.AuthGuard) {
      const authenticated = await window.AuthGuard.ensureAuth();
      if (!authenticated) {
        return;
      }
    }

    await loadUserProfile();
    bindFormEvents();
  });

  /**
   * Load current user profile data
   */
  async function loadUserProfile() {
    if (!apiClient || typeof apiClient.requestJSON !== 'function') {
      return;
    }

    try {
      const user = await apiClient.requestJSON('/api/v1/app/users/me', { auth: true });
      if (user) {
        populateProfileForm(user);
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
      window.AuthGuard?.handleAuthError(error);
    }
  }

  /**
   * Populate profile form with user data
   */
  function populateProfileForm(user) {
    const nameInput = document.getElementById('profile-name');
    const emailInput = document.getElementById('profile-email');
    const orgInput = document.getElementById('profile-organization');

    if (nameInput && user.name) {
      nameInput.value = user.name;
    }
    if (emailInput && user.email) {
      emailInput.value = user.email;
    }
    if (orgInput && user.organization) {
      orgInput.value = user.organization;
    }
  }

  /**
   * Bind form event handlers
   */
  function bindFormEvents() {
    // Profile form success handler
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
      profileForm.addEventListener('orbsurv:form-success', async () => {
        await loadUserProfile();
      });
    }

    // Listen for form errors
    document.addEventListener('orbsurv:form-error', (event) => {
      const error = event.detail?.error;
      if (error) {
        window.AuthGuard?.handleAuthError(error);
      }
    });
  }
})();



