const db = require('./db');

async function fetchClientPosts(client) {
  const baseUrl = `${client.siteUrl}/wp-json`;

  if (client.vkToken) {
    try {
      const res = await fetch(
        `${baseUrl}/wp-seo-hub/v1/audit`,
        { headers: { 'X-WPSeoHub-Token': client.vkToken }, signal: AbortSignal.timeout(10000) }
      );
      if (res.ok) {
        const data = await res.json();
        const posts = [...(data.posts || []), ...(data.pages || [])];
        return { posts, total: posts.length, source: 'hub-plugin' };
      }
    } catch {}
  }

  try {
    const res = await fetch(
      `${baseUrl}/wp/v2/posts?per_page=30&orderby=date&order=desc&_fields=id,title,status,date,link,yoast_head_json&status=publish`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (res.ok) {
      const posts = await res.json();
      const total = parseInt(res.headers.get('X-WP-Total') || String(posts.length));
      return { posts, total, source: 'wp-rest' };
    }
  } catch {}

  return null;
}

async function autoRefresh() {
  const clients = db.read('clients', []);
  if (!clients.length) {
    console.log('[auto-refresh] No clients configured — skipping');
    return;
  }

  console.log(`[auto-refresh] Refreshing ${clients.length} client(s)...`);
  const cache = db.read('wp_cache', {});

  await Promise.allSettled(
    clients.map(async (client) => {
      try {
        const result = await fetchClientPosts(client);
        if (result) {
          cache[client.id] = { ...result, cachedAt: new Date().toISOString() };
          console.log(`[auto-refresh] ✓ ${client.name}: ${result.total} posts (${result.source})`);
        } else {
          console.log(`[auto-refresh] ✗ ${client.name}: no data returned`);
        }
      } catch (err) {
        console.error(`[auto-refresh] ✗ ${client.name}: ${err.message}`);
      }
    })
  );

  db.write('wp_cache', cache);
  console.log('[auto-refresh] Done');
}

module.exports = { autoRefresh };
