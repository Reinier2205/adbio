# Design Document: Health Synchrony Website

## Overview

Health Synchrony is a standalone "Medical Luxury" website delivered as a plain HTML5/CSS3/Vanilla JS site inside `healthsync/` within the existing adbio project. No build toolchain, bundler, or framework is required — the site is a static multi-page application (MPA) composed of individual HTML files, a shared CSS layer, and a collection of small ES-module JavaScript files, mirroring the architectural style of other projects in the adbio repository.

The design must satisfy three simultaneous constraints:
1. **Clinical credibility** — HPCSA-compliant copy, POPIA-compliant data handling, and transparent credential display.
2. **Premium aesthetics** — "Medical Luxury" visual language using Playfair Display headings, Montserrat body text, and a Navy/Gold or Deep Teal/Gold palette.
3. **Conversion performance** — LCP < 2.5 s, mobile-first layout, persistent booking CTA, and embedded interactive components.

### Technology Decisions

| Concern | Choice | Rationale |
|---|---|---|
| Markup | HTML5 | Matches project style; no build step needed |
| Styling | CSS3 custom properties + utility classes | Design tokens without a preprocessor |
| Scripting | Vanilla ES modules (`type="module"`) | Native browser support; no bundler needed |
| Fonts | Google Fonts with `font-display: swap` | Fast perceived load; system fallback defined |
| Images | WebP + `<picture>` JPEG/PNG fallback | LCP optimisation; broad compatibility |
| Schema | JSON-LD inline in `<head>` | Easiest to maintain without a CMS |
| Booking | Jane App or Vagaro iframe embed | Both provide hosted booking pages; Jane App preferred for South African healthcare |
| AI Chatbot | Tidio or Crisp embedded widget (HPCSA-filtered) | Easy embed; content filter layer applied in JS |
| Reviews | Google Places API (JS SDK) or iframe embed | Fallback static HTML if API quota exceeded |
| Testing | fast-check (property-based) + native browser tests | Runs without build tools via CDN |

---

## Architecture

### Site Map

```
healthsync/
├── index.html                  ← Home
├── about.html                  ← About Us
├── aesthetics.html             ← Aesthetics (service sub-page)
├── weight-loss.html            ← Weight Loss (service sub-page)
├── iv-therapy.html             ← IV Therapy (service sub-page)
├── consultations.html          ← Consultations (service sub-page)
├── dispensary.html             ← Dispensary (service sub-page)
├── contact.html                ← Contact Us
├── privacy-policy.html         ← Privacy Policy (POPIA)
├── css/
│   ├── tokens.css              ← Design tokens (custom properties)
│   ├── base.css                ← Reset, typography, global elements
│   ├── layout.css              ← Grid, section spacing, breakpoints
│   ├── components.css          ← Reusable component styles
│   └── pages/
│       ├── home.css
│       ├── about.css
│       ├── aesthetics.css
│       ├── weight-loss.css
│       ├── iv-therapy.css
│       ├── consultations.css
│       ├── dispensary.css
│       └── contact.css
├── js/
│   ├── nav.js                  ← Mobile hamburger + sticky nav logic
│   ├── sticky-cta.js           ← Sticky "Book Consultation" CTA behaviour
│   ├── before-after-slider.js  ← Before/After image slider component
│   ├── journey-map.js          ← Interactive weight loss journey steps
│   ├── iv-menu.js              ← IV card rendering + filtering
│   ├── treatment-quiz.js       ← Multi-step quiz engine
│   ├── booking-widget.js       ← Booking embed loader + fallback logic
│   ├── ai-receptionist.js      ← Chatbot embed + HPCSA content filter
│   ├── review-widget.js        ← Google Reviews loader + fallback
│   ├── contact-form.js         ← Form validation + POPIA consent logic
│   └── schema.js               ← JSON-LD schema injection helper
├── images/
│   ├── hero/                   ← Hero images (WebP + JPEG fallback)
│   ├── team/                   ← Dr. van Dyk photos
│   ├── treatments/             ← Before/after pairs (WebP + JPEG)
│   └── icons/                  ← SVG icons (inline-able)
└── fonts/                      ← (optional) self-hosted font subset fallback
```

### Page Load Flow

```
Browser requests index.html
  └─ <head> loads tokens.css → base.css → layout.css → components.css → home.css
  └─ Google Fonts loaded async (font-display: swap)
  └─ Hero image: <picture> WebP / JPEG, fetchpriority="high", no lazy-load
  └─ All below-fold images: loading="lazy"
  └─ <script type="module"> loads page-specific JS modules
       └─ booking-widget.js: inject iframe, start 10s timeout
       └─ review-widget.js: fetch Google Places, start 10s timeout
       └─ ai-receptionist.js: inject chat widget embed
       └─ treatment-quiz.js: wire up quiz DOM
```

---

## Components and Interfaces

### 1. Shared Header / Navigation

**Structure:**
```html
<header class="site-header" role="banner">
  <a href="/healthsync/" class="logo" aria-label="Health Synchrony home">
    <img src="images/logo.webp" alt="Health Synchrony logo" width="180" height="48">
  </a>
  <nav class="primary-nav" aria-label="Primary navigation">
    <ul role="list">
      <li><a href="index.html">Home</a></li>
      <li class="has-dropdown">
        <button aria-expanded="false" aria-haspopup="true">Services</button>
        <ul class="dropdown" role="list">
          <li><a href="aesthetics.html">Aesthetics</a></li>
          <li><a href="weight-loss.html">Weight Loss</a></li>
          <li><a href="iv-therapy.html">IV Therapy</a></li>
          <li><a href="consultations.html">Consultations</a></li>
          <li><a href="dispensary.html">Dispensary</a></li>
        </ul>
      </li>
      <li><a href="about.html">About Us</a></li>
      <li><a href="contact.html">Contact Us</a></li>
    </ul>
  </nav>
  <button class="nav-toggle" aria-label="Open navigation menu" aria-expanded="false">
    <!-- SVG hamburger icon -->
  </button>
</header>
```

