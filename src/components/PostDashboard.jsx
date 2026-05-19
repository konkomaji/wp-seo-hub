import { useState, useEffect } from 'react';
import { RefreshCw, ExternalLink, FileText, CheckCircle2, AlertCircle, BarChart2 } from 'lucide-react';
import { getLocalPosts, getWpCache, saveWpCache, logError } from '../store/store';
import { fetchWpPosts } from '../utils/wpApi';
import { format, formatDistanceToNow, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { C } from '../theme';

export default function PostDashboard({ clients, onCompose }) {
  const [selectedClient, setSelectedClient] = useState('all');
  const [wpPosts, setWpPosts]               = useState({});
  const [loading, setLoading]               = useState({});
  const [errors, setErrors]                 = useState({});
  const [localPosts, setLocalPosts]         = useState({});
  const [tab, setTab]                       = useState('tracker');

  useEffect(() => {
    getLocalPosts().then(setLocalPosts).catch(() => {});
    getWpCache().then(cache => {
      const seeded = {};
      clients.forEach(c => {
        if (cache[c.id]) seeded[c.id] = { posts: cache[c.id].posts, total: cache[c.id].total, cachedAt: cache[c.id].cachedAt };
      });
      if (Object.keys(seeded).length) setWpPosts(seeded);
    }).catch(() => {});
  }, []);

  const fetchForClient = async (client) => {
    setLoading(l => ({ ...l, [client.id]: true }));
    setErrors(e => ({ ...e, [client.id]: null }));
    try {
      const { posts, total } = await fetchWpPosts(client, 1, 30);
      const updated = { posts, total, cachedAt: new Date().toISOString() };
      setWpPosts(p => ({ ...p, [client.id]: updated }));
      await saveWpCache(client.id, { posts, total });
    } catch (e) {
      setErrors(err => ({ ...err, [client.id]: e.message }));
      logError('Post Dashboard', 'Fetch Posts', e, { clientId: client.id, clientName: client.name });
    }
    setLoading(l => ({ ...l, [client.id]: false }));
  };

  const fetchAll = () => clients.forEach(fetchForClient);

  const displayClients = selectedClient === 'all' ? clients : clients.filter(c => c.id === selectedClient);

  const allLocalPosts = Object.entries(localPosts).flatMap(([cid, posts]) =>
    posts.map(p => ({ ...p, _clientName: clients.find(c => c.id === cid)?.name || cid }))
  ).sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

  const filteredLocalPosts = selectedClient === 'all'
    ? allLocalPosts
    : (localPosts[selectedClient] || []).map(p => ({ ...p, _clientName: clients.find(c => c.id === selectedClient)?.name }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontFamily: C.fontSerif, color: C.t1 }}>Post Dashboard</h2>
          <p style={{ margin: '4px 0 0', color: C.t3, fontSize: 13 }}>All posts across connected sites</p>
        </div>
        <button onClick={fetchAll} style={btnStyle}>
          <RefreshCw size={14} /> Refresh All
        </button>
      </div>

      {/* View tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: `1px solid ${C.b2}` }}>
        {[
          { id: 'tracker', label: 'Post Tracker' },
          { id: 'live',    label: 'Live on WordPress' },
          { id: 'local',   label: 'Local Drafts' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', marginBottom: -1,
              color: tab === t.id ? C.accent : C.t3,
              borderBottom: `2px solid ${tab === t.id ? C.accent : 'transparent'}` }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Client filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[{ id: 'all', name: 'All Clients' }, ...clients].map(c => (
          <button key={c.id} onClick={() => setSelectedClient(c.id)}
            style={{ borderRadius: 20, padding: '6px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
              background: selectedClient === c.id ? C.accent : C.bg3,
              color:      selectedClient === c.id ? C.bg1   : C.t3,
              border:     `1px solid ${selectedClient === c.id ? C.accent : C.b2}` }}>
            {c.name}
          </button>
        ))}
      </div>

      {tab === 'tracker' && (
        <PostTracker clients={clients} wpPosts={wpPosts} onFetch={fetchAll} />
      )}

      {tab === 'live' && (
        <div>
          {clients.length === 0 && <Empty msg="Add clients to see their WordPress posts here." />}
          {displayClients.map(client => {
            const data = wpPosts[client.id];
            return (
              <div key={client.id} style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.accent, flexShrink: 0 }} />
                  <span style={{ fontSize: 14, color: C.t1, fontWeight: 500 }}>{client.name}</span>
                  <span style={{ fontSize: 12, color: C.t3 }}>{client.siteUrl}</span>
                  {data?.cachedAt && !loading[client.id] && (
                    <span style={{ fontSize: 11, color: C.t4, marginLeft: 4 }}>
                      · {formatDistanceToNow(new Date(data.cachedAt), { addSuffix: true })}
                    </span>
                  )}
                  <button onClick={() => fetchForClient(client)} style={{ marginLeft: 'auto', ...iconBtn }}>
                    {loading[client.id]
                      ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                      : <RefreshCw size={13} />}
                  </button>
                </div>

                {errors[client.id] && (
                  <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderRadius: 8, marginBottom: 10, background: C.redBg, border: `1px solid ${C.redBd}`, fontSize: 13, color: C.red }}>
                    <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {errors[client.id]}
                  </div>
                )}

                {!data && !loading[client.id] && !errors[client.id] && (
                  <div style={{ fontSize: 13, color: C.t4, padding: '14px 0' }}>Click refresh to load posts from this site.</div>
                )}

                {data?.posts?.length > 0 && (
                  <div style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${C.b2}` }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 110px 36px', padding: '8px 16px', background: C.bg2, borderBottom: `1px solid ${C.b1}` }}>
                      {['Title', 'Date', 'Status', ''].map(h => (
                        <div key={h} style={{ fontSize: 11, color: C.t4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
                      ))}
                    </div>
                    {data.posts.map((post, i) => (
                      <div key={post.id || i} style={{ display: 'grid', gridTemplateColumns: '1fr 130px 110px 36px', padding: '11px 16px', background: i % 2 === 0 ? C.bg3 : C.bg2, alignItems: 'center', borderBottom: `1px solid ${C.b1}` }}>
                        <div style={{ fontSize: 13, color: C.t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          title={post.title?.rendered?.replace(/<[^>]*>/g, '') || post.title}>
                          {post.title?.rendered?.replace(/<[^>]*>/g, '') || post.title || '(no title)'}
                        </div>
                        <div style={{ fontSize: 12, color: C.t3 }}>
                          {post.date ? format(new Date(post.date), 'dd MMM yyyy') : '—'}
                        </div>
                        <div>
                          <span style={{
                            fontSize: 11, padding: '3px 9px', borderRadius: 20,
                            background: post.status === 'publish' ? C.greenBg : C.accentBg,
                            color:      post.status === 'publish' ? C.green   : C.accent,
                            border:     `1px solid ${post.status === 'publish' ? C.greenBd : C.accentBd}`,
                          }}>
                            {post.status || 'publish'}
                          </span>
                        </div>
                        {post.link
                          ? <a href={post.link} target="_blank" rel="noreferrer" style={{ color: C.t3, display: 'flex' }}><ExternalLink size={13} /></a>
                          : <span />}
                      </div>
                    ))}
                  </div>
                )}

                {data?.total > 30 && (
                  <div style={{ fontSize: 12, color: C.t4, marginTop: 8 }}>Showing 30 of {data.total} posts</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'local' && (
        <div>
          {filteredLocalPosts.length === 0 && <Empty msg="No local drafts yet. Compose a post from the Calendar." />}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredLocalPosts.map(post => (
              <div key={post.localId} style={{ background: C.bg3, border: `1px solid ${C.b2}`, borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ flexShrink: 0 }}>
                  {post.wpPostId ? <CheckCircle2 size={18} color={C.green} /> : <FileText size={18} color={C.t3} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: C.t1, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {post.title || 'Untitled'}
                  </div>
                  <div style={{ fontSize: 12, color: C.t3, marginTop: 3 }}>
                    {post._clientName} · {post.savedAt ? format(new Date(post.savedAt), 'dd MMM, hh:mm a') : ''}
                    {post.focusKeyword && <span style={{ marginLeft: 8, color: C.accent }}>📌 {post.focusKeyword}</span>}
                  </div>
                </div>
                <div>
                  {post.wpPostId
                    ? <span style={{ fontSize: 11, color: C.green, background: C.greenBg, border: `1px solid ${C.greenBd}`, borderRadius: 20, padding: '3px 10px' }}>In WP #{post.wpPostId}</span>
                    : <span style={{ fontSize: 11, color: C.accent, background: C.accentBg, border: `1px solid ${C.accentBd}`, borderRadius: 20, padding: '3px 10px' }}>Local only</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Empty({ msg }) {
  return <div style={{ textAlign: 'center', padding: '48px 20px', color: C.t3, fontSize: 13 }}>{msg}</div>;
}

// ── Post Tracker (renamed from Publishing KPI Tracker) ────────────────────────

function buildMonthWeeks(monthStart, monthEnd) {
  const totalDays = monthEnd.getDate();
  // Divide month into exactly 4 buckets
  const cuts = [1];
  for (let i = 1; i <= 3; i++) cuts.push(Math.round((totalDays / 4) * i) + 1);
  cuts.push(totalDays + 1);

  return [1, 2, 3, 4].map(n => {
    const startDay = cuts[n - 1];
    const endDay   = cuts[n] - 1;
    const wStart   = new Date(monthStart.getFullYear(), monthStart.getMonth(), startDay);
    const wEnd     = new Date(monthStart.getFullYear(), monthStart.getMonth(), endDay, 23, 59, 59, 999);
    return { label: `W${n}`, dateRange: `${format(wStart, 'd')}–${format(wEnd, 'd MMM')}`, start: wStart, end: wEnd };
  });
}

function PostTracker({ clients, wpPosts, onFetch }) {
  const today        = new Date();
  const MONTH_OFFSETS = [-3, -2, -1, 0, 1, 2];
  const [selOffset, setSelOffset] = useState(0);

  const monthMeta = MONTH_OFFSETS.map(offset => {
    const d  = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    const ms = startOfMonth(d);
    const me = endOfMonth(d);
    return { offset, label: format(ms, 'MMM yyyy'), shortLabel: format(ms, 'MMM'), start: ms, end: me, isCurrent: offset === 0, isPast: offset < 0, isFuture: offset > 0 };
  });

  const selMonth   = monthMeta.find(m => m.offset === selOffset);
  const weeksInSel = buildMonthWeeks(selMonth.start, selMonth.end).map(w => ({
    ...w,
    isCurrent: isWithinInterval(today, { start: w.start, end: w.end }),
    isFuture:  w.start > today,
  }));

  const countPosts = (clientId, wStart, wEnd) =>
    (wpPosts[clientId]?.posts || []).filter(p => {
      if (!p.date) return false;
      return isWithinInterval(new Date(p.date), { start: wStart, end: wEnd });
    }).length;

  const clientStats = clients.map(c => {
    const freq       = c.weeklyFrequency || 1;
    const doneWeeks  = weeksInSel.filter(w => !w.isFuture);
    const actual     = doneWeeks.reduce((s, w) => s + countPosts(c.id, w.start, w.end), 0);
    const targetSoFar = freq * doneWeeks.length;
    const monthTarget = freq * weeksInSel.length;
    const pct         = targetSoFar > 0 ? Math.min(100, Math.round(actual / targetSoFar * 100)) : null;
    return { client: c, freq, actual, targetSoFar, monthTarget, pct };
  });

  const totalActual   = clientStats.reduce((s, x) => s + x.actual, 0);
  const totalSoFar    = clientStats.reduce((s, x) => s + x.targetSoFar, 0);
  const totalMonthTgt = clientStats.reduce((s, x) => s + x.monthTarget, 0);
  const overallPct    = totalSoFar > 0 ? Math.min(100, Math.round(totalActual / totalSoFar * 100)) : null;
  const hasAnyData    = clients.some(c => wpPosts[c.id]?.posts?.length > 0);

  if (clients.length === 0) return <Empty msg="Add clients to track publishing." />;

  return (
    <div>
      {/* Month tab strip */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: `2px solid ${C.b2}` }}>
        {monthMeta.map(m => (
          <button key={m.offset} onClick={() => setSelOffset(m.offset)}
            style={{
              padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 13, marginBottom: -2, transition: 'all 0.15s',
              color: selOffset === m.offset ? C.accent : m.isFuture ? C.t4 : C.t3,
              borderBottom: `2px solid ${selOffset === m.offset ? C.accent : 'transparent'}`,
              fontWeight: m.isCurrent ? 600 : 400,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
            {m.shortLabel}
            {m.isCurrent && <span style={{ fontSize: 8, background: C.accent, color: '#fff', borderRadius: 10, padding: '1px 5px' }}>NOW</span>}
            {m.isFuture  && <span style={{ fontSize: 8, color: C.t4 }}>›</span>}
          </button>
        ))}
      </div>

      {/* Month summary */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, padding: '14px 18px', background: C.bg3, border: `1px solid ${C.b2}`, borderRadius: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: C.t3, marginBottom: 4 }}>
            {selMonth.label}
            {selMonth.isFuture ? ' — Upcoming' : selMonth.isPast ? ' — Completed' : ' — In progress'}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            {overallPct !== null ? (
              <>
                <span style={{ fontSize: 28, fontWeight: 700, color: overallPct >= 100 ? C.green : overallPct >= 60 ? C.accent : C.red }}>
                  {overallPct}%
                </span>
                <span style={{ fontSize: 12, color: C.t3 }}>
                  {totalActual} of {totalSoFar} posts done{selMonth.isFuture ? '' : ' so far'}
                  {!selMonth.isFuture && totalMonthTgt !== totalSoFar && (
                    <span style={{ color: C.t4 }}> · {totalMonthTgt} total target</span>
                  )}
                </span>
              </>
            ) : (
              <span style={{ fontSize: 14, color: C.t4 }}>Upcoming month — no data yet</span>
            )}
          </div>
          {overallPct !== null && (
            <div style={{ marginTop: 8, height: 6, background: C.bg4, borderRadius: 4, overflow: 'hidden', maxWidth: 300 }}>
              <div style={{ height: '100%', width: `${overallPct}%`, borderRadius: 4, transition: 'width 0.4s',
                background: overallPct >= 100 ? C.green : overallPct >= 60 ? C.accent : C.red }} />
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {clientStats.map(({ client, actual, targetSoFar, pct }) => (
            <div key={client.id} style={{ textAlign: 'center', padding: '8px 12px', background: C.bg4, border: `1px solid ${C.b2}`, borderRadius: 8, minWidth: 80 }}>
              <div style={{ fontSize: 10, color: C.t3, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 90 }}>{client.name}</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: pct == null ? C.t4 : pct >= 100 ? C.green : pct >= 60 ? C.accent : C.red }}>
                {pct == null ? '—' : `${pct}%`}
              </div>
              <div style={{ fontSize: 10, color: C.t4 }}>{actual}/{targetSoFar}</div>
            </div>
          ))}
        </div>
      </div>

      {!hasAnyData && (
        <div style={{ textAlign: 'center', padding: '24px', background: C.bg3, border: `1px solid ${C.b2}`, borderRadius: 10, marginBottom: 16, color: C.t3, fontSize: 13 }}>
          <BarChart2 size={24} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.15 }} />
          No post data cached.{' '}
          <button onClick={onFetch} style={{ color: C.accent, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', textDecoration: 'underline' }}>
            Refresh All
          </button>
          {' '}to load from WordPress.
        </div>
      )}

      <MonthWeekGrid
        clients={clients} weeks={weeksInSel}
        countFn={countPosts} clientStats={clientStats}
        isFutureMonth={selMonth.isFuture}
      />

      <div style={{ marginTop: 12, fontSize: 11, color: C.t4 }}>
        * Month split into 4 equal weeks. Based on cached posts (last 30 per client). Refresh from "Live on WordPress" for latest.
      </div>
    </div>
  );
}

