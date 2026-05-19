require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const app     = express();
const PORT    = process.env.API_PORT || 3001;
const PROD    = process.env.NODE_ENV === 'production';

// Only allow requests from localhost — prevents remote network access
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  `http://localhost:${process.env.API_PORT || 3001}`,
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
];

app.use(cors({
  origin: (origin, cb) => {
    // Allow same-origin (no Origin header) and localhost only
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: false,
}));

app.use(express.json({ limit: '2mb' }));

// Simple in-memory rate limiter — prevents Claude credit drain from port scanning
const rateLimitMap = new Map();
function rateLimit(key, maxPerMinute) {
  const now = Date.now();
  const entry = rateLimitMap.get(key) || { count: 0, reset: now + 60000 };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + 60000; }
  entry.count++;
  rateLimitMap.set(key, entry);
  return entry.count > maxPerMinute;
}

// Apply rate limiting to Claude routes (max 20 AI calls/min)
app.use('/api/claude', (req, res, next) => {
  if (req.method === 'POST' && rateLimit('claude', 20)) {
    return res.status(429).json({ error: 'Too many AI requests. Wait a minute.' });
  }
  next();
});

// In production serve the React build from this same Express server
if (PROD) {
  const buildDir = path.join(__dirname, '../build');
  app.use(express.static(buildDir));
}

app.use('/api/clients',       require('./routes/clients'));
app.use('/api/posts',         require('./routes/posts'));
app.use('/api/keywords',      require('./routes/keywords'));
app.use('/api/errors',        require('./routes/errors'));
app.use('/api/gsc',           require('./routes/gsc'));
app.use('/api/claude',        require('./routes/claude'));
app.use('/api/settings',      require('./routes/settings'));
app.use('/api/audit-history', require('./routes/audit-history'));
app.use('/api/google',       require('./routes/google'));
app.use('/api/env',         require('./routes/env'));

app.get('/api/version', (req, res) => {
  const pkg = require('../package.json');
  res.json({ version: pkg.version, name: pkg.name });
});

// Migrate data from localStorage dump (one-time import)
app.post('/api/migrate', (req, res) => {
  const db   = require('./db');
  const data = req.body;
  if (data.clients)          db.write('clients',           data.clients);
  if (data.wp_cache)         db.write('wp_cache',          data.wp_cache);
  if (data.local_posts)      db.write('local_posts',       data.local_posts);
  if (data.calendar_settings) db.write('calendar_settings', data.calendar_settings);
  if (data.keywords)         db.write('keywords',          data.keywords);
  if (data.gsc_config)       db.write('gsc_config',        data.gsc_config);
  if (data.errors)           db.write('errors',            data.errors);
  res.json({ ok: true });
});

const { autoRefresh } = require('./auto-refresh');

// In production: catch-all sends index.html so React Router works
if (PROD) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../build/index.html'));
  });
}

// Bind to 127.0.0.1 only — never expose to local network
app.listen(PORT, '127.0.0.1', async () => {
  if (PROD) {
    console.log(`\nWPSeoHub  →  http://localhost:${PORT}  (production mode)\n`);
  } else {
    console.log(`\nWPSeoHub API    →  http://localhost:${PORT}`);
    console.log(`React app       →  http://localhost:3000\n`);
  }
  await autoRefresh().catch(err => console.error('[auto-refresh]', err.message));
});