**Behaviour (nav.js):**
- On mobile (≤768px), the `<nav>` is hidden by default; the hamburger button toggles `aria-expanded` and a CSS class.
- `nav.js` traps focus within the open drawer and closes on `Escape` or outside click.
- Active page gets `aria-current="page"` on its link.

### 2. Sticky CTA (sticky-cta.js)

**Structure:**
```html
<div class="sticky-cta" role="complementary" aria-label="Book consultation">
  <a href="#booking-widget" class="btn-primary sticky-cta__btn"
     data-fallback-href="contact.html">
    Book Consultation
  </a>
</div>
```

**Behaviour:**
- Displayed at all times on mobile (≤768px) in a `position: fixed` bar at the bottom.
- On click: if `#booking-widget` exists on the current page, smooth-scroll to it; otherwise navigate to `contact.html`.
- Touch target: minimum `min-height: 48px; min-width: 48px`.
- Hidden on desktop where inline CTAs are used instead.

### 3. Before/After Slider (before-after-slider.js)

**Interface:**
```html
<div class="before-after-slider" 
     data-before="images/treatments/face-before.webp"
     data-after="images/treatments/face-after.webp"
     aria-label="Before and after treatment comparison">
  <!-- rendered by JS -->
</div>
```

**Rendered output (by JS):**
```html
<div class="bas__track" aria-hidden="true">
  <img class="bas__before" src="..." alt="Before treatment">
  <img class="bas__after" src="..." alt="After treatment" style="clip-path: inset(0 50% 0 0)">
  <div class="bas__divider" role="separator">
    <button class="bas__handle" aria-label="Drag to compare before and after" 
            aria-valuemin="0" aria-valuemax="100" aria-valuenow="50">
    </button>
  </div>
</div>
<p class="bas__caption sr-only">Left: before treatment. Right: after treatment.</p>
```

**Behaviour:**
- Drag/touch moves the divider; CSS `clip-path` animates at `transition: clip-path 300ms ease`.
- Keyboard: arrow keys move the handle in 5% increments.
- Pointer position clamped to `[0, 100]` percent range.

### 4. Journey Map (journey-map.js)

**Interface:**
```html
<ol class="journey-map" aria-label="Weight loss journey steps">
  <!-- Steps injected from JSON data or data attributes -->
</ol>
```

**Data contract:**
```js
// journey-map.js receives an array of step objects:
[
  { id: 1, title: "Initial Consultation", description: "..." /* 10–40 words */ },
  { id: 2, title: "Personalised Plan",    description: "..." },
  { id: 3, title: "Treatment Programme",  description: "..." },
  { id: 4, title: "Progress Check-ins",   description: "..." },
  { id: 5, title: "Maintenance & Lifestyle", description: "..." }
]
```

**Behaviour:**
- Clicking/tapping a step highlights it (`aria-selected="true"`) and reveals its description panel.
- Only one step is active at a time.
- Minimum 3, maximum 5 steps enforced by the module (logs a console warning if violated).

### 5. IV Menu Cards (iv-menu.js)

**Data contract:**
```js
// Each card:
{
  id: "energy-boost",
  category: "Energy",      // → determines CSS colour token
  name: "Energy Boost Drip",
  ingredients: ["Vitamin B Complex", "Magnesium", "Vitamin C", "Zinc"],
  bestFor: "Fatigue recovery and sustained daily energy",  // ≤ 60 chars
  ctaHref: "#booking-widget"
}
```

**Rendered card:**
```html
<article class="iv-card iv-card--energy" aria-labelledby="card-energy-boost-title">
  <div class="iv-card__category-bar" aria-hidden="true"></div>
  <h3 id="card-energy-boost-title" class="iv-card__name">Energy Boost Drip</h3>
  <ul class="iv-card__ingredients" aria-label="Key ingredients">
    <li>Vitamin B Complex</li><!-- … -->
  </ul>
  <p class="iv-card__best-for"><strong>Best for:</strong> Fatigue recovery…</p>
  <a href="#booking-widget" class="btn-secondary iv-card__cta">Book This Drip</a>
</article>
```

**Category → colour token mapping:**
```css
.iv-card--energy    { --card-accent: var(--color-gold); }
.iv-card--beauty    { --card-accent: var(--color-sage); }
.iv-card--immunity  { --card-accent: var(--color-teal-light); }
```

### 6. Treatment Quiz (treatment-quiz.js)

**Structure:**
```html
<section class="treatment-quiz" id="treatment-quiz" aria-label="Find your perfect treatment">
  <div class="quiz__progress" role="progressbar" 
       aria-valuenow="1" aria-valuemin="1" aria-valuemax="7">
    Step 1 of 5
  </div>
  <form class="quiz__form" novalidate>
    <!-- Questions rendered progressively by JS -->
  </form>
  <div class="quiz__result" hidden aria-live="polite">
    <!-- Recommendation injected by JS on completion -->
  </div>
</section>
```

**Question data contract:**
```js
{
  id: "q1",
  text: "What is your primary health goal?",
  options: [
    { value: "aesthetics",   label: "Look and feel my best" },
    { value: "weight-loss",  label: "Manage my weight" },
    { value: "energy",       label: "Boost my energy" },
    { value: "wellness",     label: "General wellness" }
  ]
}
```

**Recommendation engine:** Simple weighted scoring. Each answer adds weight to a service category; the category with the highest score at quiz end is recommended. Result includes a `<a href="{service}.html">` CTA link.

**Constraints enforced by module:**
- 3–7 questions total; console error thrown if violated.
- `aria-live="polite"` on result region so screen readers announce the recommendation.

### 7. Booking Widget (booking-widget.js)

**Module behaviour:**
```js
// booking-widget.js
export function initBookingWidget(containerSelector, fallbackSelector) {
  // 1. Inject <iframe> with Jane App / Vagaro embed URL
  // 2. Start 10-second timeout
  // 3. On timeout: show fallback phone + email + Contact Us link
  // 4. On iframe load: clear timeout, hide fallback
}
```

