# InnoFix App Structure

## Overview
The InnoFix application consists of two main components:

### 1. Homepage (`index.html`)
- **Purpose**: Main landing page and business information (DEFAULT PAGE)
- **Technology**: Static HTML with Tailwind CSS
- **Content**: 
  - Hero section with contact info
  - About Innocent (the technician)
  - Services offered
  - Testimonials
  - Contact information

### 2. Gallery/Showcase (`gallery.html` + JavaScript App)
- **Purpose**: Portfolio showcasing completed repair work
- **Technology**: React with JavaScript (ES6 modules), Tailwind CSS
- **Content**:
  - Interactive gallery of repair work
  - Filter by appliance category
  - Before/after photos
  - Detailed descriptions

## Navigation Flow
```
index.html (Homepage - DEFAULT)
    ↓ "View Our Work" button
gallery.html (Gallery)
    ↓ "Home" link in navbar
index.html (Homepage)
```

## File Structure
```
innofix/
├── index.html            # Main homepage (DEFAULT - static HTML)
├── gallery.html          # Gallery app entry point (React)
├── index.js              # React app root (JavaScript)
├── App.js                # Main React component (JavaScript)
├── components/           # React components (JavaScript)
│   ├── Navbar.js
│   ├── Footer.js
│   └── Logo.js
├── constants.js          # App constants (JavaScript)
└── images/               # Gallery images
```

## How to Use
1. **Start with homepage**: Open `index.html` in browser (DEFAULT PAGE)
2. **View portfolio**: Click "View Our Work" to see `gallery.html` (React gallery)
3. **Return home**: Click "Home" in gallery navbar

## Development
- Homepage: Edit `index.html` directly
- Gallery: Uses JavaScript ES6 modules with React via ESM.sh CDN

Both apps share the same design system (colors, fonts, styling) for consistency.

## Fixed Issues
- ✅ Removed problematic CSS file reference
- ✅ Converted TypeScript to JavaScript for direct browser execution
- ✅ No build step required - runs directly in browser
- ✅ Uses ESM.sh for React dependencies