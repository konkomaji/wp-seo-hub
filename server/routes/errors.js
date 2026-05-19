const router = require('express').Router();
const db = require('../db');

router.get('/', (req, res) => res.json(db.read('errors', [])));

router.post('/', (req, res) => {
  const entry = req.body;
  const existing = db.read('errors', []);
  const updated = [entry, ...existing].slice(0, 100);
  db.write('errors', updated);
  res.json({ ok: true });
});

router.delete('/', (req, res) => {
  db.write('errors', []);
  res.json({ ok: true });
});

module.exports = router;
