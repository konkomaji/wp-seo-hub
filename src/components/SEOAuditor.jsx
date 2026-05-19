import { useState, useEffect } from 'react';
import {
  RefreshCw, AlertCircle, CheckCircle, ExternalLink, Sparkles,
  Loader, Tag, TrendingUp, Send, FolderOpen, Info,
} from 'lucide-react';
import { fetchHubAudit, checkHubPlugin, pushMetaFix, fetchCategories, createCategory, updateCategory } from '../utils/wpApi';
import {
  logError,
  getMetaSuggestions, generateMetaSuggestions,
  getCategorySuggestions, generateCategorySuggestions,
  getOptimizedCategories, generateCategoryOptimizations,
} from '../store/store';
import { C } from '../theme';

const scoreColor = (s) => s >= 80 ? C.green  : s >= 50 ? C.yellow  : C.red;
const scoreBg    = (s) => s >= 80 ? C.greenBg : s >= 50 ? C.yellowBg : C.redBg;
const scoreBd    = (s) => s >= 80 ? C.greenBd : s >= 50 ? C.yellowBd : C.redBd;

function scoreItem(item) {
  let score = 100;
  if (!item.meta_title)  score -= 28;
  if (!item.meta_desc)   score -= 28;
  if (!item.focus_keyword) score -= 8;
  if (!item.has_og_image) score -= 6;
  if (item.is_noindex)   score -= 20;
  if (item.word_count && item.word_count < 300) score -= 5;
  const plugin = item.seo_score || 0;
  return Math.max(0, plugin > 0 ? Math.round(score * 0.6 + plugin * 0.4) : score);
}