**Fallback HTML (rendered if timeout fires):**
```html
<div class="booking-fallback" role="alert">
  <p>Our online booking is temporarily unavailable.</p>
  <p>Call us: <a href="tel:+27XXXXXXXXXX">+27 XX XXX XXXX</a></p>
  <p>Email: <a href="mailto:info@healthsynchrony.co.za">info@healthsynchrony.co.za</a></p>
  <a href="contact.html" class="btn-secondary">Go to Contact Us</a>
</div>
```

**Responsive embed:** The iframe container uses `padding-bottom: 56.25%` aspect ratio trick or a fixed height with `overflow: auto`, capped at `max-width: 100%` to avoid horizontal scroll at all viewport widths (320px–1440px).

### 8. AI Receptionist (ai-receptionist.js)

**Architecture decision:** Use a third-party embeddable widget (Tidio, Crisp, or Tawk.to) for the chat UI/UX, but intercept outgoing responses through a JavaScript content filter before display. For a pure offline/zero-dependency fallback, a local FAQ engine is also implemented.

**HPCSA Content Filter:**
```js
// Blocked patterns — responses containing these are suppressed
const BLOCKED_PATTERNS = [
  /diagnos/i,
  /prescri/i,
  /you (should|must|need to) (take|use|try)/i,
  /guaranteed? (result|outcome|loss|improvement)/i,
  /\d+\s?(kg|lbs?|kilograms?)\s*(loss|reduction|drop)/i,
  /cure/i,
  /treat your/i,
];

export function filterResponse(responseText) {
  const isBlocked = BLOCKED_PATTERNS.some(p => p.test(responseText));
  if (isBlocked) {
    return {
      allowed: false,
      text: "For medical guidance, please contact us directly — we'd love to help you in person."
    };
  }
  return { allowed: true, text: responseText };
}
```

**FAQ Engine (local fallback):**
```js
const FAQ_ENTRIES = [
  { keywords: ["hours", "open", "operating"], answer: "We are open Monday–Friday 08:00–17:00..." },
  { keywords: ["location", "address", "where"], answer: "We are located at Irene Security Estate, Centurion, Gauteng." },
  { keywords: ["book", "appointment", "schedule"], answer: "You can book via our website or call us at +27 XX XXX XXXX." },
  { keywords: ["services", "offer", "treat"], answer: "We offer Aesthetics, Weight Loss, IV Therapy, Consultations and a Dispensary." },
];

export function matchFAQ(query) {
  // Lowercase token match; returns best match or null
}
```

**Trigger button:**
```html
<button class="ai-chat-trigger" 
        aria-label="Open AI receptionist chat"
        style="min-width:48px;min-height:48px;">
  <!-- SVG chat icon -->
</button>
```

**Timeouts:**
- 10 s wait for third-party widget to respond → show offline fallback.
- Offline fallback message: "Our assistant is temporarily unavailable. Call or email us directly."

### 9. Review Widget (review-widget.js)

**Strategy:**
1. Attempt to load Google Places API (JavaScript SDK) using a configured API key.
2. Parse reviews, filter to ≤ 24 months old, compute aggregate rating.
3. If aggregate < 4.0: hide star rating, show excerpts only.
4. 10 s timeout → render static fallback.

**Fallback HTML:**
```html
<section class="reviews-fallback">
  <blockquote class="review-excerpt">
    "Dr van Dyk was exceptional — thorough, caring, and professional."
    <cite>— Patient via Google Reviews</cite>
  </blockquote>
  <a href="https://g.page/healthsynchrony" target="_blank" rel="noopener noreferrer">
    Read all reviews on Google
  </a>
</section>
```

### 10. Contact Form (contact-form.js)

**Validation rules (client-side):**
```js
export const VALIDATORS = {
  name:    value => value.trim().length > 0,
  email:   value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()),
  phone:   value => /^(\+27|0)[0-9]{9}$/.test(value.replace(/\s/g, "")),
  message: value => value.trim().length <= 500,
  consentAppointment: value => value === true,
};
```

**Behaviour:**
- On submit: validate all fields; if any fail, render inline `<span role="alert">` messages adjacent to the field.
- Retain valid field values on validation failure.
- Only `consentAppointment` is required to submit; `consentMarketing` is optional.
- On success: show `<div role="status">Enquiry received — we'll be in touch soon.</div>`.

### 11. Shared Footer

```html
<footer class="site-footer" role="contentinfo">
  <div class="footer__links">
    <a href="privacy-policy.html">Privacy Policy</a>
    <a href="contact.html">Contact Us</a>
  </div>
  <p class="footer__disclaimer">
    Health Synchrony is registered with the HPCSA. 
    Results may vary. All treatments are subject to a medical consultation.
  </p>
  <p class="footer__popia">
    © 2025 Health Synchrony. Personal information is processed in accordance with POPIA.
  </p>
</footer>
```

Privacy Policy link in footer ensures POPIA Requirement 13.5 is met on every page.

---

## Data Models

### Page Metadata Object (per-page SEO)
```js
{
  page: "home",
  title: "Health Synchrony | Aesthetics & Wellness in Centurion",       // ≤ 60 chars
  description: "Integrated health practitioners in Irene, Centurion…",  // 50–160 chars
  schemaTypes: ["MedicalBusiness"],
  canonicalPath: "/healthsync/index.html"
}
```

### IV Menu Card
```ts
interface IVCard {
  id: string;
  category: "Energy" | "Beauty" | "Immunity" | string;
  name: string;
  ingredients: string[];    // min 3 items
  bestFor: string;          // ≤ 60 characters
  ctaHref: string;
}
```

### Quiz Question
```ts
interface QuizQuestion {
  id: string;
  text: string;
  options: Array<{ value: string; label: string; weight: Record<string, number> }>;
}
```

### Quiz Result
```ts
interface QuizResult {
  recommendedService: "aesthetics" | "weight-loss" | "iv-therapy" | "consultations" | "dispensary";
  headline: string;         // personalised headline ≤ 20 words
  ctaHref: string;          // links to the service sub-page
}
```

### Journey Map Step
```ts
interface JourneyStep {
  id: number;               // 1–5
  title: string;
  description: string;      // 10–40 words enforced
  icon?: string;            // optional SVG path or emoji
}
```

