import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

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
    let originalContent = content;

    // Fix Logo: "Cardiff & Caerphilly Landscapers" -> "Cardiff & Caerphilly Landscaping"
    // Targeting the visible text in the text-accent span
    content = content.replace(
        /<span>Cardiff & Caerphilly <span class="text-accent">Landscapers<\/span><\/span>/g,
        '<span>Cardiff & Caerphilly <span class="text-accent">Landscaping</span></span>'
    );
    content = content.replace(
        /<span>Cardiff & Caerphilly <span class="text-accent">Landscaper<\/span><\/span>/g,
        '<span>Cardiff & Caerphilly <span class="text-accent">Landscaping</span></span>'
    );

    // Also catch "Cardiff Landscapers" if it wasn't caught before (e.g. if it was "Cardiff & Caerphilly Landscapers" in text)
    content = content.replace(/Cardiff & Caerphilly Landscapers/g, 'Cardiff & Caerphilly Landscaping');

    // Fix replacements in H1/Titles if they are "Landscapers"
    // <title>...Cardiff & Caerphilly Landscapers...</title>
    content = content.replace(/<title>(.*?)Cardiff & Caerphilly Landscapers(.*?)<\/title>/g, '<title>$1Cardiff & Caerphilly Landscaping$2</title>');

    // Meta description
    content = content.replace(/content="(.*?)Cardiff & Caerphilly Landscapers(.*?)"/g, 'content="$1Cardiff & Caerphilly Landscaping$2"');


    if (content !== originalContent) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated ${path.basename(file)}`);
    }
});
