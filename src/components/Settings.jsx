import { useState, useEffect } from 'react';
import { Globe2, Clock, Save, CheckCircle, Key, Eye, EyeOff, ExternalLink, AlertCircle } from 'lucide-react';
import { getSettings, saveSettings, getEnvKeys, saveEnvKeys } from '../store/store';
import { TIMEZONES, DEFAULT_TZ } from '../utils/timezones';
import { VERSION } from '../version';
import { C } from '../theme';

export default function Settings({ clients, onSettingsChange }) {
  const [settings, setSettings] = useState({ defaultTimezone: DEFAULT_TZ, clientTimezones: {} });
  const [saved, setSaved]       = useState(false);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    getSettings().then(s => { setSettings(s); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    const updated = await saveSettings(settings).catch(() => settings);
    onSettingsChange?.(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const setClientTz = (clientId, tz) =>
    setSettings(s => ({ ...s, clientTimezones: { ...s.clientTimezones, [clientId]: tz } }));

  const clearClientTz = (clientId) =>
    setSettings(s => {
      const ct = { ...s.clientTimezones };
      delete ct[clientId];
      return { ...s, clientTimezones: ct };
    });

  if (loading) return <div style={{ color: C.t3, padding: 32, fontSize: 13 }}>Loading settings…</div>;

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontFamily: C.fontSerif, color: C.t1 }}>Settings</h2>
        <p style={{ margin: '4px 0 0', color: C.t3, fontSize: 13 }}>API keys, timezone preferences, and per-client overrides</p>
      </div>

      {/* ── API Keys ── */}
      <ApiKeysSection />

      {/* ── Default timezone ── */}
      <Section title="Global Default Timezone" icon={<Clock size={15} color={C.accent} />}>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: C.t2, lineHeight: 1.6 }}>
          Used for all scheduling and date display unless a client has its own timezone set below.
        </p>
        <select
          value={settings.defaultTimezone}
          onChange={e => setSettings(s => ({ ...s, defaultTimezone: e.target.value }))}
          style={selectStyle}
        >
          {TIMEZONES.map(tz => (
            <option key={tz.tz} value={tz.tz}>{tz.label}</option>
          ))}
        </select>
        <div style={{ marginTop: 8, fontSize: 11, color: C.t3 }}>
          Current: <strong style={{ color: C.t2 }}>{settings.defaultTimezone}</strong>
          {' — '}
          <span style={{ color: C.accent }}>
            {new Intl.DateTimeFormat('en-IN', {
              timeZone: settings.defaultTimezone,
              hour: '2-digit', minute: '2-digit', second: '2-digit',
              day: '2-digit', month: 'short', hour12: false,
            }).format(new Date())}
          </span>
        </div>
      </Section>

      {/* ── Per-client timezone ── */}
      {clients.length > 0 && (
        <Section title="Per-Client Timezone Overrides" icon={<Globe2 size={15} color={C.blue} />}>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: C.t2, lineHeight: 1.6 }}>
            Set a specific timezone for foreign clients. Scheduling and calendar dates will use this for that client.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {clients.map(c => {
              const clientTz = settings.clientTimezones?.[c.id] || '';
              return (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: C.bg2, border: `1px solid ${C.b2}`, borderRadius: 9 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: C.t1, fontWeight: 500 }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>{c.siteUrl}</div>
                  </div>
                  <select
                    value={clientTz}
                    onChange={e => e.target.value ? setClientTz(c.id, e.target.value) : clearClientTz(c.id)}
                    style={{ ...selectStyle, width: 260, margin: 0 }}
                  >
                    <option value="">— Use global default ({settings.defaultTimezone}) —</option>
                    {TIMEZONES.map(tz => (
                      <option key={tz.tz} value={tz.tz}>{tz.label}</option>
                    ))}
                  </select>
                  {clientTz && (
                    <div style={{ fontSize: 11, color: C.accent, whiteSpace: 'nowrap' }}>
                      {new Intl.DateTimeFormat('en-IN', {
                        timeZone: clientTz,
                        hour: '2-digit', minute: '2-digit', hour12: false,
                      }).format(new Date())}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* ── About ── */}
      <Section title="About" icon={null}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { label: 'Version',   value: `v${VERSION}` },
            { label: 'Platform',  value: 'React + Express (local)' },
            { label: 'Storage',   value: 'Local JSON file DB' },
            { label: 'AI Model',  value: 'claude-sonnet-4-6' },
          ].map(r => (
            <div key={r.label} style={{ background: C.bg2, border: `1px solid ${C.b2}`, borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontSize: 11, color: C.t3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{r.label}</div>
              <div style={{ fontSize: 13, color: C.t1, fontWeight: 500 }}>{r.value}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Save timezone settings button */}
      <button onClick={handleSave}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: saved ? C.greenBg : C.accent, border: `1px solid ${saved ? C.greenBd : C.accent}`, borderRadius: 8, padding: '10px 22px', color: saved ? C.green : C.bg1, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
        {saved ? <CheckCircle size={14} /> : <Save size={14} />}
        {saved ? 'Saved!' : 'Save Timezone Settings'}
      </button>
    </div>
  );
}

// ── API Keys Section ───────────────────────────────────────────────────────────

const API_KEY_DEFS = [
  {
    key:       'ANTHROPIC_API_KEY',
    label:     'Anthropic (Claude) API Key',
    desc:      'Powers all AI features — meta optimization, category suggestions, content profile, AI fix.',
    format:    'Starts with sk-ant-',
    linkLabel: 'Get key → console.anthropic.com',
    link:      'https://console.anthropic.com/settings/keys',
    steps: [
      'Go to console.anthropic.com → Log in or sign up',
      'Settings → API Keys → Create Key',
      'Copy the key (shown only once)',
      'Paste it below and click Save API Keys',
    ],
    required: true,
  },
  {
    key:       'GOOGLE_CLIENT_ID',
    label:     'Google OAuth Client ID',
    desc:      'Required for Google Search tab — connects your Google account to submit URLs for indexing and inspect page status.',
    format:    'Ends with .apps.googleusercontent.com',
    linkLabel: 'Get → console.cloud.google.com',
    link:      'https://console.cloud.google.com/apis/credentials',
    steps: [
      'console.cloud.google.com → Create or select project',
      'Enable: "Google Search Console API" + "Web Search Indexing API"',
      'APIs & Services → Credentials → Create OAuth 2.0 Client ID',
      'Application type: Desktop App → Create',
      'Copy Client ID and paste below',
      'Also add redirect URI: http://localhost:3001/api/google/callback',
    ],
    required: false,
  },
  {
    key:       'GOOGLE_CLIENT_SECRET',
    label:     'Google OAuth Client Secret',
    desc:      'Paired with the Client ID above. Found on the same OAuth credentials page.',
    format:    'alphanumeric string from Google Console',
    linkLabel: 'Same credentials page as Client ID',
    link:      'https://console.cloud.google.com/apis/credentials',
    steps: [
      'On the same OAuth 2.0 Client page as Client ID',
      'Click the credential name → copy "Client secret"',
      'Paste below and save',
    ],
    required: false,
  },
];

function ApiKeysSection() {
  const [keyStatus, setKeyStatus]   = useState({});
  const [inputs, setInputs]         = useState({});
  const [show, setShow]             = useState({});
  const [saving, setSaving]         = useState(false);
  const [saveResult, setSaveResult] = useState(null);
  const [expandedKey, setExpandedKey] = useState(null);

  useEffect(() => {
    getEnvKeys().then(s => {
      setKeyStatus(s);
      // Pre-fill inputs with masked preview so user sees current state
      const pre = {};
      for (const [k, v] of Object.entries(s)) {
        pre[k] = v.preview || '';
      }
      setInputs(pre);
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveResult(null);
    try {
      const result = await saveEnvKeys(inputs);
      if (result.ok) {
        setSaveResult({ ok: true, msg: result.updated?.length
          ? `Saved: ${result.updated.join(', ')}`
          : 'No changes — keys already up to date' });
        // Refresh status
        const fresh = await getEnvKeys().catch(() => ({}));
        setKeyStatus(fresh);
        const pre = {};
        for (const [k, v] of Object.entries(fresh)) pre[k] = v.preview || '';
        setInputs(pre);
      } else {
        setSaveResult({ ok: false, msg: result.error || 'Save failed' });
      }
    } catch (e) {
      setSaveResult({ ok: false, msg: e.message });
    }
    setSaving(false);
    setTimeout(() => setSaveResult(null), 4000);
  };

  return (
    <Section title="API Keys" icon={<Key size={15} color={C.accent} />}>
      <p style={{ margin: '0 0 18px', fontSize: 13, color: C.t2, lineHeight: 1.6 }}>
        All keys are stored in the local <code style={{ fontSize: 12, color: C.accent }}>.env</code> file — never sent anywhere except the respective API. Changes take effect immediately without restarting.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {API_KEY_DEFS.map(def => {
          const status   = keyStatus[def.key] || {};
          const isSet    = status.set;
          const expanded = expandedKey === def.key;

          return (
            <div key={def.key} style={{ background: C.bg2, border: `1px solid ${isSet ? C.b2 : C.redBd}`, borderRadius: 10, overflow: 'hidden' }}>
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, color: C.t1, fontWeight: 500 }}>{def.label}</span>
                    {def.required && !isSet && (
                      <span style={{ fontSize: 10, color: C.red, background: C.redBg, border: `1px solid ${C.redBd}`, borderRadius: 20, padding: '1px 7px' }}>Required</span>
                    )}
                    {isSet
                      ? <span style={{ fontSize: 10, color: C.green, background: C.greenBg, border: `1px solid ${C.greenBd}`, borderRadius: 20, padding: '1px 7px' }}>✓ Set</span>
                      : <span style={{ fontSize: 10, color: C.t4, background: C.bg3, border: `1px solid ${C.b2}`, borderRadius: 20, padding: '1px 7px' }}>Not set</span>
                    }
                  </div>
                  <div style={{ fontSize: 11, color: C.t3, marginTop: 3 }}>{def.desc}</div>
                </div>
                <button onClick={() => setExpandedKey(expanded ? null : def.key)}
                  style={{ fontSize: 11, color: C.accent, background: 'none', border: `1px solid ${C.accentBd}`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                  {expanded ? 'Collapse' : isSet ? 'Update Key' : 'Set Up'}
                </button>
              </div>

              {/* Expanded input + how-to */}
              {expanded && (
                <div style={{ borderTop: `1px solid ${C.b1}`, padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {/* Left: input */}
                  <div>
                    <div style={{ fontSize: 11, color: C.t3, marginBottom: 6 }}>
                      {def.format}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        type={show[def.key] ? 'text' : 'password'}
                        value={inputs[def.key] || ''}
                        onChange={e => setInputs(p => ({ ...p, [def.key]: e.target.value }))}
                        placeholder={isSet ? 'Enter new key to replace…' : 'Paste key here…'}
                        style={{ flex: 1, background: C.bg3, border: `1px solid ${C.b2}`, borderRadius: 7, padding: '8px 10px', color: C.t1, fontSize: 12, outline: 'none', fontFamily: 'monospace' }}
                      />
                      <button onClick={() => setShow(p => ({ ...p, [def.key]: !p[def.key] }))}
                        style={{ background: C.bg3, border: `1px solid ${C.b2}`, borderRadius: 7, padding: '0 10px', cursor: 'pointer', color: C.t3, display: 'flex', alignItems: 'center' }}>
                        {show[def.key] ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                    <a href={def.link} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, fontSize: 11, color: C.accent, textDecoration: 'none' }}>
                      <ExternalLink size={10} /> {def.linkLabel}
                    </a>
                  </div>

                  {/* Right: how-to steps */}
                  <div style={{ background: C.bg3, border: `1px solid ${C.b1}`, borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 11, color: C.t2, fontWeight: 500, marginBottom: 8 }}>How to get this key</div>
                    <ol style={{ margin: 0, padding: '0 0 0 16px', color: C.t3, fontSize: 11, lineHeight: 2 }}>
                      {def.steps.map((s, i) => <li key={i}>{s}</li>)}
                    </ol>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Save row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 18 }}>
        <button onClick={handleSave} disabled={saving}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: C.accent, border: 'none', borderRadius: 8, padding: '10px 22px', color: C.bg1, fontSize: 13, cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
          {saving ? 'Saving…' : <><Save size={14} /> Save API Keys</>}
        </button>
        {saveResult && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
            color: saveResult.ok ? C.green : C.red }}>
            {saveResult.ok ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
            {saveResult.msg}
          </div>
        )}
      </div>

      <div style={{ marginTop: 12, padding: '10px 14px', background: C.bg3, border: `1px solid ${C.b1}`, borderRadius: 8, fontSize: 11, color: C.t4, lineHeight: 1.7 }}>
        Keys are written to the local <code style={{ color: C.accent }}>.env</code> file only. They are never stored in the database, never logged, and never sent to any third party. Add <code style={{ color: C.accent }}>.env</code> to <code style={{ color: C.accent }}>.gitignore</code> before committing this project.
      </div>
    </Section>
  );
}

// ── Shared components ─────────────────────────────────────────────────────────

function Section({ title, icon, children }) {
  return (
    <div style={{ background: C.bg3, border: `1px solid ${C.b2}`, borderRadius: 12, padding: 20, marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        {icon}
        <span style={{ fontSize: 14, color: C.t1, fontWeight: 500 }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

const selectStyle = {
  width: '100%', background: C.bg2, border: `1px solid ${C.b2}`, borderRadius: 7,
  padding: '9px 12px', color: C.t1, fontSize: 13, outline: 'none', cursor: 'pointer',
};
