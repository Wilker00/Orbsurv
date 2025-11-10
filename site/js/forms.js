/**
 * Shared form helpers for the Orbsurv marketing site.
 * Normalises API endpoints, persists auth tokens, and wraps fetch with sane defaults.
 */
(function () {
  const LOCAL_DEFAULT_BASE = "http://localhost:8000";
  const TOKEN_STORAGE_KEY = "orbsurv:authTokens";
  let memoryTokenRecord = null;

  function resolveDefaultBase() {
    try {
      if (typeof window === "undefined" || typeof window.location === "undefined") {
        return LOCAL_DEFAULT_BASE;
      }
      const { protocol, hostname, port } = window.location;
      const isLoopback =
        !hostname ||
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname.startsWith("127.") ||
        hostname === "[::1]" ||
        hostname.startsWith("::1");
      if (isLoopback) {
        return LOCAL_DEFAULT_BASE;
      }
      return `${protocol}//${hostname}${port ? `:${port}` : ""}`;
    } catch (error) {
      console.warn("Unable to infer API base, using local fallback.", error);
      return LOCAL_DEFAULT_BASE;
    }
  }

  const metaElement =
    typeof document !== "undefined"
      ? document.querySelector('meta[name="orbsurv-api-base"]')
      : null;
  const configuredBase = [
    typeof window !== "undefined" ? window.ORBSURV_API_BASE : null,
    metaElement && metaElement.getAttribute("content"),
    resolveDefaultBase(),
    LOCAL_DEFAULT_BASE,
  ]
    .find((value) => typeof value === "string" && value.trim().length > 0);
  const API_BASE = normalizeBase(configuredBase || resolveDefaultBase());
  window.ORBSURV_API_BASE = API_BASE;

  function normalizeBase(value) {
    try {
      const fallback = resolveDefaultBase();
      if (!value) {
        return fallback;
      }
      const trimmed = value.trim();
      if (!trimmed) {
        return fallback;
      }
      const url = new URL(trimmed, fallback);
      return url.toString().replace(/\/+$/, "");
    } catch (error) {
      console.warn("Unable to normalise API base, using fallback.", error);
      return resolveDefaultBase();
    }
  }

  const REMAP_TABLE = {
    "/waitlist": "/api/v1/waitlist",
    "/pilot_request": "/api/v1/pilot_request",
    "/contact": "/api/v1/contact",
    "/auth/login": "/api/v1/auth/login",
    "/auth/register": "/api/v1/auth/register",
    "/auth/register-from-order": "/api/v1/auth/register-from-order",
    "/auth/forgot": "/api/v1/auth/forgot",
    "/auth/reset": "/api/v1/auth/reset",
    "/auth/password/reset": "/api/v1/auth/password/reset",
    "/orders": "/api/v1/orders",
  };

  function remapEndpoint(endpoint) {
    const normalized = (endpoint || "").trim();
    if (!normalized) {
      return endpoint;
    }
    return REMAP_TABLE[normalized] || normalized;
  }

  function resolveEndpoint(endpoint) {
    if (!endpoint) {
      throw new Error("Missing API endpoint");
    }
    const mapped = remapEndpoint(endpoint);
    if (/^https?:\/\//i.test(mapped)) {
      return mapped;
    }
    const path = mapped.startsWith("/") ? mapped : `/${mapped}`;
    return `${API_BASE}${path}`;
  }

  function readStoredTokens() {
    try {
      const raw = window.localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!raw) {
        return memoryTokenRecord;
      }
      const parsed = JSON.parse(raw);
      memoryTokenRecord = parsed;
      return parsed;
    } catch (error) {
      return memoryTokenRecord;
    }
  }

  function writeStoredTokens(record) {
    memoryTokenRecord = record || null;
    try {
      if (!record) {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      } else {
        window.localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(record));
      }
    } catch (error) {
      // Fallback to in-memory when storage is unavailable (private browsing, etc.)
    }
  }

  function clearStoredTokens() {
    writeStoredTokens(null);
  }

  function storeTokens(tokenResponse) {
    if (!tokenResponse || !tokenResponse.access_token) {
      return;
    }
    const record = {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token || null,
      role: tokenResponse.role || (tokenResponse.user && tokenResponse.user.role) || null,
      user: tokenResponse.user || null,
      tokenType: tokenResponse.token_type || "bearer",
      storedAt: Date.now(),
    };
    writeStoredTokens(record);
  }

  function getTokens() {
    return readStoredTokens();
  }

  function getUser() {
    const record = getTokens();
    return record && record.user ? record.user : null;
  }

  function updateUser(nextUser) {
    if (!nextUser) {
      return;
    }
    const record = getTokens();
    if (!record) {
      return;
    }
    record.user = nextUser;
    writeStoredTokens(record);
  }

  function parseJwt(token) {
    if (!token || typeof token !== "string") {
      return null;
    }
    try {
      const [, payload] = token.split(".");
      if (!payload) {
        return null;
      }
      const normalised = payload.replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalised.padEnd(normalised.length + ((4 - (normalised.length % 4)) % 4), "=");
      const decoded = atob(padded);
      return JSON.parse(decoded);
    } catch (error) {
      console.warn("Unable to decode JWT payload.", error);
      return null;
    }
  }

  function isTokenExpired(token, skewSeconds = 60) {
    const payload = parseJwt(token);
    if (!payload || !payload.exp) {
      return false;
    }
    const now = Math.floor(Date.now() / 1000);
    return payload.exp <= now + skewSeconds;
  }

  async function performRefresh(refreshToken) {
    const url = resolveEndpoint("/auth/refresh");
    let response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch (error) {
      throw new Error(`Network request failed: ${error && error.message ? error.message : error}`);
    }

    let data = null;
    try {
      data = await response.json();
    } catch (_) {
      data = null;
    }

    if (!response.ok) {
      const message =
        data && typeof data === "object"
          ? data.detail || data.error || data.message || `Refresh failed (${response.status})`
          : `Refresh failed (${response.status})`;
      const err = new Error(message);
      err.status = response.status;
      err.body = data;
      throw err;
    }

    storeTokens(data);
    return data;
  }

  async function getAccessToken({ allowRefresh = true } = {}) {
    const record = getTokens();
    if (!record || !record.accessToken) {
      return null;
    }
    if (!isTokenExpired(record.accessToken)) {
      return record.accessToken;
    }
    if (!allowRefresh || !record.refreshToken) {
      clearStoredTokens();
      return null;
    }
    try {
      const refreshed = await performRefresh(record.refreshToken);
      return refreshed.access_token || null;
    } catch (error) {
      clearStoredTokens();
      console.error("Token refresh failed", error);
      return null;
    }
  }

  async function tryRefreshAccessToken() {
    const record = getTokens();
    if (!record || !record.refreshToken) {
      clearStoredTokens();
      return false;
    }
    try {
      const refreshed = await performRefresh(record.refreshToken);
      return Boolean(refreshed && refreshed.access_token);
    } catch (error) {
      clearStoredTokens();
      console.error("Unable to refresh access token", error);
      return false;
    }
  }

  async function requestJSON(endpoint, options = {}) {
    const url = resolveEndpoint(endpoint);
    const method = (options.method || "GET").toUpperCase();
    const headers = new Headers(options.headers || {});
    if (!headers.has("Accept")) {
      headers.set("Accept", "application/json");
    }

    const init = {
      method,
      headers,
      signal: options.signal,
    };

    const hasBody =
      options.body !== undefined &&
      options.body !== null &&
      method !== "GET" &&
      method !== "HEAD";

    if (hasBody) {
      if (options.body instanceof FormData) {
        init.body = options.body;
      } else if (typeof options.body === "string") {
        init.body = options.body;
        if (!headers.has("Content-Type")) {
          headers.set("Content-Type", "application/json");
        }
      } else {
        if (!headers.has("Content-Type")) {
          headers.set("Content-Type", "application/json");
        }
        init.body = JSON.stringify(options.body);
      }
    }

    if (options.credentials) {
      init.credentials = options.credentials;
    }

    if (options.auth) {
      const token = await getAccessToken({ allowRefresh: true });
      if (!token) {
        const authError = new Error("Authentication required");
        authError.status = 401;
        throw authError;
      }
      headers.set("Authorization", `Bearer ${token}`);
    }

    let response;
    try {
      response = await fetch(url, init);
    } catch (error) {
      throw new Error(`Network request failed: ${error && error.message ? error.message : error}`);
    }

    let data = null;
    const text = await response.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (_) {
        data = text;
      }
    }

    if (response.status === 401 && options.auth && !options._retried) {
      const refreshed = await tryRefreshAccessToken();
      if (refreshed) {
        return requestJSON(endpoint, { ...options, _retried: true });
      }
    }

    if (!response.ok) {
      const message =
        data && typeof data === "object"
          ? data.detail || data.error || data.message || `Request failed (${response.status})`
          : `Request failed (${response.status})`;
      const err = new Error(message);
      err.status = response.status;
      err.statusCode = response.status;
      err.body = data;
      
      // Use AuthGuard if available for 401 errors
      if (response.status === 401 && window.AuthGuard && typeof window.AuthGuard.handleAuthError === 'function') {
        window.AuthGuard.handleAuthError(err);
      }
      
      throw err;
    }

    if (!data || typeof data === "string") {
      return data && typeof data === "string" && data.length ? { message: data } : {};
    }

    return data;
  }

  function postJSON(endpoint, payload, options = {}) {
    return requestJSON(endpoint, { ...options, method: "POST", body: payload });
  }

  function showMessage(target, text, type) {
    if (!target) return;
    target.textContent = text;
    target.style.display = "block";
    target.classList.add("is-visible");
    target.classList.toggle("is-error", type === "error");

    clearTimeout(target._orbsurvTimeout);
    target._orbsurvTimeout = window.setTimeout(() => {
      target.classList.remove("is-visible");
      target.classList.remove("is-error");
    }, 4000);
  }

  function sanitizePayload(payload) {
    const snapshot = {};
    Object.entries(payload || {}).forEach(([key, value]) => {
      if (typeof key === "string" && key.toLowerCase().includes("password")) {
        snapshot[key] = "[redacted]";
      } else if (value instanceof File) {
        snapshot[key] = "[file]";
      } else {
        snapshot[key] = value;
      }
    });
    return snapshot;
  }

  async function handleFormSubmit(event, form) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }
    const endpoint = form.dataset.endpoint;
    if (!endpoint) {
      console.warn("Form missing data-endpoint attribute", form);
      return;
    }

    const successMessage = form.dataset.successMessage || "Thanks! We received your submission.";
    const errorMessage = form.dataset.errorMessage || "Sorry, there was a problem. Please try again.";
    const targetId = form.dataset.messageTarget || (form.id ? `${form.id.replace(/-form$/, "")}-message` : "");
    const messageBox = targetId ? document.getElementById(targetId) : null;
    const submitButton = form.querySelector('[type="submit"]');

    if (messageBox) {
      messageBox.textContent = "Sending...";
      messageBox.style.display = "block";
      messageBox.classList.add("is-visible");
      messageBox.classList.remove("is-error");
    }
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.dataset.originalText = submitButton.dataset.originalText || submitButton.innerHTML;
      submitButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending';
    }

    const formData = new FormData(form);
    const payload = {};
    formData.forEach((value, key) => {
      if (Object.prototype.hasOwnProperty.call(payload, key)) {
        const existing = payload[key];
        if (Array.isArray(existing)) {
          existing.push(value);
        } else {
          payload[key] = [existing, value];
        }
      } else {
        payload[key] = typeof value === "string" ? value.trim() : value;
      }
    });

    const safePayload = sanitizePayload(payload);
    const method = (form.dataset.method || "POST").toUpperCase();
    const requiresAuth = form.dataset.auth === "true";

    try {
      const response = await requestJSON(endpoint, {
        method,
        body: payload,
        auth: requiresAuth,
      });
      form.dispatchEvent(
        new CustomEvent("orbsurv:form-success", {
          detail: { endpoint, payload: safePayload, response },
        }),
      );
      if (messageBox) {
        showMessage(messageBox, successMessage, "success");
      } else {
        window.alert(successMessage);
      }
      form.reset();
    } catch (error) {
      const message = error && error.message ? error.message : errorMessage;
      // Use AuthGuard if available for 401 errors
      if (error && (error.status === 401 || error.statusCode === 401)) {
        if (window.AuthGuard && typeof window.AuthGuard.handleAuthError === 'function') {
          window.AuthGuard.handleAuthError(error);
        }
      }
      
      form.dispatchEvent(
        new CustomEvent("orbsurv:form-error", {
          detail: { endpoint, payload: safePayload, error },
        }),
      );
      console.error("Submission failed", error);
      if (messageBox) {
        showMessage(messageBox, message, "error");
      } else {
        window.alert(message);
      }
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        if (submitButton.dataset.originalText) {
          submitButton.innerHTML = submitButton.dataset.originalText;
        }
      }
    }
  }

  window.handleFormSubmit = handleFormSubmit;
  window.OrbsurvForms = {
    handleFormSubmit,
    showMessage,
    postJSON,
    requestJSON,
    resolveEndpoint,
    API_BASE,
  };
  window.OrbsurvApi = {
    requestJSON,
    postJSON,
    resolveEndpoint,
    API_BASE,
  };
  window.OrbsurvAuth = {
    storeTokens,
    getTokens,
    getAccessToken,
    tryRefreshAccessToken,
    clearTokens: clearStoredTokens,
    getUser,
    updateUser,
    isTokenExpired,
  };
})();
