const router = require('express').Router();
const db = require('../db');

router.get('/', (req, res) => res.json(db.read('keywords', {})));

router.post('/:clientId', (req, res) => {
  const kw = req.body;
  const all = db.read('keywords', {});
  if (!all[req.params.clientId]) all[req.params.clientId] = [];
  const idx = all[req.params.clientId].findIndex(k => k.id === kw.id);
  if (idx >= 0) all[req.params.clientId][idx] = kw;
  else all[req.params.clientId].push(kw);
  db.write('keywords', all);
  res.json(all[req.params.clientId]);
});

router.delete('/:clientId/:id', (req, res) => {
  const all = db.read('keywords', {});
  if (all[req.params.clientId]) {
    all[req.params.clientId] = all[req.params.clientId].filter(k => k.id !== req.params.id);
  }
  db.write('keywords', all);
  res.json({ ok: true });
});

module.exports = router;
