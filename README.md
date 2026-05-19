<div align="center">

<img src="https://img.shields.io/badge/WPSeoHub-1.0.0-2563EB?style=for-the-badge&labelColor=0F172A" alt="WPSeoHub" />

# WPSeoHub

### AI-Powered WordPress SEO Management Dashboard

**Manage every client site. Optimise every page. Rank faster.**
A local-first, open-source SEO command centre for WordPress agencies and freelancers.

[![License: MIT](https://img.shields.io/badge/License-MIT-2563EB.svg?style=flat-square)](LICENSE)
[![Node](https://img.shields.io/badge/Node.js-%3E%3D18-16A34A?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-2563EB?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![Claude AI](https://img.shields.io/badge/Claude-Sonnet%204.6-DC2626?style=flat-square)](https://anthropic.com)
[![Security Audited](https://img.shields.io/badge/Security-Audited%20%E2%9C%93-16A34A?style=flat-square)](#security)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-7C3AED?style=flat-square)](CONTRIBUTING.md)

**Created by [Konko Maji](https://github.com/konkomaji) · Built with [Claude](https://claude.ai) by [Anthropic](https://anthropic.com)**

[Features](#features) · [Architecture](#architecture) · [Installation](#installation) · [Plugin Setup](#wordpress-plugin) · [Security](#security) · [Contributing](CONTRIBUTING.md)

</div>

---

## What is WPSeoHub?

WPSeoHub is a **free, open-source, local-first** SEO management platform built specifically for WordPress professionals. It connects to multiple WordPress client sites through a lightweight companion plugin, pulls live SEO and content data, and lets you run AI-powered optimisations across all of them from a single dashboard.

No cloud subscription. No SaaS lock-in. No data leaving your machine. Everything runs on `localhost` and your data stays in a local JSON database on your own system.

> **Who is WPSeoHub for?**
> Freelancers managing 2-20 WordPress client sites, small digital marketing agencies, WordPress SEO consultants, and content teams who want AI-assisted SEO workflows without paying per-seat SaaS prices.

---

## Features

### Multi-Client WordPress Management

Connect unlimited WordPress sites through the [WPSeoHub Connector](#wordpress-plugin) companion plugin. Each client gets its own isolated workspace with a dedicated AI profile, keyword tracker, content calendar, and SEO audit history.

- Token-only authentication via the companion plugin REST API -- no WordPress username or password ever stored
- Auto-detected SEO plugin: [Yoast SEO](https://yoast.com/wordpress/plugins/seo/), [RankMath](https://rankmath.com), The SEO Framework, All in One SEO
- Per-client timezone support for global client portfolios
- AI Client Profile: Claude reads all published posts, tracked keywords, and business description, then generates a comprehensive strategy brief stored locally -- injected automatically into every future AI call for that client

---

### Post Dashboard

A rolling 4-week view of all content across every client site, synced from WordPress in real time.

- Sync published posts and pages from WordPress via the connector plugin
- SEO score, focus keyword, meta title/description coverage at a glance
- Word count, reading time, internal/external link count, heading structure
- Amber/green/blue status indicators: draft, published, scheduled
- Write, edit, and schedule new posts without opening WordPress admin

---

### Publishing Calendar

A full month-view calendar showing all scheduled and published content across all connected client sites.

- Colour-coded per client for instant visual clarity
- Click any calendar date to open the Post Composer pre-filled with that date
- Weekly frequency targets with progress indicators
- Sync WordPress-published posts directly onto the calendar grid

---

### Post Composer

A full-featured WordPress post editor built into the hub -- supporting every field that WordPress exposes via its REST API.

| Field Group | Fields |
|-------------|--------|
| **Core** | Title, content (rich), excerpt, slug |
| **Publishing** | Status (draft / scheduled / private), scheduled date with timezone |
| **SEO** | Focus keyword, meta title with character counter (50-60 optimal), meta description with character counter (150-160 optimal) |
| **Advanced SEO** | Canonical URL, noindex, nofollow, schema type |
| **Social** | OG title, OG description, Twitter/X title |
| **Media** | Featured image upload directly from hub, media library selection |
| **Taxonomy** | Categories (create inline), tags (create inline) |
| **Access** | Comment status, post password |

Supports [Yoast SEO](https://yoast.com/wordpress/plugins/seo/) and [RankMath](https://rankmath.com) meta field writes on post creation.

---

### SEO Performance

A full SEO audit and optimisation suite powered by Claude AI.

**Meta Optimizer**
- Load all posts and pages from WordPress with their current Yoast/RankMath meta in one click
- Claude generates optimised meta titles (50-60 chars) and descriptions (150-160 chars) for every page -- using the stored AI client profile as context so every suggestion is brand-aware and keyword-targeted
- Side-by-side current vs. AI-optimised comparison with character count indicators
- Push meta fixes to live WordPress site instantly: single page or bulk push all

**Category Builder**
- Suggest new SEO-optimised categories: Claude analyses the client's content and industry and returns 5 category suggestions with names, slugs, and 120-155 char SEO descriptions
- Optimise existing categories: Claude reviews all current categories and suggests improved names, slugs, and descriptions -- with before/after diff and one-click apply

**Site Score**
- Per-page SEO health score (0-100) based on meta title, meta description, focus keyword, featured image, noindex status, and word count
- Blends Yoast/RankMath native score when available
- Sorted worst-first so priority fixes are immediately visible

---

### Search and Keywords

**Google Search Console Data**
- Fetches GSC data via the [WPSeoHub Connector](./wordpress-plugin/wp-seo-hub-connector/) which integrates with [Google Site Kit](https://sitekit.withgoogle.com) on each client WordPress site
- Shows total clicks, impressions, average CTR, average position for 7 / 28 / 90 day windows
- Top queries and top pages breakdowns

**Keyword Tracker**
- Track any keyword with current position
- Bulk import focus keywords from Yoast/RankMath across all cached posts
- Cross-reference tracked keywords against live GSC query data for clicks, impressions, CTR, and position overlays

**Content Performance**
- Maps every post's Yoast/RankMath focus keyword against live GSC query data
- Shows which posts are getting impressions, which are invisible, and which keywords need content updates

**Recommended Plugins**
- Curated list of WordPress SEO and performance plugins by category
- Check Installed: detects which plugins are active on the selected client site live via the connector plugin API

---

### Google Search (GSC + Indexing API)

Connect your Google account once and manage Google indexing for all client sites you have Search Console access to.

- **Submit for Indexing**: sends all cached page URLs to [Google's Indexing API](https://developers.google.com/search/apis/indexing-api/v3/quickstart) -- Google crawls and indexes pages significantly faster than organic Googlebot discovery (up to 200 URLs/day per project)
- **Sitemap Submission**: submit WordPress sitemaps directly to Search Console
- **URL Inspection**: paste any URL and call the [URL Inspection API](https://developers.google.com/webmaster-tools/v1/api_reference_index) -- returns Google's real verdict: indexed, blocked by robots.txt, canonical mismatch, crawl errors
- **AI Fix**: if a URL fails inspection, Claude analyses the exact indexing problem and returns specific, WordPress-targeted fix instructions
- **Site Matcher**: automatically matches hub clients to their GSC properties for accurate inspection results

---

### Claude Context

Dynamically built context prompt for use in external Claude conversations.

- Auto-builds from: AI client profile, all published WordPress posts (from live cache), all tracked keywords sorted by position, content rules
- Copy with one click -- paste into [Claude.ai](https://claude.ai) or any API call and Claude has full client context
- Character count, post count, and keyword count displayed
- Auto-refreshes whenever the AI profile is regenerated or the post cache is updated
- Also injected automatically as cached system prompt blocks in all hub-internal AI calls (Meta Optimizer, Category Builder, content generation) -- no manual copy needed inside the hub

---

### Settings and API Keys

- Add and update API keys from within the app -- no manual `.env` file editing required
- Keys written to local `.env` and reloaded live without restarting the server
- Values are masked in the UI (prefix + last 4 chars) and never returned in full
- Per-client timezone overrides with global default fallback
- Step-by-step in-app guides for obtaining each API key

---

### In-App Guide

Complete interactive documentation covering every feature, setup step, troubleshooting checklist, and security note -- built into the app itself under the Guide tab.

---

## Architecture

```
+------------------------------------------------------------------+
|                    WPSeoHub  (runs on localhost)                 |
|                                                                  |
|  +----------------------+      +-----------------------------+   |
|  |   React 18 Frontend  |<---->|   Express.js API Server     |   |
|  |   localhost:3000     | dev  |   127.0.0.1:3001            |   |
|  |   (Poppins, blue/    | proxy|                             |   |
|  |    white theme)      |      |  /api/clients               |   |
|  +----------------------+      |  /api/posts                 |   |
|                                |  /api/claude                |   |
|                                |  /api/gsc                   |   |
|                                |  /api/google                |   |
|                                |  /api/keywords              |   |
|                                |  /api/env                   |   |
|                                |  /api/settings              |   |
|                                +-------------|---------------+   |
|                                              |                   |
|                           +------------------+                   |
|                           |  data/ (local JSON database)         |
|                           |  clients.json                        |
|                           |  wp_cache.json                       |
|                           |  keywords.json                       |
|                           |  client_profiles.json                |
|                           |  audit_history.json                  |
|                           |  (gitignored, stays on your machine) |
|                           +------------------+                   |
+----------------------------------|---------------------------------+
                                   |
          +-----------------------+-+--------------------+
          |                       |                      |
+---------v---------+   +---------v----------+  +--------v---------+
|  WordPress Sites  |   |   Anthropic API    |  |   Google APIs    |
|                   |   |                    |  |                  |
|  WPSeoHub         |   |  claude-sonnet-4-6 |  |  Search Console  |
|  Connector Plugin |   |  Prompt caching    |  |  Indexing API    |
|  REST: /wp-seo-   |   |  (ephemeral cache  |  |  URL Inspection  |
|  hub/v1/          |   |   system blocks)   |  |  OAuth 2.0       |
|                   |   |                    |  |                  |
|  Token auth via   |   |  Server-side only  |  |  googleapis npm  |
|  X-WPSeoHub-Token |   |  Never in browser  |  |  v140.0.1        |
|  header           |   |                    |  |                  |
+-------------------+   +--------------------+  +------------------+
```

**Key design decisions:**

- **Localhost-only binding**: Express binds to `127.0.0.1` exclusively -- unreachable from any other machine on your network
- **Local JSON database**: `data/*.json` files act as the database -- no PostgreSQL, no MongoDB, zero infrastructure
- **Token in header, not URL**: WordPress API tokens sent via `X-WPSeoHub-Token` header to avoid exposure in server access logs, CDN logs, or browser history
- **Anthropic key server-side**: the API key lives in `.env`, loaded by Express only -- the React frontend never sees it
- **Prompt caching**: Claude system prompt blocks are marked `ephemeral` so repeated calls for the same client get cache hits and use fewer tokens
- **Plugin REST namespace**: `wp-seo-hub/v1` -- isolated from core WordPress REST endpoints

---

## Security

**Security-audited by Claude (Anthropic) with the following protections implemented:**

### Network Isolation
- Express server binds exclusively to `127.0.0.1` -- not `0.0.0.0`. Anyone on your local network (office WiFi, shared hotspot) cannot reach the hub API
- CORS policy restricted to `localhost` and `127.0.0.1` origins only -- no cross-origin requests from external websites accepted

### Authentication
- All WordPress REST API requests authenticated via `X-WPSeoHub-Token` HTTP header -- token never appears in URLs, server access logs, CDN logs, or browser history
- WordPress plugin uses PHP's `hash_equals()` for timing-safe token comparison -- prevents timing-based token inference attacks
- Brute-force lockout: 10 failed token attempts per IP triggers a 15-minute lockout enforced via WordPress transients

### Rate Limiting
- Claude API calls rate-limited to 20 requests per minute at the Express layer -- prevents credential abuse if port 3001 is somehow reached

### File Upload Security
- Media upload endpoint restricts accepted files to image MIME types only (JPEG, PNG, GIF, WebP, AVIF, SVG)
- MIME type verified using PHP's `finfo` file inspection -- not just file extension or client-supplied Content-Type header

### Data Minimisation
- `/info` endpoint does not expose WordPress admin email address
- `create-post` endpoint restricted to `draft` and `future` statuses only -- token alone cannot immediately publish content to a live site
- `/plugins-status` included only for plugin compatibility detection

### Local Data Privacy
- `data/` folder and `.env` are gitignored -- cannot be accidentally committed to version control
- No telemetry, no analytics, no usage tracking of any kind
- Google OAuth tokens stored locally in `data/google_tokens.json` (gitignored)

### What a stolen token can and cannot do

| Action | With Token | Without Token |
|--------|-----------|---------------|
| Read post content and SEO metadata | Yes | No |
| Update meta title / description | Yes | No |
| Create a draft post | Yes | No |
| Immediately publish content | **No** | No |
| Upload executable files | **No** | No |
| Access WordPress admin | **No** | No |
| Access WordPress user passwords | **No** | No |
| Reach hub API remotely | **No** | No |

> **If a token is compromised**: regenerate it from **WordPress Admin > Settings > WPSeoHub Connector > Regenerate Token**, then update it in the hub's Clients settings. The old token is immediately invalidated.

---

## Requirements

| Requirement | Version | Notes |
|-------------|---------|-------|
| [Node.js](https://nodejs.org) | >= 18 | Required |
| npm | >= 9 | Included with Node |
| [WordPress](https://wordpress.org) | >= 5.9 | On each client site |
| PHP | >= 7.4 | On each client WordPress server |
| [Anthropic API key](https://console.anthropic.com) | Any | Required for all AI features |
| [Yoast SEO](https://yoast.com/wordpress/plugins/seo/) or [RankMath](https://rankmath.com) | Any free version | Required for meta read/write |
| [Google Site Kit](https://sitekit.withgoogle.com) | Any | Required for GSC data via plugin |
| Google OAuth credentials | Any | Optional, Google Search tab only |

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/konkomaji/wp-seo-hub.git
cd wp-seo-hub
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Open `.env` and add your Anthropic API key. Or skip this step and add the key later from **Settings > API Keys** inside the running app.

```env
ANTHROPIC_API_KEY=sk-ant-...
```

### 4. Start the dev server

```bash
npm start
```

This starts both the React frontend at `http://localhost:3000` and the Express API at `http://localhost:3001` concurrently using [concurrently](https://www.npmjs.com/package/concurrently).

---

## WordPress Plugin

The **WPSeoHub Connector** is a lightweight WordPress plugin that exposes a secure REST API under `/wp-json/wp-seo-hub/v1/`. It is the bridge between the hub and each WordPress client site.

### Install

1. Navigate to `wordpress-plugin/wp-seo-hub-connector/` in this repository
2. ZIP the entire `wp-seo-hub-connector` folder
3. WordPress Admin > Plugins > Add New > Upload Plugin > Install Now > Activate

### Get your API token

WordPress Admin > **Settings > WPSeoHub Connector**

Copy the 48-character hex token displayed on the settings page.

### Connect to hub

WPSeoHub > **Clients > Add Client** > paste the token into the API Token field > Test Connection > Save.

### Plugin REST API endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/ping` | Public | Health check and plugin/SEO plugin detection |
| GET | `/info` | Token | Site info, WP version, language, timezone, analytics |
| GET | `/audit` | Token | Full SEO audit of all posts and pages with rich metadata |
| GET | `/posts` | Token | Paginated posts with full SEO meta |
| GET | `/pages` | Token | Paginated pages with full SEO meta |
| POST | `/update-meta` | Token | Write meta title, description, focus keyword via Yoast/RankMath |
| GET | `/gsc-data` | Token | GSC performance data via Site Kit (clicks, impressions, CTR, position) |
| GET | `/gsc-status` | Token | Diagnostic: checks Site Kit auth state for all admin users |
| POST | `/create-post` | Token | Create draft or scheduled post with full SEO metadata |
| POST | `/upload-media` | Token | Upload image to WordPress media library |
| POST | `/create-category` | Token | Create a new post category with SEO description |
| POST | `/update-category` | Token | Update an existing category name, slug, or description |
| GET | `/plugins-status` | Token | Detect which SEO, analytics, and utility plugins are active |

**Supported SEO plugins (auto-detected):** [Yoast SEO](https://yoast.com/wordpress/plugins/seo/), [RankMath](https://rankmath.com), [The SEO Framework](https://theseoframework.com), [All in One SEO](https://aioseo.com)

---

## API Keys

### Anthropic API Key (Claude AI)

1. Sign in at [console.anthropic.com](https://console.anthropic.com/settings/keys)
2. Create a new API key
3. In WPSeoHub: **Settings > API Keys > Anthropic** > paste and save

The key is stored in your local `.env` file and loaded server-side only. It is never sent to the browser.

### Google APIs (Search Console + Indexing API)

Required only for the **Google Search** tab.

1. Go to [Google Cloud Console](https://console.cloud.google.com) > New Project
2. APIs and Services > Enable APIs > enable both:
   - **Google Search Console API**
   - **Web Search Indexing API**
3. APIs and Services > Credentials > Create Credentials > OAuth 2.0 Client ID > Application type: **Desktop App**
4. Under Authorised Redirect URIs, add exactly: `http://localhost:3001/api/google/callback`
5. Copy the Client ID and Client Secret
6. In WPSeoHub: **Settings > API Keys** > paste both values and save
7. Go to **Google Search** tab > Connect Google Account > authorise in the popup

Your refresh token is stored in `data/google_tokens.json` (local, gitignored). One connection covers all client sites you have Search Console access to.

---

## Production Build

```bash
npm run build     # compiles React into build/
npm run serve     # Express serves everything from http://localhost:3001
```

In production mode (`NODE_ENV=production`), Express serves the compiled React app as static files alongside all API routes. No separate React dev server needed.

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Dev: React on port 3000 + Express on port 3001 (concurrently) |
| `npm run client` | React dev server only |
| `npm run server` | Express API server only |
| `npm run build` | Compile React into `build/` folder |
| `npm run serve` | Production: Express serves built React + API from port 3001 |

---

## Privacy and Data

WPSeoHub is built on a **local-first** principle. Every piece of data it generates or collects stays on your machine.

- All client data, cached posts, keywords, AI profiles, and audit history stored in `data/*.json` on your local filesystem
- `data/` is gitignored -- it cannot be committed or pushed to any repository
- `.env` is gitignored -- API keys cannot be accidentally published
- No telemetry, no analytics, no crash reporting, no external calls except to services you explicitly configure (Anthropic, Google, your client WordPress sites)
- Deleting the `data/` folder completely resets all hub data

---

## Troubleshooting

**API server offline banner in sidebar**
Run `npm start` from the project root. Both React and Express must be running. After editing files in `server/`, restart the server.

**WPSeoHub Connector not detected on client site**
Check that the plugin is activated (not just installed) in WordPress Admin > Plugins. Verify the site URL in hub Clients settings includes `https://` and matches the exact WordPress site URL with no trailing slash. Test by visiting `https://yoursite.com/wp-json/wp-seo-hub/v1/ping` in a browser -- should return JSON with `"status":"ok"`.

**API token test failing**
Confirm the token in hub Clients matches exactly the one in WordPress Admin > Settings > WPSeoHub Connector. Tokens are 48-character hex strings. Regenerate the token in WP if unsure, then update in the hub.

**Claude AI not responding**
Check Settings > API Keys > Anthropic shows a key is set. Check the Error Log tab for the specific error. Verify the key has sufficient Anthropic credits at [console.anthropic.com](https://console.anthropic.com).

**GSC data not loading**
Install [Google Site Kit](https://sitekit.withgoogle.com) on the client WordPress site. In WordPress Admin > Site Kit, connect Search Console. The admin account used to connect Site Kit must have Search Console access to the site's property. GSC data has a 2-day processing delay.

**Google Search tab not connecting**
Verify the redirect URI `http://localhost:3001/api/google/callback` is listed in your Google Cloud OAuth client settings. Both Search Console API and Indexing API must be enabled in your Google Cloud project.

**Focus keywords not importing**
Refresh the WP post cache first (Dashboard > select client > Refresh from WordPress). Yoast SEO or RankMath must be active on the client site with focus keywords set in individual posts.

---

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for full guidelines.

**Quick start:**
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes and test with a real WordPress site
4. Submit a pull request against `main`

Open an issue first for major features or breaking changes.

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

---

## License

[MIT License](LICENSE) -- free to use, modify, and distribute.

---

## Credits

**Created by** [Konko Maji](https://github.com/konkomaji) -- [work.konkomaji@gmail.com](mailto:work.konkomaji@gmail.com)

**Built with** [Claude](https://claude.ai) by [Anthropic](https://anthropic.com)

**Powered by:**
- [React](https://react.dev) 18 -- frontend UI
- [Express.js](https://expressjs.com) -- local API server
- [Anthropic SDK](https://www.npmjs.com/package/@anthropic-ai/sdk) -- Claude AI integration
- [googleapis](https://www.npmjs.com/package/googleapis) -- Google Search Console and Indexing API
- [Lucide React](https://lucide.dev) -- icon system
- [date-fns](https://date-fns.org) -- date utilities
- [Poppins](https://fonts.google.com/specimen/Poppins) -- UI typeface

---

<div align="center">

**[github.com/konkomaji/wp-seo-hub](https://github.com/konkomaji/wp-seo-hub)**

*WPSeoHub is an independent open-source project, not affiliated with Automattic, WordPress.org, Anthropic, or Google.*

</div>