function MonthWeekGrid({ clients, weeks, countFn, clientStats, isFutureMonth }) {
  if (!weeks.length) return null;
  const colTemplate = `180px repeat(${weeks.length}, 1fr) 80px`;

  return (
    <div style={{ border: `1px solid ${C.b2}`, borderRadius: 10, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'grid', gridTemplateColumns: colTemplate, background: C.bg2, borderBottom: `1px solid ${C.b2}` }}>
        <div style={{ padding: '10px 14px', fontSize: 11, color: C.t4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Client · Target</div>
        {weeks.map(w => (
          <div key={w.label} style={{ padding: '8px 6px', textAlign: 'center', borderLeft: `1px solid ${C.b1}`, background: w.isCurrent ? C.accentBg : 'transparent' }}>
            <div style={{ fontSize: 12, fontWeight: w.isCurrent ? 700 : 500, color: w.isCurrent ? C.accent : C.t2 }}>{w.label}</div>
            <div style={{ fontSize: 10, color: w.isCurrent ? C.accent : C.t4, marginTop: 2 }}>{w.dateRange}</div>
            {w.isCurrent && <div style={{ fontSize: 9, color: C.accent, marginTop: 2 }}>● NOW</div>}
            {w.isFuture && !w.isCurrent && <div style={{ fontSize: 9, color: C.t4, marginTop: 2 }}>upcoming</div>}
          </div>
        ))}
        <div style={{ padding: '10px 8px', textAlign: 'center', borderLeft: `1px solid ${C.b1}`, fontSize: 11, color: C.t4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total</div>
      </div>

      {/* Client rows */}
      {clients.map((client, ci) => {
        const freq  = client.weeklyFrequency || 1;
        const cStat = clientStats.find(s => s.client.id === client.id);
        return (
          <div key={client.id} style={{ display: 'grid', gridTemplateColumns: colTemplate, background: ci % 2 === 0 ? C.bg3 : C.bg2, borderBottom: `1px solid ${C.b1}` }}>
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRight: `1px solid ${C.b1}` }}>
              <div style={{ fontSize: 13, color: C.t1, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.name}</div>
              <div style={{ fontSize: 10, color: C.t4, marginTop: 2 }}>{freq} post{freq > 1 ? 's' : ''}/week target</div>
            </div>

            {weeks.map(w => {
              const count   = isFutureMonth ? null : countFn(client.id, w.start, w.end);
              const isFut   = isFutureMonth || w.isFuture;
              const met     = count !== null && count >= freq;
              const partial = count !== null && count > 0 && !met;
              const missed  = count !== null && count === 0 && !isFut;

              return (
                <div key={w.label} style={{
                  borderLeft: `1px solid ${C.b1}`,
                  background: w.isCurrent && !isFutureMonth ? C.accentBg : 'transparent',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  padding: '10px 4px', gap: 4,
                }}>
                  {isFut ? <span style={{ fontSize: 13, color: C.t4 }}>—</span> : (
                    <>
                      <span style={{ fontSize: 18, fontWeight: 700, lineHeight: 1, color: met ? C.green : partial ? C.accent : C.t4 }}>
                        {count}
                      </span>
                      <span style={{
                        fontSize: 9, borderRadius: 10, padding: '2px 6px', fontWeight: 600,
                        background: met ? C.greenBg : partial ? C.accentBg : missed ? C.redBg : C.bg4,
                        border:     `1px solid ${met ? C.greenBd : partial ? C.accentBd : missed ? C.redBd : C.b2}`,
                        color:      met ? C.green   : partial ? C.accent   : missed ? C.red    : C.t4,
                      }}>
                        {met ? '✓ Met' : partial ? `${count}/${freq}` : missed ? '✗ Missed' : '—'}
                      </span>
                    </>
                  )}
                </div>
              );
            })}

            <div style={{ borderLeft: `1px solid ${C.b1}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 8px' }}>
              {cStat && cStat.targetSoFar > 0 ? (
                <>
                  <span style={{ fontSize: 14, fontWeight: 700, color: cStat.pct >= 100 ? C.green : cStat.pct >= 60 ? C.accent : C.red }}>{cStat.pct}%</span>
                  <span style={{ fontSize: 10, color: C.t4, marginTop: 2 }}>{cStat.actual}/{cStat.targetSoFar}</span>
                </>
              ) : <span style={{ fontSize: 12, color: C.t4 }}>—</span>}
            </div>
          </div>
        );
      })}

      {/* Column totals */}
      <div style={{ display: 'grid', gridTemplateColumns: colTemplate, background: C.bg4, borderTop: `1px solid ${C.b2}` }}>
        <div style={{ padding: '8px 14px', fontSize: 11, color: C.t3, fontWeight: 600 }}>All Clients</div>
        {weeks.map(w => {
          const total      = isFutureMonth || w.isFuture ? null : clients.reduce((s, c) => s + countFn(c.id, w.start, w.end), 0);
          const weekTarget = clients.reduce((s, c) => s + (c.weeklyFrequency || 1), 0);
          const colPct     = total !== null && weekTarget > 0 ? Math.round(total / weekTarget * 100) : null;
          return (
            <div key={w.label} style={{ borderLeft: `1px solid ${C.b2}`, padding: '8px 4px', textAlign: 'center' }}>
              {total !== null ? (
                <>
                  <div style={{ fontSize: 13, fontWeight: 700, color: colPct >= 100 ? C.green : colPct >= 60 ? C.accent : C.red }}>{total}</div>
                  <div style={{ fontSize: 9, color: C.t4 }}>of {weekTarget}</div>
                </>
              ) : <span style={{ fontSize: 11, color: C.t4 }}>—</span>}
            </div>
          );
        })}
        <div style={{ borderLeft: `1px solid ${C.b2}`, padding: '8px', textAlign: 'center', fontSize: 11, color: C.t3 }}>
          {isFutureMonth ? '—' : `${clientStats.reduce((s, x) => s + x.actual, 0)}/${clientStats.reduce((s, x) => s + x.targetSoFar, 0)}`}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, padding: '8px 14px', background: C.bg2, borderTop: `1px solid ${C.b1}` }}>
        {[
          { bg: C.greenBg,  bd: C.greenBd,  color: C.green,  label: 'Met target' },
          { bg: C.accentBg, bd: C.accentBd, color: C.accent, label: 'Partial' },
          { bg: C.redBg,    bd: C.redBd,    color: C.red,    label: 'Missed' },
          { bg: C.bg4,      bd: C.b2,       color: C.t4,     label: 'Upcoming' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: C.t3 }}>
            <span style={{ fontSize: 9, borderRadius: 10, padding: '1px 6px', background: l.bg, border: `1px solid ${l.bd}`, color: l.color, fontWeight: 600 }}>{l.label[0]}</span>
            {l.label}
          </div>
        ))}
      </div>
    </div>
  );
}

const btnStyle = { display: 'inline-flex', alignItems: 'center', gap: 6, background: C.bg3, border: `1px solid ${C.b2}`, borderRadius: 7, padding: '8px 14px', color: C.t2, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' };
const iconBtn  = { background: C.bg2, border: `1px solid ${C.b2}`, borderRadius: 6, padding: '5px 8px', color: C.t3, cursor: 'pointer', display: 'flex', alignItems: 'center' };