### Contact Form Payload
```ts
interface ContactFormPayload {
  name: string;             // non-empty
  email: string;            // matches /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  phone: string;            // SA format: 0XX XXX XXXX or +27 XX XXX XXXX
  reason: string;           // free-text ≤ 500 chars
  preferredContact: "Phone" | "Email";
  consentAppointment: true; // required; must be true
  consentMarketing: boolean; // optional
}
```

### MedicalBusiness Schema (Home page)
```json
{
  "@context": "https://schema.org",
  "@type": "MedicalBusiness",
  "name": "Health Synchrony – Integrated Health Practitioners",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Irene Security Estate",
    "addressLocality": "Centurion",
    "addressRegion": "Gauteng",
    "addressCountry": "ZA"
  },
  "telephone": "+27XXXXXXXXXX",
  "url": "https://healthsynchrony.co.za",
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"],
      "opens": "08:00",
      "closes": "17:00"
    }
  ]
}
```

### Physician Schema (About Us page)
```json
{
  "@context": "https://schema.org",
  "@type": "Physician",
  "name": "Dr. van Dyk",
  "medicalSpecialty": "https://schema.org/Dermatology",
  "worksFor": {
    "@type": "MedicalBusiness",
    "name": "Health Synchrony – Integrated Health Practitioners"
  }
}
```

---

## CSS Architecture

### Design Tokens (tokens.css)

```css
:root {
  /* Palette — Option A (Navy + Gold) */
  --color-navy:        #0A1F3C;
  --color-gold:        #C9A84C;
  --color-sage:        #8FAF8A;
  --color-ivory:       #F5F0E8;

  /* Option B (uncomment to switch to Deep Teal) */
  /* --color-teal:     #0D4F5C; */
  /* --color-eucalyptus: #5C8C7A; */
  /* --color-rosegold: #C9817A; */

  /* Typography */
  --font-heading:      'Playfair Display', Georgia, serif;
  --font-body:         'Montserrat', 'Open Sans', system-ui, sans-serif;

  --font-size-xs:      0.75rem;
  --font-size-sm:      0.875rem;
  --font-size-base:    1rem;
  --font-size-lg:      1.25rem;
  --font-size-xl:      1.5rem;
  --font-size-2xl:     2rem;
  --font-size-3xl:     2.5rem;

  /* Spacing */
  --spacing-section-mobile:  40px;
  --spacing-section-desktop: 64px;
  --spacing-4:   4px;
  --spacing-8:   8px;
  --spacing-16:  16px;
  --spacing-24:  24px;
  --spacing-32:  32px;
  --spacing-48:  48px;
  --spacing-64:  64px;

  /* Touch targets */
  --touch-target: 48px;

  /* Border radius */
  --radius-sm:   4px;
  --radius-md:   8px;
  --radius-lg:   16px;

  /* Transitions */
  --transition-fast:   150ms ease;
  --transition-normal: 300ms ease;

  /* Z-index scale */
  --z-sticky:  100;
  --z-nav:     200;
  --z-modal:   300;
  --z-chat:    400;
}
```

### Breakpoint Strategy (mobile-first)

```css
/* base.css — mobile first */
/* Default styles target 320px+ */

@media (min-width: 375px)  { /* small phones */ }
@media (min-width: 768px)  { /* tablets — hide sticky CTA, show desktop nav */ }
@media (min-width: 1024px) { /* laptops — section spacing: var(--spacing-section-desktop) */ }
@media (min-width: 1440px) { /* wide desktop — max-width content container */ }
```

### Content Container

```css
.container {
  width: 100%;
  max-width: 1280px;
  margin-inline: auto;
  padding-inline: var(--spacing-16);
}

@media (min-width: 768px) {
  .container { padding-inline: var(--spacing-32); }
}
```

### Section Spacing

```css
.section {
  padding-block: var(--spacing-section-mobile);
}

@media (min-width: 1024px) {
  .section {
    padding-block: var(--spacing-section-desktop);
  }
}
```

---

## Error Handling

### Booking Widget Timeout
```
Page loads → booking-widget.js injects iframe → 10s timeout starts
  ├── Iframe fires load event  → timeout cleared, widget shown
  └── 10s passes without load → iframe hidden, fallback div shown (phone + email + Contact link)
       └── If fallback div also fails to render → Contact Us <a> in nav header remains available
```

### Review Widget Timeout
```
review-widget.js initialises → 10s timeout starts
  ├── Google Places API responds → render rating + excerpts (hide rating if < 4.0)
  └── 10s passes               → render static fallback (1+ review excerpt + Google Business link)
```

### AI Receptionist
```
ai-receptionist.js loads → injects 3rd-party chat widget → 10s response timeout per query
  ├── Response received → run filterResponse() → show filtered text OR fallback message
  └── No response in 10s → show offline fallback message
```

### Video Placeholder (About Us / Consultations)
```
On page load → check for video-asset-available flag (data attribute or config)
  ├── Flag present  → render <video> element with playback controls
  └── Flag absent   → render styled placeholder with aria-label, title, and description text
```

### Contact Form Submission
```
Form submit event fires → validate all fields
  ├── All valid + consentAppointment = true → submit (fetch POST or mailto fallback) → show success message
  └── Any invalid → render adjacent role="alert" error messages, retain valid field values, block submit
```

### Font Loading Failure
```
@font-face with font-display: swap ensures body text shows in system font immediately
  → Google Fonts loads asynchronously
  → If request fails, CSS fallback stack: Georgia serif / system-ui sans-serif applies
```

---

## Performance Strategy

### Hero Image (LCP Optimisation)
- Hero `<img>` is not lazy-loaded; it gets `fetchpriority="high"`.
- Hero uses `<picture>` with WebP source and JPEG fallback.
- Hero image dimensions are explicitly set (`width` / `height`) to prevent layout shift.

```html
<picture>
  <source srcset="images/hero/home-hero.webp" type="image/webp">
  <img src="images/hero/home-hero.jpg"
       alt="Dr. van Dyk consulting with a patient at Health Synchrony, Centurion"
       width="1440" height="810"
       fetchpriority="high"
       decoding="async">
</picture>
```

