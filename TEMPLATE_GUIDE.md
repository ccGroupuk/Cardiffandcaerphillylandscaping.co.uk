# VaultRank Template Guide: Multi-Trade Master

**Reference Implementation**: Cardiff & Caerphilly Plumbers
**Repository**: `ccGroupuk/plumbing-site-template`

This repository serves as the **Master Template** for **ALL TRADES** in the VaultRank ecosystem. While the content is currently "Plumbing", the structure is designed to be adapted for Carpentry, Electrical, Roofing, etc.

## 🏁 Step 0: Infrastructure Setup (Start Here)

1.  **GitHub**: Create a **NEW** repository (e.g., `cardiff-landscaping`).
2.  **Clone**: Clone your new empty repo to your computer.
3.  **Copy**: Copy **ALL** files from this template folder into your new repo folder.
    *   *Exclude `.git` folder so you don't overwrite version history.*
4.  **Push**: `git add .`, `git commit`, `git push` to get the code into your new GitHub repo.
5.  **Railway**:
    *   New Project -> Deploy from GitHub repo.
    *   Generate Domain (e.g., `cardiff-landscaping.up.railway.app`).

## 🚀 How to Deploy for New Locations (Same Trade)

To deploy this site for a new client or location (e.g., "Bristol Plumbers"), perform a global Find & Replace on the following tokens.

### 1. Global Tokens (Replace All)

| Token (Current Value) | Description | Variable Name |
|-----------------------|-------------|---------------|
| **Cardiff** | Primary City | `{{PrimaryCity}}` |
| **Caerphilly** | Secondary City/Region | `{{SecondaryCity}}` |
| **South Wales** | Broader Region | `{{Region}}` |
| **029 2169 0437** | Tracking Phone Number | `{{PhoneNumber}}` |
| **02921690437** | Tel Link Format (No spaces) | `{{TelLink}}` |
| **cardiffandcaerphillyplumbers@gmail.com** | Contact Email | `{{Email}}` |
| **https://wa.me/447803083422** | WhatsApp Link | `{{WhatsAppLink}}` |

## 🛠️ How to Adapt for New Trades (e.g., Carpentry)

To convert this template from **Plumbing** to **Carpentry** (or any other trade), follow this **Trade Swap Protocol**.

### 1. Global Terminology Swap
Perform Case-Sensitive Find & Replace:

| Current Term (Plumbing) | Target Term (Example: Carpentry) | Context |
|-------------------------|-----------------------------------|---------|
| **Plumber** | Carpenter | Role Name |
| **Plumbing** | Carpentry / Joinery | Service Name |
| **Heating** | Bespoke Furniture | Service Category 1 |
| **Gas Safe** | City & Guilds / CSCS | Qualification |
| **Boiler** | Wardrobe | Product 1 |
| **Leak** | Rot / Damage | Problem 1 |

### 2. Asset Replacement
You **MUST** replace the following images in `assets/images/` with high-fidelity equivalents for the new trade.

| File Name | Current Content | New Trade Requirement (Carpentry Ex.) |
|-----------|-----------------|---------------------------------------|
| `hero.png` | Van/Plumber with Wrench | Carpenter with Saw/Wood or Finished Kitchen |
| `leaking-sink.jpg` | Water/Pipe damage | Rotting Beam / Damaged Door |
| `drains.jpg` | Blocked Drain | Damaged Fence / Decking |
| `bathroom.png` | Tap/Sink | Door Hinge / Cabinet |

### 3. Icon Swap (Lucide)
The template uses `lucide-icons`. Update icons in `index.html` and service pages to match the trade.

- **Wrench** (`<i data-lucide="wrench"></i>`) -> Change to `hammer` or `ruler`.
- **Flame** (`<i data-lucide="flame"></i>`) -> Change to `armchair` or `box`.
- **Droplet** -> Change to `tree-pine` or `hard-hat`.

### 4. Color Palette (Optional)
The default "Premium Blue" works for most, but you can adapt `css/styles.css` `:root` variables:
- **Carpentry**: Consider Earth Tones (Browns/Greens) or Slate.
- **Electrical**: Considerations for Yellow/Volt accents.

## ⚠️ Pre-Deployment Checklist
1. [ ] Update `manifest.json` or `site.webmanifest` if present.
2. [ ] Check `sitemap.xml` (needs generating for new domains).
3. [ ] Configure the `contact.html` form action to the correct CRM endpoint.
4. [ ] **Verify Services**: Ensure the 6 Grid Cards in `services.html` match the new trade's core offers.
