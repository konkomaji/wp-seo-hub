const router = require('express').Router();
const db = require('../db');

router.get('/:clientId', (req, res) => {
  const all = db.read('audit_history', []);
  res.json(
    all.filter(r => r.clientId === req.params.clientId)
       .sort((a, b) => new Date(b.ts) - new Date(a.ts))
  );
});

router.post('/', (req, res) => {
  const all = db.read('audit_history', []);
  const run = { ...req.body, id: `run_${Date.now()}`, ts: new Date().toISOString() };
  const others     = all.filter(r => r.clientId !== run.clientId);
  const clientRuns = all.filter(r => r.clientId === run.clientId).slice(-9);
  db.write('audit_history', [...others, ...clientRuns, run]);
  res.json(run);
});

router.patch('/:id', (req, res) => {
  const all = db.read('audit_history', []);
  const idx = all.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  all[idx] = { ...all[idx], ...req.body };
  db.write('audit_history', all);
  res.json(all[idx]);
});

router.delete('/:id', (req, res) => {
  const all = db.read('audit_history', []);
  db.write('audit_history', all.filter(r => r.id !== req.params.id));
  res.json({ ok: true });
});

module.exports = router;
