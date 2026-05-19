# Contributing to WPSeoHub

Thank you for considering contributing to WPSeoHub! This is an open-source tool built for WordPress SEO professionals, and community contributions are welcome.

## Project Overview

WPSeoHub is a local-first, AI-powered SEO management dashboard for agencies and freelancers who manage multiple WordPress sites. It runs entirely on your machine — no cloud, no SaaS, no data leaving your system.

**Stack:** React (CRA) + Express.js + JSON file DB + WordPress REST Plugin + Claude AI + Google APIs

---

## Getting Started

1. Fork the repo
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/wp-seo-hub.git`
3. Install dependencies: `npm install`
4. Copy `.env.example` → `.env` and fill in your API keys
5. Start the app: `npm start`

---

## How to Contribute

### Bug Reports
Use the [Bug Report](.github/ISSUE_TEMPLATE/bug_report.md) template. Include:
- Steps to reproduce
- Expected vs actual behaviour
- OS + Node version
- Relevant error logs (from the Error Log tab)

### Feature Requests
Use the [Feature Request](.github/ISSUE_TEMPLATE/feature_request.md) template. Be specific about the use case — this tool is for WordPress SEO agencies, so features should serve that audience.

### Pull Requests
1. Open an issue first to discuss the change
2. Create a branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Test locally (start the app, check the affected feature)
5. Submit a PR against the `main` branch
6. Fill in the PR template

---

## Code Style

- **React components**: functional components with hooks
- **Styles**: inline styles using `C` from `src/theme.js` — no external CSS frameworks
- **No TypeScript**: plain JS/JSX — keep it accessible to contributors of all levels
- **Comments**: only when the WHY is non-obvious
- **Backend routes**: Express Router in `server/routes/` — follow existing patterns

---

## Project Structure

```
wp-seo-hub/
├── public/                  # CRA public assets
├── src/
│   ├── components/          # React page components
│   ├── store/store.js       # Frontend API layer (fetch wrappers)
│   ├── utils/wpApi.js       # WordPress + WPSeoHub plugin API helpers
│   ├── theme.js             # Central design tokens (all colours + fonts)
│   └── version.js           # App version string
├── server/
│   ├── routes/              # Express API routes
│   ├── db.js                # JSON file database helpers
│   ├── auto-refresh.js      # Background WP cache refresh
│   └── index.js             # Server entry point
├── wordpress-plugin/
│   └── wp-seo-hub-connector/ # WordPress companion plugin (PHP)
├── data/                    # Runtime JSON data (gitignored)
├── .env.example             # Environment variable template
└── package.json
```

---

## WordPress Plugin

The WordPress companion plugin (`wordpress-plugin/wp-seo-hub-connector/`) is a single PHP file that adds custom REST API endpoints to WordPress. It requires no database — all data goes through the hub's local JSON store.

When modifying the plugin:
- Bump `WPSEO_HUB_VERSION` in the PHP constant and plugin header
- Update the version in the PHP file and in `src/version.js`
- Test against both Yoast SEO and RankMath

---

## Reporting Security Issues

Do **not** open a public GitHub issue for security vulnerabilities. Email directly: **work.konkomaji@gmail.com**

---

## Code of Conduct

Be respectful. This is a small open-source project — treat contributors and maintainers with basic professional courtesy. Issues or PRs with hostile language will be closed.

---

## Credits

Created by [Konko Maji](https://github.com/konkomaji) with [Claude](https://claude.ai) (Anthropic).