### Below-Fold Images
All images below the first viewport fold use `loading="lazy"` on both `<img>` and `<picture>` source sets.

```html
<picture>
  <source srcset="images/treatments/face-before.webp" type="image/webp">
  <img src="images/treatments/face-before.jpg"
       alt="Patient before facial treatment"
       loading="lazy" decoding="async"
       width="600" height="400">
</picture>
```

### Font Loading
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Montserrat:wght@400;500;600&display=swap">
```

`font-display: swap` is requested via the `display=swap` parameter; this ensures text renders in the fallback font immediately, swapping to the web font when it arrives.

### Third-Party Widget Loading
- Booking widget, review widget, and AI receptionist scripts are loaded with `defer` or `async` to avoid blocking the main thread.
- All third-party scripts are placed at the bottom of `<body>` or injected by JS modules after DOMContentLoaded.

### CSS Architecture for Performance
- No CSS `@import` chains; stylesheets linked directly in `<head>` in dependency order.
- Critical above-fold styles (hero, header, sticky CTA) kept in `base.css` and `components.css`.
- Page-specific CSS loaded only on relevant pages via separate `<link>` tags.

---

## SEO and Schema Markup Strategy

### Per-Page `<title>` and `<meta description>` Rules
- Maximum 60 characters for `<title>`.
- 50–160 characters for `<meta name="description">`.
- Every page title/description is unique.
- Each must contain at minimum one service keyword and one location keyword.

Example titles:
| Page | Title |
|---|---|
| Home | Health Synchrony | Wellness in Centurion |
| About Us | About Dr. van Dyk | Centurion Health Practice |
| Aesthetics | Aesthetic Treatments Centurion | Health Synchrony |
| Weight Loss | Weight Loss Programme | Centurion Irene |
| IV Therapy | IV Drip Therapy | Health Synchrony Centurion |
| Consultations | Book a Consultation | Centurion Practice |
| Dispensary | Medical Dispensary Centurion | Health Synchrony |
| Contact | Contact Us | Health Synchrony Centurion |

### JSON-LD Schema Injection
`schema.js` exports helper functions to inject JSON-LD scripts into the current page's `<head>`:

```js
export function injectSchema(schemaObject) {
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(schemaObject);
  document.head.appendChild(script);
}
```

Each page imports and calls the relevant schema function on DOMContentLoaded.

### `<html lang>` and Charset
Every page includes:
```html
<html lang="en">
<head>
  <meta charset="UTF-8">
  ...
```

---


---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

---

### Property 1: Sticky CTA routing correctness

*For any* page DOM state, when the Sticky CTA is activated: if a `#booking-widget` element is present in the current document, the page SHALL scroll to that element; if no `#booking-widget` element is present, the browser SHALL navigate to `contact.html`. No other navigation outcome is permitted.

**Validates: Requirements 1.5**

---

### Property 2: Comprehensive image hygiene

*For any* `<img>` element on any page that is not purely decorative (i.e., not `alt=""`): the `alt` attribute must be a non-empty string of at least 1 character. *For any* `<picture>` element containing a content image: at least one `<source>` with `type="image/webp"` must be present. *For any* `<img>` or `<iframe>` element that is not the designated LCP hero element: the `loading="lazy"` attribute must be present.

**Validates: Requirements 2.6, 15.2, 18.1**

---

### Property 3: Booking widget fallback invariant

*For any* page containing a booking widget container element, if the widget's `load` event has not fired within 10 seconds of page interaction: the fallback element must become visible and must contain the practice phone number, email address, and a link to `contact.html`. The fallback must render even if the widget iframe itself fails to mount.

**Validates: Requirements 3.4, 5.7, 5.8, 11.2**

---

### Property 4: Review widget fallback invariant

*For any* invocation of the `review-widget.js` module, if the Google Places API does not return a successful response within 10 seconds: the static fallback section must be rendered in the visible viewport and must contain at minimum one review excerpt and one anchor linking to the Google Business Profile.

**Validates: Requirements 3.5, 17.4, 17.5**

---

### Property 5: Treatment quiz recommendation completeness

*For any* sequence of quiz answers that covers all 3–7 questions in the configured question set: the quiz engine SHALL produce exactly one `QuizResult` object containing a non-empty `recommendedService` string and a `ctaHref` pointing to the corresponding service sub-page HTML file. No answer sequence on a valid quiz (3–7 questions) may produce a result with a missing or empty recommendation.

**Validates: Requirements 3.7**

---

### Property 6: Video placeholder / live toggle

*For any* page render where the video-asset-available flag is `false` (or absent): no `<video>` element may appear in the DOM, and the placeholder section must be present with non-empty `aria-label` and `title` attributes. *Conversely*, for any render where the flag is `true`: the `<video>` element must be present with a `controls` attribute and the placeholder section must be absent.

**Validates: Requirements 4.4, 4.5**

---

### Property 7: No prohibited promotional terms on any page

*For any* page in the site, the visible text content (excluding `<script>` and `<style>` blocks) must not match any of the following patterns (case-insensitive): `specials`, `discount`, `deal`, `bogo`, `buy one get one`, `sale`, `% off`, `save [amount]`, `limited offer`, `free [treatment]`. The prohibition applies to all text nodes, heading elements, button labels, and `alt` attributes.

**Validates: Requirements 5.6, 14.2, 14.3**

---

### Property 8: No guaranteed outcome language on any page

*For any* page in the site, the visible text content must not match any of the following patterns (case-insensitive): `guaranteed result`, `guaranteed outcome`, `you will lose`, `guaranteed improvement`, `100% results`, `certain to`. The constraint applies to all text nodes and heading elements.

**Validates: Requirements 14.5**

---

### Property 9: Journey map step count and description length

*For any* journey map configuration passed to `journey-map.js`: the step array length must be between 3 and 5 inclusive. *For any* step in any journey map, when that step is selected by the user: the rendered description text must contain between 10 and 40 words inclusive. Any journey map that violates these bounds is considered an invalid configuration.

**Validates: Requirements 6.2, 6.3**

---

### Property 10: IV card collection and individual card structure

