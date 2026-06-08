// LEAPPs GitHub API Cache Worker
// Caches GitHub API responses at the edge for 5 minutes

const CACHE_TTL = 300; // seconds (5 minutes)
const BLOG_CACHE_TTL = 600; // seconds (10 minutes) for blog content

const BLOG_REPO = 'abrignoni/leapps-website';
const BLOG_BRANCH = 'main';

const ALLOWED_REPOS = [
  'abrignoni/iLEAPP',
  'abrignoni/ALEAPP',
  'abrignoni/RLEAPP',
  'abrignoni/VLEAPP',
  'leapps-org/LAVA-releases',
  'leapps-org/leapps-language-resources',
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return corsResponse('', 204);
    }

    // Only allow GET requests
    if (request.method !== 'GET') {
      return corsResponse(JSON.stringify({ error: 'Method not allowed' }), 405);
    }

    // Search index route: /search-index
    if (url.pathname === '/search-index') {
      return handleSearchIndex();
    }

    // Changelog RSS feed route: /changelog/feed
    if (url.pathname === '/changelog/feed') {
      return handleChangelogFeed(env);
    }

    // Blog RSS feed route: /blog/feed
    if (url.pathname === '/blog/feed') {
      return handleBlogFeed(env);
    }

    // Blog content route: /blog/posts/index.json or /blog/posts/{slug}.md
    if (url.pathname.startsWith('/blog/posts/')) {
      return handleBlogRequest(url, env);
    }

    // Parse the path — expected format: /repos/{owner}/{repo}/...
    const path = url.pathname + url.search;

    // Extract owner/repo from path - match first two path segments after /repos/
    const repoMatch = url.pathname.match(/^\/repos\/([^\/]+)\/([^\/]+)/);
    if (!repoMatch) {
      return corsResponse(JSON.stringify({ error: 'Invalid path', path: url.pathname }), 400);
    }

    const repoFullName = `${repoMatch[1]}/${repoMatch[2]}`;

    if (!ALLOWED_REPOS.includes(repoFullName)) {
      return corsResponse(JSON.stringify({ error: 'Repo not allowed', repo: repoFullName }), 403);
    }

    // Build the GitHub API URL
    const githubUrl = `https://api.github.com${path}`;

    // Check Cloudflare cache first
    const cache = caches.default;
    const cacheKey = new Request(githubUrl);
    const cached = await cache.match(cacheKey);
    if (cached) {
      const cachedResponse = new Response(cached.body, cached);
      cachedResponse.headers.set('X-Cache', 'HIT');
      cachedResponse.headers.set('Access-Control-Allow-Origin', '*');
      return cachedResponse;
    }

    // Fetch from GitHub
    const githubResponse = await fetch(githubUrl, {
      headers: {
        'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'LEAPPs-Worker/1.0',
      },
    });

    if (!githubResponse.ok) {
      return corsResponse(
        JSON.stringify({ error: `GitHub API error: ${githubResponse.status}` }),
        githubResponse.status
      );
    }

    const data = await githubResponse.text();

    // Store in cache
    const responseToCache = new Response(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${CACHE_TTL}`,
        'Access-Control-Allow-Origin': '*',
        'X-Cache': 'MISS',
      },
    });
    await cache.put(cacheKey, responseToCache.clone());

    return responseToCache;
  },
};

function handleSearchIndex() {
  const index = [
    { title: "Quick Start — Pick Your Tool", url: "https://leapps.org/docs#step-1", page: "Docs", excerpt: "Choose iLEAPP for iOS, ALEAPP for Android, RLEAPP for ISP and carrier returns, or VLEAPP for vehicle systems." },
    { title: "Quick Start — Get Your Extraction", url: "https://leapps.org/docs#step-2", page: "Docs", excerpt: "Supported extraction types: full file system, iTunes backup, adb, GrayKey, Cellebrite, logical acquisitions." },
    { title: "Quick Start — Install & Run", url: "https://leapps.org/docs#step-3", page: "Docs", excerpt: "Install dependencies with pip, then run via GUI or command line. Requires Python 3.12 or later." },
    { title: "Quick Start — Read Your Report", url: "https://leapps.org/docs#step-4", page: "Docs", excerpt: "Open index.html in your output folder or load the report into LAVA for filtering and data export." },
    { title: "Quick Start — Contribute a Parser", url: "https://leapps.org/docs#step-5", page: "Docs", excerpt: "Add a new Python file to scripts/artifacts/ and submit a pull request on GitHub." },
    { title: "iLEAPP — iOS Logs Events and Plists Parser", url: "https://leapps.org/releases", page: "Releases", excerpt: "Parse iOS and iPadOS artifacts from iTunes backups and full file system extractions." },
    { title: "ALEAPP — Android Logs Events and Plists Parser", url: "https://leapps.org/releases", page: "Releases", excerpt: "Parse Android device artifacts from adb backups, full file system, and Cellebrite extractions." },
    { title: "RLEAPP — Returns Logs Events and Plists Parser", url: "https://leapps.org/releases", page: "Releases", excerpt: "Parse ISP and carrier records, warrant returns, and subscriber data exports." },
    { title: "VLEAPP — Vehicle Logs Events and Plists Parser", url: "https://leapps.org/releases", page: "Releases", excerpt: "Parse vehicle system image artifacts and infotainment data from logical acquisitions." },
    { title: "LAVA — LEAPPs Artifact Viewer Application", url: "https://leapps.org/releases", page: "Releases", excerpt: "View and explore LEAPPs reports with filtering capabilities, data export options, and structured navigation." },
    { title: "About LEAPPs", url: "https://leapps.org/about", page: "About", excerpt: "Free, open-source digital forensics tools built by practitioners for practitioners. Started by Alexis Brignoni while working as a Special Agent and digital forensic examiner with the FBI." },
    { title: "Core Contributors", url: "https://leapps.org/about#collaborators", page: "About", excerpt: "Key collaborators: Johann-PLW, stark4n6, ydkhatri, JamesHabben, snoop168." },
    { title: "How LEAPPs Fits in Your Workflow", url: "https://leapps.org/about#comparison", page: "About", excerpt: "LEAPPs vs commercial tools vs manual review — free, open source, community parsers, code auditable, offline use, custom artifacts." },
    { title: "Artifacts — Browse All Supported Artifacts", url: "https://leapps.org/artifacts", page: "Artifacts", excerpt: "Searchable and filterable list of all artifacts supported by iLEAPP, ALEAPP, RLEAPP, and VLEAPP." },
    { title: "Changelog — Release History", url: "https://leapps.org/changelog", page: "Changelog", excerpt: "Unified release history across all LEAPPs tools — iLEAPP, ALEAPP, RLEAPP, VLEAPP, and LAVA." },
    { title: "Stats — Live Project Statistics", url: "https://leapps.org/stats", page: "Stats", excerpt: "Live download counts, GitHub stars, contributors, releases, and commits across all LEAPPs repositories." },
    { title: "Scoreboard — Contributor Rankings", url: "https://leapps.org/scoreboard", page: "Scoreboard", excerpt: "Contributor rankings based on merged pull requests across iLEAPP, ALEAPP, RLEAPP, and VLEAPP." },
    { title: "Resources — Guides, Videos, and Community", url: "https://leapps.org/resources", page: "Resources", excerpt: "Tutorials, conference talks, walkthroughs, training programs, and community resources for LEAPPs tools." },
    { title: "Mailing List", url: "https://leapps.org/mailing", page: "Mailing", excerpt: "Subscribe for release alerts, new parser notifications, and forensics community news. No spam." },
    { title: "Blog — Forensics Deep Dives", url: "https://leapps.org/blog", page: "Blog", excerpt: "Artifact write-ups, tool updates, and community contributions from the LEAPPs project." },
    { title: "Community — Discord and RSS", url: "https://discord.gg/XaZaknENUR", page: "Community", excerpt: "Join the LEAPPs community on Discord. Subscribe to the RSS feed for blog posts and changelog updates." },
    { title: "Principles — Always Free, Open Source, Community First", url: "https://leapps.org/about#philosophy", page: "About", excerpt: "LEAPPs is always free, source code is public and auditable, built by practitioners for practitioners." },
    { title: "Python Installation — Requirements", url: "https://leapps.org/docs#step-3", page: "Docs", excerpt: "Requires Python 3.12 or later. Install dependencies: pip install -r requirements.txt" },
    { title: "Command Line Usage", url: "https://leapps.org/docs#step-3", page: "Docs", excerpt: "Run from command line: python iLEAPP.py -t {fs,tar,zip,gz} -i INPUT_PATH -o OUTPUT_PATH. Each tool may have additional options." }
  ];
  return corsResponse(JSON.stringify(index), 200, { 'Cache-Control': 'public, max-age=3600' });
}

async function handleBlogRequest(url, env) {
  const filePath = url.pathname.replace(/^\/blog\/posts\//, '');

  // Only allow index.json and .md files, no path traversal
  if (!filePath.match(/^(index\.json|[\w-]+\.md)$/)) {
    return corsResponse(JSON.stringify({ error: 'Not found' }), 404);
  }

  const rawUrl = `https://raw.githubusercontent.com/${BLOG_REPO}/${BLOG_BRANCH}/blog/posts/${filePath}`;

  const cache = caches.default;
  const cacheKey = new Request(rawUrl);
  const cached = await cache.match(cacheKey);
  if (cached) {
    const cachedResponse = new Response(cached.body, cached);
    cachedResponse.headers.set('X-Cache', 'HIT');
    cachedResponse.headers.set('Access-Control-Allow-Origin', '*');
    return cachedResponse;
  }

  const headers = { 'User-Agent': 'LEAPPs-Worker/1.0' };
  if (env.GITHUB_TOKEN) headers['Authorization'] = `Bearer ${env.GITHUB_TOKEN}`;

  const upstream = await fetch(rawUrl, { headers });

  if (!upstream.ok) {
    return corsResponse(JSON.stringify({ error: 'Post not found' }), 404);
  }

  const contentType = filePath.endsWith('.json') ? 'application/json' : 'text/markdown; charset=utf-8';
  const body = await upstream.text();

  const responseToCache = new Response(body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': `public, max-age=${BLOG_CACHE_TTL}`,
      'Access-Control-Allow-Origin': '*',
      'X-Cache': 'MISS',
    },
  });
  await cache.put(cacheKey, responseToCache.clone());

  return responseToCache;
}

