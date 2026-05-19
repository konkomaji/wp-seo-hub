import { useState, useEffect } from 'react';
import {
  TrendingUp, Plus, Trash2, RefreshCw, ExternalLink, AlertCircle,
  ChevronDown, ChevronUp, Info, Package, Shield, BarChart2,
  Download, Search, CheckCircle,
} from 'lucide-react';
import {
  getTrackedKeywords, saveTrackedKeyword, deleteTrackedKeyword,
  getGscData, getGscStatus, getWpCache, generateId, logError,
} from '../store/store';
import { fetchHubSiteInfo, fetchPluginsStatus } from '../utils/wpApi';
import { C } from '../theme';

const PLUGINS = [
  {
    cat: 'SEO Plugin (Required)',
    items: [
      { name: 'Yoast SEO',  slug: 'wordpress-seo',    desc: 'Most popular SEO plugin. Sets meta tags, XML sitemap, breadcrumbs, schema. Exposes focus keyword via REST — needed for Post Performance tracking.', rec: true },
      { name: 'RankMath',   slug: 'seo-by-rank-math', desc: 'Feature-rich alternative to Yoast. Built-in schema, redirections, 404 monitor. Better free tier. Focus keyword exposed via REST for post tracking.', rec: true },
    ],
  },
  {
    cat: 'Google Integration (Critical for GSC)',
    items: [
      { name: 'Site Kit by Google', slug: 'google-site-kit', desc: 'Official Google plugin. Connects Search Console, Analytics (GA4), PageSpeed, AdSense. GSC data flows through WPSeoHub Connector when Site Kit is connected.', rec: true },
    ],
  },
  {
    cat: 'Performance & Core Web Vitals',
    items: [
      { name: 'WP Rocket',      slug: null,               desc: 'Premium caching. Page speed, lazy load, JS/CSS minification, CDN. Improves LCP and CLS scores.', rec: true },
      { name: 'W3 Total Cache', slug: 'w3-total-cache',   desc: 'Free caching. Browser caching, CDN, minification. Good for shared hosting.' },
      { name: 'Smush',          slug: 'wp-smushit',       desc: 'Bulk image compression and WebP conversion. Images are the #1 LCP killer.', rec: true },
    ],
  },
  {
    cat: 'Schema & Rich Results',
    items: [
      { name: 'Schema Pro',               slug: null,                                desc: 'Premium schema for FAQ, Article, Product, Review, LocalBusiness rich snippets.', rec: true },
      { name: 'Structured Data for WP',   slug: 'schema-and-structured-data-for-wp', desc: 'Free structured data. Compatible with Google Rich Results Test.' },
    ],
  },
  {
    cat: 'Redirects & Technical SEO',
    items: [
      { name: 'Redirection',         slug: 'redirection',         desc: 'Manage 301 redirects and catch 404 errors. Essential after migrations.', rec: true },
      { name: 'Broken Link Checker', slug: 'broken-link-checker', desc: 'Finds and alerts on broken internal/external links.' },
    ],
  },
];

const DATE_RANGES = [
  { label: '7d',  days: 7 },
  { label: '28d', days: 28 },
  { label: '90d', days: 90 },
];

// Look up a keyword in GSC topQueries (case-insensitive, partial match allowed)
function findGscRow(gscData, keyword) {
  if (!gscData?.topQueries || !keyword) return null;
  const kw = keyword.toLowerCase().trim();
  return gscData.topQueries.find(r => (r.query || '').toLowerCase() === kw)
    || gscData.topQueries.find(r => (r.query || '').toLowerCase().includes(kw))
    || null;
}

