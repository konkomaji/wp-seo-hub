// Google OAuth + Search Console + Indexing API routes
const router   = require('express').Router();
const db       = require('../db');

const SCOPES   = [
  'https://www.googleapis.com/auth/webmasters.readonly',
  'https://www.googleapis.com/auth/indexing',
  'https://www.googleapis.com/auth/userinfo.email',
];
const REDIRECT = 'http://localhost:3001/api/google/callback';

function getGoogle() {
  let google;
  try { ({ google } = require('googleapis')); }
  catch { throw new Error('googleapis not installed — run: npm install googleapis'); }
  return google;
}

function getAuth() {
  const google = getGoogle();
  const cid = process.env.GOOGLE_CLIENT_ID;
  const csc = process.env.GOOGLE_CLIENT_SECRET;
  if (!cid || !csc) throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET not set in .env');

  const auth   = new google.auth.OAuth2(cid, csc, REDIRECT);
  const tokens = db.read('google_tokens', null);
  if (tokens) auth.setCredentials(tokens);

  auth.on('tokens', (t) => {
    const existing = db.read('google_tokens', {}) || {};
    db.write('google_tokens', { ...existing, ...t });
  });

  return { auth, google };
}

// ── OAuth flow ────────────────────────────────────────────────────────────────

router.get('/auth-url', (req, res) => {
  try {
    const { auth } = getAuth();
    const url = auth.generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: SCOPES });
    res.json({ url });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.get('/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error) return res.send(`<html><body style="font-family:sans-serif;background:#0f1117;color:#e2e8f0;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div><h2 style="color:#ef4444">✗ Auth denied: ${error}</h2><p>Close this window and try again.</p></div></body></html>`);
  if (!code)  return res.status(400).send('Missing code');

  try {
    const { auth, google } = getAuth();
    const { tokens } = await auth.getToken(code);
    auth.setCredentials(tokens);

    let email = null;
    try {
      const oauth2 = google.oauth2({ version: 'v2', auth });
      const info   = await oauth2.userinfo.get();
      email        = info.data.email;
    } catch {}

    db.write('google_tokens', { ...tokens, email, connectedAt: new Date().toISOString() });

    res.send(`<html><head><style>body{font-family:sans-serif;background:#0f1117;color:#e2e8f0;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center}</style></head><body><div><h2 style="color:#22c55e;margin-bottom:8px">✓ Google Connected</h2><p style="color:#94a3b8;font-size:14px">${email ? `Signed in as <strong>${email}</strong>` : ''}</p><p style="color:#64748b;font-size:12px;margin-top:16px">Close this window to return to VK SEO Hub.</p><script>setTimeout(()=>window.close(),2500)</script></div></body></html>`);
  } catch (e) {
    res.status(500).send(`<html><body style="font-family:sans-serif;background:#0f1117;color:#e2e8f0;padding:40px"><h3 style="color:#ef4444">Auth failed: ${e.message}</h3><p>Close and try again.</p></body></html>`);
  }
});

router.get('/status', (req, res) => {
  const tokens = db.read('google_tokens', null);
  if (!tokens) return res.json({ connected: false });
  const expired = tokens.expiry_date ? Date.now() > tokens.expiry_date : false;
  res.json({
    connected:       true,
    expired,
    email:           tokens.email || null,
    connectedAt:     tokens.connectedAt || null,
    hasRefreshToken: !!tokens.refresh_token,
  });
});

router.delete('/revoke', (req, res) => {
  db.write('google_tokens', null);
  res.json({ ok: true });
});

// ── GSC — list sites ──────────────────────────────────────────────────────────