async function handleBlogFeed(env) {
  const indexUrl = `https://raw.githubusercontent.com/${BLOG_REPO}/${BLOG_BRANCH}/blog/posts/index.json`;

  const cache = caches.default;
  const cacheKey = new Request(`${indexUrl}__feed`);
  const cached = await cache.match(cacheKey);
  if (cached) {
    const cachedResponse = new Response(cached.body, cached);
    cachedResponse.headers.set('X-Cache', 'HIT');
    cachedResponse.headers.set('Access-Control-Allow-Origin', '*');
    return cachedResponse;
  }

  const headers = { 'User-Agent': 'LEAPPs-Worker/1.0' };
  if (env.GITHUB_TOKEN) headers['Authorization'] = `Bearer ${env.GITHUB_TOKEN}`;

  const upstream = await fetch(indexUrl, { headers });
  if (!upstream.ok) {
    return corsResponse(JSON.stringify({ error: 'Failed to load blog feed' }), 502);
  }

  const posts = await upstream.json();

  const items = posts.map(post => {
    const pubDate = new Date(post.date + 'T00:00:00Z').toUTCString();
    const link = `https://leapps.org/blog-post?post=${encodeURIComponent(post.slug)}`;
    const desc = (post.excerpt || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&apos;');
    const title = (post.title || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `
    <item>
      <title>${title}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <author>${(post.author || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</author>
      <description>${desc}</description>
    </item>`;
  }).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>LEAPPs Blog</title>
    <link>https://leapps.org/blog</link>
    <description>Forensics deep dives, tool updates, artifact write-ups, and community contributions from the LEAPPs project.</description>
    <language>en-us</language>
    <atom:link href="https://leapps-api.4n6-198.workers.dev/blog/feed" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`;

  const responseToCache = new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': `public, max-age=${BLOG_CACHE_TTL}`,
      'Access-Control-Allow-Origin': '*',
      'X-Cache': 'MISS',
    },
  });
  await cache.put(cacheKey, responseToCache.clone());

  return responseToCache;
}

async function handleChangelogFeed(env) {
  const CHANGELOG_REPOS = [
    { name: 'iLEAPP', repo: 'abrignoni/iLEAPP' },
    { name: 'ALEAPP', repo: 'abrignoni/ALEAPP' },
    { name: 'RLEAPP', repo: 'abrignoni/RLEAPP' },
    { name: 'VLEAPP', repo: 'abrignoni/VLEAPP' },
    { name: 'LAVA',   repo: 'leapps-org/LAVA-releases' },
  ];

  const cache = caches.default;
  const cacheKey = new Request('https://leapps-api.4n6-198.workers.dev/changelog/feed__cache');
  const cached = await cache.match(cacheKey);
  if (cached) {
    const cachedResponse = new Response(cached.body, cached);
    cachedResponse.headers.set('X-Cache', 'HIT');
    cachedResponse.headers.set('Access-Control-Allow-Origin', '*');
    return cachedResponse;
  }

  const headers = {
    'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'LEAPPs-Worker/1.0',
  };

  const allReleases = [];
  await Promise.all(CHANGELOG_REPOS.map(async ({ name, repo }) => {
    try {
      const res = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=50`, { headers });
      if (!res.ok) return;
      const releases = await res.json();
      for (const r of releases) {
        if (r.draft) continue;
        allReleases.push({ name, repo, tag: r.tag_name, date: r.published_at, body: r.body || '' });
      }
    } catch (_) {}
  }));

  allReleases.sort((a, b) => new Date(b.date) - new Date(a.date));

  function esc(s) {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  const items = allReleases.slice(0, 100).map(r => {
    const link = `https://github.com/${r.repo}/releases/tag/${encodeURIComponent(r.tag)}`;
    const pubDate = new Date(r.date).toUTCString();
    return `
    <item>
      <title>${esc(r.name + ' ' + r.tag)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${esc(r.body.slice(0, 500))}</description>
    </item>`;
  }).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>LEAPPs Changelog</title>
    <link>https://leapps.org/changelog</link>
    <description>Unified release history across iLEAPP, ALEAPP, RLEAPP, VLEAPP, and LAVA.</description>
    <language>en-us</language>
    <atom:link href="https://leapps-api.4n6-198.workers.dev/changelog/feed" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`;

  const responseToCache = new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': `public, max-age=${CACHE_TTL}`,
      'Access-Control-Allow-Origin': '*',
      'X-Cache': 'MISS',
    },
  });
  await cache.put(cacheKey, responseToCache.clone());
  return responseToCache;
}

function corsResponse(body, status = 200, extraHeaders = {}) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      ...extraHeaders,
    },
  });
}