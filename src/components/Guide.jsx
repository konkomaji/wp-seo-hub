import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, CheckCircle, AlertCircle, Info, Zap } from 'lucide-react';
import { C } from '../theme';

const SECTIONS = [
  { id: 'quickstart',   label: '1. Quick Start' },
  { id: 'clients',      label: '2. Adding Clients' },
  { id: 'dashboard',    label: '3. Post Dashboard' },
  { id: 'calendar',     label: '4. Content Calendar' },
  { id: 'seo',          label: '5. SEO Performance' },
  { id: 'keywords',     label: '6. Search & Keywords' },
  { id: 'context',      label: '7. Claude Context' },
  { id: 'google',       label: '8. Google Search' },
  { id: 'plugin',       label: '9. WordPress Plugin' },
  { id: 'troubleshoot', label: '10. Troubleshooting' },
];

export default function Guide() {
  const [active, setActive] = useState('quickstart');

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontFamily: C.fontSerif, color: C.t1 }}>Guide</h2>
        <p style={{ margin: '4px 0 0', color: C.t3, fontSize: 13 }}>
          Complete usage guide for WPSeoHub — setup, workflow, and feature reference
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 24 }}>

        {/* Left nav */}
        <div style={{ position: 'sticky', top: 20, alignSelf: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {SECTIONS.map(s => (
              <button key={s.id} onClick={() => setActive(s.id)}
                style={{ textAlign: 'left', padding: '8px 12px', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
                  background: active === s.id ? C.accentBg : 'transparent',
                  border:     `1px solid ${active === s.id ? C.accentBd : 'transparent'}`,
                  color:      active === s.id ? C.accent : C.t3, fontWeight: active === s.id ? 500 : 400 }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ minWidth: 0 }}>
          {active === 'quickstart' && <QuickStart />}
          {active === 'clients'    && <Clients />}
          {active === 'dashboard'  && <Dashboard />}
          {active === 'calendar'   && <Calendar />}
          {active === 'seo'        && <SeoPerformance />}
          {active === 'keywords'   && <Keywords />}
          {active === 'context'    && <ContextGuide />}
          {active === 'google'     && <GoogleSearch />}
          {active === 'plugin'     && <Plugin />}
          {active === 'troubleshoot' && <Troubleshoot />}
        </div>
      </div>
    </div>
  );
}

// ── Section components ──────────────────────────────────────────────────────

function QuickStart() {
  return (
    <Section title="Quick Start" subtitle="Get your first client connected in 5 minutes">
      <StepList steps={[
        {
          n: 1, title: 'Install WPSeoHub Connector on each WordPress site',
          body: 'Download the plugin ZIP from the hub\'s WordPress Plugin folder. In WP Admin → Plugins → Add New → Upload Plugin. Activate it.',
        },
        {
          n: 2, title: 'Copy the API Token',
          body: 'Go to WP Admin → Settings → WPSeoHub Connector. Copy the API token shown on that page. Keep it safe — this is the only credential you\'ll ever need.',
        },
        {
          n: 3, title: 'Add the client in WPSeoHub',
          body: 'Go to Clients → Add Client. Enter the site URL (e.g. https://clientsite.com), paste the API token, fill in the client name, industry, and weekly post frequency. Save.',
        },
        {
          n: 4, title: 'Generate AI Profile',
          body: 'Click "Generate AI Profile" on the client card. Claude analyses the site\'s content and creates a detailed strategy profile stored in the hub DB. This profile is automatically used as context in ALL future Claude calls for this client — no extra tokens wasted.',
        },
        {
          n: 5, title: 'Load SEO Data',
          body: 'Go to SEO Performance → Load SEO Data. This fetches all posts and pages with their full SEO metadata. Run Meta Optimizer and Category Builder after this.',
        },
      ]} />
      <Tip>The AI Profile is the most important step. Generate it after adding posts/pages so Claude has real content to analyse.</Tip>
    </Section>
  );
}

function Clients() {
  return (
    <Section title="Adding Clients" subtitle="Each client = one WordPress site connection">
      <H3>Client Fields</H3>
      <FieldTable rows={[
        ['Client Name', 'Display name for the client in the hub'],
        ['Site URL', 'Full URL including https:// (e.g. https://myclient.com). No trailing slash needed.'],
        ['API Token', 'From WP Admin → Settings → WPSeoHub Connector. 48-char hex string.'],
        ['Industry', 'Short industry descriptor (e.g. "Real Estate", "Interior Design", "IT Services"). Claude uses this in all AI outputs.'],
        ['Description', 'Tell Claude about the business — what they sell, who their customers are, unique selling points. 2–5 sentences. More detail = better AI output.'],
        ['Weekly Frequency', 'How many posts per week this client publishes. Used for calendar and content plan generation.'],
      ]} />

      <H3>AI Profile Generation</H3>
      <p style={{ fontSize: 13, color: C.t2, lineHeight: 1.8 }}>
        After connecting a client, click <strong>Generate AI Profile</strong>. Claude reads all the client's published posts, tracked keywords, and the description you provided, then builds a comprehensive profile covering:
      </p>
      <ul style={{ fontSize: 13, color: C.t2, lineHeight: 2, paddingLeft: 20 }}>
        <li>Business classification and target audience</li>
        <li>Content themes and tone assessment</li>
        <li>SEO opportunities and keyword gaps</li>
        <li>3-month content strategy and 10 priority keywords</li>
        <li>Brand voice guidelines</li>
      </ul>
      <p style={{ fontSize: 13, color: C.t2, lineHeight: 1.8 }}>
        This profile is stored in the hub database and automatically injected as a cached context block in every future Claude call — so Claude always knows who it's working for without wasting tokens.
      </p>
      <Tip>Regenerate the profile after the site has 20+ posts or whenever the content strategy changes significantly.</Tip>
    </Section>
  );
}

function Dashboard() {
  return (
    <Section title="Post Dashboard" subtitle="Track all client posts in a 4-week rolling view">
      <H3>4-Week View</H3>
      <p style={{ fontSize: 13, color: C.t2, lineHeight: 1.8 }}>
        The current month is divided into exactly 4 equal week buckets (W1–W4). Posts are placed in the week matching their scheduled or published date. Published posts show with a green dot; drafts show amber; scheduled shows blue.
      </p>

      <H3>Adding Posts</H3>
      <StepList steps={[
        { n: 1, title: 'From Dashboard', body: 'Click "+ New Post" in the top bar or the compose button on any week slot.' },
        { n: 2, title: 'From Calendar', body: 'Click any date in the Calendar view — pre-fills the scheduled date.' },
        { n: 3, title: 'From WP Cache', body: 'Posts published directly on WordPress are auto-imported when you click "Refresh from WordPress".' },
      ]} />

      <H3>Post Status</H3>
      <FieldTable rows={[
        ['Draft', 'Saved locally in hub. Not yet pushed to WordPress.'],
        ['Scheduled', 'Has a future date. Will be pushed as a future post on WordPress.'],
        ['Published', 'Live on WordPress. Fetched from WP cache.'],
      ]} />

      <Tip>Click a post card to open the full composer and edit or push it to WordPress.</Tip>
    </Section>
  );
}

function Calendar() {
  return (
    <Section title="Content Calendar" subtitle="Month-view content planning across all clients">
      <p style={{ fontSize: 13, color: C.t2, lineHeight: 1.8 }}>
        The Calendar tab shows a full month grid with all posts across all clients. Each client is shown in a different colour. Click any date to open the Post Composer pre-filled with that date.
      </p>
      <H3>Navigation</H3>
      <ul style={{ fontSize: 13, color: C.t2, lineHeight: 2, paddingLeft: 20 }}>
        <li>Use the left/right arrows to move between months</li>
        <li>Click a post pill to open its composer for editing</li>
        <li>Filter by client using the client chips above the calendar</li>
      </ul>
    </Section>
  );
}

function SeoPerformance() {
  return (
    <Section title="SEO Performance" subtitle="AI meta optimisation, category builder, and site scoring">
      <Info size={14} style={{ display: 'inline', marginRight: 6 }} />
      <span style={{ fontSize: 13, color: C.t3 }}>Requires WPSeoHub Connector plugin + Yoast SEO or RankMath on the WordPress site.</span>

      <H3 mt={20}>Meta Optimizer</H3>
      <StepList steps={[
        { n: 1, title: 'Load SEO Data', body: 'Click "Load SEO Data" to fetch all posts and pages with their current meta from the WordPress site.' },
        { n: 2, title: 'Generate AI Meta', body: 'Click "Generate AI Meta". Claude generates optimized meta titles (50–60 chars) and descriptions (150–160 chars) for all pages — using the stored AI profile for context. Stored in DB; only costs tokens once.' },
        { n: 3, title: 'Review suggestions', body: 'Each page shows Current vs AI Optimized side-by-side. Check character counts (shown in real-time). Pages with no existing meta are flagged red.' },
        { n: 4, title: 'Push to WordPress', body: 'Click "Push to WordPress" per page, or "Push All" to update all at once. Meta is written directly into Yoast/RankMath on the live site.' },
      ]} />

      <H3>Category Builder</H3>
      <p style={{ fontSize: 13, color: C.t2, lineHeight: 1.8 }}>Two modes:</p>
      <ul style={{ fontSize: 13, color: C.t2, lineHeight: 2, paddingLeft: 20 }}>
        <li><strong>Suggest New</strong> — Claude suggests 5 new SEO-optimised categories based on the client's industry and content. Each has a name, slug, and 120–155 char description. Create them on the site individually or all at once.</li>
        <li><strong>Optimize Existing</strong> — Claude reviews all existing categories and suggests improved descriptions, names, or slugs. Shows before/after; apply changes per category with one click.</li>
      </ul>

      <H3>Site Score</H3>
      <p style={{ fontSize: 13, color: C.t2, lineHeight: 1.8 }}>
        Every page is scored 0–100 based on meta title, meta description, focus keyword, OG image, noindex status, and word count. The score blends these factors with the Yoast/RankMath SEO score if available. Pages are sorted worst-first so priority fixes are obvious.
      </p>
    </Section>
  );
}

function Keywords() {
  return (
    <Section title="Search & Keywords" subtitle="GSC data, keyword tracking, and content performance">
      <H3>Search Console Tab</H3>
      <p style={{ fontSize: 13, color: C.t2, lineHeight: 1.8 }}>
        Fetches Google Search Console data through the WPSeoHub Connector plugin (which reads it from Site Kit). Shows total clicks, impressions, avg CTR, avg position, top queries, and top pages for 7/28/90 day ranges.
      </p>
      <Note type="warn">Requires Site Kit by Google installed and connected to Search Console on the WordPress site. See Troubleshooting if GSC data doesn't load.</Note>

      <H3>Keyword Tracker Tab</H3>
      <ul style={{ fontSize: 13, color: C.t2, lineHeight: 2, paddingLeft: 20 }}>
        <li><strong>Manual add</strong> — type any keyword + optional current position and track it.</li>
        <li><strong>Import from Posts</strong> — auto-reads the focus keywords set in Yoast/RankMath on all cached posts and bulk-imports them as tracked keywords.</li>
        <li>Each tracked keyword is cross-referenced against live GSC data to show clicks, impressions, CTR, and position.</li>
      </ul>

      <H3>Content Performance Tab</H3>
      <p style={{ fontSize: 13, color: C.t2, lineHeight: 1.8 }}>
        Maps every post's focus keyword (from Yoast/RankMath) against live GSC query data. Shows which posts are getting impressions and clicks, which are invisible, and which keywords need content improvement. Refresh the post cache first for up-to-date data.
      </p>

      <H3>Recommended Plugins Tab</H3>
      <p style={{ fontSize: 13, color: C.t2, lineHeight: 1.8 }}>
        Lists all recommended WordPress plugins by category. Click <strong>Check Installed</strong> to detect which plugins are currently active on the selected client site — shows Active/Not installed badges for each plugin, detected live from the site.
      </p>
    </Section>
  );
}

function ContextGuide() {
  return (
    <Section title="Claude Context" subtitle="Copy a ready-to-use context prompt for Claude">
      <p style={{ fontSize: 13, color: C.t2, lineHeight: 1.8 }}>
        The Claude Context tab generates a structured prompt that gives Claude full knowledge of a client — company overview, industry, description, content rules, and recent posts with their focus keywords.
      </p>
      <H3>How to use</H3>
      <StepList steps={[
        { n: 1, title: 'Select a client', body: 'Choose the client from the left panel. The prompt is instantly generated with live data.' },
        { n: 2, title: 'Choose posts to include', body: 'Select how many recent posts to include (3–20). More posts = more context for Claude, but longer prompt.' },
        { n: 3, title: 'Copy and paste', body: 'Click "Copy Context". Paste into any Claude conversation (claude.ai, API, desktop app). Claude now knows the full client context.' },
        { n: 4, title: 'Ask Claude anything', body: 'Write blog posts, audit content, suggest keywords, build a content strategy — Claude has all the context it needs without re-explaining every session.' },
      ]} />
      <Tip>The prompt automatically updates when you generate the AI Profile or refresh the post cache. Always copy a fresh prompt for the latest data.</Tip>
      <Note type="info">The hub also injects this context automatically in all AI tasks (Meta Optimizer, Category Builder, etc.) — so the copy-paste version is specifically for your own Claude conversations outside the hub.</Note>
    </Section>
  );
}

function GoogleSearch() {
  return (
    <Section title="Google Search" subtitle="Connect your Google account to submit URLs for indexing, inspect page status, and auto-fix crawl issues">
      <H3>One-Time Setup</H3>
      <StepList steps={[
        { n: 1, title: 'Create a Google Cloud project', body: 'Go to console.cloud.google.com → New Project → give it a name (e.g. "WPSeoHub").' },
        { n: 2, title: 'Enable required APIs', body: 'In your project: APIs & Services → Enable APIs → search and enable "Google Search Console API" and "Web Search Indexing API".' },
        { n: 3, title: 'Create OAuth credentials', body: 'APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID → Application type: Desktop App. Copy the Client ID and Client Secret.' },
        { n: 4, title: 'Add redirect URI', body: 'In the OAuth client settings, under Authorised Redirect URIs, add: http://localhost:3001/api/google/callback' },
        { n: 5, title: 'Add to .env file', body: 'In your hub\'s .env file add:\nGOOGLE_CLIENT_ID=your-client-id\nGOOGLE_CLIENT_SECRET=your-client-secret\nThen restart npm start.' },
        { n: 6, title: 'Connect in hub', body: 'Go to Google Search tab → Click "Connect Google Account" → Authorize in the popup → Done.' },
      ]} />
      <Tip>You only need to do this setup once. The refresh token is stored locally and survives restarts.</Tip>

      <H3>Submitting Pages for Indexing</H3>
      <p style={{ fontSize: 13, color: C.t2, lineHeight: 1.8 }}>
        The <strong>Submit All Posts</strong> button sends every cached page URL to Google's Indexing API — Google then crawls and indexes these pages much faster than waiting for Googlebot to discover them organically. Google allows up to 200 submissions per day.
      </p>
      <Note type="info">You must sync WP posts from Post Dashboard first so the cache is populated. The count shows how many URLs will be submitted.</Note>

      <H3>URL Inspection + AI Fix</H3>
      <p style={{ fontSize: 13, color: C.t2, lineHeight: 1.8 }}>
        Paste any URL from a client site and click <strong>Inspect</strong>. This calls Google Search Console's URL Inspection API and returns the real Google verdict — whether the page is indexed, blocked by robots.txt, has a canonical mismatch, etc.
      </p>
      <p style={{ fontSize: 13, color: C.t2, lineHeight: 1.8, marginTop: 8 }}>
        If the verdict is not PASS, click <strong>Get AI Fix</strong> — Claude analyses the exact indexing problem and provides specific, WordPress-targeted fix instructions.
      </p>

      <H3>Sitemap Submission</H3>
      <p style={{ fontSize: 13, color: C.t2, lineHeight: 1.8 }}>
        Submit your WordPress sitemap so Google can discover all pages. WordPress + Yoast generates one at <code style={{ fontSize: 12, color: C.accent }}>/sitemap.xml</code> or <code style={{ fontSize: 12, color: C.accent }}>/sitemap_index.xml</code>. Rank Math uses <code style={{ fontSize: 12, color: C.accent }}>/sitemap_index.xml</code>.
      </p>

      <H3>Site Matcher</H3>
      <p style={{ fontSize: 13, color: C.t2, lineHeight: 1.8 }}>
        The hub automatically matches your hub clients to their GSC properties. A green "Matched" badge confirms the client's siteUrl corresponds to a verified GSC property in your Google account — required for inspection to work correctly.
      </p>
    </Section>
  );
}

function Plugin() {
  return (
    <Section title="WordPress Plugin" subtitle="WPSeoHub Connector — install, configure, update">
      <H3>Installation</H3>
      <StepList steps={[
        { n: 1, title: 'Download the plugin', body: 'Find wp-seo-hub-connector.php in the wordpress-plugin/wp-seo-hub-connector/ folder of this hub project.' },
        { n: 2, title: 'Upload to WordPress', body: 'WP Admin → Plugins → Add New → Upload Plugin → Choose File → select the ZIP or PHP file → Install Now → Activate.' },
        { n: 3, title: 'Get the API token', body: 'WP Admin → Settings → WPSeoHub Connector. The token is shown on this page. Copy it.' },
        { n: 4, title: 'Paste in hub', body: 'In WPSeoHub → Clients → Add Client → paste the token into the API Token field.' },
      ]} />

      <H3>Plugin Version History</H3>
      <FieldTable rows={[
        ['v1.3.0', 'update-category endpoint (optimize existing categories), plugins-status endpoint (check installed plugins), security improvements'],
        ['v1.2.0', 'create-category endpoint, gsc-status diagnostic endpoint, improved GSC fetch (3 strategies)'],
        ['v1.1.0', 'gsc-data endpoint (Site Kit integration), create-post, upload-media, create-tag'],
        ['v1.0.0', 'Initial release: ping, info, audit, posts, pages, update-meta'],
      ]} />

      <H3>Supported SEO Plugins</H3>
      <p style={{ fontSize: 13, color: C.t2, lineHeight: 1.8 }}>
        WPSeoHub Connector auto-detects and integrates with: <strong>Yoast SEO</strong>, <strong>RankMath</strong>, The SEO Framework, All in One SEO. Meta titles, descriptions, focus keywords, noindex flags, and SEO scores are extracted from whichever plugin is active.
      </p>
      <Note type="info">For focus keyword tracking and content performance to work, Yoast SEO or RankMath must be active on the client site.</Note>

      <H3>Token Security</H3>
      <p style={{ fontSize: 13, color: C.t2, lineHeight: 1.8 }}>
        WPSeoHub never stores or asks for WordPress usernames or passwords. All authentication uses the plugin's 48-character API token only. The token is passed as a query parameter (<code style={{ background: C.bg4, padding: '1px 5px', borderRadius: 3, fontSize: 12 }}>?_wpseo_hub_token=TOKEN</code>) and validated server-side with a timing-safe comparison.
      </p>
      <p style={{ fontSize: 13, color: C.t2, lineHeight: 1.8 }}>
        If a token is compromised, regenerate it from WP Admin → Settings → WPSeoHub Connector → Regenerate Token, then update it in the hub's client settings.
      </p>
    </Section>
  );
}

function Troubleshoot() {
  return (
    <Section title="Troubleshooting" subtitle="Common issues and fixes">
      <AccordionItem title="GSC data not loading" default>
        <ol style={{ fontSize: 13, color: C.t2, lineHeight: 2, paddingLeft: 20 }}>
          <li>Go to <strong>Search & Keywords → Search Console</strong>. If GSC is unavailable, click the diagnostic link to see the exact issue.</li>
          <li>Ensure <strong>Site Kit by Google</strong> is installed and active on the WordPress site.</li>
          <li>In WP Admin → Site Kit, make sure you've connected Search Console (not just installed Site Kit).</li>
          <li>The admin account used to connect Site Kit must have Search Console access in Google Search Console for the site's property.</li>
          <li>Wait 24h after connecting — GSC data has a 2-day processing lag and new connections may need time to sync.</li>
          <li>Update the WordPress plugin to v1.3.0 for the best GSC fetch strategy (HTTP + nonce approach).</li>
        </ol>
        <Note type="info">Running the hub locally (localhost) does NOT affect plugin connectivity. The plugin is on the remote WP server and makes its own requests to Site Kit.</Note>
      </AccordionItem>

      <AccordionItem title="Plugin not detected on client site">
        <ol style={{ fontSize: 13, color: C.t2, lineHeight: 2, paddingLeft: 20 }}>
          <li>Check the site URL in the client settings — must include https:// and match the exact WordPress site URL.</li>
          <li>Confirm the plugin is active (not just installed) in WP Admin → Plugins.</li>
          <li>Test by visiting: <code style={{ fontSize: 12, background: C.bg4, padding: '1px 6px', borderRadius: 3 }}>https://yoursite.com/wp-json/wp-seo-hub/v1/ping</code> — should return JSON with status: ok.</li>
          <li>Check if a firewall or Cloudflare is blocking REST API requests. Whitelist your IP or disable protection temporarily to test.</li>
        </ol>
      </AccordionItem>

      <AccordionItem title="Meta push fails">
        <ol style={{ fontSize: 13, color: C.t2, lineHeight: 2, paddingLeft: 20 }}>
          <li>Confirm the VK API token in the hub matches the one in WP Admin → Settings → WPSeoHub Connector.</li>
          <li>Ensure Yoast SEO or RankMath is installed on the site — meta update writes to their post meta fields.</li>
          <li>Check the Error Log tab in the hub for the exact error message from the push attempt.</li>
        </ol>
      </AccordionItem>

      <AccordionItem title="API server offline error in sidebar">
        <ol style={{ fontSize: 13, color: C.t2, lineHeight: 2, paddingLeft: 20 }}>
          <li>The Express backend is not running. Open a terminal in the hub folder and run: <code style={{ fontSize: 12, background: C.bg4, padding: '2px 8px', borderRadius: 3 }}>npm start</code></li>
          <li>This starts both the React frontend (port 3000) and Express API (port 3001) together.</li>
          <li>After any changes to files in <code>server/</code>, restart npm start for changes to take effect.</li>
        </ol>
      </AccordionItem>

      <AccordionItem title="Claude AI calls not working">
        <ol style={{ fontSize: 13, color: C.t2, lineHeight: 2, paddingLeft: 20 }}>
          <li>Create a <code>.env</code> file in the root of the hub project with: <code>ANTHROPIC_API_KEY=sk-ant-api03-...</code></li>
          <li>Restart the server after adding .env — environment variables are loaded at startup.</li>
          <li>The API key must have sufficient credits. Check your Anthropic Console usage dashboard.</li>
        </ol>
      </AccordionItem>

      <AccordionItem title="Focus keywords not importing from posts">
        <ol style={{ fontSize: 13, color: C.t2, lineHeight: 2, paddingLeft: 20 }}>
          <li>Refresh the post cache first: Dashboard → select client → Refresh from WordPress.</li>
          <li>Focus keywords are stored by Yoast (<code>_yoast_wpseo_focuskw</code>) or RankMath (<code>rank_math_focus_keyword</code>). One of these must be active.</li>
          <li>Check that individual posts have focus keywords set in the Yoast/RankMath block in the WP post editor.</li>
          <li>The WPSeoHub Connector plugin must be v1.1.0+ to expose focus keywords via the audit endpoint.</li>
        </ol>
      </AccordionItem>
    </Section>
  );
}

// ── UI helpers ──────────────────────────────────────────────────────────────

function Section({ title, subtitle, children }) {
  return (
    <div>
      <div style={{ marginBottom: 20, paddingBottom: 14, borderBottom: `1px solid ${C.b2}` }}>
        <h3 style={{ margin: 0, fontSize: 18, fontFamily: C.fontSerif, color: C.t1 }}>{title}</h3>
        {subtitle && <p style={{ margin: '4px 0 0', fontSize: 13, color: C.t3 }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function H3({ children, mt = 16 }) {
  return <div style={{ fontSize: 14, fontWeight: 600, color: C.t1, marginTop: mt, marginBottom: 8 }}>{children}</div>;
}

function StepList({ steps }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
      {steps.map(s => (
        <div key={s.n} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: C.accentBg, border: `1px solid ${C.accentBd}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: C.accent, flexShrink: 0, marginTop: 1 }}>
            {s.n}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.t1, marginBottom: 3 }}>{s.title}</div>
            <div style={{ fontSize: 13, color: C.t2, lineHeight: 1.7 }}>{s.body}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function FieldTable({ rows }) {
  return (
    <div style={{ marginBottom: 16, border: `1px solid ${C.b2}`, borderRadius: 8, overflow: 'hidden' }}>
      {rows.map(([field, desc], i) => (
        <div key={field} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', borderBottom: i < rows.length - 1 ? `1px solid ${C.b1}` : 'none' }}>
          <div style={{ padding: '10px 14px', background: C.bg3, fontSize: 13, fontWeight: 500, color: C.t1, borderRight: `1px solid ${C.b1}` }}>{field}</div>
          <div style={{ padding: '10px 14px', fontSize: 13, color: C.t2, lineHeight: 1.6 }}>{desc}</div>
        </div>
      ))}
    </div>
  );
}

function Tip({ children }) {
  return (
    <div style={{ display: 'flex', gap: 10, padding: '11px 14px', borderRadius: 8, marginBottom: 14, background: C.purpleBg, border: `1px solid ${C.purpleBd}` }}>
      <Zap size={14} color={C.purple} style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ fontSize: 13, color: C.t2, lineHeight: 1.7 }}><strong style={{ color: C.purple }}>Pro tip:</strong> {children}</div>
    </div>
  );
}

function Note({ type = 'info', children }) {
  const isWarn = type === 'warn';
  return (
    <div style={{ display: 'flex', gap: 10, padding: '11px 14px', borderRadius: 8, marginBottom: 14,
      background: isWarn ? C.yellowBg : C.accentBg,
      border: `1px solid ${isWarn ? C.yellowBd : C.accentBd}` }}>
      <Info size={14} color={isWarn ? C.yellow : C.accent} style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ fontSize: 13, color: C.t2, lineHeight: 1.7 }}>{children}</div>
    </div>
  );
}

function AccordionItem({ title, children, default: isOpen = false }) {
  const [open, setOpen] = useState(isOpen);
  return (
    <div style={{ marginBottom: 8, border: `1px solid ${C.b2}`, borderRadius: 9, overflow: 'hidden' }}>
      <button onClick={() => setOpen(!open)}
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 16px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: C.t1 }}>{title}</span>
        {open ? <ChevronUp size={15} color={C.t3} /> : <ChevronDown size={15} color={C.t3} />}
      </button>
      {open && (
        <div style={{ padding: '4px 16px 16px', borderTop: `1px solid ${C.b1}` }}>
          {children}
        </div>
      )}
    </div>
  );
}
