'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const SITE_MANIFEST_PATH = path.join(DATA_DIR, 'tradevault-site-manifest.json');

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

function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';

  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
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
  const manifest = readSiteManifest();
  if (manifest) {
    console.log(`[site-manifest] Loaded — style=${manifest.styleKey || 'classic'} company=${manifest.brand?.companyName || '(none)'}`);
  } else {
    console.log('[site-manifest] No manifest yet — CRM Website → Publish creates data/tradevault-site-manifest.json.');
  }
});
