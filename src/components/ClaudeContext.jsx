import { useState, useEffect, useCallback } from 'react';
import { Copy, CheckCircle, Brain, BookOpen, Target, RefreshCw, Key, TrendingUp } from 'lucide-react';
import { getLocalPosts, getClientProfiles, getWpCache, getTrackedKeywords } from '../store/store';
import { C } from '../theme';

export default function ClaudeContext({ clients }) {
  const [selectedClient, setSelectedClient] = useState(clients[0]?.id || null);
  const [copied, setCopied]                 = useState(false);
  const [includeLastN, setIncludeLastN]     = useState(10);
  const [loading, setLoading]               = useState(false);

  // All data sources
  const [localPosts, setLocalPosts]   = useState({});
  const [wpCache, setWpCache]         = useState({});
  const [profiles, setProfiles]       = useState({});
  const [keywords, setKeywords]       = useState({});

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [lp, wpc, prof, kw] = await Promise.all([
        getLocalPosts().catch(() => ({})),
        getWpCache().catch(() => ({})),
        getClientProfiles().catch(() => ({})),
        getTrackedKeywords().catch(() => ({})),
      ]);
      setLocalPosts(lp);
      setWpCache(wpc);
      setProfiles(prof);
      setKeywords(kw);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const client  = clients.find(c => c.id === selectedClient);
  const profile = profiles[selectedClient] || null;

  // WP cache posts (primary source — richest data)
  const cacheData  = wpCache[selectedClient] || {};
  const wpPosts    = [...(cacheData.posts || []), ...(cacheData.pages || [])]
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, includeLastN);

  // Local hub posts (fallback / drafts)
  const localClientPosts = (localPosts[selectedClient] || [])
    .filter(p => p.wpPostId || p.title)
    .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt))
    .slice(0, includeLastN);

  const postsToUse = wpPosts.length > 0 ? wpPosts : localClientPosts;

  // Tracked keywords with positions
  const clientKeywords = (keywords[selectedClient] || [])
    .sort((a, b) => (a.position || 999) - (b.position || 999))
    .slice(0, 40);

  const cacheAge = cacheData.cachedAt
    ? Math.round((Date.now() - new Date(cacheData.cachedAt)) / 60000)
    : null;

  const context = client
    ? buildContext(client, postsToUse, clientKeywords, profile, localClientPosts)
    : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(context);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontFamily: C.fontSerif, color: C.t1 }}>Claude Context</h2>
        <p style={{ margin: '4px 0 0', color: C.t3, fontSize: 13 }}>
          Copy this auto-built context and paste into Claude — includes AI profile, published posts, and tracked keywords
        </p>
      </div>

      {clients.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', color: C.t3, fontSize: 13 }}>Add clients first.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20 }}>

          {/* ── Left panel ── */}
          <div>
            <div style={{ fontSize: 11, color: C.t3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Clients</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {clients.map(c => (
                <button key={c.id} onClick={() => setSelectedClient(c.id)}
                  style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                    background: selectedClient === c.id ? C.accentBg : C.bg3,
                    border:     `1px solid ${selectedClient === c.id ? C.accentBd : C.b2}`,
                    color:      selectedClient === c.id ? C.accent : C.t3, fontSize: 13 }}>
                  {c.name}
                  {c.industry && <div style={{ fontSize: 11, color: C.t4, marginTop: 2 }}>{c.industry}</div>}
                  {/* Profile indicator */}
                  {profiles[c.id] && (
                    <div style={{ fontSize: 10, color: C.green, marginTop: 3 }}>✓ AI profile ready</div>
                  )}
                </button>
              ))}
            </div>

            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 11, color: C.t3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Posts to include</div>
              <select value={includeLastN} onChange={e => setIncludeLastN(+e.target.value)}
                style={{ width: '100%', background: C.bg3, border: `1px solid ${C.b2}`, borderRadius: 7, padding: '8px 10px', color: C.t2, fontSize: 13, outline: 'none' }}>
                {[5, 10, 15, 20, 30, 50].map(n => <option key={n} value={n}>Last {n} posts</option>)}
              </select>
            </div>

            {/* Data freshness */}
            {cacheAge !== null && (
              <div style={{ marginTop: 12, padding: '10px 12px', background: C.bg3, border: `1px solid ${C.b2}`, borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: C.t4 }}>
                  WP cache: {cacheAge < 60 ? `${cacheAge}m ago` : `${Math.round(cacheAge / 60)}h ago`}
                </div>
                <div style={{ fontSize: 11, color: C.t4, marginTop: 3 }}>
                  {wpPosts.length} posts · {clientKeywords.length} keywords
                </div>
              </div>
            )}

            {/* Refresh */}
            <button onClick={loadAll} disabled={loading}
              style={{ marginTop: 12, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', borderRadius: 7, cursor: loading ? 'wait' : 'pointer', fontFamily: 'inherit', fontSize: 12,
                background: 'transparent', border: `1px solid ${C.b2}`, color: C.t3 }}>
              <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              {loading ? 'Refreshing…' : 'Refresh data'}
            </button>

            {/* How to use */}
            <div style={{ marginTop: 20, padding: '14px', background: C.bg3, border: `1px solid ${C.b2}`, borderRadius: 10 }}>
              <div style={{ fontSize: 12, color: C.t2, fontWeight: 500, marginBottom: 8 }}>How to use</div>
              <ol style={{ margin: 0, padding: '0 0 0 16px', color: C.t3, fontSize: 12, lineHeight: 1.8 }}>
                <li>Generate AI profile in SEO Performance → AI Profile</li>
                <li>Sync WP posts from Post Dashboard</li>
                <li>Add tracked keywords in Search & Keywords</li>
                <li>Click "Copy Context" and paste into Claude</li>
              </ol>
              <div style={{ marginTop: 10, fontSize: 11, color: C.t4, lineHeight: 1.6 }}>
                Context auto-updates whenever profile, posts, or keywords change — no manual editing needed.
              </div>
            </div>
          </div>

          {/* ── Right panel ── */}
          <div>
            {client && (
              <>
                {/* Stat cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
                  <StatCard icon={<Key size={14} />}        label="AI Profile"  value={profile ? 'Ready' : 'Not set'} valueColor={profile ? C.green : C.t4} />
                  <StatCard icon={<Brain size={14} />}      label="WP Posts"    value={wpPosts.length || localClientPosts.length} />
                  <StatCard icon={<TrendingUp size={14} />} label="Keywords"    value={clientKeywords.length} />
                  <StatCard icon={<BookOpen size={14} />}   label="Industry"    value={client.industry || '—'} />
                </div>

                {/* Profile status banner */}
                {!profile && (
                  <div style={{ marginBottom: 14, padding: '10px 14px', background: C.bg3, border: `1px solid ${C.b2}`, borderRadius: 8, fontSize: 12, color: C.t3 }}>
                    No AI profile yet for this client. Go to <strong>SEO Performance → AI Profile</strong> to generate one — it significantly enriches the context.
                  </div>
                )}

                {/* Copy header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: C.t2, fontWeight: 500 }}>Context prompt — paste directly into Claude</span>
                  <button onClick={handleCopy}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
                      background: copied ? C.greenBg : C.accent,
                      border:     `1px solid ${copied ? C.greenBd : C.accent}`,
                      color:      copied ? C.green : C.bg1, fontWeight: 500 }}>
                    {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
                    {copied ? 'Copied!' : 'Copy Context'}
                  </button>
                </div>

                <pre style={{ background: C.bg2, border: `1px solid ${C.b2}`, borderRadius: 10, padding: 20, color: '#7a9a6a', fontSize: 12.5, fontFamily: 'monospace', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 540, overflowY: 'auto', margin: 0 }}>
                  {context}
                </pre>

                <div style={{ marginTop: 10, display: 'flex', gap: 16, fontSize: 12, color: C.t4, flexWrap: 'wrap' }}>
                  <span>{context.length.toLocaleString()} characters</span>
                  <span>·</span>
                  <span>{postsToUse.length} posts included</span>
                  <span>·</span>
                  <span>{clientKeywords.length} keywords included</span>
                  {profile && <><span>·</span><span style={{ color: C.green }}>✓ AI profile included</span></>}
                </div>
              </>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, valueColor }) {
  return (
    <div style={{ background: C.bg3, border: `1px solid ${C.b2}`, borderRadius: 9, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: C.t3, marginBottom: 6 }}>
        {icon} <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      </div>
      <div style={{ fontSize: 16, color: valueColor || C.t1, fontWeight: 500 }}>{value}</div>
    </div>
  );
}

function buildContext(client, wpPosts, keywords, profile, localDrafts) {
  const lines = [];

  lines.push(`=== CONTEXT FOR CLAUDE: ${client.name.toUpperCase()} ===`);
  lines.push('');
  lines.push('COMPANY OVERVIEW');
  lines.push('----------------');
  lines.push(`Company: ${client.name}`);
  lines.push(`Website: ${client.siteUrl}`);
  lines.push(`Industry: ${client.industry || 'Not specified'}`);
  lines.push(`Publishing frequency: ${client.weeklyFrequency} posts per week`);
  if (client.description) {
    lines.push('');
    lines.push('COMPANY DESCRIPTION');
    lines.push('-------------------');
    lines.push(client.description);
  }

  // AI Profile (most authoritative — put it early)
  if (profile?.content) {
    lines.push('');
    lines.push('AI-GENERATED CLIENT PROFILE');
    lines.push('---------------------------');
    lines.push(profile.content);
    if (profile.generatedAt) {
      lines.push(`[Profile generated: ${new Date(profile.generatedAt).toLocaleDateString('en-IN')}]`);
    }
  }

  // Published posts from WP
  lines.push('');
  lines.push('PUBLISHED POSTS ON WEBSITE');
  lines.push('--------------------------');
  if (wpPosts.length > 0) {
    wpPosts.forEach((p, i) => {
      const title = p.title?.rendered?.replace(/<[^>]*>/g, '') || p.title || '(no title)';
      const kw    = p.focus_keyword ? ` [keyword: ${p.focus_keyword}]` : '';
      const date  = p.date ? new Date(p.date).toLocaleDateString('en-IN') : '';
      const slug  = p.slug ? ` /${p.slug}` : '';
      lines.push(`  ${i + 1}. "${title}"${kw}${date ? ` — ${date}` : ''}${slug}`);
    });
  } else {
    lines.push('  (No WordPress posts cached yet — sync from Post Dashboard)');
  }

  // Local drafts not yet pushed
  const pendingDrafts = (localDrafts || []).filter(p => !p.wpPostId).slice(0, 5);
  if (pendingDrafts.length > 0) {
    lines.push('');
    lines.push('DRAFTS IN HUB (not yet published)');
    lines.push('-----------------------------------');
    pendingDrafts.forEach((p, i) => {
      const kw = p.focusKeyword ? ` [keyword: ${p.focusKeyword}]` : '';
      lines.push(`  ${i + 1}. "${p.title || 'Untitled'}"${kw}`);
    });
  }

  // Tracked keywords with positions
  if (keywords.length > 0) {
    lines.push('');
    lines.push('TRACKED KEYWORDS & RANKINGS');
    lines.push('----------------------------');
    const ranked   = keywords.filter(k => k.position).sort((a, b) => a.position - b.position);
    const unranked = keywords.filter(k => !k.position);

    if (ranked.length > 0) {
      lines.push('Currently ranking:');
      ranked.slice(0, 20).forEach(k => {
        const pos = `#${k.position}`;
        const vol = k.volume ? ` (vol: ${k.volume})` : '';
        lines.push(`  ${pos.padEnd(5)} ${k.keyword}${vol}`);
      });
    }
    if (unranked.length > 0) {
      lines.push('Targeting (not yet ranked / tracking):');
      unranked.slice(0, 15).forEach(k => {
        const vol = k.volume ? ` (vol: ${k.volume})` : '';
        lines.push(`  • ${k.keyword}${vol}`);
      });
    }
  }

  lines.push('');
  lines.push('CONTENT RULES');
  lines.push('-------------');
  lines.push('- Do NOT repeat any topic or keyword already covered in the posts above');
  lines.push(`- Match the tone: professional, informative, suited to ${client.industry || 'the industry'}`);
  lines.push('- All content must be SEO-optimised with a clear focus keyword');
  lines.push('- Include H2 and H3 headings for structure');
  lines.push('- Target 800–1200 words unless specified otherwise');
  lines.push('- Write for an Indian audience unless specified otherwise');
  lines.push('- End with a clear CTA relevant to the business');

  lines.push('');
  lines.push('WHEN WRITING A NEW POST');
  lines.push('-----------------------');
  lines.push('1. Confirm the focus keyword first');
  lines.push('2. Check it does not overlap with the posts above');
  lines.push('3. Suggest a URL slug');
  lines.push('4. Write a meta title (50–60 chars) and meta description (150–160 chars)');
  lines.push('5. Then write the full post content in HTML format');

  lines.push('');
  lines.push('=== END CONTEXT ===');

  return lines.join('\n');
}
