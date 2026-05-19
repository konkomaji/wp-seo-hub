# Changelog

All notable changes to WPSeoHub will be documented here.

Format: [Semantic Versioning](https://semver.org/) — `MAJOR.MINOR.PATCH`

---

## [1.0.0] — 2025

### Initial Open-Source Release

**Core Features**
- Multi-client WordPress site management
- Post Dashboard with WP cache sync and SEO score display
- Publishing Calendar with drag-and-drop scheduling
- Post Composer with full WordPress fields (status, scheduling, SEO meta, OG tags, schema type, comments, password protection)

**AI Features (Claude)**
- AI Client Profile generation — stored and auto-injected as context in all Claude calls
- Meta Optimizer — AI-suggested titles and descriptions for all pages
- Category Builder — suggest new categories and optimise existing ones
- Claude Context tab — auto-built context prompt from live data (posts + keywords + profile)
- All AI powered by Claude claude-sonnet-4-6 with prompt caching

**SEO Tools**
- SEO Auditor — per-page score, meta coverage, focus keyword tracking
- Keyword Tracker with position tracking and Search Console import
- Recommended Plugins detector — checks which SEO plugins are active on each WP site

**Google Search**
- Google OAuth 2.0 — connect your Google account (one account, all clients)
- URL submission to Google Indexing API (fast-track indexing)
- Sitemap submission via Search Console API
- URL Inspection — full Google verdict per page
- AI Fix — Claude analyses inspection result and gives WordPress-specific fix steps

**Settings**
- Dynamic API key management — add/update Anthropic and Google keys from UI, no manual .env editing
- Timezone settings — global default + per-client overrides
- All settings persisted to local JSON DB

**WordPress Plugin (v1.0.0)**
- REST API companion plugin (`wp-seo-hub-connector`)
- Endpoints: ping, info, audit, create-post, update-meta, upload-media, create-tag, create-category, update-category, plugins-status
- Token-based authentication — no username/password ever stored
- Yoast SEO + RankMath full field support

**Infrastructure**
- Local JSON file database — all data stays on your machine
- Express.js backend proxied from React dev server
- Error Log tab — captures all API errors with stack traces
- Guide tab — full in-app documentation

---

## WordPress Plugin Changelog

### [1.0.0]
- Initial release as WPSeoHub Connector
- All endpoints from VK SEO Connector rebranded and cleaned up
- Namespace: `wp-seo-hub/v1`
