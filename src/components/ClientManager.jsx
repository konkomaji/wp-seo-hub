import { useState, useEffect } from 'react';
import { Plus, Globe, Trash2, Edit3, CheckCircle, XCircle, Loader, ChevronDown, ChevronUp, RefreshCw, Key, Sparkles, Brain, Clock } from 'lucide-react';
import { generateId, saveClient, deleteClient, saveWpCache, getWpCache, getClientProfiles, generateClientProfile, logError } from '../store/store';
import { testConnection, fetchWpPosts } from '../utils/wpApi';
import { TIMEZONES, getClientTz } from '../utils/timezones';
import { C } from '../theme';

const FREQUENCIES = [1, 2, 3, 4, 5, 6, 7];

export default function ClientManager({ clients, onClientsChange, settings }) {
  const [showForm, setShowForm]       = useState(false);
  const [editing, setEditing]         = useState(null);
  const [form, setForm]               = useState({ name: '', siteUrl: '', vkToken: '', weeklyFrequency: 3, industry: '', description: '' });
  const [testing, setTesting]         = useState(false);
  const [testResult, setTestResult]   = useState(null);
  const [expanded, setExpanded]       = useState(null);
  const [fetchingFor, setFetchingFor] = useState(null);
  const [wpCache, setWpCache]         = useState({});
  const [profiles, setProfiles]       = useState({});
  const [generatingProfile, setGeneratingProfile] = useState(null);
  const [profileError, setProfileError] = useState(null);

  useEffect(() => {
    getWpCache().then(setWpCache).catch(() => {});
    getClientProfiles().then(setProfiles).catch(() => {});
  }, [clients]);

  const resetForm = () => {
    setForm({ name: '', siteUrl: '', vkToken: '', weeklyFrequency: 3, industry: '', description: '' });
    setEditing(null);
    setTestResult(null);
  };

  const handleEdit = (client) => {
    setForm({ ...client });
    setEditing(client.id);
    setShowForm(true);
    setTestResult(null);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const cleanUrl = form.siteUrl.replace(/\/$/, '');
      const result   = await testConnection({ ...form, siteUrl: cleanUrl });
      setTestResult({ ok: true, msg: `Connected — WPSeoHub Connector v${result.version || '?'} (${result.seo_plugin || 'no SEO plugin'})` });
    } catch (e) {
      setTestResult({ ok: false, msg: e.message });
      logError('Client Manager', 'Test Connection', e, { siteUrl: form.siteUrl });
    }
    setTesting(false);
  };

  const handleSave = async () => {
    if (!form.name || !form.siteUrl || !form.vkToken) return;
    const cleanUrl = form.siteUrl.replace(/\/$/, '');
    const isNew    = !editing;
    const client   = {
      ...form, siteUrl: cleanUrl,
      id: editing || generateId(),
      createdAt: editing
        ? (clients.find(c => c.id === editing)?.createdAt || new Date().toISOString())
        : new Date().toISOString(),
    };
    const updated = await saveClient(client);
    onClientsChange(updated);
    resetForm();
    setShowForm(false);

    if (isNew) {
      setFetchingFor(client.id);
      try {
        const { posts, total } = await fetchWpPosts(client, 1, 30);
        await saveWpCache(client.id, { posts, total });
        setWpCache(prev => ({ ...prev, [client.id]: { posts, total, cachedAt: new Date().toISOString() } }));
      } catch (e) {
        logError('Client Manager', 'Auto-Fetch Posts', e, { clientId: client.id, clientName: client.name });
      }
      setFetchingFor(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this client?')) return;
    const updated = await deleteClient(id);
    onClientsChange(updated);
  };

  const handleGenerateProfile = async (client) => {
    setGeneratingProfile(client.id);
    setProfileError(null);
    try {
      const profile = await generateClientProfile(client.id);
      setProfiles(p => ({ ...p, [client.id]: profile }));
    } catch (e) {
      setProfileError(e.message);
    }
    setGeneratingProfile(null);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontFamily: C.fontSerif, color: C.t1 }}>Client Sites</h2>
          <p style={{ margin: '4px 0 0', color: C.t3, fontSize: 13 }}>{clients.length} connected site{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} style={btn(C.bg4, C.accent)}>
          <Plus size={15} /> Add Client
        </button>
      </div>

      {showForm && (
        <div style={{ background: C.bg3, border: `1px solid ${C.b2}`, borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 20px', fontSize: 15, color: C.t1, fontWeight: 500 }}>{editing ? 'Edit Client' : 'New Client'}</h3>

          <div style={{ background: C.accentBg, border: `1px solid ${C.accentBd}`, borderRadius: 8, padding: '10px 14px', marginBottom: 18, fontSize: 12, color: C.t2, lineHeight: 1.7 }}>
            <Key size={12} style={{ marginRight: 6, color: C.accent }} />
            Connection uses your <strong>WPSeoHub Connector plugin API token only</strong> — no WordPress username or password required.
            Install the plugin on the client site, generate a token in <em>WP Settings → WPSeoHub Connector</em>, and paste it below.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Company Name *" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="e.g. Birla Open Minds" />
            <Field label="WordPress Site URL *" value={form.siteUrl} onChange={v => setForm(f => ({ ...f, siteUrl: v }))} placeholder="https://example.com" />
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>WPSeoHub Connector API Token *</label>
              <input type="password" value={form.vkToken} onChange={e => setForm(f => ({ ...f, vkToken: e.target.value }))}
                placeholder="Paste token from WordPress plugin settings" style={inputStyle} />
            </div>
            <Field label="Industry" value={form.industry} onChange={v => setForm(f => ({ ...f, industry: v }))} placeholder="e.g. Education, Real Estate" />
            <div>
              <label style={labelStyle}>Weekly Post Frequency</label>
              <select value={form.weeklyFrequency} onChange={e => setForm(f => ({ ...f, weeklyFrequency: +e.target.value }))} style={inputStyle}>
                {FREQUENCIES.map(n => <option key={n} value={n}>{n} post{n > 1 ? 's' : ''} / week</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Company Description (used to build Claude AI context)</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Brief description of company, target audience, tone of voice, key USPs..."
                style={{ ...inputStyle, height: 80, resize: 'vertical' }} />
            </div>
          </div>

          {testResult && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, padding: '10px 14px', borderRadius: 8, background: testResult.ok ? C.greenBg : C.redBg, border: `1px solid ${testResult.ok ? C.greenBd : C.redBd}` }}>
              {testResult.ok ? <CheckCircle size={15} color={C.green} /> : <XCircle size={15} color={C.red} />}
              <span style={{ fontSize: 13, color: testResult.ok ? C.green : C.red }}>{testResult.msg}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button onClick={handleTest} disabled={testing || !form.siteUrl || !form.vkToken} style={btn(C.bg4, C.blue)}>
              {testing ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Globe size={14} />} Test Connection
            </button>
            <button onClick={handleSave} disabled={!form.name || !form.siteUrl || !form.vkToken} style={btn(C.accent, C.bg1, true)}>
              Save Client
            </button>
            <button onClick={() => { setShowForm(false); resetForm(); }} style={btn(C.bg4, C.t3)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {clients.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: C.t3, fontSize: 14 }}>
            <Globe size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.2 }} />
            No clients yet. Add your first WordPress site above.
          </div>
        )}
        {clients.map(client => {
          const cache      = wpCache[client.id];
          const profile    = profiles[client.id];
          const isFetching = fetchingFor === client.id;
          const isGenerating = generatingProfile === client.id;
          const clientTz   = getClientTz(client, settings);
          return (
            <div key={client.id} style={{ background: C.bg3, border: `1px solid ${C.b2}`, borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', gap: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: C.bg4, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Globe size={16} color={C.accent} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, color: C.t1, fontSize: 14 }}>{client.name}</div>
                  <div style={{ color: C.t3, fontSize: 12, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.siteUrl}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {isFetching && (
                    <span style={{ fontSize: 11, color: C.accent, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} /> Fetching...
                    </span>
                  )}
                  {cache && !isFetching && (
                    <span style={{ fontSize: 11, color: C.green, background: C.greenBg, border: `1px solid ${C.greenBd}`, borderRadius: 20, padding: '2px 9px' }}>
                      {cache.total} posts
                    </span>
                  )}
                  {profile && (
                    <span style={{ fontSize: 11, color: C.purple, background: C.purpleBg, border: `1px solid ${C.purpleBd}`, borderRadius: 20, padding: '2px 9px', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Brain size={9} /> AI Profile
                    </span>
                  )}
                  <span style={{ fontSize: 12, color: C.accent, background: C.accentBg, border: `1px solid ${C.accentBd}`, borderRadius: 20, padding: '3px 10px' }}>
                    {client.weeklyFrequency}×/wk
                  </span>
                  {client.industry && (
                    <span style={{ fontSize: 12, color: C.t3, background: C.bg4, border: `1px solid ${C.b2}`, borderRadius: 20, padding: '3px 10px' }}>
                      {client.industry}
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: C.green, background: C.greenBg, border: `1px solid ${C.greenBd}`, borderRadius: 20, padding: '2px 7px', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Key size={9} /> Token
                  </span>
                  <button onClick={() => setExpanded(expanded === client.id ? null : client.id)} style={iconBtn}>
                    {expanded === client.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  <button onClick={() => handleEdit(client)} style={iconBtn}><Edit3 size={15} /></button>
                  <button onClick={() => handleDelete(client.id)} style={iconBtn}><Trash2 size={15} /></button>
                </div>
              </div>

              {expanded === client.id && (
                <div style={{ padding: '0 18px 18px', borderTop: `1px solid ${C.b1}` }}>
                  <div style={{ paddingTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
                    <InfoRow label="Site URL"   value={client.siteUrl} />
                    <InfoRow label="Token"      value="••••••••••••  (API token set)" />
                    <InfoRow label="Industry"   value={client.industry || '—'} />
                    <InfoRow label="Frequency"  value={`${client.weeklyFrequency} posts/week`} />
                    <InfoRow label="Timezone"   value={clientTz} icon={<Clock size={11} />} />
                    <InfoRow label="Added"      value={client.createdAt ? new Date(client.createdAt).toLocaleDateString('en-IN') : '—'} />
                    {client.description && <div style={{ gridColumn: '1/-1' }}><InfoRow label="Description" value={client.description} /></div>}
                  </div>

                  {cache?.posts?.length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontSize: 11, color: C.t3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                        Recent Posts (cached · {new Date(cache.cachedAt).toLocaleDateString('en-IN')})
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {cache.posts.slice(0, 5).map((p, i) => (
                          <div key={p.id || i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', background: C.bg2, borderRadius: 7, border: `1px solid ${C.b1}` }}>
                            <div style={{ flex: 1, fontSize: 12, color: C.t2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {p.title?.rendered?.replace(/<[^>]*>/g, '') || p.title || '(no title)'}
                            </div>
                            <div style={{ fontSize: 11, color: C.t3, flexShrink: 0 }}>
                              {p.date ? new Date(p.date).toLocaleDateString('en-IN') : '—'}
                            </div>
                          </div>
                        ))}
                        {cache.total > 5 && (
                          <div style={{ fontSize: 11, color: C.t3, padding: '4px 10px' }}>+{cache.total - 5} more — view all in Dashboard</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* AI Profile section */}
                  <div style={{ marginTop: 18, borderTop: `1px solid ${C.b1}`, paddingTop: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <Brain size={14} color={C.purple} />
                        <span style={{ fontSize: 13, color: C.t1, fontWeight: 500 }}>AI Client Profile</span>
                        {profile && (
                          <span style={{ fontSize: 11, color: C.t3 }}>
                            · generated {new Date(profile.generatedAt).toLocaleDateString('en-IN')}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleGenerateProfile(client)}
                        disabled={isGenerating}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.purpleBg, border: `1px solid ${C.purpleBd}`, borderRadius: 7, padding: '7px 14px', color: C.purple, fontSize: 12, cursor: isGenerating ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: isGenerating ? 0.7 : 1 }}>
                        {isGenerating
                          ? <><Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> Generating...</>
                          : <><Sparkles size={12} /> {profile ? 'Regenerate Profile' : 'Generate AI Profile'}</>
                        }
                      </button>
                    </div>

                    {profileError && (
                      <div style={{ fontSize: 12, color: C.red, background: C.redBg, border: `1px solid ${C.redBd}`, borderRadius: 7, padding: '8px 12px', marginBottom: 10 }}>
                        {profileError}
                      </div>
                    )}

                    {!profile && !isGenerating && (
                      <div style={{ fontSize: 12, color: C.t3, lineHeight: 1.7, background: C.bg4, border: `1px solid ${C.b1}`, borderRadius: 8, padding: '12px 14px' }}>
                        Generate a one-time AI profile to analyse this client's industry, target audience, content themes, brand voice, and SEO strategy. This profile is stored and used by all AI features to give context-aware recommendations.
                      </div>
                    )}

                    {profile && (
                      <div style={{ background: C.bg2, border: `1px solid ${C.purpleBd}`, borderRadius: 8, padding: '14px 16px', maxHeight: 400, overflowY: 'auto' }}>
                        <pre style={{ margin: 0, fontSize: 12, color: C.t2, fontFamily: 'inherit', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.75 }}>
                          {profile.content}
                        </pre>
                        {profile.usage && (
                          <div style={{ marginTop: 10, fontSize: 10, color: C.t4 }}>
                            {profile.usage.input_tokens}↑ {profile.usage.output_tokens}↓ tokens
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
    </div>
  );
}

function InfoRow({ label, value, icon }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: C.t3, fontSize: 11, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {icon}{label}
      </div>
      <div style={{ color: C.t2, fontSize: 12, wordBreak: 'break-all' }}>{value}</div>
    </div>
  );
}

const labelStyle = { display: 'block', marginBottom: 6, fontSize: 12, color: C.t3, letterSpacing: '0.04em' };
const inputStyle = { width: '100%', background: C.bg2, border: `1px solid ${C.b2}`, borderRadius: 7, padding: '9px 12px', color: C.t1, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
const iconBtn    = { background: 'none', border: 'none', cursor: 'pointer', color: C.t3, padding: 4, display: 'flex', alignItems: 'center' };
const btn = (bg, color, solid = false) => ({
  display: 'inline-flex', alignItems: 'center', gap: 6,
  background: solid ? color : bg,
  color:      solid ? bg    : color,
  border:     `1px solid ${solid ? color : C.b3}`,
  borderRadius: 7, padding: '8px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
  opacity: 1,
});
