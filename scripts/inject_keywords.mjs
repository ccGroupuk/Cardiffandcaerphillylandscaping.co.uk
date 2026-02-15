import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.join(__dirname, '..');

// Base keywords that apply to everyone
const BASE_KEYWORDS = [
    "Landscaper",
    "Landscaping",
    "Garden Design",
    "Patios",
    "Paving",
    "Fencing",
    "Decking",
    "Driveways",
    "Garden Maintenance",
    "Hedge Trimming",
    "Turfing",
    "Artificial Grass",
    "Marshalls Register"
];

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
    const filename = path.basename(file, '.html');

    // Determine location based on filename
    let location = 'Cardiff'; // Default
    if (filename !== 'index' && filename !== 'services' && filename !== 'contact' &&
        filename !== 'hard-landscaping' && filename !== 'fencing' && filename !== 'maintenance' &&
        filename !== 'garden-design' && filename !== 'news') {
        // Assume filename is the location (e.g., caerphilly.html -> Caerphilly)
        location = filename.charAt(0).toUpperCase() + filename.slice(1);
    }

    // Generate specific keywords
    const specificKeywords = BASE_KEYWORDS.map(kw => `${kw} ${location}`);
    const allKeywords = [...BASE_KEYWORDS, ...specificKeywords, `Landscaper ${location}`, `Gardeners ${location}`];

    // Deduplicate
    const uniqueKeywords = [...new Set(allKeywords)].join(', ');

    const metaTag = `<meta name="keywords" content="${uniqueKeywords}">`;

    // Check if meta keywords already exists
    if (content.includes('<meta name="keywords"')) {
        // Replace existing
        content = content.replace(/<meta name="keywords" content=".*?">/, metaTag);
        console.log(`Updated keywords for ${filename}`);
    } else {
        // Insert after description
        if (content.includes('<meta name="description"')) {
            content = content.replace(
                /(<meta name="description"[\s\S]*?>)/,
                `$1\n    ${metaTag}`
            );
            console.log(`Inserted keywords for ${filename}`);
        } else {
            // Fallback: Insert in head
            content = content.replace('</head>', `    ${metaTag}\n</head>`);
            console.log(`Inserted keywords for ${filename} (Head fallback)`);
        }
    }

    fs.writeFileSync(file, content);
});

console.log('Keyword injection complete.');
