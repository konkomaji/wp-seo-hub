const router = require('express').Router();
const db = require('../db');

function getAnthropic() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set. Add it to .env file.');
  const Anthropic = require('@anthropic-ai/sdk');
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// Builds system prompt blocks for any client-facing Claude call.
// Block 1 (agency context) + Block 2 (stored AI client profile if available).
// Both marked ephemeral so they're cache-hit on repeated calls for same client.
function buildSystemBlocks(client, profile) {
  const blocks = [
    {
      type: 'text',
      text: `You are a senior SEO strategist and WordPress expert. You specialise in WordPress SEO, content strategy, and sustainable organic growth. You are data-driven, specific, and actionable — never generic. Always factor in the client's market, target audience, and industry-specific nuances.`,
      cache_control: { type: 'ephemeral' },
    },
  ];

  if (profile?.content) {
    blocks.push({
      type: 'text',
      text: `STORED CLIENT PROFILE (AI-generated, use as primary context for all recommendations)\n${'='.repeat(60)}\n${profile.content}`,
      cache_control: { type: 'ephemeral' },
    });
  }

  return blocks;
}

// Reads the stored AI profile for a client (or null).
function getProfile(clientId) {
  const profiles = db.read('client_profiles', {});
  return profiles[clientId] || null;
}

// ── GET profiles ──────────────────────────────────────────────────────────────

router.get('/profiles', (req, res) => res.json(db.read('client_profiles', {})));

router.get('/profile/:clientId', (req, res) => {
  const profiles = db.read('client_profiles', {});
  const profile  = profiles[req.params.clientId];
  if (!profile) return res.status(404).json({ error: 'No profile yet' });
  res.json(profile);
});

// ── POST /generate — content strategy tasks ───────────────────────────────────

