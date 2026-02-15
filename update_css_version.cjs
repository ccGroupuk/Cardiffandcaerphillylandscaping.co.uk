const fs = require('fs');
const path = require('path');

const directoryPath = process.cwd();
const cssVersion = '3';
const cssLinkRegex = /<link rel="stylesheet" href="css\/styles\.css\?v=\d+">/g;
// Also match potentially broken/removed lines or just standard link if version is missing
const standardCssLink = `<link rel="stylesheet" href="css/styles.css?v=${cssVersion}">`;

fs.readdir(directoryPath, (err, files) => {
    if (err) {
        return console.log('Unable to scan directory: ' + err);
    }

    files.forEach((file) => {
        if (path.extname(file) === '.html') {
            const filePath = path.join(directoryPath, file);
            let content = fs.readFileSync(filePath, 'utf8');
            let updated = false;

            // Check if file has the CSS link
            if (cssLinkRegex.test(content)) {
                content = content.replace(cssLinkRegex, standardCssLink);
                updated = true;
                console.log(`Updated ${file} to v${cssVersion}`);
            } else if (content.includes('css/styles.css')) {
                // Try to match without version if regex failed but file exists
                content = content.replace(/<link rel="stylesheet" href="css\/styles\.css.*?>/, standardCssLink);
                updated = true;
                console.log(`Updated (loose match) ${file} to v${cssVersion}`);
            } else {
                console.log(`Warning: No CSS link found in ${file}. Repairing...`);
                // Heuristic: Insert before </head> if missing
                const headEnd = '</head>';
                if (content.includes(headEnd)) {
                    // Check if we previously deleted it along with other stuff. 
                    // If the file looks severely damaged (missing head tags), we might need more manual intervention.
                    // For now, let's inject it back.
                    content = content.replace(headEnd, `    ${standardCssLink}\n${headEnd}`);
                    updated = true;
                    console.log(`Repaired ${file} (injected CSS link)`);
                }
            }

            if (updated) {
                fs.writeFileSync(filePath, content, 'utf8');
            }
        }
    });
});
