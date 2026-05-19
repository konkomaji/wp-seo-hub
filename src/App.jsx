import { useState, useEffect } from 'react';
import { Globe, Calendar, LayoutDashboard, Brain, Menu, X, ShieldCheck, TrendingUp, AlertTriangle, Settings2, BookOpen, Search } from 'lucide-react';
import { getClients, getErrorLog, getSettings, migrateFromLocalStorage } from './store/store';
import { C } from './theme';
import { VERSION } from './version';
import ClientManager from './components/ClientManager';
import ContentCalendar from './components/ContentCalendar';
import PostDashboard from './components/PostDashboard';
import ClaudeContext from './components/ClaudeContext';
import PostComposer from './components/PostComposer';
import SEOAuditor from './components/SEOAuditor';
import KeywordTracker from './components/KeywordTracker';
import ErrorLog from './components/ErrorLog';
import Settings from './components/Settings';
import Guide from './components/Guide';
import GoogleIndexing from './components/GoogleIndexing';

const NAV = [
  { id: 'dashboard', label: 'Dashboard',          icon: LayoutDashboard },
  { id: 'calendar',  label: 'Publishing Calendar', icon: Calendar },
  { id: 'clients',   label: 'Clients',             icon: Globe },
  { id: 'seo',       label: 'SEO Performance',     icon: ShieldCheck },
  { id: 'keywords',  label: 'Search & Keywords',   icon: TrendingUp },
  { id: 'google',    label: 'Google Search',       icon: Search },
  { id: 'claude',    label: 'Claude Context',      icon: Brain },
  { id: 'errors',    label: 'Error Log',           icon: AlertTriangle },
  { id: 'settings',  label: 'Settings',            icon: Settings2 },
  { id: 'guide',     label: 'Guide',               icon: BookOpen },
];

