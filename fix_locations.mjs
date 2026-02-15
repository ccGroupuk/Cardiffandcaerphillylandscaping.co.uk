
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
    'cardiff.html',
    'heath.html',
    'lisvane.html',
    'llanishen.html',
    'newport.html',
    'penarth.html',
    'pontypridd.html',
    'radyr.html',
    'roath.html',
    'whitchurch.html',
    'maintenance.html'
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
                        <li><a href="newport.html">Newport</a></li>
                        <li><a href="barry.html">Barry</a></li>
                        <li><a href="penarth.html">Penarth</a></li>
                        <li><a href="pontypridd.html">Pontypridd</a></li>
                        <li><a href="radyr.html">Radyr</a></li>
                        <li><a href="lisvane.html">Lisvane</a></li>
                        <li><a href="llanishen.html">Llanishen</a></li>
                        <li><a href="roath.html">Roath</a></li>
                        <li><a href="whitchurch.html">Whitchurch</a></li>
                        <li><a href="heath.html">Heath</a></li>
                        <li><a href="birchgrove.html">Birchgrove</a></li>
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

// Founder Section Replacement
const founderSectionRegex = /<!-- Founder Message -->[\s\S]*?<!-- Dynamic Counters Section -->/;
const newFounderSection = `<!-- Founder Message -->
    <section class="section-padding" style="background: white;">
        <div class="container">
            <div class="about-grid">
                <div class="paul-image-container">
                    <img src="assets/images/stef-profile.jpg" alt="Stef - Founder of Cardiff Landscapers"
                        class="paul-image">
                </div>
                <div class="paul-content">
                    <div class="inline-badge">Message from the Founder</div>
                    <h2>Hi, I'm Stef.</h2>
                    <p class="lead-text">I founded Cardiff Landscapers with a simple mission: to provide the
                        kind of reliable, honest service I'd want for my own family.</p>
                    <p>When you call us, you're not just getting a "tradesman" – you're getting a dedicated local expert
                        who cares about your home. We turn up on time, we respect your property, and we don't sign off
                        until you're completely happy.</p>
                    <p>That's my personal guarantee to you.</p>
                    <div class="signature">
                        <span class="sign-name">Stef</span>
                        <span class="sign-title">Head Landscaper & Founder</span>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Dynamic Counters Section -->`;