*For any* collection of IV cards rendered by `iv-menu.js`: the count must be between 3 and 10 inclusive, and the categories "Energy", "Beauty", and "Immunity" must each be represented by at least one card. *For any individual* IV card in the rendered collection: a category colour indicator element must be present, `ingredients.length` must be ≥ 3, `bestFor` must be ≤ 60 characters, and a CTA anchor element must be present.

**Validates: Requirements 7.2, 7.3**

---

### Property 11: Contact form validators accept/reject correctly

*For any* string input to the email validator: it should return `true` if and only if the string matches `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`. *For any* string input to the SA phone validator (after whitespace removal): it should return `true` if and only if the string matches `/^(\+27|0)[0-9]{9}$/`. Neither validator should have false positives or false negatives with respect to these regular expression definitions.

**Validates: Requirements 10.5**

---

### Property 12: Form validation error display and value retention

*For any* form submission attempt where at least one required field is invalid: the submit action must be prevented, an element with `role="alert"` must be rendered immediately adjacent to each invalid field, and every field that contained a valid value before submission must retain that value unchanged after the validation pass.

**Validates: Requirements 10.6, 13.3**

---

### Property 13: FAQ response length constraint

*For any* FAQ topic that is matched by the `matchFAQ` function: the returned answer string must be ≤ 500 characters. No matched FAQ response may exceed this length regardless of the content of the input query.

**Validates: Requirements 12.3**

---

### Property 14: Unmatched FAQ produces fallback

*For any* query string that does not contain any keyword from any entry in the `FAQ_ENTRIES` array: `matchFAQ` must return `null`, and the chatbot UI must render the designated fallback message directing the Visitor to call or email the practice.

**Validates: Requirements 12.4**

---

### Property 15: HPCSA content filter correctness

*For any* response string passed to `filterResponse()`: if the string matches any pattern in `BLOCKED_PATTERNS` (medical advice, diagnoses, specific treatment recommendations, guaranteed outcomes, specific weight-loss claims), the function must return `{ allowed: false }`. *For any* response string that matches none of the blocked patterns, the function must return `{ allowed: true, text: responseText }`. The filter must have no false positives that suppress legitimate FAQ answers, and no false negatives that allow through medically advisory content.

**Validates: Requirements 12.5, 12.6**

---

### Property 16: POPIA consent logic correctness

*For any* form submission payload where `consentAppointment` is `false` or unchecked: the form submission must be blocked, an accessible `role="alert"` error must be rendered adjacent to the appointment consent checkbox, and all other field values must be retained. *For any* form submission payload where `consentAppointment` is `true` and `consentMarketing` is `false` (and all other fields are valid): the form submission must not be blocked by the consent logic.

**Validates: Requirements 13.3, 13.4**

---

### Property 17: Privacy Policy link in every page footer

*For any* page HTML file in the `healthsync/` directory: the `<footer>` element must contain at least one `<a>` element with `href="privacy-policy.html"` or an equivalent absolute URL to the Privacy Policy. This includes every service sub-page, the home page, and all utility pages.

**Validates: Requirements 13.5**

---

### Property 18: Cybersecurity disclaimer on required pages

*For any* page in the defined set `{about.html, consultations.html}`: the visible body text must contain the exact string "The doctor will never ask for payment before a consultation" (case-sensitive match). The disclaimer must not be hidden via `display:none`, `visibility:hidden`, or `aria-hidden="true"`.

**Validates: Requirements 4.6, 14.4, 8.5**

---

### Property 19: No horizontal overflow at any supported viewport

*For any* page in the site rendered at any of the defined breakpoints (320px, 375px, 768px, 1024px, 1440px): `document.body.scrollWidth` must not exceed the viewport width. No two content elements may visually overlap within the same layout flow.

**Validates: Requirements 15.4, 11.3**

---

### Property 20: Touch target minimum size on all interactive elements

*For any* element on any page that is a button, anchor (`<a>`), form input, select, or textarea: its rendered `offsetWidth` must be ≥ 48px and its `offsetHeight` must be ≥ 48px. This includes the Sticky CTA, nav toggle, AI receptionist trigger, all form submit buttons, and all card CTAs.

**Validates: Requirements 1.4, 6.5, 12.8, 15.5**

---

### Property 21: Per-page meta title and description constraints

*For any* page HTML file in the site: the `<title>` element's text content must be ≤ 60 characters. The `<meta name="description">` content must be between 50 and 160 characters inclusive. Across all pages, every `<title>` and every `<meta name="description">` value must be unique. Each must contain at least one service-relevant keyword and one location keyword from {"Centurion", "Irene", "Gauteng"}.

**Validates: Requirements 16.2**

---

### Property 22: html lang and charset declarations on every page

*For any* page HTML file in the `healthsync/` directory: the root `<html>` element must have `lang="en"`, and the `<head>` must contain `<meta charset="UTF-8">` as the first or one of the earliest child elements. These declarations must be present and non-empty on every page without exception.

**Validates: Requirements 16.5**

---

### Property 23: Review widget rating display rule

*For any* review dataset passed to `review-widget.js` where the computed aggregate rating is ≥ 4.0: the star rating indicator element must be visible. *For any* review dataset where the computed aggregate rating is < 4.0: the star rating indicator element must not be visible (`display:none` or absent from DOM), and a Google Business Profile link must be rendered. *For any* rendered review list, each displayed excerpt must be ≤ 250 characters, and the total number of displayed excerpts must be between 3 and 10 inclusive.

**Validates: Requirements 17.2, 17.3**

---

### Property 24: Logical heading hierarchy on every page

*For any* page HTML in the site: extracting all heading elements (`h1`–`h6`) in DOM order must produce a sequence in which no heading level is skipped (e.g., `h1` followed directly by `h3` without an intervening `h2` is a violation). Every page must have exactly one `<h1>` element.

**Validates: Requirements 18.2**

---

### Property 25: Form inputs associated with labels

*For any* `<input>`, `<select>`, or `<textarea>` element with an `id` attribute on any page: there must exist a `<label>` element on the same page with a `for` attribute equal to that `id`. No form control with an `id` may be unlabelled.

**Validates: Requirements 18.4**

---

