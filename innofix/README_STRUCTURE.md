# InnoFix App Structure

## Overview
The InnoFix application consists of two main components:

### 1. Homepage (`InnoFix.html`)
- **Purpose**: Main landing page and business information
- **Technology**: Static HTML with Tailwind CSS
- **Content**: 
  - Hero section with contact info
  - About Innocent (the technician)
  - Services offered
  - Testimonials
  - Contact information

### 2. Gallery/Showcase (`index.html` + JavaScript App)
- **Purpose**: Portfolio showcasing completed repair work
- **Technology**: React with JavaScript (ES6 modules), Tailwind CSS
- **Content**:
  - Interactive gallery of repair work
  - Filter by appliance category
  - Before/after photos
  - Detailed descriptions

## Navigation Flow
```
InnoFix.html (Homepage)
    ↓ "View Our Work" button
index.html (Gallery)
    ↓ "Home" link in navbar
InnoFix.html (Homepage)
```

## File Structure
```
innofix/
├── InnoFix.html          # Main homepage (static)
├── index.html            # Gallery app entry point
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
1. **Start with homepage**: Open `InnoFix.html` in browser
2. **View portfolio**: Click "View Our Work" to see `index.html` (React gallery)
3. **Return home**: Click "Home" in gallery navbar

## Development
- Homepage: Edit `InnoFix.html` directly
- Gallery: Uses JavaScript ES6 modules with React via ESM.sh CDN

Both apps share the same design system (colors, fonts, styling) for consistency.

## Fixed Issues
- ✅ Removed problematic CSS file reference
- ✅ Converted TypeScript to JavaScript for direct browser execution
- ✅ No build step required - runs directly in browser
- ✅ Uses ESM.sh for React dependencies