files.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
        console.log(`Skipping ${file} - not found`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Logo Branding (Orange Landscapers)
    // Find <a href="index.html" class="logo"> ... <span>Location Landscapers</span>
    // Replace with <span>Location <span class="text-accent">Landscapers</span></span>
    // We need to be careful not to double wrap.
    // Regex matches the span content, capturing "Location" and "Landscapers"
    // Assuming format is <span>City Landscapers</span>
    content = content.replace(/<span>(.*?) Landscapers<\/span>/g, '<span>$1 <span class="text-accent">Landscapers</span></span>');
    // Fix double span if already applied (just in case)
    content = content.replace(/<span class="text-accent"><span class="text-accent">/g, '<span class="text-accent">');


    // 2. Service Card Images
    // Patios & Paving
    content = content.replace(/src="assets\/images\/hero.png"/g, 'src="assets/images/patios-final.jpg"');
    content = content.replace(/alt="Hard Landscaping and Patios Service"/g, 'alt="Patios and Paving Services"');

    // Drainage -> Drains (keep drains.jpg)

    // Garden Design
    content = content.replace(/src="assets\/images\/garden-design.png"/g, 'src="assets/images/garden-design-final.webp"');
    content = content.replace(/src="assets\/images\/garden-design-v2.png"/g, 'src="assets/images/garden-design-final.webp"');
    content = content.replace(/src="assets\/images\/garden-design-final.jpg"/g, 'src="assets/images/garden-design-final.webp"'); // Fix previous error

    // Fencing (Emergency Garden -> Fencing)
    content = content.replace(/src="assets\/images\/emergency-garden.jpg"/g, 'src="assets/images/fencing-final.webp"');
    content = content.replace(/src="assets\/images\/fencing-panel.jpg"/g, 'src="assets/images/fencing-final.webp"'); // Fix previous error

    // Maintenance
    content = content.replace(/src="assets\/images\/maintenance.jpg"/g, 'src="assets/images/hedge-trimming.webp"');

    // Handyman - Keep or remove? Let's keep for now but ensure image exists. 
    // If handyman.jpg doesn't exist, maybe use something else. Assuming it exists.

    // 3. Founder Image & Title
    // Replace the whole founder section to update image to paul-founder.jpg and Title to "Head Landscaper"
    // But we need to keep the dynamic Location name in "Founder of [Location] Landscapers" ???
    // The newFounderSection above uses "Cardiff Landscapers" hardcoded.
    // We should preserve the location name if possible, or just standardise to Cardiff Landscapers for the Founder section
    // as Paul is the founder of the company, not just the location branch.
    // Let's standardise to "Founder of Cardiff Landscapers" as that is valid.
    content = content.replace(founderSectionRegex, newFounderSection);

    // 4. Terminology Fixes
    content = content.replace(/Marshalls Register Engineers/g, 'Marshalls Register Landscapers');
    content = content.replace(/Head Engineer/g, 'Head Landscaper');
    content = content.replace(/General Maintenance/g, 'Garden Maintenance');

    // 5. Structure & Nav
    content = content.replace(oldNavRegex, newNav);
    content = content.replace(oldFooterRegex, newFooter);
    content = content.replace(boilerBlockRegex, '');

    // 6. Fix "Emergency (90mins)" text if still present to "Urgent"
    content = content.replace(/Emergency \(90mins\)/g, 'Urgent (90mins)');

    // 7. Remove "24/7 Emergency Line" text in header?
    // <div class="phone-cta"><span>24/7 Emergency Line</span>
    // Change to "Call For A Quote" or similar?
    // User didn't explicitly ask, but "Emergency Line" sounds like plumbing.
    // Let's change to "Free Instant Quote"
    content = content.replace(/<span>24\/7 Emergency Line<\/span>/g, '<span>Free Instant Quote</span>');


    // 8. Fix "Cardiff Landscapers" in About Image Alt
    // <img src="..." alt="Cardiff Landscapers Barry - Barry Island"> -> this is fine.

    // 9. Fix button links in cards
    // "Book Landscaper" / "Free Quote" buttons -> Booking Link
    // Previously we mapped to contact.html. Now we want the external link.
    // We target the href="contact.html" BUT only for the buttons (class="btn"). 
    // Wait, navigation also uses contact.html. We must be specific.
    // The cards look like: <a href="contact.html" class="btn btn-primary" style="width: 100%">...</a>

    const bookingLink = 'https://tradevaultai-production-5bf2.up.railway.app/landscaping-leads';

    // Replace the old railway link (if present) with the new one (just to be sure capitalization is fixed)
    content = content.replace(/href="https:\/\/tradevaultai-production-5bf2.up.railway.app\/Landscaping-leads"/g, `href="${bookingLink}"`);

    // Replace contact.html for Card Buttons
    // Regex to match: href="contact.html" ... class="btn ... width: 100%" (or similar)
    // Or just look for specific Button Text?
    // "Free Patios Quote", "Fix Blocked Drains", "Book Landscaper", "Get Help"

    const ctasToUpdate = [
        'Free Patios Quote',
        'Fix Blocked Drains',
        'Book Landscaper',
        'Get Help'
    ];

    ctasToUpdate.forEach(cta => {
        // Look for: <a href="contact.html" ... >CTA Text</a>
        // We use a regex safely.
        // It might be split across lines.
        // <a href="contact.html"\s+class="btn[^"]+"[^>]*?>\s*CTA Text
        const ctaRegex = new RegExp(`href="contact\\.html"([^>]*?)>\\s*${cta}`, 'g');
        content = content.replace(ctaRegex, `href="${bookingLink}"$1>${cta}`);
    });


    // 10. CRITICAL FIX: Missing </article> after Drainage card
    // The previous template seems to have missed closing the Drainage card before starting Garden Designs.
    // We look for the pattern: </div> (end of card-content) -> whitespace -> <!-- Garden Designs -->
    // And ensure </article> is there.
    // To be safe, we'll replace the specific transition that is known to be broken.
    const drainageFixRegex = /(<div class="card-content">[\s\S]*?<\/div>)(\s+<!-- Garden Designs -->)/;
    if (content.match(drainageFixRegex)) {
        console.log(`Fixing unclosed Drainage article in ${file}`);
        content = content.replace(drainageFixRegex, '$1\n                </article>$2');
    }

    // 11. Ensure no double closing </article> if we ran this twice (though regex above relies on it NOT being there)
    // Actually, if we run it twice, the regex won't match because </article> will be between div and comment.
    // But let's be sure.
    // The regex matches `</div>\s+<!--` so if `</article>` is present, it won't match `</div>` directly followed by comment (ignoring whitespace).
    // Wait, \s+ includes newlines. So `</div>\n </article>\n <!--` matches `</div>\s+<!--`?
    // YES. \s includes \n.
    // So we need to explicitly excluded </article> from the "whitespace".
    // Better regex: `(<\/div>)\s+(?!<\/article>)(\s*<!-- Garden Designs -->)`

    const drainageSafeFix = /(<\/div>)\s+(?!<\/article>)(\s*<!-- Garden Designs -->)/;
    if (content.match(drainageSafeFix)) {
        console.log(`Applying Drainage HTML fix to ${file}`);
        content = content.replace(drainageSafeFix, '$1\n                </article>$2');
    }

    // 12. Fix Image Paths (Garden Design & Fencing)
    // Correcting to .webp
    content = content.replace(/src="assets\/images\/garden-design.png"/g, 'src="assets/images/garden-design-final.webp"');
    content = content.replace(/src="assets\/images\/garden-design-v2.png"/g, 'src="assets/images/garden-design-final.webp"');
    content = content.replace(/src="assets\/images\/garden-design-final.jpg"/g, 'src="assets/images/garden-design-final.webp"'); // Fix previous error

    // Fencing 
    content = content.replace(/src="assets\/images\/emergency-garden.jpg"/g, 'src="assets/images/fencing-final.webp"');
    content = content.replace(/src="assets\/images\/fencing-panel.jpg"/g, 'src="assets/images/fencing-final.webp"');

    // 13. Fix Phone CTA Header (Standardize to Index style)
    // Replace <div class="phone-cta">...</div> with the button
    const oldPhoneCtaRegex = /<div class="phone-cta">[\s\S]*?<\/div>/;
    const newPhoneCta = `<a href="tel:02921690437" class="btn btn-primary" style="padding: 0.5rem 1rem;">
                    <i data-lucide="phone" size="18" style="margin-right: 0.5rem; vertical-align: middle;"></i>
                    029 2169 0437
                </a>`;
    if (content.match(oldPhoneCtaRegex)) {
        console.log(`Fixing Phone CTA in ${file}`);
        content = content.replace(oldPhoneCtaRegex, newPhoneCta);
    }

    // 14. Fix any "Paul" references (Text Content) - Reverting previous error
    // Replace "Paul" with "Stef" if it appears in text nodes
    content = content.replace(/Paul /g, 'Stef ');
    // content = content.replace(/Paul/g, 'Stef'); // Dangerous if Paul is in a URL or specific class? 
    // "Paul" in "paul-founder.jpg" (we already handled image above).
    // "Paul" in "paul-content", "paul-image-container" (classes) -> We should probably keep classes or rename them?
    // The classes in newFounderSection are still "paul-content". So we should NOT replace Paul globally if it breaks CSS.
    // However, the classes are defined in CSS. If I rename classes in HTML, I must rename in CSS.
    // User task is just "should be stef with his image".
    // I will leave classes as "paul-*" for safety unless I check CSS.
    // Just replace Text display.

    // Explicit text replacements for what I likely broke:
    content = content.replace(/>Paul</g, '>Stef<');
    content = content.replace(/Hi, I'm Paul/g, "Hi, I'm Stef");

    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
});
console.log("Done.");