router.get('/sites', async (req, res) => {
  try {
    const { auth, google } = getAuth();
    const wm = google.webmasters({ version: 'v3', auth });
    const r  = await wm.sites.list();
    res.json(r.data.siteEntry || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GSC — list sitemaps for a site ────────────────────────────────────────────

router.get('/gsc/sitemaps', async (req, res) => {
  const { siteUrl } = req.query;
  if (!siteUrl) return res.status(400).json({ error: 'siteUrl required' });
  try {
    const { auth, google } = getAuth();
    const wm = google.webmasters({ version: 'v3', auth });
    const r  = await wm.sitemaps.list({ siteUrl });
    res.json(r.data.sitemap || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GSC — URL inspection ──────────────────────────────────────────────────────

router.post('/gsc/inspect', async (req, res) => {
  const { inspectionUrl, siteUrl } = req.body;
  if (!inspectionUrl || !siteUrl) return res.status(400).json({ error: 'inspectionUrl and siteUrl required' });
  try {
    const { auth, google } = getAuth();
    const sc = google.searchconsole({ version: 'v1', auth });
    const r  = await sc.urlInspection.index.inspect({ requestBody: { inspectionUrl, siteUrl } });
    res.json(r.data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Indexing API — submit URLs ─────────────────────────────────────────────────

router.post('/indexing/submit', async (req, res) => {
  const { urls, type = 'URL_UPDATED' } = req.body;
  if (!urls?.length) return res.status(400).json({ error: 'No URLs provided' });

  try {
    const { auth, google } = getAuth();
    const idx     = google.indexing({ version: 'v3', auth });
    const results = [];

    for (const url of urls.slice(0, 200)) {
      try {
        const r = await idx.urlNotifications.publish({ requestBody: { url, type } });
        results.push({ url, status: 'submitted', data: r.data });
      } catch (e) {
        results.push({ url, status: 'error', error: e.message });
      }
      await new Promise(resolve => setTimeout(resolve, 120)); // rate limit
    }

    // Persist submission log
    const log = db.read('indexing_log', []);
    const entry = {
      id:         Date.now().toString(36),
      submittedAt: new Date().toISOString(),
      type,
      results,
      total:     urls.length,
      succeeded: results.filter(r => r.status === 'submitted').length,
    };
    log.unshift(entry);
    db.write('indexing_log', log.slice(0, 200));

    res.json(entry);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Indexing API — submit sitemap ─────────────────────────────────────────────

router.post('/indexing/sitemap', async (req, res) => {
  const { siteUrl, feedpath } = req.body;
  if (!siteUrl || !feedpath) return res.status(400).json({ error: 'siteUrl and feedpath required' });
  try {
    const { auth, google } = getAuth();
    const wm = google.webmasters({ version: 'v3', auth });
    await wm.sitemaps.submit({ siteUrl, feedpath });
    res.json({ ok: true, message: `Sitemap submitted: ${feedpath}` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Indexing log ──────────────────────────────────────────────────────────────

router.get('/indexing/log', (req, res) => {
  res.json(db.read('indexing_log', []).slice(0, 50));
});

// ── Claude AI — fix indexing issue ────────────────────────────────────────────

router.post('/indexing/ai-fix', async (req, res) => {
  const { inspectionResult, url, clientId } = req.body;
  if (!inspectionResult) return res.status(400).json({ error: 'inspectionResult required' });

  let anthropic;
  try {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set');
    const Anthropic = require('@anthropic-ai/sdk');
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  } catch (e) { return res.status(400).json({ error: e.message }); }

  const ir = inspectionResult.inspectionResult || inspectionResult;
  const verdict     = ir.indexStatusResult?.verdict || 'UNKNOWN';
  const coverage    = ir.indexStatusResult?.coverageState || '';
  const robotsTxt   = ir.indexStatusResult?.robotsTxtState || '';
  const indexing    = ir.indexStatusResult?.indexingState || '';
  const pageFetch   = ir.indexStatusResult?.pageFetchState || '';
  const googleCanon = ir.indexStatusResult?.googleCanonical || '';
  const userCanon   = ir.indexStatusResult?.userDeclaredCanonical || '';
  const crawlTime   = ir.indexStatusResult?.lastCrawlTime || '';

  const prompt = `I am auditing the Google indexing status of a WordPress page and need specific, actionable fixes.

URL: ${url}
Google verdict: ${verdict}
Coverage state: ${coverage}
Robots.txt state: ${robotsTxt}
Indexing state: ${indexing}
Page fetch state: ${pageFetch}
Google canonical: ${googleCanon}
User declared canonical: ${userCanon}
Last crawled: ${crawlTime || 'Never crawled'}

Based on this data, provide:
1. Root cause of the indexing problem (1 sentence)
2. Step-by-step fix instructions (numbered, specific to WordPress/Yoast/RankMath)
3. After fixing, how to resubmit for indexing (1–2 lines)
4. Expected timeline for Google to re-index after fix

Be specific. Reference exact WordPress settings, plugin options, or code changes. Do not give generic advice.`;

  try {
    const response = await anthropic.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 800,
      system:     'You are a technical SEO expert specialising in WordPress and Google indexing issues. Give concise, actionable fixes.',
      messages:   [{ role: 'user', content: prompt }],
    });
    res.json({ fix: response.content[0]?.text || '' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