### Property 26: Before/After Slider ARIA and transition

*For any* instantiated Before/After Slider component: the "before" image must have a non-empty `alt` attribute, the "after" image must have a non-empty `alt` attribute, the handle `<button>` must have a non-empty `aria-label`, and the clip-path CSS transition duration must be exactly 300ms. These constraints must hold for every slider instance on every page.

**Validates: Requirements 5.3, 18.5**

---

## Testing Strategy

### Overview

The testing strategy for the Health Synchrony website uses a **dual-layer approach**: property-based tests for universal invariants and example-based unit tests for specific behaviors. Because the site is plain HTML/CSS/Vanilla JS with no build toolchain, tests run either in the browser (via a local test harness) or in Node.js (using jsdom for DOM-based assertions).

**Property-Based Testing Library:** [`fast-check`](https://fast-check.dev/) loaded via CDN in a test harness HTML file, or via `npm install fast-check --save-dev` for Node.js execution.

### Test Layers

#### Layer 1: Static Analysis Tests (Node.js + jsdom)

These tests parse each HTML file as a DOM and assert structural invariants. They run without a browser and are fast enough to include in a pre-commit hook.

**Covers:**
- Property 2 (image alt + WebP sources + lazy loading)
- Property 3 partial (booking widget container present)
- Property 7 (no prohibited promotional terms — text extraction + regex)
- Property 8 (no guaranteed outcome language)
- Property 17 (Privacy Policy link in every footer)
- Property 18 (cybersecurity disclaimer on required pages)
- Property 21 (meta title ≤60 chars, meta description 50–160 chars)
- Property 22 (html lang + charset)
- Property 24 (heading hierarchy)
- Property 25 (form inputs have labels)

**Example test file:** `healthsync/tests/static-analysis.test.js`

```js
// Run: node healthsync/tests/static-analysis.test.js
// Requires: npm install jsdom fast-check
import { JSDOM } from "jsdom";
import * as fs from "fs";
import * as path from "path";
import fc from "fast-check";

const PAGES = ["index.html", "about.html", "aesthetics.html", "weight-loss.html",
               "iv-therapy.html", "consultations.html", "dispensary.html", "contact.html",
               "privacy-policy.html"];

// Property 22: html lang + charset on every page
for (const page of PAGES) {
  const html = fs.readFileSync(path.join("healthsync", page), "utf-8");
  const dom = new JSDOM(html);
  console.assert(
    dom.window.document.documentElement.getAttribute("lang") === "en",
    `${page}: missing lang="en"`
  );
  const charset = dom.window.document.querySelector("meta[charset]");
  console.assert(charset?.getAttribute("charset") === "UTF-8", `${page}: missing charset=UTF-8`);
}
```

#### Layer 2: JavaScript Unit + Property Tests

These tests import individual JS modules directly and exercise them with both example inputs and fast-check generators.

**Test file:** `healthsync/tests/modules.test.js`

Modules under test and their property coverage:

| Module | Properties Tested |
|---|---|
| `contact-form.js` (VALIDATORS) | 11, 12, 16 |
| `ai-receptionist.js` (filterResponse, matchFAQ) | 13, 14, 15 |
| `treatment-quiz.js` (quiz engine) | 5 |
| `journey-map.js` (step validation) | 9 |
| `iv-menu.js` (card validation) | 10 |
| `review-widget.js` (rating + excerpt logic) | 4, 23 |
| `booking-widget.js` (timeout + fallback) | 3 |
| `sticky-cta.js` (routing logic) | 1 |

**Property test configuration:** Every `fc.assert(fc.property(...))` runs with `{ numRuns: 200 }` (minimum 100 as required, 200 for better coverage of string inputs).

**Tag format:** Each property test is annotated with a comment:
```js
// Feature: health-synchrony-website, Property 15: HPCSA content filter correctness
```

Example property tests:

```js
// Property 11: Form validators
import { VALIDATORS } from "../js/contact-form.js";
import fc from "fast-check";

// Feature: health-synchrony-website, Property 11: Contact form validators accept/reject correctly
fc.assert(fc.property(
  fc.emailAddress(),
  email => VALIDATORS.email(email) === true
), { numRuns: 200 });

fc.assert(fc.property(
  fc.string().filter(s => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)),
  invalidEmail => VALIDATORS.email(invalidEmail) === false
), { numRuns: 200 });
```

```js
// Property 15: HPCSA content filter correctness
import { filterResponse, BLOCKED_PATTERNS } from "../js/ai-receptionist.js";

// Feature: health-synchrony-website, Property 15: HPCSA content filter correctness
fc.assert(fc.property(
  fc.constantFrom(...BLOCKED_PATTERNS).chain(pattern =>
    fc.string().map(s => {
      // Insert a pattern-matching substring into a random string
      const trigger = ["diagnose", "prescribe", "guaranteed result", "you should take",
                       "you must use", "100kg loss", "cure"][Math.floor(Math.random() * 7)];
      return s.slice(0, 5) + trigger + s.slice(5);
    })
  ),
  blockedText => filterResponse(blockedText).allowed === false
), { numRuns: 200 });

fc.assert(fc.property(
  fc.string().filter(s => !BLOCKED_PATTERNS.some(p => p.test(s))),
  safeText => filterResponse(safeText).allowed === true
), { numRuns: 200 });
```

```js
// Property 9: Journey map step count and description length
import { validateJourneyMap, selectStep } from "../js/journey-map.js";

// Feature: health-synchrony-website, Property 9: Journey map step count and description length
fc.assert(fc.property(
  fc.array(
    fc.record({
      id: fc.integer({ min: 1, max: 5 }),
      title: fc.string({ minLength: 1, maxLength: 50 }),
      description: fc.string({ minLength: 10, maxLength: 200 })
    }),
    { minLength: 3, maxLength: 5 }
  ),
  steps => {
    const result = validateJourneyMap(steps);
    return result.valid === true;
  }
), { numRuns: 200 });
```

```js
// Property 10: IV card collection and individual card structure
import { validateIVCards } from "../js/iv-menu.js";

// Feature: health-synchrony-website, Property 10: IV card collection and individual card structure
fc.assert(fc.property(
  fc.array(
    fc.record({
      id: fc.string({ minLength: 1 }),
      category: fc.constantFrom("Energy", "Beauty", "Immunity"),
      name: fc.string({ minLength: 1 }),
      ingredients: fc.array(fc.string({ minLength: 1 }), { minLength: 3, maxLength: 10 }),
      bestFor: fc.string({ maxLength: 60 }),
      ctaHref: fc.webUrl()
    }),
    { minLength: 3, maxLength: 10 }
  ).filter(cards => {
    const cats = new Set(cards.map(c => c.category));
    return cats.has("Energy") && cats.has("Beauty") && cats.has("Immunity");
  }),
  cards => validateIVCards(cards).valid === true
), { numRuns: 200 });
```

```js
// Property 16: POPIA consent logic
import { submitForm } from "../js/contact-form.js";

// Feature: health-synchrony-website, Property 16: POPIA consent logic correctness
fc.assert(fc.property(
  fc.record({
    name: fc.string({ minLength: 1 }),
    email: fc.emailAddress(),
    phone: fc.constantFrom("0821234567", "+27821234567"),
    reason: fc.string({ maxLength: 500 }),
    preferredContact: fc.constantFrom("Phone", "Email"),
    consentAppointment: fc.constant(false),
    consentMarketing: fc.boolean()
  }),
  payload => {
    const result = submitForm(payload);
    return result.blocked === true && result.errors.consentAppointment !== undefined;
  }
), { numRuns: 200 });
```

```js
// Property 5: Treatment quiz recommendation completeness
import { runQuiz } from "../js/treatment-quiz.js";

// Feature: health-synchrony-website, Property 5: Treatment quiz recommendation completeness
fc.assert(fc.property(
  fc.array(fc.constantFrom("aesthetics", "weight-loss", "iv-therapy", "consultations", "dispensary"),
    { minLength: 3, maxLength: 7 }),
  answers => {
    const result = runQuiz(answers);
    return result !== null &&
           result.recommendedService !== "" &&
           result.ctaHref.endsWith(".html");
  }
), { numRuns: 200 });
```

#### Layer 3: Browser Rendering Tests (Playwright or Manual)

These tests require a running browser and verify rendered behavior: touch target sizes, viewport overflow, transition durations, focus indicators, WCAG contrast, and booking/review widget timeout behavior.

**Covers:** Properties 1, 3, 4, 6, 19, 20, 26, and WCAG contrast checks.

**Recommended tool:** [Playwright](https://playwright.dev/) (can be added as a dev dependency without modifying the site's source files).

Example Playwright test for Property 19:

```js
// Feature: health-synchrony-website, Property 19: No horizontal overflow at any supported viewport
import { test, expect } from "@playwright/test";
const PAGES = ["/healthsync/index.html", "/healthsync/about.html", /* ... */];
const VIEWPORTS = [320, 375, 768, 1024, 1440];

for (const page of PAGES) {
  for (const width of VIEWPORTS) {
    test(`${page} has no horizontal overflow at ${width}px`, async ({ page: p }) => {
      await p.setViewportSize({ width, height: 900 });
      await p.goto(`http://localhost:8080${page}`);
      const overflow = await p.evaluate(() =>
        document.body.scrollWidth > document.documentElement.clientWidth
      );
      expect(overflow).toBe(false);
    });
  }
}
```

#### Layer 4: SEO and Schema Validation (Node.js)

Validates JSON-LD schema structure and per-page meta rules.

**Covers:** Properties 21, 22, and schema completeness for MedicalBusiness and Physician types.

```js
// Property 21: Per-page meta constraints
// Feature: health-synchrony-website, Property 21: Per-page meta title and description constraints
for (const page of PAGES) {
  const html = fs.readFileSync(path.join("healthsync", page), "utf-8");
  const dom = new JSDOM(html);
  const title = dom.window.document.title;
  const description = dom.window.document.querySelector("meta[name='description']")?.content ?? "";
  console.assert(title.length <= 60, `${page}: title exceeds 60 chars`);
  console.assert(description.length >= 50, `${page}: description too short`);
  console.assert(description.length <= 160, `${page}: description too long`);
  const locationKeywords = ["Centurion", "Irene", "Gauteng"];
  const hasLocation = locationKeywords.some(k => title.includes(k) || description.includes(k));
  console.assert(hasLocation, `${page}: missing location keyword`);
}
```

### Test Execution Summary

| Layer | Runner | When to Run |
|---|---|---|
| Layer 1: Static Analysis | `node tests/static-analysis.test.js` | Pre-commit, CI |
| Layer 2: Module Unit + Property | `node tests/modules.test.js` | Pre-commit, CI |
| Layer 3: Browser Rendering | `npx playwright test` | PR review, staging deploy |
| Layer 4: SEO + Schema | `node tests/seo-validation.test.js` | Pre-commit, CI |

### Unit Test Focus Areas

In addition to property tests, unit tests (example-based) cover:
- **Booking widget fallback** — simulate `iframe.onload` firing vs. timeout firing
- **Review widget fallback** — simulate API success vs. 10s timeout
- **Contact form success path** — valid payload → success message rendered
- **Sticky CTA** — click with widget present → scroll; click without widget → navigate
- **Before/After Slider** — drag to 0%, 50%, 100%; keyboard arrow key navigation
- **Treatment Quiz** — specific answer sequences → specific service recommendations
- **AI Receptionist** — specific FAQ queries → expected responses within 500 chars

### Accessibility Regression Testing

Run [axe-core](https://github.com/dequelabs/axe-core) (CDN, no build step) on each page to catch WCAG 2.1 AA violations automatically. This covers:
- Colour contrast (Property 15.7 / WCAG AA)
- Focus indicators (Property 18.3)
- Form label associations (Property 25)
- ARIA attributes on dynamic components (Property 26)

```html
<!-- Add to each page for development testing only, remove for production -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.9.1/axe.min.js"></script>
<script>
  axe.run().then(results => {
    if (results.violations.length > 0) {
      console.error("axe-core violations:", results.violations);
    }
  });
</script>
```
