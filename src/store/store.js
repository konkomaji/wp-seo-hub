// store.js — API-backed store (Express server on port 3001, proxied via CRA)

const API = '/api';

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, options);
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json();
}

// ── Clients ───────────────────────────────────────────────────────────────────

export const getClients = () => apiFetch('/clients').catch(() => []);

export const saveClient = (client) =>
  apiFetch('/clients', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(client),
  });

export const deleteClient = (id) =>
  apiFetch(`/clients/${id}`, { method: 'DELETE' });

// ── WP Cache ──────────────────────────────────────────────────────────────────

export const getWpCache = () => apiFetch('/posts/cache').catch(() => ({}));

export const saveWpCache = (clientId, data) =>
  apiFetch(`/posts/cache/${clientId}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(data),
  });

export const clearWpCache = (clientId) =>
  apiFetch(`/posts/cache/${clientId}`, { method: 'DELETE' });

// ── Local Posts ───────────────────────────────────────────────────────────────

export const getLocalPosts = () => apiFetch('/posts/local').catch(() => ({}));

export const saveLocalPost = (clientId, post) =>
  apiFetch('/posts/local', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ ...post, clientId }),
  });

export const deleteLocalPost = (clientId, localId) =>
  apiFetch(`/posts/local/${clientId}/${localId}`, { method: 'DELETE' });

// ── Calendar Settings ─────────────────────────────────────────────────────────

export const getCalendarSettings = () => apiFetch('/posts/calendar').catch(() => ({}));

export const saveCalendarSettings = (clientId, settings) =>
  apiFetch(`/posts/calendar/${clientId}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ settings }),
  });

// ── Tracked Keywords ──────────────────────────────────────────────────────────

export const getTrackedKeywords = () => apiFetch('/keywords').catch(() => ({}));

