import { useState, useEffect, useCallback } from 'react';
import {
  Search, CheckCircle, ExternalLink, RefreshCw,
  Upload, Globe, Loader, Sparkles, ChevronDown, ChevronUp,
} from 'lucide-react';
import {
  getGoogleStatus, getGoogleAuthUrl, revokeGoogle, getGoogleSites,
  submitUrlsForIndexing, submitSitemap, inspectUrl, getIndexingLog, getAiFix,
  getWpCache,
} from '../store/store';
import { C } from '../theme';

const STATUS_COLOR = {
  PASS:    C.green,  PARTIAL: C.yellow, FAIL: C.red,
  NEUTRAL: C.t3,     UNKNOWN: C.t4,
};
const STATUS_BG = {
  PASS:    C.greenBg,  PARTIAL: C.yellowBg, FAIL: C.redBg,
  NEUTRAL: C.bg3,      UNKNOWN: C.bg3,
};

export default function GoogleIndexing({ clients }) {
  const [googleStatus, setGoogleStatus] = useState(null);
  const [authLoading, setAuthLoading]   = useState(false);
  const [googleSites, setGoogleSites]   = useState([]);
  const [indexingLog, setIndexingLog]   = useState([]);
  const [selectedClient, setSelectedClient] = useState(clients[0]?.id || null);
  const [wpCache, setWpCache]           = useState({});

  const loadStatus = useCallback(async () => {
    const s = await getGoogleStatus();
    setGoogleStatus(s);
    if (s.connected) {
      getGoogleSites().then(setGoogleSites).catch(() => {});
      getIndexingLog().then(setIndexingLog).catch(() => {});
      getWpCache().then(setWpCache).catch(() => {});
    }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const handleConnect = async () => {
    setAuthLoading(true);
    try {
      const { url } = await getGoogleAuthUrl();
      const win = window.open(url, '_blank', 'width=550,height=650');
      // Poll for completion
      const poll = setInterval(async () => {
        if (win?.closed) {
          clearInterval(poll);
          await loadStatus();
          setAuthLoading(false);
        }
      }, 1000);
    } catch (e) {
      alert(e.message);
      setAuthLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect Google account? You can reconnect anytime.')) return;
    await revokeGoogle();
    setGoogleStatus({ connected: false });
    setGoogleSites([]);
  };

  const client = clients.find(c => c.id === selectedClient);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontFamily: C.fontSerif, color: C.t1 }}>Google Search</h2>
        <p style={{ margin: '4px 0 0', color: C.t3, fontSize: 13 }}>
          Submit pages for indexing, inspect URL status, and auto-fix crawl issues with AI — using your Google account
        </p>
      </div>

      {/* ── Connection card ── */}
      <ConnectCard
        status={googleStatus}
        authLoading={authLoading}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        onRefresh={loadStatus}
      />

      {googleStatus?.connected && (
        <>
          {/* ── Site matcher ── */}
          {googleSites.length > 0 && (
            <SiteMatcher clients={clients} googleSites={googleSites} />
          )}

          {/* ── Client selector ── */}
          {clients.length > 0 && (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                {clients.map(c => (
                  <button key={c.id} onClick={() => setSelectedClient(c.id)}
                    style={{ borderRadius: 20, padding: '6px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                      background: selectedClient === c.id ? C.accent : C.bg3,
                      color:      selectedClient === c.id ? C.bg1   : C.t3,
                      border:     `1px solid ${selectedClient === c.id ? C.accent : C.b2}` }}>
                    {c.name}
                  </button>
                ))}
              </div>

              {client && (
                <ClientIndexingPanel
                  client={client}
                  googleSites={googleSites}
                  wpCache={wpCache}
                  onDone={loadStatus}
                />
              )}
            </>
          )}

          {/* ── Indexing log ── */}
          {indexingLog.length > 0 && (
            <IndexingLog log={indexingLog} />
          )}
        </>
      )}
    </div>
  );
}

// ── Connection card ────────────────────────────────────────────────────────────

