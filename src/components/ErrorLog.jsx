import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Trash2, RefreshCw, ChevronDown, ChevronUp, Copy, CheckCircle } from 'lucide-react';
import { getErrorLog, clearErrorLog } from '../store/store';
import { C } from '../theme';

const COMPONENT_COLORS = {
  'SEO Auditor':     { bg: C.purpleBg, bd: C.purpleBd, color: C.purple },
  'Client Manager':  { bg: C.blueBg,   bd: C.blueBd,   color: C.blue },
  'Post Dashboard':  { bg: C.accentBg, bd: C.accentBd, color: C.accent },
  'Keyword Tracker': { bg: C.greenBg,  bd: C.greenBd,  color: C.green },
  'Post Composer':   { bg: C.yellowBg, bd: C.yellowBd, color: C.yellow },
};

const compStyle = (component) =>
  COMPONENT_COLORS[component] || { bg: C.bg4, bd: C.b3, color: C.t3 };

const fmtTime = (iso) => {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
};

const fmtCtx = (ctx) => {
  if (!ctx || typeof ctx !== 'object') return null;
  const pairs = Object.entries(ctx).filter(([, v]) => v != null && v !== '');
  if (!pairs.length) return null;
  return pairs.map(([k, v]) => `${k}: ${v}`).join(' · ');
};

