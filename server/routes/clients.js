const router = require('express').Router();
const db = require('../db');

router.get('/', (req, res) => {
  res.json(db.read('clients', []));
});

router.post('/', (req, res) => {
  const client = req.body;
  const clients = db.read('clients', []);
  const idx = clients.findIndex(c => c.id === client.id);
  if (idx >= 0) clients[idx] = client;
  else clients.push(client);
  db.write('clients', clients);
  res.json(clients);
});

router.delete('/:id', (req, res) => {
  const clients = db.read('clients', []).filter(c => c.id !== req.params.id);
  db.write('clients', clients);
  const cache = db.read('wp_cache', {});
  delete cache[req.params.id];
  db.write('wp_cache', cache);
  res.json(clients);
});

module.exports = router;
