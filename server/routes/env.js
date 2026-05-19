// Manage .env API keys at runtime — read/write without restarting manually
const router = require('express').Router();
const fs     = require('fs');
const path   = require('path');
const dotenv = require('dotenv');

const ENV_PATH = path.join(__dirname, '../../.env');

const MANAGED_KEYS = ['ANTHROPIC_API_KEY', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'];

function readEnvFile() {
  try { return fs.readFileSync(ENV_PATH, 'utf8'); }
  catch { return ''; }
}

function parseEnv(text) {
  const map = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    map[key] = val;
  }
  return map;
}

function writeEnvFile(updates) {
  let text = readEnvFile();

  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === undefined) continue;

    const lineRegex = new RegExp(`^(${key}\\s*=.*)$`, 'm');
    if (lineRegex.test(text)) {
      text = text.replace(lineRegex, `${key}=${value}`);
    } else {
      text = text.trimEnd() + `\n${key}=${value}\n`;
    }

    // Update live process.env immediately — no restart needed
    process.env[key] = value;
  }

  fs.writeFileSync(ENV_PATH, text, 'utf8');
  return true;
}

function maskKey(val) {
  if (!val || val.length < 8) return val ? '●●●●●●●●' : '';
  const prefix = val.startsWith('sk-ant-') ? 'sk-ant-…' : val.slice(0, 6) + '…';
  return prefix + val.slice(-4);
}

// GET /api/env/keys — returns masked status for each managed key
router.get('/keys', (req, res) => {
  const current = parseEnv(readEnvFile());
  const result  = {};
  for (const key of MANAGED_KEYS) {
    const val = current[key] || process.env[key] || '';
    result[key] = {
      set:     !!val,
      preview: val ? maskKey(val) : null,
    };
  }
  res.json(result);
});

// POST /api/env/keys — write one or more keys to .env and reload process.env
router.post('/keys', (req, res) => {
  const updates = {};
  const current = parseEnv(readEnvFile());

  for (const key of MANAGED_KEYS) {
    const submitted = req.body[key];
    if (submitted === undefined) continue;         // not included in request
    if (!submitted) continue;                       // empty — don't wipe key
    const masked = current[key] ? maskKey(current[key]) : null;
    if (submitted === masked) continue;             // unchanged masked preview

    // Basic format checks
    if (key === 'ANTHROPIC_API_KEY' && !submitted.startsWith('sk-ant-')) {
      return res.status(400).json({ error: `${key}: must start with sk-ant-` });
    }
    updates[key] = submitted;
  }

  if (!Object.keys(updates).length) {
    return res.json({ ok: true, message: 'Nothing changed' });
  }

  try {
    writeEnvFile(updates);
    dotenv.config({ path: ENV_PATH, override: true });
    res.json({ ok: true, updated: Object.keys(updates) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