export const saveTrackedKeyword = (clientId, kw) =>
  apiFetch(`/keywords/${clientId}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(kw),
  });

export const deleteTrackedKeyword = (clientId, id) =>
  apiFetch(`/keywords/${clientId}/${id}`, { method: 'DELETE' });

// ── GSC Config ────────────────────────────────────────────────────────────────

export const getGscConfig = () => apiFetch('/gsc').catch(() => ({}));

export const saveGscConfig = (config) =>
  apiFetch('/gsc', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(config),
  });

// ── Error Log ─────────────────────────────────────────────────────────────────

export const logError = (component, operation, error, ctx = {}) => {
  const entry = {
    id:        generateId(),
    ts:        new Date().toISOString(),
    component,
    operation,
    message:   error?.message || String(error),
    stack:     error?.stack ? error.stack.split('\n').slice(0, 4).join(' | ') : null,
    ctx:       typeof ctx === 'object' ? ctx : { detail: ctx },
  };
  fetch(`${API}/errors`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(entry),
  }).catch(() => {});
  return entry;
};

export const getErrorLog = () => apiFetch('/errors').catch(() => []);

export const clearErrorLog = () =>
  apiFetch('/errors', { method: 'DELETE' });

// ── Settings ──────────────────────────────────────────────────────────────────

export const getSettings = () =>
  apiFetch('/settings').catch(() => ({ defaultTimezone: 'Asia/Kolkata', clientTimezones: {} }));

export const saveSettings = (settings) =>
  apiFetch('/settings', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(settings),
  });

// ── Client Profiles ───────────────────────────────────────────────────────────

export const getClientProfiles = () => apiFetch('/claude/profiles').catch(() => ({}));

export const generateClientProfile = (clientId) =>
  apiFetch('/claude/profile', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ clientId }),
  });

// ── Meta Optimizer ───────────────────────────────────────────────────────────

export const getMetaSuggestions = (clientId) =>
  apiFetch(`/claude/meta-suggestions/${clientId}`).catch(() => null);

export const generateMetaSuggestions = (clientId, pages) =>
  apiFetch('/claude/meta-optimize', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ clientId, pages }),
  });

// ── Category Builder ─────────────────────────────────────────────────────────

export const getCategorySuggestions = (clientId) =>
  apiFetch(`/claude/category-suggestions/${clientId}`).catch(() => null);

export const generateCategorySuggestions = (clientId, existingCategories, posts) =>
  apiFetch('/claude/suggest-categories', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ clientId, existingCategories, posts }),
  });

// ── Audit History ─────────────────────────────────────────────────────────────

export const getAuditHistory = (clientId) =>
  apiFetch(`/audit-history/${clientId}`).catch(() => []);

export const saveAuditRun = (run) =>
  apiFetch('/audit-history', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(run),
  });

export const patchAuditRun = (id, patch) =>
  apiFetch(`/audit-history/${id}`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(patch),
  });

export const deleteAuditRun = (id) =>
  apiFetch(`/audit-history/${id}`, { method: 'DELETE' });

// ── Category Optimizations ────────────────────────────────────────────────────

export const getOptimizedCategories = (clientId) =>
  apiFetch(`/claude/category-optimizations/${clientId}`).catch(() => null);

export const generateCategoryOptimizations = (clientId, categories) =>
  apiFetch('/claude/optimize-categories', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ clientId, categories }),
  });

// ── GSC Data via VK Connector ─────────────────────────────────────────────────

export const getGscData = (clientId, days = 28) =>
  apiFetch(`/gsc/${clientId}/data?days=${days}`).catch(() => null);

export const getGscStatus = (clientId) =>
  apiFetch(`/gsc/${clientId}/status`).catch(() => null);

// ── API Keys (.env management) ────────────────────────────────────────────────

export const getEnvKeys = () => apiFetch('/env/keys').catch(() => ({}));

export const saveEnvKeys = (keys) =>
  apiFetch('/env/keys', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(keys),
  });

// ── Google OAuth + Indexing ───────────────────────────────────────────────────

export const getGoogleStatus = () => apiFetch('/google/status').catch(() => ({ connected: false }));

export const getGoogleAuthUrl = () => apiFetch('/google/auth-url');

export const revokeGoogle = () =>
  apiFetch('/google/revoke', { method: 'DELETE' });

export const getGoogleSites = () => apiFetch('/google/sites').catch(() => []);

export const submitUrlsForIndexing = (urls, type = 'URL_UPDATED') =>
  apiFetch('/google/indexing/submit', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ urls, type }),
  });

export const submitSitemap = (siteUrl, feedpath) =>
  apiFetch('/google/indexing/sitemap', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ siteUrl, feedpath }),
  });

export const inspectUrl = (inspectionUrl, siteUrl) =>
  apiFetch('/google/gsc/inspect', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ inspectionUrl, siteUrl }),
  });

export const getIndexingLog = () => apiFetch('/google/indexing/log').catch(() => []);

export const getAiFix = (url, inspectionResult, clientId) =>
  apiFetch('/google/indexing/ai-fix', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ url, inspectionResult, clientId }),
  });

// ── Utility ───────────────────────────────────────────────────────────────────

export const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ── One-time localStorage migration ──────────────────────────────────────────

export const migrateFromLocalStorage = async () => {
  if (localStorage.getItem('vk_seo_migrated')) return;

  const get = (key, def) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? def; }
    catch { return def; }
  };

  const payload = {
    clients:           get('vk_seo_clients', []),
    wp_cache:          get('vk_seo_wp_cache', {}),
    local_posts:       get('vk_seo_posts', {}),
    calendar_settings: get('vk_seo_calendar', {}),
    keywords:          get('vk_seo_keywords', {}),
    gsc_config:        get('vk_seo_gsc', {}),
    errors:            get('vk_seo_errors', []),
  };

  const hasData = payload.clients.length > 0 || Object.keys(payload.local_posts).length > 0;
  if (!hasData) { localStorage.setItem('vk_seo_migrated', '1'); return; }

  try {
    await fetch(`${API}/migrate`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    localStorage.setItem('vk_seo_migrated', '1');
    console.log('[store] localStorage data migrated to file DB');
  } catch (e) {
    console.warn('[store] Migration failed:', e.message);
  }
};