export default function SEOAuditor({ clients, settings }) {
  const [selectedClient, setSelectedClient] = useState(clients[0]?.id || null);
  const [tab, setTab]                       = useState('meta');

  const [auditItems, setAuditItems]     = useState(null);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditError, setAuditError]     = useState(null);
  const [vkPlugin, setVkPlugin]         = useState({});

  const client = clients.find(c => c.id === selectedClient);

  useEffect(() => {
    if (!client || vkPlugin[client.id] !== undefined) return;
    checkHubPlugin(client)
      .then(info => setVkPlugin(p => ({ ...p, [client.id]: info || null })))
      .catch(() => setVkPlugin(p => ({ ...p, [client.id]: null })));
  }, [selectedClient]);

  const fetchAudit = async () => {
    if (!client) return;
    setLoadingAudit(true);
    setAuditError(null);
    setAuditItems(null);
    try {
      const data = await fetchHubAudit(client, 'any');
      setAuditItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setAuditError(e.message);
      logError('SEO Performance', 'Fetch Audit', e, { clientId: client.id });
    }
    setLoadingAudit(false);
  };

  if (clients.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px', color: C.t3, fontSize: 14 }}>
        Add a client site to start optimising SEO performance.
      </div>
    );
  }

  const pluginOk = vkPlugin[client?.id] !== undefined && vkPlugin[client?.id] !== null;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontFamily: C.fontSerif, color: C.t1 }}>SEO Performance</h2>
        <p style={{ margin: '4px 0 0', color: C.t3, fontSize: 13 }}>
          AI-powered meta optimisation, category builder, and site health scoring
        </p>
      </div>

      {/* Client selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {clients.map(c => (
          <button key={c.id} onClick={() => { setSelectedClient(c.id); setAuditItems(null); setAuditError(null); }}
            style={{ borderRadius: 20, padding: '6px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
              background: selectedClient === c.id ? C.accent : C.bg3,
              color:      selectedClient === c.id ? C.bg1   : C.t3,
              border:     `1px solid ${selectedClient === c.id ? C.accent : C.b2}` }}>
            {c.name}
          </button>
        ))}
      </div>

      {/* Plugin status banner */}
      {client && vkPlugin[client.id] === null && (
        <div style={{ display: 'flex', gap: 10, padding: '10px 14px', borderRadius: 8, marginBottom: 16, background: C.redBg, border: `1px solid ${C.redBd}`, fontSize: 13, color: C.red }}>
          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          WPSeoHub Connector not detected on {client.name}. Install the plugin and add the API token to access SEO performance tools.
        </div>
      )}

      {/* Load SEO data CTA */}
      {client && !auditItems && !loadingAudit && (
        <div style={{ background: C.bg3, border: `1px solid ${C.b2}`, borderRadius: 10, padding: '28px', textAlign: 'center', marginBottom: 20 }}>
          <TrendingUp size={28} style={{ margin: '0 auto 10px', display: 'block', color: C.accent, opacity: 0.6 }} />
          <div style={{ fontSize: 14, color: C.t2, marginBottom: 4 }}>Load site SEO data to begin</div>
          <div style={{ fontSize: 12, color: C.t3, marginBottom: 16 }}>
            Fetches all posts and pages with full SEO metadata via WPSeoHub Connector
          </div>
          <button onClick={fetchAudit}
            disabled={!pluginOk && vkPlugin[client.id] !== undefined}
            style={{ ...btn(C.accent, C.bg1, true), opacity: (!pluginOk && vkPlugin[client.id] !== undefined) ? 0.5 : 1 }}>
            <RefreshCw size={14} /> Load SEO Data
          </button>
        </div>
      )}

      {loadingAudit && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px', color: C.t3, fontSize: 13 }}>
          <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Fetching pages from {client?.name}…
        </div>
      )}

      {auditError && (
        <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderRadius: 8, marginBottom: 16, background: C.redBg, border: `1px solid ${C.redBd}`, fontSize: 13, color: C.red }}>
          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {auditError}
          <button onClick={fetchAudit} style={{ marginLeft: 'auto', color: C.red, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', textDecoration: 'underline' }}>Retry</button>
        </div>
      )}

      {auditItems && (
        <>
          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${C.b2}`, marginBottom: 24 }}>
            {[
              { id: 'meta',       label: 'Meta Optimizer' },
              { id: 'categories', label: 'Category Builder' },
              { id: 'score',      label: 'Site Score' },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', marginBottom: -1,
                  color: tab === t.id ? C.accent : C.t3,
                  borderBottom: `2px solid ${tab === t.id ? C.accent : 'transparent'}` }}>
                {t.label}
              </button>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 2 }}>
              <span style={{ fontSize: 11, color: C.t4 }}>{auditItems.length} pages loaded</span>
              <button onClick={fetchAudit} style={{ background: C.bg2, border: `1px solid ${C.b2}`, borderRadius: 6, padding: '5px 8px', color: C.t3, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <RefreshCw size={13} />
              </button>
            </div>
          </div>

          {tab === 'meta'       && <MetaOptimizer   client={client} auditItems={auditItems} />}
          {tab === 'categories' && <CategoryBuilder  client={client} auditItems={auditItems} />}
          {tab === 'score'      && <SiteScore        client={client} auditItems={auditItems} />}
        </>
      )}
    </div>
  );
}

// ── Meta Optimizer ────────────────────────────────────────────────────────────

function MetaOptimizer({ client, auditItems }) {
  const [suggestions, setSuggestions] = useState(null);
  const [generating, setGenerating]   = useState(false);
  const [genError, setGenError]       = useState(null);
  const [pushStatus, setPushStatus]   = useState({});
  const [filter, setFilter]           = useState('all');

  useEffect(() => {
    getMetaSuggestions(client.id).then(s => { if (s) setSuggestions(s); });
  }, [client.id]);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenError(null);
    try {
      const pages = auditItems.map(item => ({
        id:           item.id,
        type:         item.type,
        title:        item.title,
        slug:         item.slug,
        metaTitle:    item.meta_title   || '',
        metaDesc:     item.meta_desc    || '',
        focusKeyword: item.focus_keyword || '',
        score:        scoreItem(item),
      }));
      const result = await generateMetaSuggestions(client.id, pages);
      setSuggestions(result);
    } catch (e) {
      setGenError(e.message);
    }
    setGenerating(false);
  };

  const handlePush = async (item) => {
    const sug = suggestions?.suggestions?.[item.id];
    if (!sug) return;
    setPushStatus(p => ({ ...p, [item.id]: 'pushing' }));
    try {
      await pushMetaFix(client, item.id, { metaTitle: sug.metaTitle, metaDesc: sug.metaDesc, focusKeyword: item.focus_keyword || '' });
      setPushStatus(p => ({ ...p, [item.id]: 'done' }));
    } catch (e) {
      setPushStatus(p => ({ ...p, [item.id]: 'error:' + e.message }));
    }
  };

  const handlePushAll = async () => {
    for (const item of auditItems) {
      if (suggestions?.suggestions?.[item.id] && pushStatus[item.id] !== 'done') {
        await handlePush(item);
      }
    }
  };

  const sugCount    = Object.keys(suggestions?.suggestions || {}).length;
  const pushedCount = Object.values(pushStatus).filter(s => s === 'done').length;
  const missingCount = auditItems.filter(i => !i.meta_title || !i.meta_desc).length;

  const filtered = filter === 'missing'
    ? auditItems.filter(i => !i.meta_title || !i.meta_desc)
    : filter === 'pending'
      ? auditItems.filter(i => suggestions?.suggestions?.[i.id] && pushStatus[i.id] !== 'done')
      : auditItems;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20, padding: '16px 20px', background: C.bg3, border: `1px solid ${C.b2}`, borderRadius: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, color: C.t1, fontWeight: 500, marginBottom: 4 }}>AI Meta Generation</div>
          <div style={{ fontSize: 12, color: C.t3, lineHeight: 1.7 }}>
            Claude generates accurate, keyword-rich meta titles (50–60 chars) and meta descriptions (150–160 chars) for every page — using the stored AI client profile as context. Generated once, stored in DB. Push updates directly to WordPress via WPSeoHub Connector.
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 10, fontSize: 12 }}>
            <span style={{ color: C.red }}>{missingCount} pages missing meta</span>
            {sugCount > 0 && <span style={{ color: C.purple }}>{sugCount} AI suggestions ready</span>}
            {pushedCount > 0 && <span style={{ color: C.green }}>{pushedCount} pushed to WordPress</span>}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
          <button onClick={handleGenerate} disabled={generating}
            style={{ ...btn(C.purpleBg, C.purple), border: `1px solid ${C.purpleBd}`, opacity: generating ? 0.7 : 1 }}>
            {generating
              ? <><Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</>
              : <><Sparkles size={13} /> {suggestions ? 'Regenerate AI Meta' : 'Generate AI Meta'}</>}
          </button>
          {sugCount > 0 && (
            <button onClick={handlePushAll} style={{ ...btn(C.greenBg, C.green), border: `1px solid ${C.greenBd}` }}>
              <Send size={13} /> Push All to WordPress
            </button>
          )}
        </div>
      </div>

      {genError && (
        <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 14, background: C.redBg, border: `1px solid ${C.redBd}`, fontSize: 12, color: C.red }}>
          {genError}
        </div>
      )}

      {suggestions?.generatedAt && (
        <div style={{ fontSize: 11, color: C.t4, marginBottom: 12 }}>
          Generated {new Date(suggestions.generatedAt).toLocaleString('en-IN')} · {suggestions.pageCount} pages · {suggestions.usage?.input_tokens}↑ {suggestions.usage?.output_tokens}↓ tokens
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[
          { id: 'all',     label: `All Pages (${auditItems.length})` },
          { id: 'missing', label: `Missing Meta (${missingCount})` },
          ...(sugCount > 0 ? [{ id: 'pending', label: `Pending Push (${sugCount - pushedCount})` }] : []),
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
              background: filter === f.id ? C.accent : C.bg3,
              color:      filter === f.id ? C.bg1    : C.t3,
              border:     `1px solid ${filter === f.id ? C.accent : C.b2}` }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Pages */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(item => {
          const sug   = suggestions?.suggestions?.[item.id];
          const ps    = pushStatus[item.id];
          const score = scoreItem(item);
          return (
            <div key={item.id} style={{ background: C.bg3, border: `1px solid ${C.b2}`, borderRadius: 10, overflow: 'hidden' }}>
              {/* Page title row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderBottom: `1px solid ${C.b1}` }}>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: scoreBg(score), border: `1px solid ${scoreBd(score)}`, color: scoreColor(score), fontWeight: 600, flexShrink: 0 }}>
                  {score}%
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: C.t1, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: C.t4, marginTop: 2 }}>/{item.slug} · {item.type}</div>
                </div>
                {item.link && (
                  <a href={item.link} target="_blank" rel="noreferrer" style={{ color: C.t4, flexShrink: 0 }}><ExternalLink size={13} /></a>
                )}
                {sug && (
                  <button onClick={() => handlePush(item)} disabled={ps === 'pushing' || ps === 'done'}
                    style={{ ...btn(ps === 'done' ? C.greenBg : C.accentBg, ps === 'done' ? C.green : C.accent), border: `1px solid ${ps === 'done' ? C.greenBd : C.accentBd}`, flexShrink: 0, fontSize: 11 }}>
                    {ps === 'pushing' ? <><Loader size={11} style={{ animation: 'spin 1s linear infinite' }} /> Pushing…</>
                      : ps === 'done'    ? <><CheckCircle size={11} /> Pushed</>
                      : <><Send size={11} /> Push to WordPress</>}
                  </button>
                )}
              </div>

              {/* Current vs AI comparison */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                <div style={{ padding: '10px 16px', borderRight: `1px solid ${C.b1}` }}>
                  <div style={{ fontSize: 10, color: C.t4, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Current</div>
                  <MetaField label="Meta Title"       value={item.meta_title} missing={!item.meta_title} />
                  <MetaField label="Meta Description" value={item.meta_desc}  missing={!item.meta_desc} isDesc />
                  {item.focus_keyword && <div style={{ fontSize: 11, color: C.t3, marginTop: 4 }}>Focus keyword: {item.focus_keyword}</div>}
                </div>
                <div style={{ padding: '10px 16px', background: sug ? '#7c3aed11' : 'transparent' }}>
                  <div style={{ fontSize: 10, color: sug ? C.purple : C.t4, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                    {sug ? 'AI Optimized' : 'AI Suggestion'}
                  </div>
                  {sug ? (
                    <>
                      <MetaField label="Meta Title"       value={sug.metaTitle} ai />
                      <MetaField label="Meta Description" value={sug.metaDesc}  ai isDesc />
                    </>
                  ) : (
                    <div style={{ fontSize: 12, color: C.t4, paddingTop: 4 }}>
                      Click "Generate AI Meta" to create optimised suggestions for all pages
                    </div>
                  )}
                </div>
              </div>
              {ps?.startsWith('error:') && (
                <div style={{ padding: '6px 16px', background: C.redBg, fontSize: 11, color: C.red }}>Push failed: {ps.slice(6)}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MetaField({ label, value, missing, ai, isDesc }) {
  const len    = value?.length || 0;
  const minOk  = isDesc ? 150 : 50;
  const maxOk  = isDesc ? 160 : 60;
  const lenOk  = value && len >= minOk && len <= maxOk;
  const lenWarn = value && (len < minOk || len > maxOk);
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
        <span style={{ fontSize: 10, color: C.t4 }}>{label}</span>
        {value && <span style={{ fontSize: 10, color: lenOk ? C.green : lenWarn ? C.yellow : C.t4 }}>{len}/{maxOk}</span>}
      </div>
      <div style={{ fontSize: 12, color: missing ? C.red : ai ? C.purple : C.t2, lineHeight: 1.55, fontStyle: missing ? 'italic' : 'normal' }}>
        {missing ? `No ${label.toLowerCase()} set` : value}
      </div>
    </div>
  );
}

// ── Category Builder ──────────────────────────────────────────────────────────

function CategoryBuilder({ client, auditItems }) {
  const [suggestions, setSuggestions]     = useState(null);
  const [existing, setExisting]           = useState(null);
  const [generating, setGenerating]       = useState(false);
  const [genError, setGenError]           = useState(null);
  const [createStatus, setCreateStatus]   = useState({});
  const [catTab, setCatTab]               = useState('suggest');
  const [optimizations, setOptimizations] = useState(null);
  const [optimizing, setOptimizing]       = useState(false);
  const [optError, setOptError]           = useState(null);
  const [applyStatus, setApplyStatus]     = useState({});

  useEffect(() => {
    getCategorySuggestions(client.id).then(s => { if (s) setSuggestions(s); });
    getOptimizedCategories(client.id).then(o => { if (o) setOptimizations(o); });
    fetchCategories(client).then(cats => setExisting(cats)).catch(() => setExisting([]));
  }, [client.id]);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenError(null);
    try {
      const posts = auditItems.filter(i => i.type === 'post');
      const result = await generateCategorySuggestions(client.id, existing || [], posts);
      setSuggestions(result);
    } catch (e) {
      setGenError(e.message);
    }
    setGenerating(false);
  };

  const handleCreate = async (sug, idx) => {
    setCreateStatus(s => ({ ...s, [idx]: 'creating' }));
    try {
      const created = await createCategory(client, sug);
      setCreateStatus(s => ({ ...s, [idx]: 'done' }));
      setExisting(ex => [...(ex || []), created]);
    } catch (e) {
      setCreateStatus(s => ({ ...s, [idx]: 'error:' + e.message }));
    }
  };

  const handleCreateAll = async () => {
    for (let i = 0; i < (suggestions?.suggestions || []).length; i++) {
      if (createStatus[i] !== 'done') await handleCreate(suggestions.suggestions[i], i);
    }
  };

  const handleOptimizeExisting = async () => {
    if (!existing?.length) return;
    setOptimizing(true);
    setOptError(null);
    try {
      const result = await generateCategoryOptimizations(client.id, existing.map(c => ({
        id: c.id, name: c.name, slug: c.slug, description: c.description || '', count: c.count || 0,
      })));
      setOptimizations(result);
    } catch (e) {
      setOptError(e.message);
    }
    setOptimizing(false);
  };

  const handleApply = async (opt) => {
    setApplyStatus(s => ({ ...s, [opt.id]: 'applying' }));
    try {
      await updateCategory(client, opt.id, {
        name:        opt.newName        || opt.name,
        slug:        opt.newSlug        || opt.slug,
        description: opt.newDescription || '',
      });
      setApplyStatus(s => ({ ...s, [opt.id]: 'done' }));
      setExisting(ex => (ex || []).map(c => c.id === opt.id
        ? { ...c, name: opt.newName || c.name, slug: opt.newSlug || c.slug, description: opt.newDescription || c.description }
        : c));
    } catch (e) {
      setApplyStatus(s => ({ ...s, [opt.id]: 'error:' + e.message }));
    }
  };

  return (
    <div>
      {/* Existing categories */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: C.t3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
          Existing Categories on Site ({existing?.length ?? '…'})
        </div>
        {existing?.length > 0 ? (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {existing.map(cat => (
              <span key={cat.id} style={{ fontSize: 12, padding: '4px 11px', borderRadius: 20, background: C.bg3, border: `1px solid ${C.b2}`, color: C.t2 }}>
                {cat.name} <span style={{ color: C.t4 }}>/{cat.slug}</span>
                {cat.count > 0 && <span style={{ color: C.t4, marginLeft: 4 }}>·{cat.count}</span>}
              </span>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: C.t4 }}>{existing === null ? 'Loading…' : 'No categories yet'}</div>
        )}
      </div>

      {/* Tab selector */}
      <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${C.b2}`, marginBottom: 20 }}>
        {[
          { id: 'suggest',  label: 'Suggest New Categories' },
          { id: 'optimize', label: 'Optimize Existing' },
        ].map(t => (
          <button key={t.id} onClick={() => setCatTab(t.id)}
            style={{ padding: '9px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', marginBottom: -1,
              color: catTab === t.id ? C.accent : C.t3,
              borderBottom: `2px solid ${catTab === t.id ? C.accent : 'transparent'}` }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── SUGGEST NEW ── */}
      {catTab === 'suggest' && <>
        {/* Generate panel */}
        <div style={{ padding: '16px 20px', background: C.bg3, border: `1px solid ${C.b2}`, borderRadius: 10, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: C.t1, fontWeight: 500, marginBottom: 4 }}>AI Category Suggestions</div>
              <div style={{ fontSize: 12, color: C.t3, lineHeight: 1.7 }}>
                Claude analyses the client's industry, existing posts, and content themes to suggest 5 SEO-optimised post categories — each with a descriptive name, clean kebab-case slug, and keyword-rich description (120–155 chars). Generated once, stored. Creates them directly on the WordPress site.
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
              <button onClick={handleGenerate} disabled={generating}
                style={{ ...btn(C.purpleBg, C.purple), border: `1px solid ${C.purpleBd}`, opacity: generating ? 0.7 : 1 }}>
                {generating
                  ? <><Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</>
                  : <><Sparkles size={13} /> {suggestions ? 'Regenerate Suggestions' : 'Suggest 5 Categories'}</>}
              </button>
              {(suggestions?.suggestions?.length > 0) && (
                <button onClick={handleCreateAll} style={{ ...btn(C.greenBg, C.green), border: `1px solid ${C.greenBd}` }}>
                  <FolderOpen size={13} /> Create All on Site
                </button>
              )}
            </div>
          </div>
          {genError && <div style={{ marginTop: 10, fontSize: 12, color: C.red }}>{genError}</div>}
        </div>

        {suggestions?.generatedAt && (
          <div style={{ fontSize: 11, color: C.t4, marginBottom: 14 }}>
            Generated {new Date(suggestions.generatedAt).toLocaleString('en-IN')} · {suggestions.usage?.input_tokens}↑ {suggestions.usage?.output_tokens}↓ tokens
          </div>
        )}

        {/* Suggestion cards */}
        {suggestions?.suggestions?.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {suggestions.suggestions.map((sug, i) => {
            const cs           = createStatus[i];
            const alreadyOnSite = existing?.some(e => e.slug === sug.slug);
            return (
              <div key={i} style={{ background: C.bg3, border: `1px solid ${(alreadyOnSite || cs === 'done') ? C.greenBd : C.b2}`, borderRadius: 10, padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <Tag size={13} color={C.accent} />
                      <span style={{ fontSize: 14, fontWeight: 500, color: C.t1 }}>{sug.name}</span>
                      <code style={{ fontSize: 11, color: C.t3, background: C.bg4, border: `1px solid ${C.b1}`, borderRadius: 4, padding: '1px 6px' }}>
                        /{sug.slug}
                      </code>
                      {(alreadyOnSite || cs === 'done') && (
                        <span style={{ fontSize: 11, color: C.green, background: C.greenBg, border: `1px solid ${C.greenBd}`, borderRadius: 20, padding: '1px 8px' }}>
                          ✓ Live on site
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.7, marginBottom: 6 }}>{sug.description}</div>
                    <div style={{ fontSize: 11, color: C.t4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Info size={10} /> {sug.seoRationale}
                    </div>
                  </div>
                  {!alreadyOnSite && cs !== 'done' && (
                    <button onClick={() => handleCreate(sug, i)} disabled={cs === 'creating'}
                      style={{ ...btn(C.accentBg, C.accent), border: `1px solid ${C.accentBd}`, flexShrink: 0, opacity: cs === 'creating' ? 0.7 : 1 }}>
                      {cs === 'creating'
                        ? <><Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> Creating…</>
                        : <><FolderOpen size={12} /> Create on Site</>}
                    </button>
                  )}
                </div>
                {cs?.startsWith('error:') && (
                  <div style={{ marginTop: 8, fontSize: 11, color: C.red }}>{cs.slice(6)}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
      </>}

      {/* ── OPTIMIZE EXISTING ── */}
      {catTab === 'optimize' && <>
        <div style={{ padding: '16px 20px', background: C.bg3, border: `1px solid ${C.b2}`, borderRadius: 10, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: C.t1, fontWeight: 500, marginBottom: 4 }}>AI Category Optimizer</div>
              <div style={{ fontSize: 12, color: C.t3, lineHeight: 1.7 }}>
                Claude reviews your existing categories and suggests improved names, slugs, and SEO-optimised descriptions (120–155 chars). Apply changes individually or all at once — updates live on the WordPress site.
              </div>
            </div>
            <button onClick={handleOptimizeExisting} disabled={optimizing || !existing?.length}
              style={{ ...btn(C.purpleBg, C.purple), border: `1px solid ${C.purpleBd}`, opacity: (optimizing || !existing?.length) ? 0.7 : 1, flexShrink: 0 }}>
              {optimizing
                ? <><Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> Analysing…</>
                : <><Sparkles size={13} /> {optimizations ? 'Re-analyse' : 'Analyse & Optimize'}</>}
            </button>
          </div>
          {optError && <div style={{ marginTop: 10, fontSize: 12, color: C.red }}>{optError}</div>}
        </div>

        {optimizations?.generatedAt && (
          <div style={{ fontSize: 11, color: C.t4, marginBottom: 14 }}>
            Analysed {new Date(optimizations.generatedAt).toLocaleString('en-IN')} · {optimizations.usage?.input_tokens}↑ {optimizations.usage?.output_tokens}↓ tokens
          </div>
        )}

        {optimizations?.suggestions?.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {optimizations.suggestions.map(opt => {
              const as = applyStatus[opt.id];
              const hasChanges = opt.newName || opt.newSlug || opt.newDescription;
              return (
                <div key={opt.id} style={{ background: C.bg3, border: `1px solid ${as === 'done' ? C.greenBd : C.b2}`, borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderBottom: `1px solid ${C.b1}` }}>
                    <Tag size={13} color={C.accent} />
                    <span style={{ fontSize: 13, fontWeight: 500, color: C.t1 }}>{opt.name}</span>
                    <code style={{ fontSize: 11, color: C.t3, background: C.bg4, border: `1px solid ${C.b1}`, borderRadius: 4, padding: '1px 6px' }}>/{opt.slug}</code>
                    {as === 'done' && <span style={{ fontSize: 11, color: C.green, marginLeft: 4 }}>✓ Updated</span>}
                    {hasChanges && as !== 'done' && (
                      <button onClick={() => handleApply(opt)} disabled={as === 'applying'}
                        style={{ ...btn(C.accentBg, C.accent), border: `1px solid ${C.accentBd}`, marginLeft: 'auto', fontSize: 11, opacity: as === 'applying' ? 0.7 : 1 }}>
                        {as === 'applying'
                          ? <><Loader size={11} style={{ animation: 'spin 1s linear infinite' }} /> Applying…</>
                          : <><CheckCircle size={11} /> Apply Changes</>}
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                    <div style={{ padding: '10px 16px', borderRight: `1px solid ${C.b1}` }}>
                      <div style={{ fontSize: 10, color: C.t4, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Current</div>
                      <div style={{ fontSize: 12, color: C.t2, marginBottom: 4 }}>Name: {opt.name}</div>
                      <div style={{ fontSize: 12, color: C.t3, marginBottom: 4 }}>Slug: /{opt.slug}</div>
                      <div style={{ fontSize: 12, color: opt.description ? C.t3 : C.t4, fontStyle: opt.description ? 'normal' : 'italic', lineHeight: 1.55 }}>
                        {opt.description || 'No description set'}
                      </div>
                    </div>
                    <div style={{ padding: '10px 16px', background: hasChanges ? '#7c3aed11' : 'transparent' }}>
                      <div style={{ fontSize: 10, color: hasChanges ? C.purple : C.t4, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                        {hasChanges ? 'AI Optimized' : 'No changes needed'}
                      </div>
                      {opt.newName && <div style={{ fontSize: 12, color: C.purple, marginBottom: 4 }}>Name: {opt.newName}</div>}
                      {opt.newSlug && <div style={{ fontSize: 12, color: C.purple, marginBottom: 4 }}>Slug: /{opt.newSlug}</div>}
                      {opt.newDescription && (
                        <div style={{ fontSize: 12, color: C.purple, lineHeight: 1.55, marginBottom: 4 }}>{opt.newDescription}</div>
                      )}
                      {opt.rationale && (
                        <div style={{ fontSize: 11, color: C.t4, display: 'flex', alignItems: 'flex-start', gap: 4, marginTop: 6 }}>
                          <Info size={10} style={{ flexShrink: 0, marginTop: 2 }} /> {opt.rationale}
                        </div>
                      )}
                    </div>
                  </div>
                  {as?.startsWith('error:') && (
                    <div style={{ padding: '6px 16px', background: C.redBg, fontSize: 11, color: C.red }}>{as.slice(6)}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!optimizations && !optimizing && existing?.length === 0 && (
          <div style={{ fontSize: 13, color: C.t4, textAlign: 'center', padding: 24 }}>No existing categories to optimize. Add some categories first.</div>
        )}
      </>}

    </div>
  );
}

// ── Site Score ────────────────────────────────────────────────────────────────

function SiteScore({ auditItems, client }) {
  const scored      = auditItems.map(item => ({ ...item, _score: scoreItem(item) }));
  const avg         = scored.length ? Math.round(scored.reduce((s, i) => s + i._score, 0) / scored.length) : 0;
  const goodPages   = scored.filter(i => i._score >= 80);
  const errorPages  = scored.filter(i => !i.meta_title || !i.meta_desc || i.is_noindex);
  const noindex     = scored.filter(i => i.is_noindex);
  const sorted      = [...scored].sort((a, b) => a._score - b._score);

  return (
    <div>
      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Avg SEO Score', value: `${avg}%`,           color: scoreColor(avg) },
          { label: 'Pages Healthy', value: goodPages.length,    color: C.green },
          { label: 'Need Attention',value: errorPages.length,   color: C.red },
          { label: 'Noindex Pages', value: noindex.length,      color: C.yellow },
        ].map(card => (
          <div key={card.label} style={{ background: C.bg3, border: `1px solid ${C.b2}`, borderRadius: 10, padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: card.color, marginBottom: 4 }}>{card.value}</div>
            <div style={{ fontSize: 11, color: C.t3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Score bar */}
      <div style={{ marginBottom: 24, padding: '14px 18px', background: C.bg3, border: `1px solid ${C.b2}`, borderRadius: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12, color: C.t3 }}>
          <span>Overall site SEO health</span>
          <span style={{ color: scoreColor(avg), fontWeight: 600 }}>{avg}%</span>
        </div>
        <div style={{ height: 8, background: C.bg4, borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${avg}%`, background: scoreColor(avg), borderRadius: 4, transition: 'width 0.4s' }} />
        </div>
      </div>

      {/* Pages table */}
      <div style={{ fontSize: 12, color: C.t3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
        All pages — lowest score first
      </div>
      <div style={{ border: `1px solid ${C.b2}`, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr 90px 90px 80px 70px', padding: '8px 14px', background: C.bg2, borderBottom: `1px solid ${C.b1}` }}>
          {['Score', 'Page', 'Meta Title', 'Meta Desc', 'Keyword', 'OG Image'].map(h => (
            <div key={h} style={{ fontSize: 11, color: C.t4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
          ))}
        </div>
        {sorted.map((item, i) => (
          <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '64px 1fr 90px 90px 80px 70px', padding: '10px 14px', background: i % 2 === 0 ? C.bg3 : C.bg2, borderBottom: `1px solid ${C.b1}`, alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor(item._score) }}>{item._score}%</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, color: C.t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
              <div style={{ fontSize: 10, color: C.t4 }}>/{item.slug} · {item.type}</div>
            </div>
            <StatusDot ok={!!item.meta_title} label={item.meta_title ? `${item.meta_title.length}c` : 'Missing'} />
            <StatusDot ok={!!item.meta_desc}  label={item.meta_desc  ? `${item.meta_desc.length}c`  : 'Missing'} />
            <StatusDot ok={!!item.focus_keyword} label={item.focus_keyword || 'Not set'} />
            <StatusDot ok={!!item.has_og_image}  label={item.has_og_image ? 'Set' : 'Missing'} />
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusDot({ ok, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: ok ? C.green : C.red, flexShrink: 0 }} />
      <span style={{ fontSize: 11, color: C.t3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
    </div>
  );
}

// ── Shared style helpers ──────────────────────────────────────────────────────

const btn = (bg, color, solid = false) => ({
  display: 'inline-flex', alignItems: 'center', gap: 6,
  background: solid ? color : bg,
  color:      solid ? bg    : color,
  border:     `1px solid ${solid ? color : 'transparent'}`,
  borderRadius: 7, padding: '8px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
});
