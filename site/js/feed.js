/**
 * Activity feed page functionality
 */

(function() {
  'use strict';

  let apiClient = null;
  let authClient = null;
  let currentFilter = 'all';
  let feedData = [];

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

    bindFilterEvents();
    await loadFeedData();
  });

  /**
   * Load feed data from API
   */
  async function loadFeedData() {
    if (!apiClient || typeof apiClient.requestJSON !== 'function') {
      renderEmptyState('API client not available');
      return;
    }

    try {
      const summary = await apiClient.requestJSON('/api/v1/app/dashboard/summary', { auth: true });
      if (summary && summary.recent_logs) {
        feedData = summary.recent_logs.map(log => ({
          id: log.id,
          type: categorizeActivity(log.action),
          title: formatActivityTitle(log.action),
          description: log.description || formatActivityDescription(log.action),
          timestamp: log.created_at,
          icon: getActivityIcon(log.action)
        }));
        renderFeed();
      } else {
        renderEmptyState('No activity found');
      }
    } catch (error) {
      console.error('Failed to load feed data:', error);
      window.AuthGuard?.handleAuthError(error);
      renderEmptyState('Unable to load activity feed');
    }
  }

  /**
   * Categorize activity by action type
   */
  function categorizeActivity(action) {
    if (!action) return 'system';
    if (action.includes('auth.') || action.includes('login') || action.includes('register')) {
      return 'auth';
    }
    if (action.includes('profile') || action.includes('account.')) {
      return 'profile';
    }
    if (action.includes('camera') || action.includes('feed')) {
      return 'camera';
    }
    return 'system';
  }

  /**
   * Format activity title
   */
  function formatActivityTitle(action) {
    if (!action) return 'Activity';
    
    const parts = action.split('.');
    const lastPart = parts[parts.length - 1];
    
    // Convert snake_case to Title Case
    return lastPart
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Format activity description
   */
  function formatActivityDescription(action) {
    if (!action) return 'Activity occurred';
    
    const descriptions = {
      'auth.login': 'You logged into your account',
      'auth.register': 'You created a new account',
      'auth.logout': 'You logged out',
      'account.profile.update': 'You updated your profile information',
      'account.password.update': 'You changed your password',
      'account.organization.update': 'You updated your organization details',
      'settings.notifications.update': 'You updated notification preferences',
      'settings.automation.update': 'You updated automation settings'
    };

    return descriptions[action] || `Action: ${action}`;
  }

  /**
   * Get icon for activity type
   */
  function getActivityIcon(action) {
    if (!action) return 'fa-circle';
    
    if (action.includes('login') || action.includes('register')) {
      return 'fa-right-to-bracket';
    }
    if (action.includes('logout')) {
      return 'fa-right-from-bracket';
    }
    if (action.includes('profile') || action.includes('account')) {
      return 'fa-user';
    }
    if (action.includes('password')) {
      return 'fa-lock';
    }
    if (action.includes('camera')) {
      return 'fa-video';
    }
    if (action.includes('settings')) {
      return 'fa-gear';
    }
    return 'fa-circle-info';
  }

  /**
   * Render feed items
   */
  function renderFeed() {
    const feedList = document.getElementById('feed-list');
    if (!feedList) return;

    const filtered = currentFilter === 'all' 
      ? feedData 
      : feedData.filter(item => item.type === currentFilter);

    if (filtered.length === 0) {
      feedList.innerHTML = '<li class="feed-empty">No activity found for this filter.</li>';
      return;
    }

    feedList.innerHTML = filtered.map(item => `
      <li class="feed-item">
        <div class="feed-icon">
          <i class="fa-solid ${item.icon}"></i>
        </div>
        <div class="feed-content">
          <div class="feed-title">${escapeHtml(item.title)}</div>
          <div class="feed-description">${escapeHtml(item.description)}</div>
          <div class="feed-time">${formatTimestamp(item.timestamp)}</div>
        </div>
      </li>
    `).join('');
  }

  /**
   * Render empty state
   */
  function renderEmptyState(message) {
    const feedList = document.getElementById('feed-list');
    if (feedList) {
      feedList.innerHTML = `<li class="feed-empty">${escapeHtml(message)}</li>`;
    }
  }

  /**
   * Format timestamp
   */
  function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now - date;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
      if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
      if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
      
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return timestamp;
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Bind filter button events
   */
  function bindFilterEvents() {
    const filterButtons = document.querySelectorAll('.feed-filter button');
    filterButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Update active state
        filterButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Update filter
        currentFilter = button.dataset.filter || 'all';
        renderFeed();
      });
    });
  }
})();

