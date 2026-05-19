const router = require('express').Router();
const db = require('../db');

const DEFAULTS = { defaultTimezone: 'Asia/Kolkata', clientTimezones: {} };

router.get('/', (req, res) => res.json(db.read('settings', DEFAULTS)));

router.post('/', (req, res) => {
  const updated = { ...db.read('settings', DEFAULTS), ...req.body };
  db.write('settings', updated);
  res.json(updated);
});

module.exports = router;
