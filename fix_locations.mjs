
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("Starting fix_locations.mjs...");

const files = [
    'barry.html',
    'birchgrove.html',
    'caerphilly.html',
    'heath.html',
    'lisvane.html',
    'llanishen.html',
    'newport.html',
    'pontypridd.html',
    'radyr.html',
    'roath.html',
    'whitchurch.html'
];

const newNav = `            <nav class="nav-links">
                <a href="index.html">Home</a>
                <a href="services.html">Services</a>
                <a href="hard-landscaping.html">Patios & Paving</a>
                <a href="garden-design.html">Garden Design</a>
                <a href="fencing.html">Fencing</a>
                <a href="maintenance.html">Maintenance</a>
                <a href="contact.html">Contact</a>
            </nav>`;

const oldNavRegex = /<nav class="nav-links">[\s\S]*?<\/nav>/;

const newFooter = `    <footer class="footer">
        <div class="container">
            <div class="footer-main">
                <div class="footer-col">
                    <h3>Cardiff Landscapers</h3>
                    <p>Improving and maintaining properties for over 15 years.</p>
                    <div style="margin-top: 1rem; display: flex; gap: 1rem; color: white;">
                        <i data-lucide="facebook"></i>
                        <i data-lucide="instagram"></i>
                        <i data-lucide="twitter"></i>
                    </div>
                </div>

                <div class="footer-col">
                    <h3>Services</h3>
                    <ul class="footer-links">
                        <li><a href="hard-landscaping.html">Patios & Paving</a></li>
                        <li><a href="garden-design.html">Garden Design</a></li>
                        <li><a href="fencing.html">Fencing & Decking</a></li>
                        <li><a href="maintenance.html">Garden Maintenance</a></li>
                    </ul>
                </div>

                <div class="footer-col">
                    <h3>Service Areas</h3>
                    <ul class="footer-links">
                        <li><a href="cardiff.html">Cardiff</a></li>
                        <li><a href="caerphilly.html">Caerphilly</a></li>
                        <li><a href="penarth.html">Penarth</a></li>
                        <li><a href="newport.html">Newport</a></li>
                    </ul>
                </div>

                <div class="footer-col">
                    <h3>Contact</h3>
                    <ul class="footer-links">
                        <li><i data-lucide="phone" size="14"></i> 029 2169 0437</li>
                        <li><i data-lucide="mail" size="14"></i> info@cardifflandscapers.co.uk</li>
                        <li><i data-lucide="map-pin" size="14"></i> Cardiff, UK</li>
                    </ul>
                </div>
            </div>
            <div class="copyright">
                <p>&copy; 2024 Cardiff Landscapers. All rights reserved.</p>
            </div>
        </div>
    </footer>`;

const oldFooterRegex = /<footer class="footer">[\s\S]*?<\/footer>/;

const boilerBlockRegex = /<!-- Priority Support Sales Banner -->[\s\S]*?(?=<!-- Existing Text Content -->)/;

files.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
        console.log(`Skipping ${file} - not found`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    // Replacements
    content = content.replace(/Patioss/g, 'Patios');
    content = content.replace(/Hard Landscaping & Patios/g, 'Patios & Paving');
    content = content.replace(/Garden Designs & Wet Rooms/g, 'Garden Design & Planting');
    content = content.replace(/Garden Design & Wet Rooms/g, 'Garden Design & Planting');
    content = content.replace(/Emergency \(90mins\)/g, 'Urgent (90mins)');

    // JS Variables
    content = content.replace(/Garden DesignCount/g, 'gardenDesignCount');
    content = content.replace(/id="Garden Design-counter"/g, 'id="garden-design-counter"');
    content = content.replace(/"Garden Design-counter"/g, '"garden-design-counter"');

    // Nav
    content = content.replace(oldNavRegex, newNav);

    // Footer
    content = content.replace(oldFooterRegex, newFooter);

    // Boiler Card
    content = content.replace(boilerBlockRegex, '');

    // Misc
    content = content.replace(/Wet Rooms/g, 'Planting');
    content = content.replace(/Marshalls Register engineers/g, 'Marshalls Register landscapers');

    // Emergency Landscaping Card -> Fencing (Simple regex to replace title and button)
    // Title
    content = content.replace(/<h3>Emergency Landscaping<\/h3>/g, '<h3>Fencing & Decking</h3>');
    // Button
    content = content.replace(/Call Emergency<\/a>/g, 'View Options</a>');
    content = content.replace(/href="tel:02921690437" class="btn btn-accent"/g, 'href="fencing.html" class="btn btn-accent"');
    // Text description is trickier, simplified replacement:
    const emergencyTextRegex = /<p>Burst pipe at 3 AM\?[\s\S]*?help when you need it most\.<\/p>/;
    const newFencingText = `<p>Secure your property with high-quality timber fencing or upgrade to composite decking. We offer professional installation for long-lasting results.</p>`;
    content = content.replace(emergencyTextRegex, newFencingText);

    // Image replacement for that card
    content = content.replace(/src="assets\/images\/emergency-garden.jpg"/g, 'src="assets/images/emergency-garden.jpg"');
    // Wait, fencing.html uses the same image? In index.html it was emergency-garden.jpg?
    // In cardiff.html snippet: <img src="assets/images/emergency-garden.jpg" alt="Emergency 24/7 Landscaping">
    // I should change alt tag at least.
    content = content.replace(/alt="Emergency 24\/7 Landscaping"/g, 'alt="Fencing Services"');


    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
});
console.log("Done.");
