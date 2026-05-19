# WPSeoHub

**AI-powered WordPress SEO management dashboard for agencies and freelancers.**

Manage multiple WordPress client sites, optimise SEO with Claude AI, submit pages to Google for fast indexing, and track rankings — all from a single local dashboard. Your data never leaves your machine.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![React](https://img.shields.io/badge/react-18-blue)](https://react.dev)
[![Claude AI](https://img.shields.io/badge/AI-Claude%20claude--sonnet--4--6-orange)](https://anthropic.com)

> Created by [Konko Maji](https://github.com/konkomaji) · Built with [Claude](https://claude.ai) (Anthropic)

---

## What is WPSeoHub?

WPSeoHub is a **local-first** SEO command centre for WordPress professionals. It connects to your clients' WordPress sites via a companion plugin, pulls live SEO data, and lets you run AI-powered optimisations — all without any cloud dependency or monthly subscription.

**Who is it for?**
- Freelancers managing 2–20 WordPress client sites
- Small to mid-size digital marketing agencies
- WordPress SEO specialists who want AI-assisted workflows

---

## Features

### Multi-Client Management
- Add unlimited WordPress client sites with token-based auth (no passwords stored)
- Generate AI client profiles — Claude analyses the site and builds a comprehensive strategy brief stored locally
- Per-client timezone support for international clients

### Post Dashboard
- Sync all published posts and pages from WordPress
- View SEO scores, focus keywords, meta coverage at a glance
- Write and schedule new posts without opening WordPress admin

### Publishing Calendar
- Visual calendar view of all scheduled content across all clients
- One-click compose from any calendar date
- Weekly frequency targets with progress tracking

### Post Composer (Full WordPress feature set)
- Title, content, excerpt, slug
- Post status: Draft / Publish Now / Schedule / Private
- Focus keyword, meta title (char counter), meta description (char counter)
- Advanced SEO: schema type, canonical URL, noindex/nofollow
- Social/OG: OG title, OG description, Twitter title
- Featured image upload, categories, tags (create inline)
- Comment status, post password

### SEO Performance
- **Meta Optimizer** — AI generates better title/description for every page, push fixes to WordPress with one click
- **Category Builder** — Suggest new categories + optimise existing ones with AI
- **Site Score** — Overall SEO health score with per-page breakdown

### Search & Keywords
- Track keywords with positions
- Import from Google Search Console
- Recommended plugins detector — checks which SEO/performance plugins are active per site

### Google Search (GSC + Indexing API)
- Connect your Google account once — works for all clients
- Submit all published pages to Google Indexing API for fast crawling
- Submit sitemaps, URL inspection, AI-powered fix suggestions for indexing issues

### Claude Context
- Auto-built context prompt: AI profile + published posts + tracked keywords
- Copy and paste into any Claude conversation — Claude knows the full client context

### Settings & Setup
- Add/update API keys from the UI — no manual `.env` editing needed
- Timezone settings — global default + per-client overrides

### In-App Guide
- Full documentation for every feature
- Setup walkthroughs for plugin, Google OAuth, and API keys

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     WPSeoHub (local)                        │
│                                                             │
│  ┌──────────────────┐         ┌───────────────────────┐    │
│  │   React Frontend  │◄──────►│    Express Backend     │    │
│  │   (port 3000)     │  proxy │    (port 3001)         │    │
│  └──────────────────┘        └───────────┬───────────┘    │
│                                           │                 │
│                          data/*.json (local JSON DB)        │
└─────────────────────────────────┬───────────────────────────┘
                                  │
          ┌───────────────────────┼────────────────────┐
          │                       │                    │
   ┌──────▼──────┐      ┌─────────▼──────┐   ┌────────▼───────┐
   │  WordPress   │      │  Anthropic API  │   │  Google APIs   │
   │  + WPSeoHub  │      │  (Claude AI)    │   │  GSC + Indexing│
   │  Connector   │      └─────────────────┘   └────────────────┘
   └─────────────┘
```

- React proxied to Express — same-origin in dev, no CORS issues
- Express calls WordPress REST API via companion plugin (token auth)
- Anthropic API key used **server-side only** — never exposed to browser
- All data stored in `data/*.json` — local, gitignored, never leaves machine

---

## Requirements

| Requirement | Version |
|-------------|---------|
| Node.js | ≥ 18 |
| npm | ≥ 9 |
| WordPress | ≥ 5.9 |
| PHP | ≥ 7.4 |
| Anthropic API key | Required for AI features |
| Google OAuth credentials | Optional (Google Search tab only) |

---

## Installation

### 1. Clone

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

Edit `.env` and add your Anthropic API key, or add it later from **Settings → API Keys** inside the app.

### 4. Start

```bash
npm start
```

Opens React at `http://localhost:3000` + Express API at `http://localhost:3001`.

---

## WordPress Plugin Setup

### Install WPSeoHub Connector

1. Go to `wordpress-plugin/wp-seo-hub-connector/`
2. ZIP the folder
3. WordPress Admin → Plugins → Add New → Upload Plugin → Install → Activate

### Get API token

WordPress Admin → **Settings → WPSeoHub Connector** → copy the token.

### Add to hub

WPSeoHub → **Clients** → Add Client → paste the token.

> No WordPress username or password is ever stored. Token-only authentication.

---

## API Keys

### Anthropic (Claude)
1. [console.anthropic.com](https://console.anthropic.com/settings/keys) → API Keys → Create Key
2. Add in WPSeoHub → Settings → API Keys

### Google (Search Console + Indexing API)
1. [Google Cloud Console](https://console.cloud.google.com) → Create project
2. Enable: **Google Search Console API** + **Web Search Indexing API**
3. Credentials → OAuth 2.0 Client ID → Desktop App
4. Add redirect URI: `http://localhost:3001/api/google/callback`
5. Copy Client ID + Secret → add in WPSeoHub → Settings → API Keys
6. Google Search tab → Connect Google Account

---

## Privacy & Data

- All data (clients, posts, keywords, AI profiles, tokens) stored in `data/` folder — local only
- `data/` and `.env` are gitignored — never committed
- Anthropic API key: server-side only, never in browser
- No telemetry, no analytics, no external calls except to services you explicitly configure

---

## Scripts

| Script | What it does |
|--------|-------------|
| `npm start` | Dev mode — React (3000) + Express (3001) concurrently |
| `npm run client` | React dev server only |
| `npm run server` | Express API only |
| `npm run build` | Build React into `build/` folder |
| `npm run serve` | Production mode — Express serves the built React app on port 3001 |

### Production deployment

```bash
npm run build          # compile React → build/
npm run serve          # serves everything from http://localhost:3001
```

In production mode, Express serves the React build as static files and handles all `/api/` routes — no separate React dev server needed. All data still stays local in the `data/` folder.

---

## Troubleshooting

**API server offline** — run `npm start` from project root. Both servers must run.

**Plugin not detected** — check site URL (no trailing slash), verify token matches exactly, confirm plugin is activated.

**Claude not working** — check ANTHROPIC_API_KEY in Settings → API Keys. Check Error Log tab.

**Google Search not connecting** — verify redirect URI `http://localhost:3001/api/google/callback` is added in Google Cloud Console. Both Search Console API and Indexing API must be enabled.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

1. Fork → branch → PR against `main`
2. Open issue first for major features
3. Test with a real WP site before submitting

---

## License

[MIT](LICENSE)

---

## Credits

**Created by** [Konko Maji](https://github.com/konkomaji) — [work.konkomaji@gmail.com](mailto:work.konkomaji@gmail.com)

**Built with** [Claude](https://claude.ai) by [Anthropic](https://anthropic.com)

**Repo:** [github.com/konkomaji/wp-seo-hub](https://github.com/konkomaji/wp-seo-hub)

---

*WPSeoHub is an independent open-source project, not affiliated with Automattic, WordPress.org, Anthropic, or Google.*
