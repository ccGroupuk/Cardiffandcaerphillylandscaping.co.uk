const fs = require('fs');
const path = require('path');

/**
 * Append a blog post URL to sitemap.xml if missing.
 * Idempotent: rehydrateBlogPosts() replays every post at boot, so an entry that is
 * already there must not be added twice.
 * @param {string} slug - Filename slug without .html
 * @param {string} domain - Public origin, e.g. https://www.cardiffandcaerphillylandscaping.co.uk
 */
function updateSitemap(slug, domain) {
    const sitemapPath = path.join(__dirname, 'sitemap.xml');
    const baseDomain = String(domain).replace(/\/+$/, '');
    const url = `${baseDomain}/${slug}.html`;
    const today = new Date().toISOString().split('T')[0];

    try {
        if (!fs.existsSync(sitemapPath)) {
            console.error('sitemap.xml not found at', sitemapPath);
            return;
        }

        const content = fs.readFileSync(sitemapPath, 'utf8');
        if (content.includes(`<loc>${url}</loc>`)) return;

        const entry = `  <url>
    <loc>${url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>`;

        if (content.includes('</urlset>')) {
            fs.writeFileSync(sitemapPath, content.replace('</urlset>', entry), 'utf8');
            console.log(`[sitemap] added ${url}`);
        } else {
            console.error('Invalid sitemap.xml: missing </urlset>');
        }
    } catch (error) {
        console.error('[sitemap] update failed:', error.message);
    }
}

module.exports = { updateSitemap };
