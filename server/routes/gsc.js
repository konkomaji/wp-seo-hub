const router = require('express').Router();
const db = require('../db');

// Legacy config (kept for compat)
router.get('/', (req, res) => res.json(db.read('gsc_config', {})));
router.post('/', (req, res) => {
  db.write('gsc_config', req.body);
  res.json({ ok: true });
});

// VK Connector GSC data proxy — all GSC data comes through the plugin
router.get('/:clientId/data', async (req, res) => {
  const clients = db.read('clients', []);
  const client  = clients.find(c => c.id === req.params.clientId);
  if (!client)         return res.status(404).json({ error: 'Client not found' });
  if (!client.vkToken) return res.status(400).json({ error: 'No vkToken configured for this client' });

  const days = req.query.days || 28;
  const base = client.siteUrl.replace(/\/$/, '');
  const url  = `${base}/wp-json/wp-seo-hub/v1/gsc-data?days=${days}`;

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'X-WPSeoHub-Token': client.vkToken },
      signal:  AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      if (response.status === 404 || response.status === 405) {
        return res.json({ notAvailable: true, message: 'GSC endpoint not found on this plugin version. Update WPSeoHub Connector to access Google Site Kit data.' });
      }
      return res.status(response.status).json({
        error: `Plugin returned ${response.status}${text ? ': ' + text.slice(0, 200) : ''}`,
      });
    }

    const data = await response.json();

    // Cache for fallback
    const cache = db.read('gsc_data_cache', {});
    cache[req.params.clientId] = { data, fetchedAt: new Date().toISOString() };
    db.write('gsc_data_cache', cache);

    res.json(data);
  } catch (e) {
    // Serve stale cache if fetch fails
    const cache = db.read('gsc_data_cache', {});
    if (cache[req.params.clientId]) {
      return res.json({ ...cache[req.params.clientId].data, fromCache: true, cachedAt: cache[req.params.clientId].fetchedAt });
    }
    res.status(500).json({ error: e.message });
  }
});

// GSC status/diagnostic endpoint
router.get('/:clientId/status', async (req, res) => {
  const clients = db.read('clients', []);
  const client  = clients.find(c => c.id === req.params.clientId);
  if (!client)         return res.status(404).json({ error: 'Client not found' });
  if (!client.vkToken) return res.status(400).json({ error: 'No vkToken configured' });

  const base = client.siteUrl.replace(/\/$/, '');
  const url  = `${base}/wp-json/wp-seo-hub/v1/gsc-status`;

  try {
    const response = await fetch(url, { headers: { Accept: 'application/json', 'X-WPSeoHub-Token': client.vkToken }, signal: AbortSignal.timeout(15000) });
    if (!response.ok) return res.status(response.status).json({ error: `Plugin returned ${response.status}` });
    res.json(await response.json());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
