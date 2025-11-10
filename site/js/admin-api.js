/**
 * Shared admin API utility for consistent admin endpoint calls
 * Handles authentication, error handling, and data formatting
 */

(function() {
  'use strict';

  let apiClient = null;
  let authClient = null;

  /**
   * Initialize admin API client
   */
  function init() {
    apiClient = window.OrbsurvApi || null;
    authClient = window.OrbsurvAuth || null;
  }

  /**
   * Get authentication token
   */
  async function getAuthToken() {
    if (!authClient || typeof authClient.getAccessToken !== 'function') {
      throw new Error('Auth client not available');
    }
    return await authClient.getAccessToken({ allowRefresh: true });
  }

  /**
   * Make authenticated API request
   */
  async function request(endpoint, options = {}) {
    if (!apiClient || typeof apiClient.requestJSON !== 'function') {
      // Fallback to direct fetch
      const token = await getAuthToken();
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      };

      const url = endpoint.startsWith('http') ? endpoint : `${window.ORBSURV_API_BASE || 'http://localhost:8000'}${endpoint}`;
      
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        const error = new Error(`Request failed: ${response.status}`);
        error.status = response.status;
        error.statusCode = response.status;
        throw error;
      }

      return await response.json();
    }

    return await apiClient.requestJSON(endpoint, {
      auth: true,
      ...options
    });
  }

  /**
   * Get admin summary
   */
  async function getSummary() {
    return await request('/api/v1/admin/summary');
  }

  /**
   * Get admin logs
   */
  async function getLogs() {
    return await request('/api/v1/admin/logs');
  }

  /**
   * Get all users
   */
  async function getUsers() {
    return await request('/api/v1/admin/users');
  }

  /**
   * Get waitlist entries
   */
  async function getWaitlist() {
    return await request('/api/v1/admin/waitlist');
  }

  /**
   * Get contact requests
   */
  async function getContacts() {
    return await request('/api/v1/admin/contacts');
  }

  /**
   * Get pilot requests
   */
  async function getPilotRequests() {
    return await request('/api/v1/admin/pilot-requests');
  }

  /**
   * Get investor interest
   */
  async function getInvestorInterest() {
    return await request('/api/v1/admin/investor-interest');
  }

  /**
   * Send email
   */
  async function sendEmail(to, subject, body) {
    return await request('/api/v1/admin/send-email', {
      method: 'POST',
      body: { to, subject, body }
    });
  }

  /**
   * Export data to CSV
   */
  function exportToCSV(data, filename) {
    if (!Array.isArray(data) || data.length === 0) {
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          const stringValue = String(value).replace(/"/g, '""');
          return `"${stringValue}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename || 'export'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Export data to JSON
   */
  function exportToJSON(data, filename) {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename || 'export'}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Format date for display
   */
  function formatDate(dateString) {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (error) {
      return dateString;
    }
  }

  /**
   * Format relative time
   */
  function formatRelativeTime(dateString) {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diff = now - date;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
      if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
      if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
      
      return date.toLocaleDateString();
    } catch (error) {
      return dateString;
    }
  }

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export to window
  window.AdminAPI = {
    getSummary,
    getLogs,
    getUsers,
    getWaitlist,
    getContacts,
    getPilotRequests,
    getInvestorInterest,
    sendEmail,
    exportToCSV,
    exportToJSON,
    formatDate,
    formatRelativeTime,
    request
  };
})();