export default function App() {
  const [page, setPage]               = useState('dashboard');
  const [clients, setClients]         = useState([]);
  const [composer, setComposer]       = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [refreshKey, setRefreshKey]   = useState(0);
  const [errorCount, setErrorCount]   = useState(0);
  const [serverOk, setServerOk]       = useState(null);
  const [settings, setSettings]       = useState({ defaultTimezone: 'Asia/Kolkata', clientTimezones: {} });

  useEffect(() => {
    migrateFromLocalStorage().catch(() => {});
    getClients()
      .then(c => { setClients(c); setServerOk(true); })
      .catch(() => setServerOk(false));
    getSettings().then(setSettings).catch(() => {});
    getErrorLog().then(log => setErrorCount(log.length)).catch(() => {});
    const interval = setInterval(() => {
      getErrorLog().then(log => setErrorCount(log.length)).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleCompose       = (client, scheduledDate = null) => setComposer({ client, scheduledDate });
  const handleComposerSaved = () => setRefreshKey(k => k + 1);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.bg1, fontFamily: C.fontSans, color: C.t1 }}>

      {/* ── Sidebar ── */}
      <div style={{
        width: sidebarOpen ? 240 : 0, flexShrink: 0, transition: 'width 0.2s', overflow: 'hidden',
        background: C.bg2, borderRight: `1px solid ${C.b1}`, display: 'flex', flexDirection: 'column',
        boxShadow: '2px 0 8px rgba(37,99,235,0.04)',
      }}>

        {/* Brand */}
        <div style={{ padding: '20px 18px 16px', borderBottom: `1px solid ${C.b1}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 5h14M3 10h9M3 15h12" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.t1, letterSpacing: '-0.01em' }}>WPSeoHub</div>
              <div style={{ fontSize: 10, color: C.t4, marginTop: 1, letterSpacing: '0.03em' }}>WordPress SEO · AI Powered</div>
            </div>
          </div>
        </div>

        {/* Server offline banner */}
        {serverOk === false && (
          <div style={{ padding: '8px 14px', background: C.redBg, borderBottom: `1px solid ${C.redBd}`, fontSize: 11, color: C.red }}>
            API server offline. Run <code style={{ fontSize: 10 }}>npm start</code>
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 8px' }}>
          {NAV.map(item => {
            const Icon   = item.icon;
            const active = page === item.id;
            return (
              <button key={item.id} onClick={() => {
                setPage(item.id);
                if (item.id === 'errors') getErrorLog().then(l => setErrorCount(l.length)).catch(() => {});
              }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '9px 12px', borderRadius: 8, marginBottom: 2,
                  background: active ? C.accentBg : 'transparent',
                  border:     `1px solid ${active ? C.accentBd : 'transparent'}`,
                  color:      active ? C.accent : C.t3,
                  fontSize: 13, fontWeight: active ? 600 : 400,
                  cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.15s',
                }}>
                <Icon size={15} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.id === 'errors' && errorCount > 0 && (
                  <span style={{ fontSize: 10, background: C.red, color: '#fff', borderRadius: 20, padding: '1px 6px', marginLeft: 'auto' }}>
                    {errorCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: '14px 16px', borderTop: `1px solid ${C.b1}` }}>
          <div style={{ fontSize: 11, color: C.t4, marginBottom: 7 }}>
            {clients.length} client{clients.length !== 1 ? 's' : ''} connected
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {clients.slice(0, 4).map(c => (
              <div key={c.id} title={c.name}
                style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: C.accentBg, color: C.accent, border: `1px solid ${C.accentBd}`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 80 }}>
                {c.name}
              </div>
            ))}
            {clients.length > 4 && <div style={{ fontSize: 10, color: C.t3 }}>+{clients.length - 4}</div>}
          </div>
          <div style={{ marginTop: 10, fontSize: 10, color: C.t4, display: 'flex', justifyContent: 'space-between' }}>
            <a href="https://github.com/konkomaji/wp-seo-hub" target="_blank" rel="noopener noreferrer"
              style={{ color: C.t4, textDecoration: 'none' }}>GitHub</a>
            <span>v{VERSION}</span>
          </div>
        </div>
      </div>

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Topbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 24px', borderBottom: `1px solid ${C.b1}`, background: C.bg2 }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.t3, display: 'flex', padding: 4 }}>
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <h1 style={{ margin: 0, fontSize: 15, color: C.t1, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            {NAV.find(n => n.id === page)?.label}
            {page === 'errors' && errorCount > 0 && (
              <span style={{ fontSize: 11, background: C.redBg, color: C.red, border: `1px solid ${C.redBd}`, borderRadius: 20, padding: '2px 8px', fontWeight: 400 }}>
                {errorCount} recorded
              </span>
            )}
          </h1>
          <div style={{ marginLeft: 'auto' }}>
            <button onClick={() => handleCompose(clients[0])} disabled={clients.length === 0}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8,
                background: C.accent, border: 'none', color: '#fff',
                fontSize: 13, fontWeight: 600, cursor: clients.length === 0 ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', opacity: clients.length === 0 ? 0.4 : 1,
                boxShadow: clients.length > 0 ? '0 1px 4px rgba(37,99,235,0.3)' : 'none',
              }}>
              + New Post
            </button>
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex: 1, padding: '28px', overflowY: 'auto', maxHeight: 'calc(100vh - 53px)' }}>
          {page === 'clients'   && <ClientManager  clients={clients} onClientsChange={setClients} settings={settings} />}
          {page === 'calendar'  && <ContentCalendar key={refreshKey} clients={clients} onCompose={handleCompose} settings={settings} />}
          {page === 'dashboard' && <PostDashboard   key={refreshKey} clients={clients} onCompose={handleCompose} settings={settings} />}
          {page === 'seo'       && <SEOAuditor      clients={clients} settings={settings} />}
          {page === 'keywords'  && <KeywordTracker  clients={clients} settings={settings} />}
          {page === 'google'    && <GoogleIndexing  clients={clients} />}
          {page === 'claude'    && <ClaudeContext   clients={clients} />}
          {page === 'errors'    && <ErrorLog />}
          {page === 'settings'  && <Settings        clients={clients} onSettingsChange={setSettings} />}
          {page === 'guide'     && <Guide />}
        </div>
      </div>

      {/* Composer modal */}
      {composer && (
        <PostComposer
          client={composer.client}
          scheduledDate={composer.scheduledDate}
          editPost={composer.editPost}
          onClose={() => setComposer(null)}
          onSaved={() => { handleComposerSaved(); }}
        />
      )}

      <style>{`
        * { box-sizing: border-box; }
        input, textarea, select { color-scheme: light; font-family: 'Poppins', sans-serif; }
        input::placeholder, textarea::placeholder { color: ${C.t4}; }
        button { font-weight: 600; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.b2}; border-radius: 3px; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        a { text-decoration: none; }
        button:focus { outline: none; }
      `}</style>
    </div>
  );
}
