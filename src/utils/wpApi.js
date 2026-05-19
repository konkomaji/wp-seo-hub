// wpApi.js — Token-based WordPress + WPSeoHub Connector API helpers

const hubBase = (client) => `${client.siteUrl}/wp-json/wp-seo-hub/v1`;

// Token sent in X-WPSeoHub-Token header (not URL) — avoids exposure in server/CDN logs
const hubHeaders = (client, extra = {}) => ({
  ...(client.vkToken ? { 'X-WPSeoHub-Token': client.vkToken } : {}),
  ...extra,
});

const hubJson = (client) => hubHeaders(client, { 'Content-Type': 'application/json' });

// ── Connection & Plugin ───────────────────────────────────────────────────────

export const checkHubPlugin = async (client) => {
  try {
    const res = await fetch(`${hubBase(client)}/ping`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
};

export const testConnection = async (client) => {
  const result = await checkHubPlugin(client);
  if (!result) throw new Error('WPSeoHub Connector plugin not found or API token invalid. Install the plugin on WordPress and enter the correct token.');
  return result;
};

// ── Fetch Posts ───────────────────────────────────────────────────────────────

export const fetchWpPosts = async (client, page = 1, perPage = 30) => {
  if (client.vkToken) {
    try {
      const data = await fetchHubAudit(client);
      const all  = [...(data.posts || []), ...(data.pages || [])];
      const start = (page - 1) * perPage;
      return { posts: all.slice(start, start + perPage), total: all.length };
    } catch {}
  }
  const res = await fetch(
    `${client.siteUrl}/wp-json/wp/v2/posts?page=${page}&per_page=${perPage}&_fields=id,title,status,date,link,categories,tags,yoast_head_json&orderby=date&order=desc`
  );
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const total = parseInt(res.headers.get('X-WP-Total') || '0');
  const posts = await res.json();
  return { posts, total };
};

export const fetchWpPages = async (client) => {
  const res = await fetch(
    `${client.siteUrl}/wp-json/wp/v2/pages?per_page=50&_fields=id,title,status,link,yoast_head_json`
  );
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return await res.json();
};

export const fetchCategories = async (client) => {
  const res = await fetch(`${client.siteUrl}/wp-json/wp/v2/categories?per_page=100`);
  if (!res.ok) return [];
  return res.json();
};

export const fetchTags = async (client) => {
  const res = await fetch(`${client.siteUrl}/wp-json/wp/v2/tags?per_page=100`);
  if (!res.ok) return [];
  return res.json();
};

// ── Media & Post Creation ─────────────────────────────────────────────────────

export const uploadMedia = async (client, file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', file.name.replace(/\.[^/.]+$/, ''));
  const res = await fetch(`${hubBase(client)}/upload-media`, {
    method:  'POST',
    headers: hubHeaders(client),
    body:    formData,
  });
  if (!res.ok) throw new Error(`Media upload failed: ${res.status}`);
  return res.json();
};

export const createDraftPost = async (client, postData) => {
  const payload = {
    title:          postData.title           || '',
    content:        postData.content         || '',
    excerpt:        postData.excerpt         || '',
    slug:           postData.slug            || '',
    status:         postData.status          || 'draft',
    category_ids:   postData.categoryIds     || [],
    tag_ids:        postData.tagIds          || [],
    featured_media: postData.featuredMediaId || 0,
    focus_keyword:  postData.focusKeyword    || '',
    meta_title:     postData.metaTitle       || '',
    meta_desc:      postData.metaDescription || '',
    scheduled_date: postData.scheduledDate   || '',
    noindex:        postData.noindex         || false,
    nofollow:       postData.nofollow        || false,
    canonical_url:  postData.canonicalUrl    || '',
    og_title:       postData.ogTitle         || '',
    og_description: postData.ogDescription   || '',
    schema_type:    postData.schemaType      || '',
    twitter_title:  postData.twitterTitle    || '',
    comment_status: postData.commentStatus   || 'open',
    post_password:  postData.postPassword    || '',
  };
  const res = await fetch(`${hubBase(client)}/create-post`, {
    method:  'POST',
    headers: hubJson(client),
    body:    JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Post failed: ${res.status}`);
  }
  return res.json();
};

// ── Hub Plugin Endpoints ──────────────────────────────────────────────────────

export const fetchHubSiteInfo = async (client) => {
  const res = await fetch(`${hubBase(client)}/info`, { headers: hubHeaders(client) });
  if (!res.ok) throw new Error(`Hub info failed: ${res.status}`);
  return res.json();
};

export const fetchHubAudit = async (client, status = 'any') => {
  const res = await fetch(`${hubBase(client)}/audit?status=${status}`, { headers: hubHeaders(client) });
  if (!res.ok) throw new Error(`Hub audit failed: ${res.status}`);
  return res.json();
};

export const pushMetaFix = async (client, postId, { metaTitle, metaDesc, focusKeyword }) => {
  const res = await fetch(`${hubBase(client)}/update-meta`, {
    method:  'POST',
    headers: hubJson(client),
    body:    JSON.stringify({
      post_id:       postId,
      meta_title:    metaTitle    || '',
      meta_desc:     metaDesc     || '',
      focus_keyword: focusKeyword || '',
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Push failed: ${res.status}`);
  }
  return res.json();
};

export const fetchAllForAudit = async (client) => {
  const fields = 'id,title,status,date,link,slug,yoast_head_json,rank_math_seo';
  const [postsRes, pagesRes] = await Promise.all([
    fetch(`${client.siteUrl}/wp-json/wp/v2/posts?per_page=100&status=publish&_fields=${fields}&orderby=date&order=desc`),
    fetch(`${client.siteUrl}/wp-json/wp/v2/pages?per_page=100&_fields=${fields}`),
  ]);
  const posts = postsRes.ok ? await postsRes.json() : [];
  const pages = pagesRes.ok ? await pagesRes.json() : [];
  return {
    posts: Array.isArray(posts) ? posts.map(p => ({ ...p, _type: 'post' })) : [],
    pages: Array.isArray(pages) ? pages.map(p => ({ ...p, _type: 'page' })) : [],
  };
};

export const updateCategory = async (client, categoryId, { name, slug, description }) => {
  const res = await fetch(`${hubBase(client)}/update-category`, {
    method:  'POST',
    headers: hubJson(client),
    body:    JSON.stringify({ category_id: categoryId, name: name || '', slug: slug || '', description: description || '' }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Update category failed: ${res.status}`);
  }
  return res.json();
};

export const fetchPluginsStatus = async (client) => {
  try {
    const res = await fetch(`${hubBase(client)}/plugins-status`, {
      headers: hubHeaders(client),
      signal:  AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
};

export const createCategory = async (client, { name, slug, description }) => {
  const res = await fetch(`${hubBase(client)}/create-category`, {
    method:  'POST',
    headers: hubJson(client),
    body:    JSON.stringify({ name, slug, description }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Create category failed: ${res.status}`);
  }
  return res.json();
};
