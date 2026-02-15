import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.join(__dirname, '..');

// The new navigation HTML
const NAV_HTML = `
            <nav class="nav-links">
                <a href="index.html">Home</a>
                <a href="services.html">Services</a>
                <a href="about-us.html">About Us</a>
                <a href="blog.html">Blog</a>
                <a href="news.html">Weekly Updates</a>
                <a href="contact.html">Contact</a>
            </nav>
`;

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

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    // Regex to find the nav-links block
    // It captures <nav class="nav-links"> ... </nav>
    // flexible with whitespace
    const navRegex = /<nav class="nav-links">[\s\S]*?<\/nav>/;

    if (navRegex.test(content)) {
        // We need to inject the "active" class based on the current filename
        let fileNavHtml = NAV_HTML;
        const fileName = path.basename(file);

        if (fileName === 'index.html') {
            fileNavHtml = fileNavHtml.replace('href="index.html"', 'href="index.html" class="active"');
        } else if (fileName === 'services.html') {
            fileNavHtml = fileNavHtml.replace('href="services.html"', 'href="services.html" class="active"');
        } else if (fileName === 'about-us.html') {
            fileNavHtml = fileNavHtml.replace('href="about-us.html"', 'href="about-us.html" class="active"');
        } else if (fileName === 'blog.html') {
            fileNavHtml = fileNavHtml.replace('href="blog.html"', 'href="blog.html" class="active"');
        } else if (fileName === 'news.html') {
            fileNavHtml = fileNavHtml.replace('href="news.html"', 'href="news.html" class="active"');
        } else if (fileName === 'contact.html') {
            fileNavHtml = fileNavHtml.replace('href="contact.html"', 'href="contact.html" class="active"');
        }

        // Remove the leading newline for cleaner replacement
        fileNavHtml = fileNavHtml.trim();

        const newContent = content.replace(navRegex, fileNavHtml);
        fs.writeFileSync(file, newContent, 'utf8');
        console.log(`Updated nav in ${file}`);
    } else {
        console.log(`No nav found in ${file}`);
    }
});
