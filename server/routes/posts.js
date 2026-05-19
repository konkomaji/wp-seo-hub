const router = require('express').Router();
const db = require('../db');

// WP cache
router.get('/cache', (req, res) => res.json(db.read('wp_cache', {})));

router.post('/cache/:clientId', (req, res) => {
  const all = db.read('wp_cache', {});
  all[req.params.clientId] = { ...req.body, cachedAt: new Date().toISOString() };
  db.write('wp_cache', all);
  res.json(all[req.params.clientId]);
});

router.delete('/cache/:clientId', (req, res) => {
  const all = db.read('wp_cache', {});
  delete all[req.params.clientId];
  db.write('wp_cache', all);
  res.json({ ok: true });
});

// Local posts
router.get('/local', (req, res) => res.json(db.read('local_posts', {})));

router.post('/local', (req, res) => {
  const post = req.body;
  const all = db.read('local_posts', {});
  const cid = post.clientId;
  if (!all[cid]) all[cid] = [];
  const idx = all[cid].findIndex(p => p.localId === post.localId);
  if (idx >= 0) all[cid][idx] = post;
  else all[cid].push(post);
  db.write('local_posts', all);
  res.json(all[cid]);
});

router.delete('/local/:clientId/:localId', (req, res) => {
  const all = db.read('local_posts', {});
  if (all[req.params.clientId]) {
    all[req.params.clientId] = all[req.params.clientId].filter(p => p.localId !== req.params.localId);
  }
  db.write('local_posts', all);
  res.json({ ok: true });
});

// Calendar settings
router.get('/calendar', (req, res) => res.json(db.read('calendar_settings', {})));

router.post('/calendar/:clientId', (req, res) => {
  const all = db.read('calendar_settings', {});
  all[req.params.clientId] = req.body.settings;
  db.write('calendar_settings', all);
  res.json({ ok: true });
});

module.exports = router;
