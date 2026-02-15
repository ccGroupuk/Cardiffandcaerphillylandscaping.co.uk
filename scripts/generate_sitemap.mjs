import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOMAIN = 'https://cardifflandscapers.co.uk';
const ROOT_DIR = path.join(__dirname, '..');

const sitemapHeader = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

const sitemapFooter = `
</urlset>`;

function getHtmlFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.git' && file !== 'scripts' && file !== 'css' && file !== 'assets' && file !== 'images' && file !== 'js') {
                results = results.concat(getHtmlFiles(filePath));
            }
        } else {
            if (file.endsWith('.html')) {
                results.push(filePath);
            }
        }
    });
    return results;
}

const files = getHtmlFiles(ROOT_DIR);
let sitemapContent = sitemapHeader;

files.forEach(file => {
    // Convert absolute path to relative path
    let relativePath = path.relative(ROOT_DIR, file).replace(/\\/g, '/');

    // Create URL
    let url = `${DOMAIN}/${relativePath}`;
    if (relativePath === 'index.html') {
        url = DOMAIN + '/';
    }

    // Get last modified date
    const stats = fs.statSync(file);
    const lastMod = stats.mtime.toISOString().split('T')[0];

    // Priority
    let priority = '0.8';
    if (relativePath === 'index.html') priority = '1.0';
    else if (relativePath === 'contact.html' || relativePath === 'services.html') priority = '0.9';

    sitemapContent += `
    <url>
        <loc>${url}</loc>
        <lastmod>${lastMod}</lastmod>
        <priority>${priority}</priority>
    </url>`;
});

sitemapContent += sitemapFooter;

fs.writeFileSync(path.join(ROOT_DIR, 'sitemap.xml'), sitemapContent);
console.log(`Sitemap generated with ${files.length} URLs at ${path.join(ROOT_DIR, 'sitemap.xml')}`);
