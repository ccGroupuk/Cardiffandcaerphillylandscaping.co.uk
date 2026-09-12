'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { marked } = require('marked');
const { updateSitemap } = require('./update-sitemap.js');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const SITE_MANIFEST_PATH = path.join(DATA_DIR, 'tradevault-site-manifest.json');

const DEFAULT_PUBLIC_ORIGIN = 'https://www.cardiffandcaerphillylandscaping.co.uk';
// Articles are written into ROOT, which Railway rebuilds from git on every deploy — so
// a post written there alone is destroyed by the next redeploy, along with its blog
// card and sitemap entry. The feed below is the durable record on the ./data volume;
// the files in ROOT are a cache replayed from it at boot.
const BLOG_FEED_PATH = path.join(DATA_DIR, 'tradevault-blog-feed.json');
// A connection test that reached the volume would otherwise be replayed onto the live
// site for ever — deleting the rendered file does nothing, the next boot puts it back.
const BLOG_TEST_SLUG_PREFIX = 'blog-tradevault-connection-test';
// Cards need a thumbnail; posts often arrive with no media. This is the site's own
// existing garden photo, already used on blog.html.
const CARD_FALLBACK_IMAGE = 'images/GARDEN%20DESIGN.webp';

const SITE_NAV_BY_PAGE_ID = {
  home:         { href: 'index.html',          label: 'Home' },
  services:     { href: 'services.html',        label: 'Services' },
  gallery:      { href: 'gallery.html',         label: 'Gallery' },
  news:         { href: 'news.html',            label: 'News' },
  about:        { href: 'about-us.html',        label: 'About' },
  contact:      { href: 'contact.html',         label: 'Contact' },
  faq:          { href: 'faq.html',             label: 'FAQ' },
  testimonials: { href: 'testimonials.html',    label: 'Testimonials' },
  areas:        { href: 'areas.html',           label: 'Areas' },
  privacy:      { href: 'privacy.html',         label: 'Privacy' },
};

const LANDSCAPING_EXTRA_NAV = [
  { href: 'garden-design.html',    label: 'Garden Design' },
  { href: 'hard-landscaping.html', label: 'Hard Landscaping' },
  { href: 'fencing.html',          label: 'Fencing' },
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.pdf':  'application/pdf',
  '.xml':  'application/xml',
  '.txt':  'text/plain',
};

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function readSiteManifest() {
  try {
    if (fs.existsSync(SITE_MANIFEST_PATH)) {
      return JSON.parse(fs.readFileSync(SITE_MANIFEST_PATH, 'utf8'));
    }
  } catch {}
  return null;
}