export default function KeywordTracker({ clients, settings }) {
  const [selectedClient, setSelectedClient] = useState(clients[0]?.id || null);
  const [tab, setTab]                       = useState('gsc');

  // GSC state
  const [gscData, setGscData]         = useState(null);
  const [loadingGsc, setLoadingGsc]   = useState(false);
  const [gscError, setGscError]       = useState(null);
  const [gscStatus, setGscStatus]     = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [dateRange, setDateRange]     = useState(28);
  const [sortField, setSortField]     = useState('impressions');
  const [sortDir, setSortDir]         = useState('desc');
  const [gscFromCache, setGscFromCache] = useState(false);

  // Keyword tracker state
  const [keywords, setKeywords]       = useState([]);
  const [newKw, setNewKw]             = useState('');
  const [newPos, setNewPos]           = useState('');
  const [importing, setImporting]     = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Plugin/site info
  const [expandedCat, setExpandedCat] = useState(null);
  const [vkSiteInfo, setVkSiteInfo]   = useState({});
  const [wpCache, setWpCache]         = useState({});

  const client = clients.find(c => c.id === selectedClient);

  // Load keywords when client changes
  useEffect(() => {
    if (selectedClient) {
      getTrackedKeywords().then(all => setKeywords(all[selectedClient] || [])).catch(() => {});
    }
  }, [selectedClient]);

  // Load site info
  useEffect(() => {
    if (!client || vkSiteInfo[client.id] !== undefined) return;
    fetchHubSiteInfo(client)
      .then(info => setVkSiteInfo(p => ({ ...p, [client.id]: info })))
      .catch(() => setVkSiteInfo(p => ({ ...p, [client.id]: null })));
  }, [selectedClient]);

  // Load WP cache (for post keywords)
  useEffect(() => {
    getWpCache().then(setWpCache).catch(() => {});
  }, []);

  // Auto-fetch GSC silently on tab open
  useEffect(() => {
    if (tab === 'gsc' && client && !gscData && !loadingGsc) {
      handleFetchGsc(true);
    }
  }, [selectedClient, tab]);

  const handleFetchGsc = async (silent = false) => {
    if (!client) return;
    setLoadingGsc(true);
    if (!silent) { setGscError(null); setGscStatus(null); }
    try {
      const data = await getGscData(client.id, dateRange);
      if (!data) {
        if (!silent) setGscError('Could not reach GSC endpoint. Check API server is running.');
        setLoadingGsc(false);
        return;
      }
      if (data.notAvailable) {
        if (!silent) {
          setGscError(data.message || 'GSC unavailable.');
          // Fetch diagnostic status
          setLoadingStatus(true);
          getGscStatus(client.id).then(s => setGscStatus(s)).catch(() => {}).finally(() => setLoadingStatus(false));
        }
        setLoadingGsc(false);
        return;
      }
      if (data.error) throw new Error(data.error);
      setGscData(data);
      setGscFromCache(!!data.fromCache);
      setGscError(null);
    } catch (e) {
      if (!silent) {
        setGscError(e.message);
        logError('Keyword Tracker', 'Fetch GSC', e, { clientId: client?.id, dateRange });
      }
    }
    setLoadingGsc(false);
  };

  // Auto-import focus keywords from cached posts
  const handleImportFromPosts = async () => {
    if (!selectedClient) return;
    setImporting(true);
    setImportResult(null);
    try {
      const posts    = wpCache[selectedClient]?.posts || [];
      const existing = new Set(keywords.map(k => k.keyword.toLowerCase().trim()));
      const newKws   = [];
      const seen     = new Set();

      posts.forEach(p => {
        const kw = (p.focus_keyword || '').trim();
        if (!kw) return;
        const key = kw.toLowerCase();
        if (seen.has(key) || existing.has(key)) return;
        seen.add(key);
        newKws.push({
          id:       generateId(),
          keyword:  kw,
          history:  [],
          addedAt:  new Date().toISOString(),
          source:   'post_import',
          postTitle: (p.title?.rendered?.replace(/<[^>]*>/g, '') || p.title || '').slice(0, 60),
        });
      });

      if (newKws.length === 0) {
        setImportResult({ added: 0, skipped: posts.filter(p => p.focus_keyword).length });
        setImporting(false);
        return;
      }

      // Save all at once
      let updated = keywords;
      for (const kw of newKws) {
        const res = await saveTrackedKeyword(selectedClient, kw).catch(() => null);
        if (res) updated = res;
      }
      setKeywords(updated);
      setImportResult({ added: newKws.length, skipped: posts.filter(p => p.focus_keyword && !newKws.find(k => k.keyword.toLowerCase() === p.focus_keyword.toLowerCase())).length });
    } catch (e) {
      setImportResult({ error: e.message });
    }
    setImporting(false);
  };

  const addKw = async () => {
    const kw = newKw.trim();
    if (!kw || !selectedClient) return;
    const pos    = parseInt(newPos) || null;
    const record = { id: generateId(), keyword: kw, history: pos ? [{ date: today(), pos }] : [], addedAt: new Date().toISOString() };
    const updated = await saveTrackedKeyword(selectedClient, record).catch(() => null);
    if (updated) setKeywords(updated);
    setNewKw(''); setNewPos('');
  };

  const removeKw = async (id) => {
    await deleteTrackedKeyword(selectedClient, id).catch(() => {});
    setKeywords(kws => kws.filter(k => k.id !== id));
  };

  const updatePos = async (id, val) => {
    const pos = parseInt(val);
    if (isNaN(pos) || pos < 1) return;
    const kw = keywords.find(k => k.id === id);
    if (!kw) return;
    const hist = [...(kw.history || [])];
    const td   = today();
    const idx  = hist.findIndex(h => h.date === td);
    if (idx >= 0) hist[idx].pos = pos;
    else hist.push({ date: td, pos });
    const updated = await saveTrackedKeyword(selectedClient, { ...kw, history: hist }).catch(() => null);
    if (updated) setKeywords(updated);
  };

  const sortedGsc = (() => {
    if (!gscData?.topQueries) return [];
    return [...gscData.topQueries].sort((a, b) => {
      const av = a[sortField] ?? 0;
      const bv = b[sortField] ?? 0;
      return sortDir === 'desc' ? bv - av : av - bv;
    });
  })();

  const toggleSort = (f) => {
    if (sortField === f) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortField(f); setSortDir('desc'); }
  };

  if (clients.length === 0) return <Empty />;

  const TABS = [
    { id: 'gsc',         label: 'Search Console' },
    { id: 'tracker',     label: 'Keyword Tracker' },
    { id: 'performance', label: 'Content Performance' },
    { id: 'plugins',     label: 'Recommended Plugins' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontFamily: C.fontSerif, color: C.t1 }}>Keywords & Search Console</h2>
        <p style={{ margin: '4px 0 0', color: C.t3, fontSize: 13 }}>GSC performance data, keyword rank tracking, and content keyword analysis</p>
      </div>

      <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${C.b2}`, marginBottom: 24 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', marginBottom: -1,
              color: tab === t.id ? C.accent : C.t3,
              borderBottom: `2px solid ${tab === t.id ? C.accent : 'transparent'}` }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Search Console Tab ── */}
      {tab === 'gsc' && (
        <GscOverview
          clients={clients} selectedClient={selectedClient} onSelectClient={(id) => { setSelectedClient(id); setGscData(null); setGscError(null); setGscStatus(null); }}
          gscData={gscData} loadingGsc={loadingGsc} gscError={gscError} gscFromCache={gscFromCache}
          gscStatus={gscStatus} loadingStatus={loadingStatus}
          dateRange={dateRange} onDateRange={setDateRange}
          sortedGsc={sortedGsc} sortField={sortField} sortDir={sortDir} onSort={toggleSort}
          onFetch={() => handleFetchGsc(false)}
          vkSiteInfo={vkSiteInfo} client={client}
        />
      )}

      {/* ── Keyword Tracker Tab ── */}
      {tab === 'tracker' && (
        <KeywordTrackerTab
          clients={clients} selectedClient={selectedClient} onSelectClient={setSelectedClient}
          keywords={keywords} newKw={newKw} newPos={newPos}
          onNewKw={setNewKw} onNewPos={setNewPos}
          onAdd={addKw} onRemove={removeKw} onUpdatePos={updatePos}
          onImport={handleImportFromPosts} importing={importing} importResult={importResult}
          wpCache={wpCache} gscData={gscData}
          client={client}
        />
      )}

      {/* ── Content Performance Tab ── */}
      {tab === 'performance' && (
        <ContentPerformance
          clients={clients} selectedClient={selectedClient} onSelectClient={setSelectedClient}
          wpCache={wpCache} gscData={gscData}
          onFetchGsc={() => handleFetchGsc(false)} loadingGsc={loadingGsc}
          client={client}
        />
      )}

      {/* ── Plugins Tab ── */}
      {tab === 'plugins' && (
        <PluginsTab expandedCat={expandedCat} onExpandCat={setExpandedCat} client={client} />
      )}
    </div>
  );
}

// ── Search Console (GSC Overview) ────────────────────────────────────────────

function GscOverview({ clients, selectedClient, onSelectClient, gscData, loadingGsc, gscError, gscFromCache, gscStatus, loadingStatus, dateRange, onDateRange, sortedGsc, sortField, sortDir, onSort, onFetch, vkSiteInfo, client }) {
  return (
    <div>
      {/* Client selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {clients.map(c => (
          <button key={c.id} onClick={() => onSelectClient(c.id)}
            style={{ borderRadius: 20, padding: '6px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
              background: selectedClient === c.id ? C.accent : C.bg3,
              color:      selectedClient === c.id ? C.bg1   : C.t3,
              border:     `1px solid ${selectedClient === c.id ? C.accent : C.b2}` }}>
            {c.name}
          </button>
        ))}
      </div>

      {/* Site Kit status badge */}
      {client && vkSiteInfo[client.id]?.analytics?.gsc_property && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: C.green, padding: '8px 14px', background: C.greenBg, borderRadius: 8, border: `1px solid ${C.greenBd}`, marginBottom: 14 }}>
          <Shield size={13} />
          GSC connected — property: <code style={{ background: C.bg2, padding: '1px 6px', borderRadius: 3, fontSize: 11 }}>{vkSiteInfo[client.id].analytics.gsc_property}</code>
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {DATE_RANGES.map(dr => (
            <button key={dr.days} onClick={() => onDateRange(dr.days)}
              style={{ fontSize: 12, padding: '6px 11px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
                background: dateRange === dr.days ? C.bg5 || C.bg4 : C.bg3,
                color:      dateRange === dr.days ? C.t1 : C.t3,
                border:     `1px solid ${dateRange === dr.days ? C.b3 || C.b2 : C.b2}` }}>
              {dr.label}
            </button>
          ))}
        </div>
        <button onClick={onFetch} disabled={loadingGsc}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: loadingGsc ? C.bg4 : C.accent, border: 'none', borderRadius: 7, padding: '8px 16px', color: loadingGsc ? C.t3 : C.bg1, fontSize: 13, cursor: loadingGsc ? 'wait' : 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
          {loadingGsc ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <TrendingUp size={13} />}
          {loadingGsc ? 'Fetching…' : 'Fetch GSC Data'}
        </button>
        {gscData && gscFromCache && <span style={{ fontSize: 11, color: C.t4 }}>Showing cached data</span>}
      </div>

      {/* Error + diagnostic */}
      {gscError && (
        <div style={{ background: C.redBg, border: `1px solid ${C.redBd}`, borderRadius: 10, padding: '14px 16px', marginBottom: 18 }}>
          <div style={{ display: 'flex', gap: 8, color: C.red, fontSize: 13, marginBottom: gscStatus ? 12 : 0 }}>
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {gscError}
          </div>
          {loadingStatus && <div style={{ fontSize: 12, color: C.t3, marginTop: 8 }}>Running diagnostic…</div>}
          {gscStatus && <GscSetupGuide status={gscStatus} />}
          {!gscStatus && !loadingStatus && (
            <div style={{ marginTop: 10, fontSize: 12, color: C.t3, lineHeight: 1.8 }}>
              <strong style={{ color: C.t2 }}>Setup checklist:</strong>
              <ol style={{ margin: '6px 0 0', paddingLeft: 20 }}>
                <li>Install <strong>Site Kit by Google</strong> on the WordPress site</li>
                <li>Sign in with an admin Google account in Site Kit</li>
                <li>Connect <strong>Search Console</strong> in Site Kit → Connect more services</li>
                <li>Wait 24–48h for data to appear in Search Console</li>
                <li>Update WPSeoHub Connector to v1.2.0+</li>
              </ol>
            </div>
          )}
        </div>
      )}

      {/* KPI cards */}
      {gscData && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Total Clicks',    val: gscData.totalClicks?.toLocaleString()      ?? '—', color: C.green },
              { label: 'Impressions',     val: gscData.totalImpressions?.toLocaleString() ?? '—', color: C.blue || C.accent },
              { label: 'Avg CTR',         val: gscData.avgCtr != null ? (gscData.avgCtr * 100).toFixed(1) + '%' : '—', color: C.accent },
              { label: 'Avg Position',    val: gscData.avgPosition?.toFixed(1) ?? '—', color: gscData.avgPosition <= 10 ? C.green : gscData.avgPosition <= 20 ? C.yellow : C.t2 },
            ].map(s => (
              <div key={s.label} style={{ background: C.bg3, border: `1px solid ${C.b2}`, borderRadius: 9, padding: '12px 16px' }}>
                <div style={{ fontSize: 10, color: C.t3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 10, color: C.t4, marginTop: 3 }}>last {dateRange} days</div>
              </div>
            ))}
          </div>

          {/* Queries table */}
          {sortedGsc.length > 0 && (
            <>
              <div style={{ fontSize: 12, color: C.t3, marginBottom: 10 }}>
                {sortedGsc.length} queries · last {dateRange} days
                {gscData.source && <span style={{ marginLeft: 8, color: C.t4 }}>via {gscData.source}</span>}
              </div>
              <div style={{ border: `1px solid ${C.b2}`, borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 110px 70px 90px', padding: '8px 14px', background: C.bg2, borderBottom: `1px solid ${C.b1}` }}>
                  {[
                    { label: 'Query',       field: null },
                    { label: 'Clicks',      field: 'clicks' },
                    { label: 'Impressions', field: 'impressions' },
                    { label: 'CTR',         field: 'ctr' },
                    { label: 'Position',    field: 'position' },
                  ].map(h => (
                    <button key={h.label} onClick={() => h.field && onSort(h.field)}
                      style={{ background: 'none', border: 'none', cursor: h.field ? 'pointer' : 'default', textAlign: 'left', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 11, color: sortField === h.field ? C.accent : C.t4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h.label}</span>
                      {sortField === h.field && <span style={{ fontSize: 9, color: C.accent }}>{sortDir === 'desc' ? '↓' : '↑'}</span>}
                    </button>
                  ))}
                </div>
                {sortedGsc.map((row, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 110px 70px 90px', padding: '9px 14px', background: i % 2 === 0 ? C.bg3 : C.bg2, borderBottom: `1px solid ${C.b1}`, alignItems: 'center' }}>
                    <div style={{ fontSize: 13, color: C.t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.query || '—'}</div>
                    <div style={{ fontSize: 12, color: C.green, fontWeight: 500 }}>{row.clicks?.toLocaleString() ?? '0'}</div>
                    <div style={{ fontSize: 12, color: C.t2 }}>{row.impressions?.toLocaleString() ?? '0'}</div>
                    <div style={{ fontSize: 12, color: C.accent }}>{row.ctr != null ? `${(row.ctr * 100).toFixed(1)}%` : '—'}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: row.position <= 3 ? C.green : row.position <= 10 ? C.accent : C.t3 }}>
                      #{row.position?.toFixed(1) ?? '—'}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Top pages */}
          {gscData.topPages?.length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: C.t3, marginBottom: 10 }}>Top pages by impressions</div>
              <div style={{ border: `1px solid ${C.b2}`, borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 110px 70px', padding: '8px 14px', background: C.bg2, borderBottom: `1px solid ${C.b1}` }}>
                  {['Page URL', 'Clicks', 'Impressions', 'Avg Pos'].map(h => (
                    <div key={h} style={{ fontSize: 11, color: C.t4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
                  ))}
                </div>
                {gscData.topPages.slice(0, 15).map((row, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 110px 70px', padding: '9px 14px', background: i % 2 === 0 ? C.bg3 : C.bg2, borderBottom: `1px solid ${C.b1}`, alignItems: 'center' }}>
                    <div style={{ fontSize: 12, color: C.t2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.page}</div>
                    <div style={{ fontSize: 12, color: C.green, fontWeight: 500 }}>{row.clicks?.toLocaleString() ?? '0'}</div>
                    <div style={{ fontSize: 12, color: C.t2 }}>{row.impressions?.toLocaleString() ?? '0'}</div>
                    <div style={{ fontSize: 12, color: C.t3 }}>#{row.position?.toFixed(1) ?? '—'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!gscData && !loadingGsc && !gscError && (
        <div style={{ background: C.bg3, border: `1px solid ${C.b2}`, borderRadius: 10, padding: '20px 22px' }}>
          <div style={{ fontSize: 13, color: C.t1, fontWeight: 500, marginBottom: 10 }}>Search Console data via WPSeoHub Connector</div>
          <ul style={{ margin: 0, padding: '0 0 0 18px', color: C.t2, fontSize: 13, lineHeight: 2.2 }}>
            <li>Top keywords with clicks, impressions, CTR, and position</li>
            <li>Page-level performance (which pages get impressions and clicks)</li>
            <li>Page-2 keywords (positions 11–20) for quick-win targeting</li>
            <li>High-impression / low-CTR queries — fix meta description to boost CTR</li>
          </ul>
          <div style={{ marginTop: 14, fontSize: 12, color: C.t3 }}>
            Requires: WPSeoHub Connector v1.2.0+ · Site Kit by Google · Search Console connected in Site Kit
          </div>
        </div>
      )}
    </div>
  );
}

function GscSetupGuide({ status }) {
  const steps = status?.steps || [];
  return (
    <div style={{ background: C.bg3, border: `1px solid ${C.b2}`, borderRadius: 8, padding: '12px 14px', marginTop: 10 }}>
      <div style={{ fontSize: 12, color: C.t1, fontWeight: 500, marginBottom: 8 }}>Diagnostic results</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10, fontSize: 12 }}>
        <StatusCheck ok={status.site_kit_active}  label="Site Kit installed" />
        <StatusCheck ok={status.gsc_connected}    label="Search Console connected" />
        <StatusCheck ok={status.can_fetch}        label="GSC data accessible" />
        {status.gsc_property && <div style={{ fontSize: 11, color: C.t3 }}>Property: {status.gsc_property}</div>}
      </div>
      {status.fix && (
        <div style={{ fontSize: 12, color: C.t2, marginBottom: 8 }}>
          <strong style={{ color: C.accent }}>Fix:</strong> {status.fix}
        </div>
      )}
      {steps.length > 0 && (
        <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: C.t2, lineHeight: 2 }}>
          {steps.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
      )}
    </div>
  );
}

function StatusCheck({ ok, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: ok ? C.green : C.red }}>
      {ok ? <CheckCircle size={12} /> : <AlertCircle size={12} />} {label}
    </div>
  );
}

// ── Keyword Tracker ───────────────────────────────────────────────────────────

function KeywordTrackerTab({ clients, selectedClient, onSelectClient, keywords, newKw, newPos, onNewKw, onNewPos, onAdd, onRemove, onUpdatePos, onImport, importing, importResult, wpCache, gscData, client }) {
  const postsWithKw = (wpCache[selectedClient]?.posts || []).filter(p => p.focus_keyword);
  const alreadyTracked = new Set(keywords.map(k => k.keyword.toLowerCase().trim()));
  const importableCount = new Set(postsWithKw.map(p => p.focus_keyword.toLowerCase().trim()).filter(k => !alreadyTracked.has(k))).size;

  return (
    <div>
      {/* Client selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {clients.map(c => (
          <button key={c.id} onClick={() => onSelectClient(c.id)}
            style={{ borderRadius: 20, padding: '6px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
              background: selectedClient === c.id ? C.accent : C.bg3,
              color:      selectedClient === c.id ? C.bg1   : C.t3,
              border:     `1px solid ${selectedClient === c.id ? C.accent : C.b2}` }}>
            {c.name}
          </button>
        ))}
      </div>

      {/* Import from posts banner */}
      <div style={{ background: C.accentBg, border: `1px solid ${C.accentBd}`, borderRadius: 10, padding: '14px 18px', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: C.t1, fontWeight: 500, marginBottom: 4 }}>Import Focus Keywords from Posts</div>
            <div style={{ fontSize: 12, color: C.t3, lineHeight: 1.7 }}>
              Automatically pull focus keywords set in Yoast SEO or RankMath from your cached posts.
              {importableCount > 0
                ? <strong style={{ color: C.accent }}> {importableCount} new keyword{importableCount > 1 ? 's' : ''} found</strong>
                : postsWithKw.length > 0 ? ' All post keywords already tracked.' : ' No post keywords found — refresh post cache first.'}
            </div>
            {importResult && !importResult.error && (
              <div style={{ fontSize: 12, color: C.green, marginTop: 6 }}>
                ✓ Added {importResult.added} keyword{importResult.added !== 1 ? 's' : ''}{importResult.skipped > 0 ? `, ${importResult.skipped} already tracked` : ''}
              </div>
            )}
            {importResult?.error && <div style={{ fontSize: 12, color: C.red, marginTop: 6 }}>{importResult.error}</div>}
          </div>
          <button onClick={onImport} disabled={importing || importableCount === 0}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.accent, border: 'none', borderRadius: 7, padding: '9px 16px', color: C.bg1, fontSize: 12, cursor: (importing || importableCount === 0) ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: importableCount === 0 ? 0.5 : 1, flexShrink: 0 }}>
            {importing ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={12} />}
            {importing ? 'Importing…' : 'Import Keywords'}
          </button>
        </div>
      </div>

      {/* Manual add */}
      <div style={{ background: C.bg3, border: `1px solid ${C.b2}`, borderRadius: 10, padding: 16, marginBottom: 18 }}>
        <div style={{ fontSize: 12, color: C.t3, marginBottom: 10 }}>Add keyword manually and update ranking positions weekly to track trends.</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input value={newKw} onChange={e => onNewKw(e.target.value)} onKeyDown={e => e.key === 'Enter' && onAdd()}
            placeholder="Keyword to track…"
            style={inputStyle} />
          <input value={newPos} onChange={e => onNewPos(e.target.value)} onKeyDown={e => e.key === 'Enter' && onAdd()}
            placeholder="Position" type="number" min="1"
            style={{ ...inputStyle, width: 100 }} />
          <button onClick={onAdd} disabled={!newKw.trim()}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.accent, border: 'none', borderRadius: 7, padding: '9px 16px', color: C.bg1, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      {/* Keyword table */}
      {keywords.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', color: C.t3, fontSize: 13 }}>
          No keywords tracked for {client?.name}. Import from posts or add manually above.
        </div>
      ) : (
        <div style={{ border: `1px solid ${C.b2}`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 80px 120px 110px 34px', padding: '8px 14px', background: C.bg2, borderBottom: `1px solid ${C.b1}` }}>
            {['Keyword', 'Position', 'Change', 'GSC Data', 'Update Rank', ''].map(h => (
              <div key={h} style={{ fontSize: 11, color: C.t4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
            ))}
          </div>
          {keywords.map((kw, i) => {
            const hist    = kw.history || [];
            const latest  = hist.length ? hist[hist.length - 1].pos : null;
            const prev    = hist.length > 1 ? hist[hist.length - 2].pos : null;
            const delta   = prev != null && latest != null ? prev - latest : null;
            const gscRow  = findGscRow(gscData, kw.keyword);
            return (
              <div key={kw.id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 80px 120px 110px 34px', padding: '10px 14px', background: i % 2 === 0 ? C.bg3 : C.bg2, borderBottom: `1px solid ${C.b1}`, alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, color: C.t1, fontWeight: 500 }}>{kw.keyword}</div>
                  {kw.source === 'post_import' && kw.postTitle && (
                    <div style={{ fontSize: 10, color: C.t4, marginTop: 2 }}>Post: {kw.postTitle}</div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  {latest != null ? (
                    <span style={{ fontSize: 15, fontWeight: 700, color: latest <= 3 ? C.green : latest <= 10 ? C.accent : C.t2 }}>#{latest}</span>
                  ) : gscRow ? (
                    <span style={{ fontSize: 13, color: C.t3 }}>#{gscRow.position?.toFixed(0) ?? '—'} <span style={{ fontSize: 10, color: C.t4 }}>GSC</span></span>
                  ) : (
                    <span style={{ fontSize: 12, color: C.t3 }}>—</span>
                  )}
                </div>
                <div>
                  {delta !== null && (
                    <span style={{ fontSize: 12, color: delta > 0 ? C.green : delta < 0 ? C.red : C.t3 }}>
                      {delta > 0 ? `▲${delta}` : delta < 0 ? `▼${Math.abs(delta)}` : '='}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: C.t3 }}>
                  {gscRow ? (
                    <span>
                      <span style={{ color: C.green }}>{gscRow.clicks} clicks</span>
                      {' · '}
                      <span>#{gscRow.position?.toFixed(0)}</span>
                    </span>
                  ) : gscData ? (
                    <span style={{ color: C.t4 }}>Not in GSC top queries</span>
                  ) : (
                    <span style={{ color: C.t4 }}>Fetch GSC data</span>
                  )}
                </div>
                <input type="number" min="1" max="200" placeholder="New rank"
                  onBlur={e => { if (e.target.value) { onUpdatePos(kw.id, e.target.value); e.target.value = ''; } }}
                  style={{ ...inputStyle, padding: '5px 8px', fontSize: 12 }} />
                <button onClick={() => onRemove(kw.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.t4, padding: 4, display: 'flex' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Content Performance ───────────────────────────────────────────────────────

function ContentPerformance({ clients, selectedClient, onSelectClient, wpCache, gscData, onFetchGsc, loadingGsc, client }) {
  const posts = (wpCache[selectedClient]?.posts || [])
    .filter(p => p.focus_keyword)
    .map(p => {
      const title = p.title?.rendered?.replace(/<[^>]*>/g, '') || p.title || '';
      const gscRow = findGscRow(gscData, p.focus_keyword);
      return {
        id:           p.id,
        title,
        slug:         p.slug,
        link:         p.link,
        date:         p.date,
        focusKeyword: p.focus_keyword,
        seoPlugin:    p.seo_plugin,
        gsc:          gscRow,
      };
    })
    .sort((a, b) => {
      // Sort: GSC data first (ranked items), then by clicks desc
      if (a.gsc && !b.gsc) return -1;
      if (!a.gsc && b.gsc) return 1;
      return (b.gsc?.clicks ?? 0) - (a.gsc?.clicks ?? 0);
    });

  const postsNoKw = (wpCache[selectedClient]?.posts || []).filter(p => !p.focus_keyword).length;

  return (
    <div>
      {/* Client selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {clients.map(c => (
          <button key={c.id} onClick={() => onSelectClient(c.id)}
            style={{ borderRadius: 20, padding: '6px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
              background: selectedClient === c.id ? C.accent : C.bg3,
              color:      selectedClient === c.id ? C.bg1   : C.t3,
              border:     `1px solid ${selectedClient === c.id ? C.accent : C.b2}` }}>
            {c.name}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <div style={{ flex: 1, fontSize: 13, color: C.t2 }}>
          Shows how each post's focus keyword (set in Yoast/RankMath) is performing in Google Search.
          {postsNoKw > 0 && <span style={{ color: C.yellow }}> {postsNoKw} posts have no focus keyword set.</span>}
        </div>
        {!gscData && (
          <button onClick={onFetchGsc} disabled={loadingGsc}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.accent, border: 'none', borderRadius: 7, padding: '8px 14px', color: C.bg1, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
            {loadingGsc ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={12} />}
            {loadingGsc ? 'Fetching…' : 'Load GSC Data'}
          </button>
        )}
      </div>

      {!gscData && (
        <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, background: C.accentBg, border: `1px solid ${C.accentBd}`, fontSize: 12, color: C.t2 }}>
          <Info size={12} style={{ marginRight: 6 }} />
          GSC data not loaded. Click "Load GSC Data" above to cross-reference keyword performance. Post focus keywords still shown below.
        </div>
      )}

      {posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', color: C.t3, fontSize: 13 }}>
          No posts with focus keywords found for {client?.name}.<br />
          <span style={{ fontSize: 12 }}>Set focus keywords in Yoast SEO or RankMath on the WordPress site, then refresh the post cache.</span>
        </div>
      ) : (
        <div style={{ border: `1px solid ${C.b2}`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 80px 100px 70px 80px', padding: '8px 14px', background: C.bg2, borderBottom: `1px solid ${C.b1}` }}>
            {['Post Title', 'Focus Keyword', 'Clicks', 'Impressions', 'CTR', 'Position'].map(h => (
              <div key={h} style={{ fontSize: 11, color: C.t4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
            ))}
          </div>
          {posts.map((post, i) => (
            <div key={post.id} style={{ display: 'grid', gridTemplateColumns: '1fr 160px 80px 100px 70px 80px', padding: '10px 14px', background: i % 2 === 0 ? C.bg3 : C.bg2, borderBottom: `1px solid ${C.b1}`, alignItems: 'center' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, color: C.t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.title}</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                  <span style={{ fontSize: 10, color: C.t4 }}>/{post.slug}</span>
                  {post.link && (
                    <a href={post.link} target="_blank" rel="noreferrer" style={{ color: C.t4 }}><ExternalLink size={10} /></a>
                  )}
                </div>
              </div>
              <div style={{ fontSize: 12, color: C.accent, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {post.focusKeyword}
                {post.seoPlugin && <span style={{ fontSize: 10, color: C.t4, marginLeft: 4 }}>({post.seoPlugin})</span>}
              </div>
              {post.gsc ? (
                <>
                  <div style={{ fontSize: 13, fontWeight: 600, color: post.gsc.clicks > 0 ? C.green : C.t3 }}>{post.gsc.clicks?.toLocaleString() ?? '0'}</div>
                  <div style={{ fontSize: 12, color: C.t2 }}>{post.gsc.impressions?.toLocaleString() ?? '0'}</div>
                  <div style={{ fontSize: 12, color: C.accent }}>{post.gsc.ctr != null ? `${(post.gsc.ctr * 100).toFixed(1)}%` : '—'}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: post.gsc.position <= 3 ? C.green : post.gsc.position <= 10 ? C.accent : C.t3 }}>
                    #{post.gsc.position?.toFixed(1) ?? '—'}
                  </div>
                </>
              ) : (
                <div style={{ gridColumn: 'span 4', fontSize: 11, color: C.t4 }}>
                  {gscData ? 'Keyword not in top GSC queries' : 'Load GSC data to see performance'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Recommended Plugins ───────────────────────────────────────────────────────

const PLUGIN_STATUS_KEY = {
  'Yoast SEO': 'yoast', 'RankMath': 'rankmath', 'Site Kit by Google': 'site-kit',
  'WP Rocket': 'wp-rocket', 'W3 Total Cache': 'w3-total-cache', 'Smush': 'smush',
  'Schema Pro': 'schema-pro', 'Redirection': 'redirection',
  'Broken Link Checker': 'broken-link-checker',
};

function PluginsTab({ expandedCat, onExpandCat, client }) {
  const [pluginsStatus, setPluginsStatus] = useState(null);
  const [loadingPlugins, setLoadingPlugins] = useState(false);

  const handleCheck = async () => {
    if (!client?.vkToken) return;
    setLoadingPlugins(true);
    const status = await fetchPluginsStatus(client);
    setPluginsStatus(status);
    setLoadingPlugins(false);
  };

  const installedCount = pluginsStatus
    ? Object.values(pluginsStatus).filter(Boolean).length
    : null;

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 20 }}>
        <div style={{ flex: 1, background: C.accentBg, border: `1px solid ${C.accentBd}`, borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Info size={15} color={C.accent} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 13, color: C.t2, lineHeight: 1.7 }}>
            Install these on client WordPress sites. <strong style={{ color: C.t1 }}>Yoast SEO or RankMath</strong> is required for focus keyword tracking. <strong style={{ color: C.t1 }}>Site Kit by Google</strong> enables Search Console data via WPSeoHub Connector.
          </div>
        </div>
        {client?.vkToken && (
          <button onClick={handleCheck} disabled={loadingPlugins}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
              background: C.bg3, border: `1px solid ${C.b2}`, color: C.t2, flexShrink: 0, opacity: loadingPlugins ? 0.7 : 1 }}>
            {loadingPlugins
              ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Checking…</>
              : <><Shield size={13} /> {pluginsStatus ? 'Recheck' : 'Check Installed'}</>}
          </button>
        )}
      </div>

      {pluginsStatus && (
        <div style={{ padding: '10px 16px', borderRadius: 8, marginBottom: 16, background: C.bg3, border: `1px solid ${C.b2}`, fontSize: 12, color: C.t3 }}>
          {installedCount} plugins detected active on {client?.name}
        </div>
      )}

      {PLUGINS.map(cat => (
        <div key={cat.cat} style={{ background: C.bg3, border: `1px solid ${C.b2}`, borderRadius: 10, marginBottom: 10, overflow: 'hidden' }}>
          <button onClick={() => onExpandCat(expandedCat === cat.cat ? null : cat.cat)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Package size={14} color={C.accent} />
              <span style={{ fontSize: 14, color: C.t1, fontWeight: 500 }}>{cat.cat}</span>
              <span style={{ fontSize: 11, color: C.t3 }}>({cat.items.length})</span>
              {pluginsStatus && cat.items.some(p => pluginsStatus[PLUGIN_STATUS_KEY[p.name]]) && (
                <span style={{ fontSize: 10, color: C.green, background: C.greenBg, border: `1px solid ${C.greenBd}`, borderRadius: 20, padding: '1px 7px' }}>
                  ✓ {cat.items.filter(p => pluginsStatus[PLUGIN_STATUS_KEY[p.name]]).length} active
                </span>
              )}
            </div>
            {expandedCat === cat.cat ? <ChevronUp size={15} color={C.t3} /> : <ChevronDown size={15} color={C.t3} />}
          </button>
          {expandedCat === cat.cat && (
            <div style={{ borderTop: `1px solid ${C.b1}` }}>
              {cat.items.map((p, i) => {
                const statusKey = PLUGIN_STATUS_KEY[p.name];
                const isActive  = pluginsStatus && statusKey ? pluginsStatus[statusKey] : null;
                return (
                  <div key={p.name} style={{ padding: '14px 18px', borderBottom: i < cat.items.length - 1 ? `1px solid ${C.b1}` : 'none', display: 'flex', gap: 14, alignItems: 'flex-start',
                    background: isActive ? '#16a34a08' : 'transparent' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                        <span style={{ fontSize: 14, color: C.t1, fontWeight: 500 }}>{p.name}</span>
                        {p.rec && <span style={{ fontSize: 10, color: C.accent, background: C.accentBg, border: `1px solid ${C.accentBd}`, borderRadius: 20, padding: '1px 7px' }}>Recommended</span>}
                        {isActive === true  && <span style={{ fontSize: 10, color: C.green,  background: C.greenBg,  border: `1px solid ${C.greenBd}`,  borderRadius: 20, padding: '1px 8px' }}>✓ Active</span>}
                        {isActive === false && <span style={{ fontSize: 10, color: C.t3,     background: C.bg4,      border: `1px solid ${C.b2}`,       borderRadius: 20, padding: '1px 8px' }}>Not installed</span>}
                      </div>
                      <div style={{ fontSize: 13, color: C.t2, lineHeight: 1.6 }}>{p.desc}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, alignItems: 'flex-end' }}>
                      {p.slug ? (
                        <a href={`https://wordpress.org/plugins/${p.slug}/`} target="_blank" rel="noreferrer"
                          style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: C.accent, background: C.accentBg, border: `1px solid ${C.accentBd}`, borderRadius: 7, padding: '6px 12px', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                          <ExternalLink size={11} /> wordpress.org
                        </a>
                      ) : (
                        <span style={{ fontSize: 11, color: C.t3, background: C.bg4, border: `1px solid ${C.b2}`, borderRadius: 7, padding: '6px 10px', whiteSpace: 'nowrap' }}>Premium</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Shared ────────────────────────────────────────────────────────────────────

function Empty() {
  return <div style={{ textAlign: 'center', padding: '56px', color: C.t3, fontSize: 14 }}>Add a client first.</div>;
}

function today() { return new Date().toISOString().split('T')[0]; }

const inputStyle = {
  flex: 1, background: C.bg2, border: `1px solid ${C.b2}`, borderRadius: 7,
  padding: '9px 12px', color: C.t1, fontSize: 13, outline: 'none', fontFamily: 'inherit',
};
