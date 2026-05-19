const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function read(name, defaultVal = null) {
  ensureDir();
  const file = path.join(DATA_DIR, `${name}.json`);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return defaultVal;
  }
}

function write(name, data) {
  ensureDir();
  const file = path.join(DATA_DIR, `${name}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = { read, write };
