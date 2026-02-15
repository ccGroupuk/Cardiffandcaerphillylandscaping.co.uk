
const fs = require('fs');
const path = require('path');

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

const oldNavRegex = /<nav class="nav-links">[\s\S]*?<\/nav>/; // Be careful with this, but structure is consistent

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

// Boiler Card Regex
const boilerCardRegex = /<!-- Priority Support Sales Banner -->[\s\S]*?<div class="boiler-advert-card"[\s\S]*?<\/div>[\s\S]*?<\/div>/; 
// The boiler card ends with </div>, but there might be nested divs.
// Actually, looking at cardiff.html, it's:
// <!-- Priority Support Sales Banner -->
// <div class="boiler-advert-card" ...>
//    ...
// </div>
//
// <!-- Existing Text Content -->
//
// I will try to match from <!-- Priority Support Sales Banner --> until <!-- Existing Text Content -->

const boilerBlockRegex = /<!-- Priority Support Sales Banner -->[\s\S]*?(?=<!-- Existing Text Content -->)/;


files.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
        console.log(`Skipping ${file} - not found`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    // Replacements
    // 1. Patioss -> Patios (Global)
    content = content.replace(/Patioss/g, 'Patios');

    // 2. Hard Landscaping & Patios -> Patios & Paving (Fixing the title in Service Card)
    // The Card title was "Hard Landscaping & Patioss" -> replaced to "Patios" above -> "Hard Landscaping & Patios"
    // We want "Patios & Paving"
    content = content.replace(/Hard Landscaping & Patios/g, 'Patios & Paving');

    // 3. Garden Designs & Wet Rooms -> Garden Design & Planting
    content = content.replace(/Garden Designs & Wet Rooms/g, 'Garden Design & Planting');
    // Also "Garden Design & Wet Rooms" if "Designs" was "Design"
    content = content.replace(/Garden Design & Wet Rooms/g, 'Garden Design & Planting');

    // 4. Emergency (90mins) -> Urgent (90mins)
    content = content.replace(/Emergency \(90mins\)/g, 'Urgent (90mins)');

    // 5. Emergency Landscaping Card -> Fencing Card
    // <h3...>Emergency Landscaping</h3> ... -> Fencing description
    // This is hard to regex replace cleanly without destroying structure. 
    // Maybe just change title "Emergency Landscaping" -> "Fencing & Decking" 
    // and Text "Burst pipe..." -> "Secure your property..."
    // and Button "Call Emergency" -> "View Options"
    // This is simplified.

    // 6. JS Variables
    content = content.replace(/Garden DesignCount/g, 'gardenDesignCount');
    content = content.replace(/id="Garden Design-counter"/g, 'id="garden-design-counter"');
    content = content.replace(/"Garden Design-counter"/g, '"garden-design-counter"');

    // 7. Nav
    content = content.replace(oldNavRegex, newNav);

    // 8. Footer
    content = content.replace(oldFooterRegex, newFooter);

    // 9. Boiler Card
    content = content.replace(boilerBlockRegex, '');

    // 10. Fix "Wet Room" refs if any left
    content = content.replace(/Wet Rooms/g, 'Planting');
    
    // 11. "Marshalls Register engineers" -> "Marshalls Register landscapers"
    content = content.replace(/Marshalls Register engineers/g, 'Marshalls Register landscapers');

    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
});
