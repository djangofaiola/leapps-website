# leapps-website

Source for [leapps.org](https://leapps.org) — the website for the LEAPPs digital forensics tools: iLEAPP, ALEAPP, RLEAPP, VLEAPP, and LAVA.

The site is static HTML served from Cloudflare. It auto-deploys: pushing to `main` triggers a Cloudflare build that publishes the static files and the edge Worker. A second, separately deployed Worker (`leapps-api`) provides the dynamic data (GitHub stats, releases, RSS feeds, downloads).

---

## Repo structure

```
leapps-website/
├── *.html               # All site pages (one file per page)
├── css/
│   └── global.css       # Shared styles (nav, footer, dropdown, search, themes)
├── analytics.js         # GA4 consent banner + download/outbound click tracking
├── worker.js            # Edge Worker — injects per-post OG tags for /blog-post
├── wrangler.jsonc       # Cloudflare config for the leapps-website Worker
├── _headers             # Cache-Control rules for static assets
├── .assetsignore        # Files excluded from the published asset bundle
├── leapps-worker.js     # The leapps-api Worker (deployed separately — see below)
├── search-index.json    # Static search index for all site pages
├── blog/
│   ├── posts/
│   │   ├── index.json   # Blog post manifest (slug, title, date, author, tags, excerpt)
│   │   └── *.md         # Individual blog post content in Markdown
│   ├── images/<slug>/   # Images referenced by a post (via jsDelivr)
│   └── og/              # Auto-generated 1200×630 social cards (one per post)
├── tools/og-cards/      # OG-card generator (Satori + resvg); run by a GitHub Action
├── data/downloads.json  # Daily download-count snapshot (committed by an Action)
├── downloads/           # Downloadable files served via the leapps-api Worker
├── img/ images/ logos/  # Image and logo assets
├── sitemap.xml          # Sitemap for all pages
└── robots.txt           # Crawler rules
```

### Pages

| File | URL |
|---|---|
| `index.html` | leapps.org/ |
| `about.html` | leapps.org/about |
| `artifacts.html` | leapps.org/artifacts |
| `blog.html` | leapps.org/blog |
| `blog-post.html` | leapps.org/blog-post (template for all posts) |
| `changelog.html` | leapps.org/changelog |
| `docs.html` | leapps.org/docs |
| `mailing.html` | leapps.org/mailing |
| `releases.html` | leapps.org/releases |
| `resources.html` | leapps.org/resources |
| `scoreboard.html` | leapps.org/scoreboard |
| `stats.html` | leapps.org/stats |
| `404.html` | leapps.org/404 |

---

## Hosting & deployment

The site runs on Cloudflare as a **Worker with static assets**. There are two Workers, deployed differently:

### 1. `leapps-website` — auto-deployed from `main`

Defined by [`worker.js`](worker.js) and [`wrangler.jsonc`](wrangler.jsonc). **Every push to `main` auto-deploys** via Cloudflare Workers Builds — there is no manual step. The Worker's only job is edge OG injection: for `/blog-post?post=<slug>` it rewrites the page's Open Graph / Twitter tags (title, description, per-post social card) so links shared on LinkedIn, Facebook, etc. show the real post. Every other path serves the static asset directly.

`run_worker_first: ["/blog-post"]` in `wrangler.jsonc` is required — otherwise the static `blog-post.html` is served before the Worker runs and the OG tags are never rewritten. `.assetsignore` keeps `worker.js`, `tools/`, `node_modules/`, `.git/`, and `.github/` out of the published bundle.

### 2. `leapps-api` — deployed manually

Defined by [`leapps-worker.js`](leapps-worker.js) and served at `https://leapps-api.4n6-198.workers.dev`. This is **not** git-connected — after editing it you must redeploy it yourself (Cloudflare dashboard → Workers → `leapps-api` → Edit/Deploy, or `wrangler deploy`). It provides the live-data endpoints the pages fetch.

#### `leapps-api` routes

| Route | Description |
|---|---|
| `/repos/:owner/:repo/*` | GitHub API proxy with caching (releases, contributors, repo contents, repo metadata) |
| `/changelog/feed` | RSS feed aggregating releases across all tools |
| `/blog/feed` | RSS feed for blog posts |
| `/downloads/counts`, `/downloads/daily` | Download-count totals and daily stats (KV-backed) |
| `/downloads/<file>` | Serves an allowed downloadable file and increments its counter |
| `/search-index` | JSON search index (legacy; the site now reads the static `/search-index.json` instead) |

Blog content is **not** served by the Worker — `index.json` and each `<slug>.md` are static files fetched same-origin (`/blog/posts/...`), as is `/search-index.json`. The Worker is only used for GitHub data, the RSS feeds, and downloads.

### Caching

[`_headers`](_headers) sets Cache-Control: images/logos 30 days, OG cards / `analytics.js` / `css/*` 1 hour. **HTML, JSON, and Markdown are left at the default (revalidate)** so content edits and deploys show immediately.

> ⚠️ Because `css/*` and `analytics.js` are cached for an hour, their `<link>`/`<script>` references carry a `?v=YYYYMMDD` version token. **Bump that token whenever you change `css/global.css` or `analytics.js`** — otherwise returning visitors load fresh HTML against an hour-stale cached asset and the page renders broken.

---

## Search

The site search box (in the nav) merges three sources at query time, each rendered as its own group:

| Group | Source | Maintenance |
|---|---|---|
| **Blog Posts** | `blog/posts/index.json`, fetched live | Automatic — every post is searchable as soon as its manifest entry merges. No separate step. |
| **Artifacts** | the tool repos' `scripts/artifacts/` via the `leapps-api` Worker, live | Automatic — pulled from GitHub. |
| **Pages** | `search-index.json`, a static curated file | Hand-maintained — see below. |

So blog posts and artifacts are **already dynamic**; nothing needs regenerating for them. `search-index.json` holds only the curated **page/section** entries — bespoke titles and excerpts (not scraped from the DOM), one per searchable page or anchor (e.g. `releases#section-ileapp`, `docs#step-3`). Edit that file by hand only when you want to add or reword a page/section result; it is not auto-generated and does **not** list individual blog posts (those come from the live manifest above — adding them here would double them).

---

## Adding a blog post

Blog posts are plain Markdown files. Adding a post is two file changes and a pull request.

### 1. Create the Markdown file

Add a Markdown file to `blog/posts/`. The filename (without `.md`) becomes the post's **slug** — its public URL — so it must be URL-safe and unique: lowercase letters, digits, and hyphens. Pick something short and descriptive:

```
your-post-title.md
```

Dating the slug (`2026-06-05-your-post-title.md`) is an **optional** convention — it keeps the folder sorted and guarantees uniqueness — but it is not required. The `date` frontmatter field below is what the site uses for ordering and display, not the filename.

Start the file with YAML frontmatter:

```markdown
---
title: Your Post Title
date: 2026-06-05
author: Your Name
tags: [iLEAPP, iOS, artifacts]
excerpt: A one or two sentence summary shown on the blog index and in search results.
---

Your content starts here...
```

**Frontmatter fields:**

| Field | Required | Notes |
|---|---|---|
| `title` | ✅ | Shown on blog index and post page |
| `date` | ✅ | Format: `YYYY-MM-DD` |
| `author` | ✅ | Your name or handle |
| `tags` | ✅ | Array of strings — used for filtering; the first tag also picks the social-card accent color |
| `excerpt` | ✅ | 1–2 sentences — shown on index card, og:description, and RSS |

### 2. Update the index

Open `blog/posts/index.json` and add an entry at the **top** of the array (newest first):

```json
{
  "slug": "your-post-title",
  "title": "Your Post Title",
  "date": "2026-06-05",
  "author": "Your Name",
  "tags": ["iLEAPP", "iOS", "artifacts"],
  "excerpt": "A one or two sentence summary shown on the blog index and in search results."
}
```

Field rules (enforced by CI — see step 5):

- **`slug`** — must match the `.md` filename exactly (without the extension) and be URL-safe (`[\w-]+`: letters, digits, hyphen, underscore; lowercase by convention). It becomes the public URL, so it must be unique and not change after a post is shared. The `YYYY-MM-DD-` prefix is the convention but isn't required by the code; if you use one, it should match the `date` field.
- **`date`** — required, `YYYY-MM-DD`. This field (not the filename) drives post ordering, prev/next, related posts, and the social-card cache-bust, so it must be correct.
- **`title`, `author`, `excerpt`** — required, non-empty. **`tags`** — array of strings; the first tool tag (iLEAPP/ALEAPP/RLEAPP/VLEAPP/LAVA) sets the social-card accent color.

### 3. Images (optional)

Put images in `blog/images/<slug>/` and reference them from the Markdown via the jsDelivr CDN so they load fast and cached:

```markdown
![Alt text](https://cdn.jsdelivr.net/gh/abrignoni/leapps-website@main/blog/images/your-post-title/screenshot.png)
```

### 4. Social card — automatic

You do **not** create the 1200×630 social-share card. A GitHub Action (`.github/workflows/og-cards.yml`) regenerates `blog/og/<slug>.png` whenever `blog/posts/**` changes on `main`, using the generator in `tools/og-cards/`. The edge Worker then serves it for the post's OG tags.

### 5. Open a pull request

Submit your PR against `main`. Posts are reviewed before merging. Once merged, the post is live immediately and the social card is generated on the same push.

A GitHub Action (`.github/workflows/validate-blog.yml`) runs `tools/validate-blog.mjs` on every PR that touches `blog/posts/`, checking the manifest against the post files (URL-safe/unique slugs, a matching `.md` for each entry, a valid `date`, and the required fields). If it fails, the PR check turns red with the exact problem. Run it locally before pushing:

```bash
node tools/validate-blog.mjs
```

### Markdown support

Standard Markdown: headings, bold/italic/strikethrough, ordered/unordered lists, links and images, fenced code blocks with syntax highlighting, tables, blockquotes, and horizontal rules.

---

## Development

The site is static HTML — open any `.html` file in a browser or run a local server:

```bash
python3 -m http.server 3456
```

Then open `http://localhost:3456/index.html`.

Pages that need live data (stats, releases, changelog, artifacts, blog, search) fetch from the `leapps-api` Worker and the GitHub API directly, so they work from localhost without any local backend. Edge OG injection is the one thing that only runs on Cloudflare — locally you'll see the generic OG tags, which is fine for everything except previewing share cards.

---

## Analytics

`analytics.js` loads Google Analytics 4 (`G-G6WS09KNKH`) behind a consent banner — GA only loads after the visitor clicks Accept; the choice is remembered. Cloudflare Web Analytics runs separately (cookieless, no consent needed). The same script also fires custom `download` and `outbound_click` events so release/download click-throughs and external links are measurable.

---

## Branching

| Branch | Purpose |
|---|---|
| `main` | Production — every push auto-deploys to Cloudflare |
| `brigs-working` | Active development branch — PRs merge here first |

---

## Contributing

- **Blog posts** — see [Adding a blog post](#adding-a-blog-post) above
- **Parsers and artifacts** — contribute to the individual tool repos ([iLEAPP](https://github.com/abrignoni/iLEAPP), [ALEAPP](https://github.com/abrignoni/ALEAPP), [RLEAPP](https://github.com/abrignoni/RLEAPP), [VLEAPP](https://github.com/abrignoni/VLEAPP))
- **Site bugs or improvements** — open an issue or PR against this repo
