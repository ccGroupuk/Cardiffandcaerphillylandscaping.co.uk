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
    const originalContent = content;

    // 1. Core Brand Name Replacement: "Cardiff Landscapers" -> "Cardiff & Caerphilly Landscaping"
    // Handle specific HTML structure first
    content = content.replace(
        /<span>Cardiff <span class="text-accent">Landscapers<\/span><\/span>/g,
        '<span>Cardiff & Caerphilly <span class="text-accent">Landscaping</span></span>'
    );
    // Handle case where it might have been partially updated or different span structure
    content = content.replace(
        /<span>Cardiff <span class="text-accent">Landscaping<\/span><\/span>/g,
        '<span>Cardiff & Caerphilly <span class="text-accent">Landscaping</span></span>'
    );

    // Handle Logo variations (e.g. in Footer or other places if structure matches)
    content = content.replace(
        /Cardiff <span class="text-accent">Landscapers<\/span>/g,
        'Cardiff & Caerphilly <span class="text-accent">Landscaping</span>'
    );

    // 2. Global Text Replacement (Excluding Email/URLs roughly)
    // Replace "Cardiff Landscapers" with "Cardiff & Caerphilly Landscaping" in text
    // We use a regex to look for "Cardiff Landscapers" that is NOT followed by .co.uk (email/domain)
    content = content.replace(/Cardiff Landscapers(?!\.co\.uk)/g, 'Cardiff & Caerphilly Landscaping');

    // Catch "Cardiff and Caerphilly Landscapers" -> "Cardiff & Caerphilly Landscaping" (from previous partial run)
    content = content.replace(/Cardiff and Caerphilly Landscapers/g, 'Cardiff & Caerphilly Landscaping');

    // 3. Title Tags
    // Ensure "Cardiff & Caerphilly Landscaping" is in the title if "Cardiff Landscapers" was there
    content = content.replace(/<title>(.*?)(Cardiff Landscapers|Cardiff Landscaping)(.*?)<\/title>/g, '<title>$1Cardiff & Caerphilly Landscaping$3</title>');
    // Clean up potential double branding in titles if previous script ran
    content = content.replace(/Cardiff and Caerphilly Landscaping/g, 'Cardiff & Caerphilly Landscaping');

    // 4. Meta Descriptions
    content = content.replace(/content="(.*?)(Cardiff Landscapers|Cardiff Landscaping)(.*?)"/g, 'content="$1Cardiff & Caerphilly Landscaping$3"');
    content = content.replace(/content="(.*?)Cardiff and Caerphilly Landscaping(.*?)"/g, 'content="$1Cardiff & Caerphilly Landscaping$2"');

    // 5. Schema.org Name
    content = content.replace(/"name": "Cardiff Landscapers"/g, '"name": "Cardiff & Caerphilly Landscaping"');
    content = content.replace(/"name": "Cardiff and Caerphilly Landscapers"/g, '"name": "Cardiff & Caerphilly Landscaping"');

    // 6. Keywords Meta - ensure "Landscaping" is prominent
    // Just ensuring the brand full name is there
    // content = content.replace(/content="(.*?)Landscaper Cardiff(.*?)"/g, 'content="$1Landscaping Cardiff & Caerphilly$2"');

    // 7. Footer/About Founder
    content = content.replace(/Stef - Founder of Cardiff Landscapers/g, 'Stef - Founder of Cardiff & Caerphilly Landscaping');
    content = content.replace(/Stef - Founder of Cardiff and Caerphilly Landscaping/g, 'Stef - Founder of Cardiff & Caerphilly Landscaping');


    if (content !== originalContent) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated ${path.basename(file)}`);
    } else {
        // console.log(`No changes for ${path.basename(file)}`);
    }
});