router.post('/generate', async (req, res) => {
  let anthropic;
  try { anthropic = getAnthropic(); } catch (e) { return res.status(400).json({ error: e.message }); }

  const { clientId, task = 'suggest-posts' } = req.body;
  const clients    = db.read('clients', []);
  const clientData = clients.find(c => c.id === clientId);
  if (!clientData) return res.status(404).json({ error: 'Client not found' });

  const wpCache    = db.read('wp_cache', {});
  const localPosts = db.read('local_posts', {});
  const keywords   = db.read('keywords', {});

  const clientPosts = wpCache[clientId]?.posts || [];
  const drafts      = localPosts[clientId] || [];
  const trackedKws  = keywords[clientId] || [];

  const recentPosts = clientPosts.slice(0, 25).map(p => {
    const title = p.title?.rendered?.replace(/<[^>]*>/g, '') || p.title || '(no title)';
    const date  = p.date ? new Date(p.date).toLocaleDateString('en-IN') : 'unknown';
    const kw    = p.focus_keyword ? ` [kw: ${p.focus_keyword}]` : '';
    return `- "${title}" (${date})${kw}`;
  }).join('\n') || '  No published posts cached yet.';

  const draftList = drafts.slice(0, 10).map(p =>
    `- "${p.title || 'Untitled'}"${p.focusKeyword ? ` [kw: ${p.focusKeyword}]` : ''}`
  ).join('\n');

  const kwList = trackedKws.map(kw => {
    const latest = kw.history?.slice(-1)?.[0];
    const prev   = kw.history?.slice(-2, -1)?.[0];
    const trend  = latest && prev ? (prev.pos - latest.pos > 0 ? ` ↑${prev.pos - latest.pos}` : prev.pos - latest.pos < 0 ? ` ↓${latest.pos - prev.pos}` : ' ═') : '';
    return `- "${kw.keyword}"${latest ? ` #${latest.pos}${trend}` : ' (no position yet)'}`;
  }).join('\n');

  const taskPrompts = {
    'suggest-posts': `Generate 5 unique blog post ideas. For each provide:
1. SEO-optimised post title (50–60 chars)
2. Primary focus keyword + 2 LSI keywords
3. Target audience angle (specific for Indian market)
4. Brief content outline (3–4 H2 headings)
5. One-line rationale — why this fits their SEO strategy

Do NOT duplicate any existing posts listed above.`,

    'audit-keywords': `Analyse the tracked keywords:
1. QUICK WINS — keywords ranking 11–20 (page 2): exact improvements to break page 1
2. NEW OPPORTUNITIES — 5 new keywords based on industry + content gaps
3. AT-RISK — any slipping keywords and why
4. ACTION PLAN — prioritised next 30 days`,

    'monthly-strategy': `Build a 30-day content calendar:
- ${clientData.weeklyFrequency} posts/week per their target frequency
- Each post: title, focus keyword, target audience, recommended publish date
- Mix of informational, commercial, and local SEO content
- Seasonal/trending topics for ${clientData.industry || 'the industry'} in India
- End with 3 quick wins (low effort, high impact)`,
  };

  const profile = getProfile(clientId);

  const userPrompt = `CLIENT: ${clientData.name}
SITE: ${clientData.siteUrl}
INDUSTRY: ${clientData.industry || 'Not specified'}
FREQUENCY: ${clientData.weeklyFrequency} posts/week
${clientData.description && !profile ? `\nDESCRIPTION\n-----------\n${clientData.description}\n` : ''}
PUBLISHED POSTS (${clientPosts.length} total)
${'-'.repeat(30)}
${recentPosts}

${draftList ? `LOCAL DRAFTS\n${'-'.repeat(12)}\n${draftList}\n\n` : ''}${kwList ? `TRACKED KEYWORDS (with positions)\n${'-'.repeat(34)}\n${kwList}\n\n` : ''}TASK
${'-'.repeat(4)}
${taskPrompts[task] || taskPrompts['suggest-posts']}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 2048,
      system: buildSystemBlocks(clientData, profile),
      messages: [{ role: 'user', content: userPrompt }],
    });
    res.json({ content: message.content[0].text, usage: message.usage, model: message.model });
  } catch (e) {
    console.error('[Claude generate]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── POST /profile — one-time AI client profiling ──────────────────────────────

router.post('/profile', async (req, res) => {
  let anthropic;
  try { anthropic = getAnthropic(); } catch (e) { return res.status(400).json({ error: e.message }); }

  const { clientId } = req.body;
  const clients  = db.read('clients', []);
  const client   = clients.find(c => c.id === clientId);
  if (!client) return res.status(404).json({ error: 'Client not found' });

  const wpCache      = db.read('wp_cache', {});
  const localPosts   = db.read('local_posts', {});
  const keywords     = db.read('keywords', {});
  const auditHistory = db.read('audit_history', []);

  const clientPosts = wpCache[clientId]?.posts || [];
  const drafts      = localPosts[clientId] || [];
  const trackedKws  = keywords[clientId] || [];
  const lastAudit   = auditHistory
    .filter(r => r.clientId === clientId)
    .sort((a, b) => new Date(b.ts) - new Date(a.ts))[0];

  const allTitles = clientPosts.map(p => {
    const t  = p.title?.rendered?.replace(/<[^>]*>/g, '') || p.title || '';
    const kw = p.focus_keyword ? ` [${p.focus_keyword}]` : '';
    const cat = p.categories_names?.length ? ` (${p.categories_names[0]})` : '';
    return `- ${t}${kw}${cat}`;
  }).join('\n') || '(no published content)';

  const kwSummary = trackedKws.map(kw => {
    const latest = kw.history?.slice(-1)?.[0];
    return `- "${kw.keyword}" → pos ${latest?.pos ?? '?'}`;
  }).join('\n');

  const auditSummary = lastAudit ? `
Last audit: ${new Date(lastAudit.ts).toLocaleDateString('en-IN')}
  Total pages: ${lastAudit.stats?.total ?? 0}
  Avg score: ${lastAudit.stats?.avg ?? 0}%  |  Errors: ${lastAudit.stats?.errors ?? 0}  |  Warnings: ${lastAudit.stats?.warnings ?? 0}` : '';

  // No existing profile yet — just the agency block
  const agencyBlock = buildSystemBlocks(client, null);

  const userPrompt = `Build a comprehensive SEO & content strategy profile for this client. Analyse everything and produce a detailed, structured profile that will be stored and used to guide all future AI-assisted work for this client.

CLIENT DETAILS
--------------
Name: ${client.name}
Website: ${client.siteUrl}
Industry (self-reported): ${client.industry || 'Not specified'}
Publishing frequency: ${client.weeklyFrequency} posts/week
Notes: ${client.description || 'None provided'}

PUBLISHED CONTENT (${clientPosts.length} posts/pages)
${'-'.repeat(40)}
${allTitles}

${drafts.length > 0 ? `LOCAL DRAFTS (${drafts.length})
${drafts.map(d => `- "${d.title || 'Untitled'}"${d.focusKeyword ? ` [${d.focusKeyword}]` : ''}`).join('\n')}

` : ''}${kwSummary ? `TRACKED KEYWORDS\n${'-'.repeat(20)}\n${kwSummary}\n\n` : ''}${auditSummary ? `SEO AUDIT HISTORY\n${'-'.repeat(18)}\n${auditSummary}\n\n` : ''}GENERATE THE FOLLOWING PROFILE SECTIONS:

## 1. BUSINESS CLASSIFICATION
- Precise industry / sub-industry
- Business model (B2B / B2C / B2B2C / D2C)
- Geographic focus (local city / regional / national / international)
- Estimated audience profile

## 2. TARGET AUDIENCE
- Primary persona (demographics, intent, pain points, search behaviour)
- Secondary personas if applicable
- Search intent patterns typical for this industry

## 3. CONTENT ANALYSIS
- Core content themes found in published posts
- Content style and tone assessment
- Average content depth (thin / medium / comprehensive)
- Best performing content types present

## 4. SEO POSITION ASSESSMENT
- Current keyword landscape summary
- Quick wins visible (page 2 keyword opportunities)
- Obvious content gaps vs. industry standards
- Technical SEO health observations

## 5. CONTENT STRATEGY RECOMMENDATIONS (NEXT 3 MONTHS)
- Top 5 priority content pillars
- Recommended content cadence and mix (ratio of informational : commercial : local)
- 10 specific target keywords with rationale
- Topics to avoid (cannibalisation / irrelevant)

## 6. BRAND VOICE GUIDE
- Tone (professional / conversational / authoritative / etc.)
- Style guidelines for future content
- Language preferences (en-IN specifics, avoid jargon to avoid)
- CTA style that fits this business

Be specific. Reference actual post titles and keywords from the data above. This profile will be stored and referenced by AI tools for all future content work for this client.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 3500,
      system: agencyBlock,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const profile = {
      clientId,
      content:     message.content[0].text,
      usage:       message.usage,
      generatedAt: new Date().toISOString(),
    };

    const profiles = db.read('client_profiles', {});
    profiles[clientId] = profile;
    db.write('client_profiles', profiles);

    res.json(profile);
  } catch (e) {
    console.error('[Claude profile]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── POST /seo-analysis — post-audit Claude analysis ───────────────────────────

router.post('/seo-analysis', async (req, res) => {
  let anthropic;
  try { anthropic = getAnthropic(); } catch (e) { return res.status(400).json({ error: e.message }); }

  const { clientId, auditData = [], gscData, auditRunId } = req.body;
  const clients = db.read('clients', []);
  const client  = clients.find(c => c.id === clientId);
  if (!client) return res.status(404).json({ error: 'Client not found' });

  const profiles = db.read('client_profiles', {});
  const profile  = profiles[clientId];

  const totalItems  = auditData.length;
  const avgScore    = totalItems > 0
    ? Math.round(auditData.reduce((s, i) => s + (i.score || 0), 0) / totalItems)
    : 0;
  const errorCount  = auditData.filter(i => i.issues?.some(x => x.level === 'error')).length;
  const warnCount   = auditData.filter(i => i.issues?.some(x => x.level === 'warn')).length;
  const noindexCount = auditData.filter(i => i.isNoindex).length;

  // Top 20 worst-scoring pages for detailed analysis
  const topIssues = [...auditData]
    .filter(i => i.issues?.length > 0)
    .sort((a, b) => a.score - b.score)
    .slice(0, 20)
    .map(i => [
      `PAGE: "${i.title}" [${i.type}] — Score: ${i.score}%`,
      `  Slug: /${i.slug}`,
      `  Meta title: ${i.metaTitle || 'NOT SET'}`,
      `  Meta desc: ${i.metaDesc || 'NOT SET'}`,
      `  Focus keyword: ${i.focusKeyword || 'NOT SET'}`,
      `  Word count: ${i.wordCount || 'unknown'}`,
      `  Issues: ${i.issues?.map(x => `[${x.level.toUpperCase()}] ${x.msg}`).join(' | ') || 'none'}`,
    ].join('\n')).join('\n\n');

  const gscSection = gscData ? `
GSC DATA (via VK Connector / Google Site Kit)
${'─'.repeat(45)}
Total clicks (last ${gscData.days || 28}d): ${gscData.totalClicks ?? '?'}
Total impressions: ${gscData.totalImpressions ?? '?'}
Avg CTR: ${gscData.avgCtr != null ? (gscData.avgCtr * 100).toFixed(1) + '%' : '?'}
Avg position: ${gscData.avgPosition?.toFixed(1) ?? '?'}

Top queries:
${(gscData.topQueries || []).slice(0, 15).map(q =>
    `- "${q.query}": ${q.clicks} clicks, pos ${q.position?.toFixed(1) ?? '?'}, CTR ${q.ctr != null ? (q.ctr * 100).toFixed(1) + '%' : '?'}`
  ).join('\n') || '(no query data)'}

Top pages by impressions:
${(gscData.topPages || []).slice(0, 10).map(p =>
    `- ${p.page}: ${p.impressions} impressions, ${p.clicks} clicks`
  ).join('\n') || '(no page data)'}` : '';

  const userPrompt = `Analyse the SEO audit results for ${client.name} and produce a comprehensive, actionable analysis. When writing meta titles and descriptions, write the ACTUAL ready-to-use text — not templates or examples.

SITE OVERVIEW
${'─'.repeat(30)}
URL: ${client.siteUrl}
Industry: ${client.industry || 'Not specified'}
Total pages audited: ${totalItems}
Average SEO score: ${avgScore}%
Pages with errors: ${errorCount}
Pages with warnings: ${warnCount}
Noindex pages: ${noindexCount}

PAGES WITH ISSUES (worst first)
${'─'.repeat(40)}
${topIssues || '(no issues found — great!)'}
${gscSection}

PRODUCE THE FOLLOWING SECTIONS:

## SECTION 1: SITE HEALTH SUMMARY
One paragraph overview of the site's current SEO health. Be direct about the severity.

## SECTION 2: CRITICAL FIXES (do these first)
Top 10 technical issues ranked by impact. For each:
- Priority: CRITICAL / HIGH / MEDIUM
- Issue description
- Specific fix instruction
- Affected pages (list slug)
- Expected impact after fix

## SECTION 3: META TAG REWRITES
For every page with missing or poor meta title/description:
- Page: [title]
- NEW Meta Title: [exactly 50-60 chars, includes focus keyword, compelling]
- NEW Meta Description: [exactly 150-160 chars, includes keyword, has clear value prop + action]

## SECTION 4: CONTENT IMPROVEMENTS
5 specific suggestions to improve existing pages (not new posts). For each: which page, what to add/change, why.

## SECTION 5: GSC INSIGHTS${gscData ? '' : ' (no GSC data — skipping)'}
${gscData ? `- Top 5 keyword opportunities (high impressions, low CTR — fix meta description)
- Keywords in positions 8–20 that need content improvement for page 1 push
- Pages with high impressions but no clicks (title/description problem)` : 'Connect Google Site Kit via VK Connector for GSC data insights.'}

## SECTION 6: 30-DAY ACTION PLAN
Prioritised checklist. Format: [ ] Action — Expected impact (High/Med/Low) — Est. time

Focus on actions that will show measurable results within 30 days.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 4096,
      system: buildSystemBlocks(client, profile),
      messages: [{ role: 'user', content: userPrompt }],
    });

    const analysis = {
      content:     message.content[0].text,
      usage:       message.usage,
      generatedAt: new Date().toISOString(),
    };

    // Attach to audit run in history if ID provided
    if (auditRunId) {
      const history = db.read('audit_history', []);
      const idx = history.findIndex(r => r.id === auditRunId);
      if (idx !== -1) {
        history[idx].claudeAnalysis = analysis;
        db.write('audit_history', history);
      }
    }

    res.json(analysis);
  } catch (e) {
    console.error('[Claude seo-analysis]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── GET meta suggestions (stored) ────────────────────────────────────────────

router.get('/meta-suggestions/:clientId', (req, res) => {
  const store = db.read('meta_suggestions', {});
  res.json(store[req.params.clientId] || null);
});

// ── POST /meta-optimize — batch AI meta generation for all pages ──────────────
// One call per client, result stored in DB. Re-call to regenerate.

router.post('/meta-optimize', async (req, res) => {
  let anthropic;
  try { anthropic = getAnthropic(); } catch (e) { return res.status(400).json({ error: e.message }); }

  const { clientId, pages = [] } = req.body;
  if (!pages.length) return res.status(400).json({ error: 'No pages provided' });

  const clients = db.read('clients', []);
  const client  = clients.find(c => c.id === clientId);
  if (!client) return res.status(404).json({ error: 'Client not found' });

  const profile = getProfile(clientId);

  // Sort: missing meta first, then by score ascending
  const priority = [...pages]
    .sort((a, b) => {
      const aMissing = !a.metaTitle || !a.metaDesc ? 1 : 0;
      const bMissing = !b.metaTitle || !b.metaDesc ? 1 : 0;
      if (bMissing !== aMissing) return bMissing - aMissing;
      return (a.score || 100) - (b.score || 100);
    })
    .slice(0, 80); // max 80 pages per call

  const pageList = priority.map(p =>
    `ID:${p.id} | Type:${p.type} | Title:"${p.title}" | Slug:/${p.slug}` +
    ` | CurrentTitle:${p.metaTitle ? `"${p.metaTitle}"` : 'MISSING'}` +
    ` | CurrentDesc:${p.metaDesc ? `"${p.metaDesc.slice(0, 60)}…"` : 'MISSING'}` +
    ` | Keyword:${p.focusKeyword || 'none'}`
  ).join('\n');

  const userPrompt = `Generate SEO-optimized meta titles and descriptions for every page listed below for client: ${client.name} (${client.industry || 'unspecified industry'}).

Rules:
- Meta title: 50–60 characters, include focus keyword near the start, compelling, no keyword stuffing
- Meta description: 150–160 characters, include focus keyword naturally, clear value proposition, ends with a soft CTA
- Write for Indian audience, use en-IN English
- If a focus keyword is set, use it. If not, infer from the page title.
- Do NOT use template placeholders — write the actual final text

PAGES TO OPTIMIZE:
${pageList}

Return ONLY a valid JSON array, no markdown fences, no explanation:
[{"id":123,"metaTitle":"...","metaDesc":"..."},...]`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 4096,
      system: buildSystemBlocks(client, profile),
      messages: [{ role: 'user', content: userPrompt }],
    });

    let suggestions;
    try {
      const raw = message.content[0].text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '');
      suggestions = JSON.parse(raw);
    } catch {
      return res.status(500).json({ error: 'Claude returned non-JSON. Try again.', raw: message.content[0].text.slice(0, 500) });
    }

    // Map by page id for fast lookup
    const byId = {};
    suggestions.forEach(s => { byId[s.id] = s; });

    const result = {
      clientId,
      suggestions: byId,
      generatedAt: new Date().toISOString(),
      usage: message.usage,
      pageCount: suggestions.length,
    };

    const store = db.read('meta_suggestions', {});
    store[clientId] = result;
    db.write('meta_suggestions', store);

    res.json(result);
  } catch (e) {
    console.error('[Claude meta-optimize]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── GET category suggestions (stored) ────────────────────────────────────────

router.get('/category-suggestions/:clientId', (req, res) => {
  const store = db.read('category_suggestions', {});
  res.json(store[req.params.clientId] || null);
});

// ── POST /suggest-categories — AI SEO category suggestions ───────────────────
// One call per client, result stored in DB. Re-call to regenerate.

router.post('/suggest-categories', async (req, res) => {
  let anthropic;
  try { anthropic = getAnthropic(); } catch (e) { return res.status(400).json({ error: e.message }); }

  const { clientId, existingCategories = [], posts = [] } = req.body;

  const clients = db.read('clients', []);
  const client  = clients.find(c => c.id === clientId);
  if (!client) return res.status(404).json({ error: 'Client not found' });

  const profile = getProfile(clientId);

  const existingList = existingCategories.map(c => `- "${c.name}" (slug: ${c.slug})`).join('\n') || '(none)';
  const postTitles   = posts.slice(0, 30).map(p => `- ${p.title?.rendered?.replace(/<[^>]*>/g, '') || p.title}`).join('\n') || '(none)';

  const userPrompt = `Suggest 5 SEO-optimized WordPress post categories for: ${client.name} (${client.industry || 'unspecified industry'}).

EXISTING CATEGORIES (do not duplicate):
${existingList}

RECENT POST TITLES (use for context):
${postTitles}

Requirements for each category:
- name: Proper case, concise (2–4 words), search-friendly
- slug: lowercase-kebab-case, max 3 words, no stop words (not "the", "and", "for")
- description: Exactly 120–155 characters. Describe what readers find here. Naturally include 1–2 keywords.
- seoRationale: One sentence explaining why this category helps SEO for this client

Do NOT suggest categories already in the existing list.
Return ONLY valid JSON, no markdown:
[{"name":"...","slug":"...","description":"...","seoRationale":"..."},...]`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 1500,
      system: buildSystemBlocks(client, profile),
      messages: [{ role: 'user', content: userPrompt }],
    });

    let suggestions;
    try {
      const raw = message.content[0].text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '');
      suggestions = JSON.parse(raw);
    } catch {
      return res.status(500).json({ error: 'Claude returned non-JSON. Try again.', raw: message.content[0].text.slice(0, 500) });
    }

    const result = {
      clientId,
      suggestions,
      generatedAt: new Date().toISOString(),
      usage: message.usage,
    };

    const store = db.read('category_suggestions', {});
    store[clientId] = result;
    db.write('category_suggestions', store);

    res.json(result);
  } catch (e) {
    console.error('[Claude suggest-categories]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── GET category optimizations (stored) ──────────────────────────────────────

router.get('/category-optimizations/:clientId', (req, res) => {
  const store = db.read('category_optimizations', {});
  res.json(store[req.params.clientId] || null);
});

// ── POST /optimize-categories — AI improvement of existing WP categories ──────

router.post('/optimize-categories', async (req, res) => {
  let anthropic;
  try { anthropic = getAnthropic(); } catch (e) { return res.status(400).json({ error: e.message }); }

  const { clientId, categories = [] } = req.body;
  if (!categories.length) return res.status(400).json({ error: 'No categories provided' });

  const clients = db.read('clients', []);
  const client  = clients.find(c => c.id === clientId);
  if (!client) return res.status(404).json({ error: 'Client not found' });

  const profile = getProfile(clientId);

  const catList = categories.map(c =>
    `ID:${c.id} | Name:"${c.name}" | Slug:${c.slug} | Posts:${c.count || 0} | CurrentDesc:${c.description ? `"${c.description.slice(0, 100)}"` : 'EMPTY'}`
  ).join('\n');

  const userPrompt = `Optimize these existing WordPress post categories for: ${client.name} (${client.industry || 'unspecified industry'}).

CURRENT CATEGORIES:
${catList}

For each category:
- Keep the name and slug unless it's genuinely bad for SEO (if changing, keep slug close to original)
- Write a new description: exactly 120–155 characters, keyword-rich, tells readers what to expect
- If the name should be improved for SEO, suggest a newName (otherwise omit)
- If the slug should be improved, suggest a newSlug (otherwise omit)
- Provide a brief rationale for changes

Return ONLY valid JSON array, no markdown:
[{"id":1,"name":"Current Name","slug":"current-slug","newName":"Better Name (optional)","newSlug":"better-slug (optional)","newDescription":"...","rationale":"..."}]`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 2000,
      system: buildSystemBlocks(client, profile),
      messages: [{ role: 'user', content: userPrompt }],
    });

    let suggestions;
    try {
      const raw = message.content[0].text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '');
      suggestions = JSON.parse(raw);
    } catch {
      return res.status(500).json({ error: 'Claude returned non-JSON. Try again.', raw: message.content[0].text.slice(0, 500) });
    }

    const result = {
      clientId,
      suggestions,
      generatedAt: new Date().toISOString(),
      usage: message.usage,
    };

    const store = db.read('category_optimizations', {});
    store[clientId] = result;
    db.write('category_optimizations', store);

    res.json(result);
  } catch (e) {
    console.error('[Claude optimize-categories]', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