export default function ErrorLog() {
  const [errors, setErrors]       = useState([]);
  const [expanded, setExpanded]   = useState(null);
  const [filterComp, setFilterComp] = useState('all');
  const [copied, setCopied]       = useState(null);
  const [loading, setLoading]     = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getErrorLog()
      .then(setErrors)
      .catch(() => setErrors([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, []);

  const handleClear = async () => {
    if (!window.confirm('Clear all error logs?')) return;
    await clearErrorLog().catch(() => {});
    setErrors([]);
  };

  const components = ['all', ...Array.from(new Set(errors.map(e => e.component)))];
  const filtered   = filterComp === 'all' ? errors : errors.filter(e => e.component === filterComp);

  const copyEntry = (entry, id) => {
    const text = [
      `[${entry.ts}] ${entry.component} › ${entry.operation}`,
      `ERROR: ${entry.message}`,
      fmtCtx(entry.ctx) ? `CONTEXT: ${fmtCtx(entry.ctx)}` : null,
      entry.stack ? `STACK: ${entry.stack}` : null,
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const exportAll = () => {
    const text = errors.map(e => [
      `[${e.ts}] ${e.component} › ${e.operation}`,
      `  ERROR: ${e.message}`,
      fmtCtx(e.ctx) ? `  CONTEXT: ${fmtCtx(e.ctx)}` : null,
      e.stack ? `  STACK: ${e.stack}` : null,
    ].filter(Boolean).join('\n')).join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `wp-seo-hub-errors-${new Date().toISOString().split('T')[0]}.txt`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontFamily: C.fontSerif, color: C.t1 }}>Error Log</h2>
          <p style={{ margin: '4px 0 0', color: C.t3, fontSize: 13 }}>
            {errors.length === 0 ? 'No errors recorded' : `${errors.length} error${errors.length > 1 ? 's' : ''} — most recent first`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.bg3, border: `1px solid ${C.b2}`, borderRadius: 7, padding: '8px 14px', color: C.t2, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            <RefreshCw size={13} style={loading ? { animation: 'spin 1s linear infinite' } : {}} /> Refresh
          </button>
          {errors.length > 0 && (
            <>
              <button onClick={exportAll}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.bg3, border: `1px solid ${C.b2}`, borderRadius: 7, padding: '8px 14px', color: C.t2, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                <Copy size={13} /> Export
              </button>
              <button onClick={handleClear}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.redBg, border: `1px solid ${C.redBd}`, borderRadius: 7, padding: '8px 14px', color: C.red, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                <Trash2 size={13} /> Clear All
              </button>
            </>
          )}
        </div>
      </div>

      {errors.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {components.map(comp => {
            const count = comp === 'all' ? errors.length : errors.filter(e => e.component === comp).length;
            const cs    = comp === 'all' ? { bg: C.bg4, bd: C.b3, color: C.t2 } : compStyle(comp);
            return (
              <button key={comp} onClick={() => setFilterComp(comp)}
                style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                  background: filterComp === comp ? cs.bg : C.bg3,
                  border:     `1px solid ${filterComp === comp ? cs.bd : C.b2}`,
                  color:      filterComp === comp ? cs.color : C.t3 }}>
                {comp === 'all' ? `All (${count})` : `${comp} (${count})`}
              </button>
            );
          })}
        </div>
      )}

      {errors.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 24px', background: C.bg3, border: `1px solid ${C.b2}`, borderRadius: 12 }}>
          <CheckCircle size={36} style={{ display: 'block', margin: '0 auto 14px', color: C.green, opacity: 0.4 }} />
          <div style={{ fontSize: 15, color: C.t2, marginBottom: 6 }}>No errors logged</div>
          <div style={{ fontSize: 13, color: C.t3, maxWidth: 380, margin: '0 auto', lineHeight: 1.7 }}>
            Errors from API calls, connection tests, SEO audits, and meta push operations will appear here automatically.
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map((entry) => {
          const cs         = compStyle(entry.component);
          const isExpanded = expanded === entry.id;
          const ctxStr     = fmtCtx(entry.ctx);
          return (
            <div key={entry.id} style={{ background: C.bg3, border: `1px solid ${C.b2}`, borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px' }}>
                <AlertTriangle size={14} color={C.red} style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: cs.bg, border: `1px solid ${cs.bd}`, color: cs.color, fontWeight: 500, flexShrink: 0 }}>
                      {entry.component}
                    </span>
                    <span style={{ fontSize: 12, color: C.t2, fontWeight: 500 }}>{entry.operation}</span>
                    <span style={{ fontSize: 11, color: C.t4, marginLeft: 'auto', flexShrink: 0 }}>{fmtTime(entry.ts)}</span>
                  </div>
                  <div style={{ fontSize: 13, color: C.red, fontFamily: 'monospace', wordBreak: 'break-word', lineHeight: 1.5 }}>{entry.message}</div>
                  {ctxStr && <div style={{ fontSize: 11, color: C.t3, marginTop: 5, lineHeight: 1.6 }}>{ctxStr}</div>}
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button onClick={() => copyEntry(entry, entry.id)}
                    style={{ background: copied === entry.id ? C.greenBg : C.bg4, border: `1px solid ${copied === entry.id ? C.greenBd : C.b3}`, borderRadius: 6, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: copied === entry.id ? C.green : C.t3 }}>
                    {copied === entry.id ? <CheckCircle size={10} /> : <Copy size={10} />}
                    {copied === entry.id ? 'Copied' : 'Copy'}
                  </button>
                  {entry.stack && (
                    <button onClick={() => setExpanded(isExpanded ? null : entry.id)}
                      style={{ background: C.bg4, border: `1px solid ${C.b3}`, borderRadius: 6, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: C.t3 }}>
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  )}
                </div>
              </div>

              {isExpanded && entry.stack && (
                <div style={{ borderTop: `1px solid ${C.b1}`, padding: '10px 16px 12px', background: C.bg4 }}>
                  <div style={{ fontSize: 10, color: C.t3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Stack Trace</div>
                  <pre style={{ margin: 0, fontSize: 11, color: C.t2, fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.7 }}>
                    {entry.stack.split(' | ').join('\n')}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && filterComp !== 'all' && (
        <div style={{ textAlign: 'center', padding: '32px', color: C.t3, fontSize: 13 }}>No errors from {filterComp}.</div>
      )}

      {errors.length > 0 && (
        <div style={{ marginTop: 16, fontSize: 11, color: C.t4, textAlign: 'center' }}>
          Logs stored in local file DB. Max 100 entries (oldest auto-removed).
        </div>
      )}
    </div>
  );
}