function ConnectCard({ status, authLoading, onConnect, onDisconnect, onRefresh }) {
  if (!status) {
    return (
      <div style={{ background: C.bg3, border: `1px solid ${C.b2}`, borderRadius: 10, padding: 20, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Loader size={14} style={{ animation: 'spin 1s linear infinite', color: C.t3 }} />
        <span style={{ fontSize: 13, color: C.t3 }}>Checking Google connection…</span>
      </div>
    );
  }

  if (!status.connected) {
    return (
      <div style={{ background: C.bg3, border: `1px solid ${C.b2}`, borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
          <div>
            <div style={{ fontSize: 15, color: C.t1, fontWeight: 500, marginBottom: 8 }}>Connect Your Google Account</div>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: C.t3, lineHeight: 1.7 }}>
              Your Google account has Search Console access for all your clients. Connect once and manage indexing for every site from here.
            </p>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: C.t4, marginBottom: 6 }}>Permissions requested:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[
                  'Google Search Console — read site data & sitemaps',
                  'Google Indexing API — submit URLs for fast indexing',
                ].map(p => (
                  <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: C.t3 }}>
                    <CheckCircle size={11} style={{ color: C.green, flexShrink: 0 }} /> {p}
                  </div>
                ))}
              </div>
            </div>
            <button onClick={onConnect} disabled={authLoading}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 8, cursor: authLoading ? 'wait' : 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, background: C.accent, border: 'none', color: C.bg1 }}>
              {authLoading ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Waiting for authorization…</> : <><Globe size={14} /> Connect Google Account</>}
            </button>
          </div>

          <div style={{ background: C.bg2, border: `1px solid ${C.b1}`, borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 12, color: C.t2, fontWeight: 500, marginBottom: 10 }}>Setup required (one-time)</div>
            <ol style={{ margin: 0, padding: '0 0 0 16px', color: C.t3, fontSize: 11, lineHeight: 2 }}>
              <li>Go to Google Cloud Console → Create project</li>
              <li>Enable Search Console API + Indexing API</li>
              <li>OAuth 2.0 → Create credentials (Desktop App)</li>
              <li>Add redirect URI: <code style={{ color: C.accent, fontSize: 10 }}>http://localhost:3001/api/google/callback</code></li>
              <li>Add to <code style={{ color: C.accent, fontSize: 10 }}>.env</code>:<br /><code style={{ color: '#7a9a6a', fontSize: 10 }}>GOOGLE_CLIENT_ID=…<br />GOOGLE_CLIENT_SECRET=…</code></li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: C.greenBg, border: `1px solid ${C.greenBd}`, borderRadius: 10, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
      <CheckCircle size={16} style={{ color: C.green, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: 13, color: C.green, fontWeight: 500 }}>
          Google Connected{status.email ? ` — ${status.email}` : ''}
        </span>
        {status.connectedAt && (
          <span style={{ fontSize: 11, color: C.t4, marginLeft: 12 }}>
            since {new Date(status.connectedAt).toLocaleDateString('en-IN')}
          </span>
        )}
      </div>
      <button onClick={onRefresh} style={{ background: 'none', border: 'none', color: C.t3, cursor: 'pointer', padding: 4 }}>
        <RefreshCw size={13} />
      </button>
      <button onClick={onDisconnect}
        style={{ fontSize: 12, color: C.red, background: 'none', border: `1px solid ${C.redBd}`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>
        Disconnect
      </button>
    </div>
  );
}

// ── Site matcher ───────────────────────────────────────────────────────────────