function writeSiteManifest(manifest) {
  fs.writeFileSync(SITE_MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
}

function sanitizeCssColor(input) {
  if (!input) return '';
  const s = String(input).trim();
  if (/^#[0-9a-fA-F]{3,8}$/.test(s)) return s;
  if (/^hsl\(/.test(s) && s.length < 60) return s;
  return '';
}

function escapeHtmlAttr(str) {
  return String(str || '').replace(/[&"<>]/g, c => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' }[c]));
}

function applySiteManifestToHtml(html, filename) {
  const manifest = readSiteManifest();
  if (!manifest) return html;

  const $ = cheerio.load(html, { decodeEntities: false });
  const { styleKey = 'classic', templateKey = 'landscaping', brand = {}, pages = {} } = manifest;

  $('html').attr('data-tv-style', styleKey);
  $('html').attr('data-tv-template', templateKey);

  const primary = sanitizeCssColor(brand.primaryColor);
  $('#tradevault-site-branding').remove();
  if (primary) {
    $('head').append(`<style id="tradevault-site-branding">:root { --color-primary: ${primary}; --color-primary-dark: ${primary}; }</style>`);
  }

  const companyName = String(brand.companyName || '').trim();
  if (companyName) {
    $('[data-tv-company]').text(companyName);
    $('title').each((_, el) => {
      const t = $(el).text();
      if (!t.includes(companyName)) $(el).text(`${companyName} | ${t}`);
    });
  }
  if (brand.phone) $('[data-tv-phone], .tv-phone').text(brand.phone).attr('href', `tel:${brand.phone.replace(/\s+/g, '')}`);
  if (brand.email) $('[data-tv-email], .tv-email').text(brand.email).attr('href', `mailto:${brand.email}`);
  if (brand.logoUrl) {
    $('[data-tv-logo]').attr('src', escapeHtmlAttr(brand.logoUrl)).attr('alt', escapeHtmlAttr(companyName));
  }

  // Disable pages
  const allNavPageIds = Object.keys(SITE_NAV_BY_PAGE_ID);
  for (const pageId of allNavPageIds) {
    if (pages[pageId] === false) {
      const link = SITE_NAV_BY_PAGE_ID[pageId];
      $(`a[href="${link.href}"], a[href="./${link.href}"]`).closest('li').hide();
    }
  }

  return $.html();
}

// ─── TradeVault blog: CRM → article page + blog card + sitemap ───────────────
function isBlogTestSlug(slug) {
  return String(slug || '').startsWith(BLOG_TEST_SLUG_PREFIX);
}

function getSitePublicOrigin() {
  return String(process.env.SITE_PUBLIC_ORIGIN || DEFAULT_PUBLIC_ORIGIN).replace(/\/+$/, '');
}

function slugifySegment(text) {
  return String(text).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'post';
}

function stripLeadingH1Markdown(markdown) {
  const lines = String(markdown || '').split(/\r?\n/);
  const m = (lines[0] || '').match(/^#\s+(.+)$/);
  if (!m) return { title: null, bodyMd: markdown };
  return { title: m[1].trim(), bodyMd: lines.slice(1).join('\n').replace(/^\n+/, '') };
}

function sanitizeMarkedHtml(html) {
  return String(html || '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
}

function plainTextFromMarkdown(md, maxLen) {
  const plain = String(md || '')
    .replace(/^#+\s+/gm, '')
    .replace(/\*\*|__/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/\n+/g, ' ')
    .trim();
  if (!plain) return '';
  return plain.length > maxLen ? `${plain.slice(0, maxLen - 1)}…` : plain;
}

/** Some generators wrap the body in their own JSON envelope. Unwrap it. */
function stripJsonWrapperContent(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed.startsWith('{')) return trimmed;
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed.postContent === 'string') return parsed.postContent;
    if (typeof parsed.content === 'string') return parsed.content;
  } catch { /* not valid JSON */ }
  const m = trimmed.match(/"postContent"\s*:\s*"([\s\S]+?)"\s*[,}]/);
  if (m) { try { return JSON.parse('"' + m[1] + '"'); } catch { return m[1]; } }
  return trimmed;
}

function buildTradeVaultBlogPage(payload) {
  const content = stripJsonWrapperContent(typeof payload.content === 'string' ? payload.content : '');
  const { title, bodyMd } = stripLeadingH1Markdown(content.trim());
  if (!title) {
    const err = new Error('First line must be a Markdown title: # Your title');
    err.code = 'BAD_REQUEST';
    throw err;
  }

  const segment = slugifySegment(title);
  const slug = segment.startsWith('blog-') ? segment : `blog-${segment}`;
  // Re-publishing one of OUR posts updates it in place. A collision with anything else
  // (a hand-written page such as blog-fencing-guide.html) gets a suffix instead — we
  // must never overwrite a page we did not generate.
  const ours = new Set(readBlogFeed().posts.map(p => p.slug));
  let fileSlug = slug;
  for (let i = 0; fs.existsSync(path.join(ROOT, `${fileSlug}.html`)) && !ours.has(fileSlug); i++) {
    fileSlug = `${slug}-${Date.now()}${i ? `-${i}` : ''}`;
  }

  // The CRM's HTML carries the branded house-style panels (see docs/blog-house-style.md
  // in the CRM repo); the Markdown is only a fallback for other senders.
  const htmlBody = typeof payload.contentHtml === 'string' && payload.contentHtml.trim()
    ? sanitizeMarkedHtml(payload.contentHtml.replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>\s*/i, ''))
    : sanitizeMarkedHtml(marked.parse(bodyMd || ''));

  const mediaUrls = Array.isArray(payload.mediaUrls)
    ? payload.mediaUrls.filter(u => typeof u === 'string' && /^https:\/\//i.test(u.trim())).map(u => u.trim())
    : [];
  const alts = Array.isArray(payload.imageAlts) ? payload.imageAlts : [];
  const altAt = (i) => (typeof alts[i] === 'string' && alts[i].trim()) ? alts[i].trim() : title;

  const hero = mediaUrls[0] || '';
  const parts = [htmlBody];
  const rest = mediaUrls.slice(1);
  if (rest.length) {
    const cells = rest.map((u, j) => `<img src="${escapeHtmlAttr(u)}" alt="${escapeHtmlAttr(altAt(j + 1))}" loading="lazy" style="border-radius: 8px;">`).join('');
    parts.push(`<div class="image-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-top: 2rem;">${cells}</div>`);
  }

  const kw = Array.isArray(payload.keywords) ? payload.keywords.map(String).filter(Boolean) : [];
  const tags = Array.isArray(payload.hashtags) ? payload.hashtags.map(t => String(t).replace(/^#/, '').trim()).filter(Boolean) : [];
  const metaDesc = plainTextFromMarkdown(bodyMd || title, 160)
    || `${title} — garden and landscaping advice from Cardiff & Caerphilly Landscaping.`;

  return {
    title,
    slug: fileSlug,
    htmlContent: parts.join('\n'),
    heroUrl: hero,
    heroAlt: altAt(0),
    metaDesc,
    metaKeywords: [...new Set([...kw, ...tags])].slice(0, 40).join(', ') || 'Landscaping Cardiff, Garden Design Cardiff, Patios Cardiff',
    ctaBody: typeof payload.callToAction === 'string' && payload.callToAction.trim()
      ? payload.callToAction.trim()
      : 'Tell us about your garden and we will come out for a free, no-obligation quote.',
    categoryLabel: tags[0] ? tags[0].replace(/-/g, ' ') : 'Expert Advice',
    cardImageUrl: hero || CARD_FALLBACK_IMAGE,
    shortDesc: metaDesc.length > 90 ? `${metaDesc.slice(0, 87)}...` : metaDesc,
  };
}

function renderBlogArticleHtml(data, publishedAt) {
  const templatePath = path.join(ROOT, 'blog-template.html');
  if (!fs.existsSync(templatePath)) throw new Error('blog-template.html is missing');

  const siteOrigin = getSitePublicOrigin();
  const isoDate = publishedAt.toISOString().split('T')[0];
  const friendlyDate = publishedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: data.title,
    datePublished: isoDate,
    description: data.metaDesc,
    author: { '@type': 'Organization', name: 'Cardiff & Caerphilly Landscaping' },
    publisher: { '@type': 'Organization', name: 'Cardiff & Caerphilly Landscaping' },
  };
  // Only claim an image when the post actually has one.
  if (data.heroUrl) schema.image = data.heroUrl;

  const heroBlock = data.heroUrl
    ? `<figure style="margin: 0 0 2.5rem; border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-lg);"><img src="${escapeHtmlAttr(data.heroUrl)}" alt="${escapeHtmlAttr(data.heroAlt)}" style="width: 100%; height: auto; display: block;" loading="lazy"></figure>`
    : '';

  // Every placeholder is replaced GLOBALLY: several appear more than once in the
  // template (META_DESC is both the meta tag and the hero subtitle), and a string
  // replace would leave the later ones raw on the page.
  const fields = {
    TITLE: escapeHtmlAttr(data.title),
    META_DESC: escapeHtmlAttr(data.metaDesc),
    META_KEYWORDS: escapeHtmlAttr(data.metaKeywords),
    CATEGORY: escapeHtmlAttr(data.categoryLabel),
    DATE_STR: escapeHtmlAttr(friendlyDate),
    CANONICAL_URL: escapeHtmlAttr(`${siteOrigin}/${data.slug}.html`),
    SCHEMA_JSON_LD: `<script type="application/ld+json">${JSON.stringify(schema)}</script>`,
    HERO_BLOCK: heroBlock,
    HTML_CONTENT: data.htmlContent,
    CALL_TO_ACTION: escapeHtmlAttr(data.ctaBody),
  };
  return fs.readFileSync(templatePath, 'utf8')
    .replace(/\{\{([A-Z_]+)\}\}/g, (match, key) => (key in fields ? fields[key] : match));
}

/** Prepend a card to blog.html's grid. Returns false if the card is already there. */
function prependBlogCard(data, publishedAt) {
  const blogPath = path.join(ROOT, 'blog.html');
  if (!fs.existsSync(blogPath)) throw new Error('blog.html is missing');

  const blogHtml = fs.readFileSync(blogPath, 'utf8');
  // Idempotent: rehydrateBlogPosts() replays the whole feed at every boot.
  if (blogHtml.includes(`<!-- tradevault-blog: ${data.slug} -->`)) return false;

  const $ = cheerio.load(blogHtml, { decodeEntities: false });
  const grid = $('#blog-grid');
  if (!grid.length) throw new Error('blog.html must contain an element with id="blog-grid"');

  const dateChip = publishedAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  grid.prepend(`
                <!-- tradevault-blog: ${data.slug} -->
                <article class="pricing-card" style="padding: 0; overflow: hidden; display: flex; flex-direction: column; background: white; border-radius: var(--radius-lg); box-shadow: var(--shadow-md); border: 1px solid var(--color-border); position: relative; z-index: 1;">
                    <div style="height: 200px; background: #e2e8f0; position: relative;">
                        <img decoding="async" loading="lazy" src="${escapeHtmlAttr(data.cardImageUrl)}" alt="${escapeHtmlAttr(data.title)}" style="width: 100%; height: 100%; object-fit: cover;">
                        <div style="position: absolute; top: 1rem; right: 1rem; background: var(--color-accent); color: white; padding: 0.25rem 0.75rem; border-radius: 99px; font-weight: 700; font-size: 0.8rem;">${escapeHtmlAttr(dateChip)}</div>
                    </div>
                    <div style="padding: 2rem; flex: 1; display: flex; flex-direction: column;">
                        <div style="color: var(--color-accent); font-weight: 700; text-transform: uppercase; font-size: 0.8rem; margin-bottom: 0.5rem; letter-spacing: 0.05em;">${escapeHtmlAttr(String(data.categoryLabel).toUpperCase())}</div>
                        <h3 style="color: var(--color-primary-dark); margin-bottom: 1rem; font-size: 1.5rem;">${escapeHtmlAttr(data.title)}</h3>
                        <p style="color: var(--color-text-muted); font-size: 0.95rem; margin-bottom: 1.5rem; flex: 1; position: relative; z-index: 2;">${escapeHtmlAttr(data.shortDesc)}</p>
                        <a href="${escapeHtmlAttr(`${data.slug}.html`)}" class="text-primary" style="font-weight: 600; display: inline-flex; align-items: center; gap: 0.5rem; position: relative; z-index: 10;">Read Guide <i data-lucide="arrow-right" size="16"></i></a>
                    </div>
                </article>`);
  fs.writeFileSync(blogPath, $.html(), 'utf8');
  return true;
}

function readBlogFeed() {
  try {
    if (!fs.existsSync(BLOG_FEED_PATH)) return { posts: [] };
    const feed = JSON.parse(fs.readFileSync(BLOG_FEED_PATH, 'utf8'));
    return Array.isArray(feed.posts) ? feed : { posts: [] };
  } catch (e) {
    console.warn('[blog-feed] read failed:', e.message);
    return { posts: [] };
  }
}

function saveBlogPostToFeed(data, publishedAt, articleHtml) {
  // Tests still render so the publisher sees them; they just never become durable.
  if (isBlogTestSlug(data.slug)) {
    console.log(`[blog-feed] skipped ${data.slug} — connection tests are not persisted`);
    return;
  }
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const feed = readBlogFeed();
  // Re-publishing the same slug replaces rather than duplicates.
  feed.posts = feed.posts.filter(p => p.slug !== data.slug);
  feed.posts.push({
    slug: data.slug,
    title: data.title,
    shortDesc: data.shortDesc,
    categoryLabel: data.categoryLabel,
    cardImageUrl: data.cardImageUrl,
    publishedAt: publishedAt.toISOString(),
    articleHtml,
  });
  fs.writeFileSync(BLOG_FEED_PATH, JSON.stringify(feed, null, 2), 'utf8');
  console.log(`[blog-feed] saved ${data.slug} (${feed.posts.length} post(s) on the volume)`);
}

/**
 * Replay the feed onto disk at boot, so a redeploy — which resets ROOT to git —
 * restores every article, blog card and sitemap entry. Every step is idempotent.
 */
function rehydrateBlogPosts() {
  const feed = readBlogFeed();

  // Self-heal a volume that already holds a connection-test post.
  const kept = feed.posts.filter(p => !isBlogTestSlug(p.slug));
  if (kept.length !== feed.posts.length) {
    const removed = feed.posts.length - kept.length;
    feed.posts = kept;
    try {
      fs.writeFileSync(BLOG_FEED_PATH, JSON.stringify(feed, null, 2), 'utf8');
      console.log(`[blog-feed] pruned ${removed} connection-test post(s) from the volume`);
    } catch (e) {
      console.warn('[blog-feed] could not prune connection-test post(s):', e.message);
    }
  }

  if (!feed.posts.length) {
    console.log('[blog-feed] no posts yet — CRM posts land in data/tradevault-blog-feed.json (mount ./data on a Railway volume so they survive deploys).');
    return;
  }

  // Oldest first: prependBlogCard puts each at the top, so the newest ends up first.
  const ordered = [...feed.posts].sort((a, b) => String(a.publishedAt).localeCompare(String(b.publishedAt)));
  let files = 0, cards = 0;
  for (const post of ordered) {
    try {
      const filePath = path.join(ROOT, `${post.slug}.html`);
      if (!fs.existsSync(filePath) && post.articleHtml) {
        fs.writeFileSync(filePath, post.articleHtml, 'utf8');
        files++;
      }
      if (prependBlogCard(post, new Date(post.publishedAt))) cards++;
      updateSitemap(post.slug, getSitePublicOrigin());
    } catch (e) {
      console.warn(`[blog-feed] could not restore ${post.slug}:`, e.message);
    }
  }
  console.log(`[blog-feed] restored ${feed.posts.length} post(s): ${files} article file(s), ${cards} blog card(s)`);
}

// Branded 404. Falls back to plain text only if 404.html is missing from the build.
function serveNotFound(res) {
  const notFoundPath = path.join(ROOT, '404.html');
  if (!fs.existsSync(notFoundPath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(fs.readFileSync(notFoundPath));
}

function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';

  if (!fs.existsSync(filePath)) {
    serveNotFound(res);
    return;
  }

  if (ext === '.html') {
    try {
      let html = fs.readFileSync(filePath, 'utf8');
      html = applySiteManifestToHtml(html, path.basename(filePath));
      res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-store' });
      res.end(html);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Server error');
    }
    return;
  }

  const stat = fs.statSync(filePath);
  res.writeHead(200, { 'Content-Type': mime, 'Content-Length': stat.size });
  fs.createReadStream(filePath).pipe(res);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', chunk => {
      total += chunk.length;
      if (total > 2 * 1024 * 1024) return reject(new Error('Payload too large'));
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function verifyBearer(req, secret) {
  if (!secret) return false;
  const auth = String(req.headers.authorization || '');
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return Boolean(m && m[1] === secret);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // ─── TradeVault Site manifest webhook ────────────────────────────────────────
  if (req.method === 'POST' && pathname === '/api/webhooks/tradevault-site') {
    const siteSecret = String(
      process.env.TRADEVAULT_SITE_WEBHOOK_SECRET ||
      process.env.TRADEVAULT_GALLERY_WEBHOOK_SECRET ||
      process.env.TRADEVAULT_WEBHOOK_SECRET ||
      'sk_test_tradevault123',
    ).trim();

    if (!verifyBearer(req, siteSecret)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      const body = await readBody(req);
      const payload = JSON.parse(body);
      if (payload.action === 'ping') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, message: 'pong' }));
        return;
      }
      if (payload.action === 'publish' && payload.manifest) {
        writeSiteManifest(payload.manifest);
        console.log('[site-manifest] Updated from CRM publish.');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
      }
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unknown action' }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // ─── TradeVault blog webhook ─────────────────────────────────────────────────
  if (req.method === 'POST' && pathname === '/api/webhooks/tradevault-blog') {
    const secret = String(process.env.TRADEVAULT_WEBHOOK_SECRET || '').trim();
    if (!verifyBearer(req, secret)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      const payload = JSON.parse((await readBody(req)) || '{}');
      const data = buildTradeVaultBlogPage(payload);
      const publishedAt = new Date();
      const articleHtml = renderBlogArticleHtml(data, publishedAt);

      // Persist to the volume FIRST — if the process dies or redeploys straight
      // after, the post survives and is replayed at the next boot.
      saveBlogPostToFeed(data, publishedAt, articleHtml);

      fs.writeFileSync(path.join(ROOT, `${data.slug}.html`), articleHtml, 'utf8');
      prependBlogCard(data, publishedAt);
      updateSitemap(data.slug, getSitePublicOrigin());

      console.log(`[blog] published ${data.slug}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, slug: data.slug }));
    } catch (err) {
      if (err instanceof SyntaxError) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }
      if (err.message === 'Payload too large') {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
      if (err.code === 'BAD_REQUEST') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
      console.error('[blog] webhook error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message || 'Server error' }));
    }
    return;
  }

  // ─── Static file serving ─────────────────────────────────────────────────────
  // pathname is still percent-encoded, so a file whose name contains a space
  // would be looked up literally as "…%20…" and always 404. Decode it first.
  // path.join + the ROOT check below still contain any "../" this reveals.
  let decodedPathname;
  try {
    decodedPathname = decodeURIComponent(pathname);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Bad request');
    return;
  }

  let filePath = path.join(ROOT, decodedPathname === '/' ? 'index.html' : decodedPathname);

  // Prevent path traversal
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end();
    return;
  }

  // If directory, serve index.html from it
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  // No extension → try .html
  if (!path.extname(filePath) && !fs.existsSync(filePath)) {
    const withHtml = filePath + '.html';
    if (fs.existsSync(withHtml)) filePath = withHtml;
  }

  serveFile(res, filePath);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[landscaping] Server listening on port ${PORT}`);
  try { rehydrateBlogPosts(); } catch (e) { console.error('[blog-feed] rehydrate failed:', e.message); }
  const manifest = readSiteManifest();
  if (manifest) {
    console.log(`[site-manifest] Loaded — style=${manifest.styleKey || 'classic'} company=${manifest.brand?.companyName || '(none)'}`);
  } else {
    console.log('[site-manifest] No manifest yet — CRM Website → Publish creates data/tradevault-site-manifest.json.');
  }
});