function SiteMatcher({ clients, googleSites }) {
  const [show, setShow] = useState(false);

  const matched = clients.map(c => {
    const url = c.siteUrl?.replace(/\/$/, '').replace(/^https?:\/\//, '');
    const site = googleSites.find(s => {
      const su = (s.siteUrl || '').replace(/\/$/, '').replace(/^(https?:\/\/|sc-domain:)/, '');
      return su === url || su.endsWith(url) || url.endsWith(su);
    });
    return { client: c, site: site || null };
  });

  return (
    <div style={{ background: C.bg3, border: `1px solid ${C.b2}`, borderRadius: 10, marginBottom: 20 }}>
      <button onClick={() => setShow(!show)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
        <span style={{ fontSize: 13, color: C.t2, fontWeight: 500 }}>
          GSC Site Matcher — {googleSites.length} sites in your account
        </span>
        {show ? <ChevronUp size={14} style={{ color: C.t3 }} /> : <ChevronDown size={14} style={{ color: C.t3 }} />}
      </button>

      {show && (
        <div style={{ borderTop: `1px solid ${C.b2}`, padding: '0 16px 16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px 12px', marginTop: 14 }}>
            <div style={{ fontSize: 11, color: C.t4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Hub Client</div>
            <div style={{ fontSize: 11, color: C.t4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>GSC Property</div>
            <div style={{ fontSize: 11, color: C.t4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</div>
            {matched.map(({ client, site }) => (
              <>
                <div key={`c-${client.id}`} style={{ fontSize: 13, color: C.t2, padding: '6px 0', borderTop: `1px solid ${C.b1}` }}>{client.name}</div>
                <div key={`s-${client.id}`} style={{ fontSize: 12, color: C.t3, padding: '6px 0', borderTop: `1px solid ${C.b1}` }}>{site?.siteUrl || '—'}</div>
                <div key={`st-${client.id}`} style={{ padding: '6px 0', borderTop: `1px solid ${C.b1}` }}>
                  {site
                    ? <span style={{ fontSize: 11, color: C.green, background: C.greenBg, border: `1px solid ${C.greenBd}`, borderRadius: 20, padding: '2px 8px' }}>Matched</span>
                    : <span style={{ fontSize: 11, color: C.t4, background: C.bg2, border: `1px solid ${C.b2}`, borderRadius: 20, padding: '2px 8px' }}>Not found</span>
                  }
                </div>
              </>
            ))}
          </div>
          {googleSites.length > matched.length && (
            <div style={{ marginTop: 12, fontSize: 12, color: C.t4 }}>
              +{googleSites.length - matched.length} other sites in GSC not matched to hub clients
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Per-client indexing panel ─────────────────────────────────────────────────

function ClientIndexingPanel({ client, googleSites, wpCache, onDone }) {
  const [submitting, setSubmitting]   = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [sitemapUrl, setSitemapUrl]   = useState('');
  const [sitemapMsg, setSitemapMsg]   = useState(null);
  const [inspectInput, setInspectInput] = useState('');
  const [inspecting, setInspecting]   = useState(false);
  const [inspection, setInspection]   = useState(null);
  const [inspectError, setInspectError] = useState(null);
  const [aiFixLoading, setAiFixLoading] = useState(false);
  const [aiFix, setAiFix]             = useState(null);

  const cacheData = wpCache[client.id] || {};
  const posts     = [...(cacheData.posts || []), ...(cacheData.pages || [])];
  const urls      = posts.map(p => p.link).filter(Boolean);

  // Match GSC site
  const siteBase = client.siteUrl?.replace(/\/$/, '').replace(/^https?:\/\//, '');
  const gscSite  = googleSites.find(s => {
    const su = (s.siteUrl || '').replace(/\/$/, '').replace(/^(https?:\/\/|sc-domain:)/, '');
    return su === siteBase || su.endsWith(siteBase) || siteBase?.endsWith(su);
  });

  const handleSubmitAll = async () => {
    if (!urls.length) return alert('No posts in cache for this client. Sync WP posts from Post Dashboard first.');
    if (!window.confirm(`Submit ${urls.length} URLs to Google Indexing API? This counts against your daily quota (200 requests/day).`)) return;
    setSubmitting(true);
    setSubmitResult(null);
    setSubmitError(null);
    try {
      const result = await submitUrlsForIndexing(urls);
      setSubmitResult(result);
      onDone();
    } catch (e) {
      setSubmitError(e.message);
    }
    setSubmitting(false);
  };

  const handleSitemap = async () => {
    const feedpath = sitemapUrl || `${client.siteUrl?.replace(/\/$/, '')}/sitemap.xml`;
    const siteUrl  = gscSite?.siteUrl || client.siteUrl;
    try {
      await submitSitemap(siteUrl, feedpath);
      setSitemapMsg(`Sitemap submitted: ${feedpath}`);
    } catch (e) {
      setSitemapMsg(`Error: ${e.message}`);
    }
  };

  const handleInspect = async () => {
    if (!inspectInput) return;
    const siteUrl = gscSite?.siteUrl || client.siteUrl;
    setInspecting(true);
    setInspection(null);
    setInspectError(null);
    setAiFix(null);
    try {
      const r = await inspectUrl(inspectInput, siteUrl);
      setInspection(r);
    } catch (e) {
      setInspectError(e.message);
    }
    setInspecting(false);
  };

  const handleAiFix = async () => {
    if (!inspection) return;
    setAiFixLoading(true);
    setAiFix(null);
    try {
      const r = await getAiFix(inspectInput, inspection, client.id);
      setAiFix(r.fix);
    } catch (e) {
      setAiFix(`Error: ${e.message}`);
    }
    setAiFixLoading(false);
  };

  const ir = inspection?.inspectionResult;
  const verdict = ir?.indexStatusResult?.verdict;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>

      {/* Submit All Posts */}
      <div style={{ background: C.bg3, border: `1px solid ${C.b2}`, borderRadius: 10, padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Upload size={15} style={{ color: C.accent }} />
          <span style={{ fontSize: 14, color: C.t1, fontWeight: 500 }}>Submit All Posts to Google</span>
        </div>
        <p style={{ margin: '0 0 14px', fontSize: 12, color: C.t3, lineHeight: 1.6 }}>
          Sends all {urls.length} cached pages to Google Indexing API — Google will crawl and index them faster than waiting for Googlebot.
        </p>
        {!gscSite && (
          <div style={{ marginBottom: 10, padding: '8px 10px', background: C.yellowBg, border: `1px solid ${C.yellowBd}`, borderRadius: 6, fontSize: 11, color: C.yellow }}>
            GSC property not matched for this client. Submission may still work but verify ownership in Google Search Console.
          </div>
        )}
        <button onClick={handleSubmitAll} disabled={submitting || !urls.length}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 7, cursor: (submitting || !urls.length) ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
            background: C.accent, border: 'none', color: C.bg1, opacity: !urls.length ? 0.4 : 1 }}>
          {submitting ? <><Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> Submitting…</> : <><Upload size={13} /> Submit {urls.length} URLs</>}
        </button>

        {submitResult && (
          <div style={{ marginTop: 12, padding: '10px 12px', background: C.greenBg, border: `1px solid ${C.greenBd}`, borderRadius: 7, fontSize: 12, color: C.green }}>
            ✓ {submitResult.succeeded}/{submitResult.total} URLs submitted successfully
            {submitResult.results?.filter(r => r.status === 'error').length > 0 && (
              <div style={{ color: C.yellow, marginTop: 4 }}>
                {submitResult.results.filter(r => r.status === 'error').length} failed — check API quota or ownership
              </div>
            )}
          </div>
        )}
        {submitError && (
          <div style={{ marginTop: 10, fontSize: 12, color: C.red }}>{submitError}</div>
        )}
      </div>

      {/* Submit Sitemap */}
      <div style={{ background: C.bg3, border: `1px solid ${C.b2}`, borderRadius: 10, padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Globe size={15} style={{ color: C.accent }} />
          <span style={{ fontSize: 14, color: C.t1, fontWeight: 500 }}>Submit Sitemap</span>
        </div>
        <p style={{ margin: '0 0 12px', fontSize: 12, color: C.t3, lineHeight: 1.6 }}>
          Tell Google about your sitemap so it can discover all pages. WordPress usually generates one at <code style={{ fontSize: 11 }}>/sitemap.xml</code>.
        </p>
        <input
          value={sitemapUrl}
          onChange={e => setSitemapUrl(e.target.value)}
          placeholder={`${client.siteUrl?.replace(/\/$/, '')}/sitemap.xml`}
          style={{ width: '100%', background: C.bg2, border: `1px solid ${C.b2}`, borderRadius: 6, padding: '8px 10px', color: C.t2, fontSize: 12, outline: 'none', marginBottom: 10, boxSizing: 'border-box' }}
        />
        <button onClick={handleSitemap}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, background: C.bg2, border: `1px solid ${C.b2}`, color: C.t2 }}>
          <Upload size={12} /> Submit Sitemap
        </button>
        {sitemapMsg && (
          <div style={{ marginTop: 10, fontSize: 12, color: sitemapMsg.startsWith('Error') ? C.red : C.green }}>
            {sitemapMsg}
          </div>
        )}
      </div>

      {/* URL Inspector */}
      <div style={{ background: C.bg3, border: `1px solid ${C.b2}`, borderRadius: 10, padding: 18, gridColumn: '1 / -1' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Search size={15} style={{ color: C.accent }} />
          <span style={{ fontSize: 14, color: C.t1, fontWeight: 500 }}>URL Inspection + AI Fix</span>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input
            value={inspectInput}
            onChange={e => setInspectInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleInspect()}
            placeholder={`${client.siteUrl?.replace(/\/$/, '')}/your-post-slug/`}
            style={{ flex: 1, background: C.bg2, border: `1px solid ${C.b2}`, borderRadius: 6, padding: '8px 12px', color: C.t2, fontSize: 13, outline: 'none' }}
          />
          <button onClick={handleInspect} disabled={inspecting || !inspectInput}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 7, cursor: (inspecting || !inspectInput) ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: 13, background: C.accent, border: 'none', color: C.bg1 }}>
            {inspecting ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={13} />}
            Inspect
          </button>
        </div>

        {inspectError && (
          <div style={{ padding: '10px 12px', background: C.redBg, border: `1px solid ${C.redBd}`, borderRadius: 7, fontSize: 12, color: C.red, marginBottom: 12 }}>
            {inspectError}
          </div>
        )}

        {ir && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
            <InspectField label="Verdict"       value={verdict}                             highlight={verdict} />
            <InspectField label="Coverage"      value={ir.indexStatusResult?.coverageState} />
            <InspectField label="Robots.txt"    value={ir.indexStatusResult?.robotsTxtState} />
            <InspectField label="Indexing"      value={ir.indexStatusResult?.indexingState} />
            <InspectField label="Page fetch"    value={ir.indexStatusResult?.pageFetchState} />
            <InspectField label="Last crawled"  value={ir.indexStatusResult?.lastCrawlTime
              ? new Date(ir.indexStatusResult.lastCrawlTime).toLocaleDateString('en-IN')
              : 'Never'} />
          </div>
        )}

        {ir && verdict && verdict !== 'PASS' && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <button onClick={handleAiFix} disabled={aiFixLoading}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 7, cursor: aiFixLoading ? 'wait' : 'pointer', fontFamily: 'inherit', fontSize: 12,
                background: C.purpleBg, border: `1px solid ${C.purpleBd}`, color: C.purple }}>
              {aiFixLoading ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={12} />}
              Get AI Fix
            </button>
            <a href={`https://search.google.com/search-console/inspect?resource_id=${encodeURIComponent(gscSite?.siteUrl || client.siteUrl)}&id=${encodeURIComponent(inspectInput)}`}
              target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 7, fontSize: 12, color: C.t3, border: `1px solid ${C.b2}`, background: C.bg2, textDecoration: 'none' }}>
              <ExternalLink size={12} /> View in GSC
            </a>
          </div>
        )}

        {aiFix && (
          <div style={{ background: C.bg2, border: `1px solid ${C.purpleBd}`, borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 12, color: C.purple, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={12} /> AI Fix Suggestions
            </div>
            <pre style={{ margin: 0, fontSize: 12.5, color: C.t2, lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
              {aiFix}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

function InspectField({ label, value, highlight }) {
  const vl = (value || 'UNKNOWN').toUpperCase();
  const col = highlight ? (STATUS_COLOR[vl] || C.t2) : C.t2;
  const bg  = highlight ? (STATUS_BG[vl] || C.bg2) : C.bg2;
  return (
    <div style={{ background: bg, border: `1px solid ${C.b2}`, borderRadius: 7, padding: '10px 12px' }}>
      <div style={{ fontSize: 10, color: C.t4, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 12, color: col, fontWeight: highlight ? 600 : 400 }}>{value || '—'}</div>
    </div>
  );
}

// ── Indexing log ───────────────────────────────────────────────────────────────

function IndexingLog({ log }) {
  const [show, setShow] = useState(false);

  return (
    <div style={{ background: C.bg3, border: `1px solid ${C.b2}`, borderRadius: 10 }}>
      <button onClick={() => setShow(!show)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
        <span style={{ fontSize: 13, color: C.t2, fontWeight: 500 }}>Indexing Submission History — {log.length} runs</span>
        {show ? <ChevronUp size={14} style={{ color: C.t3 }} /> : <ChevronDown size={14} style={{ color: C.t3 }} />}
      </button>

      {show && (
        <div style={{ borderTop: `1px solid ${C.b2}`, padding: '0 16px 16px' }}>
          {log.slice(0, 10).map(entry => (
            <div key={entry.id} style={{ marginTop: 12, padding: '12px', background: C.bg2, borderRadius: 8, border: `1px solid ${C.b1}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: C.t2 }}>
                  {new Date(entry.submittedAt).toLocaleString('en-IN')} · {entry.type}
                </span>
                <span style={{ fontSize: 12, color: entry.succeeded === entry.total ? C.green : C.yellow }}>
                  {entry.succeeded}/{entry.total} submitted
                </span>
              </div>
              {entry.results?.filter(r => r.status === 'error').slice(0, 3).map((r, i) => (
                <div key={i} style={{ fontSize: 11, color: C.red, marginTop: 2 }}>
                  ✗ {r.url} — {r.error}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
