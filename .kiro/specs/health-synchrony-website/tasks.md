# Implementation Plan: Health Synchrony Website

## Overview

Plain HTML5 / CSS3 / Vanilla JS static site built inside `healthsync/` within the existing adbio project. Five phases: skeleton first (visually reviewable in browser), then interactive JS components, then third-party integrations, then performance/SEO/compliance polish, then automated tests. No build toolchain — ES modules, CSS custom properties, and direct `<link>` / `<script type="module">` loading throughout.

---

## Tasks

---

### Phase 1 — Skeleton (MVP for CSS/UI Review)

- [x] 1. Set up `healthsync/` folder structure and CSS foundation
  - [x] 1.1 Create the `healthsync/` directory skeleton with all sub-folders
    - Create `healthsync/css/pages/`, `healthsync/js/`, `healthsync/images/hero/`, `healthsync/images/team/`, `healthsync/images/treatments/`, `healthsync/images/icons/`, `healthsync/tests/`, `healthsync/fonts/` (empty placeholder)
    - Add `.gitkeep` files in each empty folder so they are tracked
    - _Requirements: 1.6_

  - [x] 1.2 Create `healthsync/css/tokens.css` — design tokens
    - Define all CSS custom properties: `--color-navy`, `--color-gold`, `--color-sage`, `--color-ivory`, Option B tokens commented out
    - Font tokens: `--font-heading`, `--font-body` with system fallbacks
    - Spacing tokens: `--spacing-section-mobile: 40px`, `--spacing-section-desktop: 64px`, and `--spacing-4` through `--spacing-64`
    - Touch target: `--touch-target: 48px`
    - Border radius, transition, and z-index scale tokens as defined in the design
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 1.3 Create `healthsync/css/base.css` — reset, typography, global elements
    - CSS reset (box-sizing, margin/padding zero on `*`)
    - `<html>` and `<body>` base styles with `--font-body`
    - Heading styles (`h1`–`h4`) using `--font-heading` with Playfair Display
    - Google Fonts `@import` with `font-display: swap`; system-serif / system-sans-serif fallback
    - Mobile-first breakpoint comments: 320px base, 375px, 768px, 1024px, 1440px
    - _Requirements: 2.1, 15.1_

  - [x] 1.4 Create `healthsync/css/layout.css` — grid, section spacing, breakpoints
    - `.container` class: full-width up to `max-width: 1280px`, centered, `padding-inline: var(--spacing-16)` (32px at ≥768px)
    - `.section` class: `padding-block: var(--spacing-section-mobile)` with `@media (min-width: 1024px)` override to `var(--spacing-section-desktop)`
    - Responsive grid helpers: 2-col and 3-col utility classes
    - _Requirements: 2.3_

  - [x] 1.5 Create `healthsync/css/components.css` — reusable component styles
    - `.btn-primary` and `.btn-secondary` button styles with `min-height: var(--touch-target)`, `min-width: var(--touch-target)`, focus-visible outline
    - `.site-header` and `.primary-nav` shell styles (desktop layout)
    - `.nav-toggle` hamburger button shell (visible ≤768px, hidden ≥768px)
    - `.sticky-cta` fixed bar: visible on mobile (≤768px), hidden on desktop
    - `.site-footer` styles with privacy link and disclaimer text
    - `.hero` section styles: `min-height: 60vh`, full-width, relative positioning for text overlay
    - `.card` base styles (used by services overview and IV menu)
    - `.before-after-slider` placeholder shell styles
    - `.journey-map` placeholder shell styles
    - `.iv-card` shell styles with `--card-accent` CSS variable placeholder
    - `.treatment-quiz` shell styles
    - `.booking-fallback` and `.reviews-fallback` hidden fallback container styles
    - Credential badge component (`.credential-badge`)
    - `sr-only` utility class for screen-reader-only text
    - _Requirements: 1.3, 1.4, 2.2, 2.4, 15.5_

  - [x] 1.6 Create page-specific CSS stubs in `healthsync/css/pages/`
    - Create `home.css`, `about.css`, `aesthetics.css`, `weight-loss.css`, `iv-therapy.css`, `consultations.css`, `dispensary.css`, `contact.css` — each with a file comment and one placeholder rule so the file is non-empty and linkable
    - _Requirements: 2.2_

- [x] 2. Build shared header/nav and footer shell (HTML + CSS, no JS)
  - [x] 2.1 Create `healthsync/css/components.css` nav dropdown styles
    - Mobile nav drawer: `<nav>` hidden by default, `.nav-open` class reveals it as full-screen overlay
    - Desktop nav: flex row, dropdown `<ul>` absolutely positioned below Services button
    - `aria-current="page"` highlight style
    - Note: this extends the component styles from task 1.5; edit the same file
    - _Requirements: 1.2, 1.8_

  - [x] 2.2 Create shared header/nav HTML snippet (to be copy-pasted into each page in task 3)
    - Write the canonical `<header>` + `<nav>` markup per the design specification
    - Include Services dropdown with all 5 service sub-page links
    - Include `.nav-toggle` button with hamburger SVG icon inline
    - Include `aria-expanded="false"` and `aria-haspopup="true"` on the Services button
    - Document the snippet in a comment at the top of `index.html` (created in task 3.1)
    - _Requirements: 1.1, 1.2, 18.2, 18.3_

  - [x] 2.3 Create shared footer HTML snippet
    - Include Privacy Policy link (`href="privacy-policy.html"`), Contact Us link
    - HPCSA disclaimer paragraph: "Health Synchrony is registered with the HPCSA. Results may vary. All treatments are subject to a medical consultation."
    - POPIA copyright paragraph with current year
    - _Requirements: 13.5_

  - [x] 2.4 Create `healthsync/images/icons/` SVG icons
    - Hamburger menu icon (`menu.svg`)
    - Close icon (`close.svg`)
    - Chat bubble icon (`chat.svg`) for AI receptionist trigger
    - Inline the icons directly as `<svg>` in HTML where used
    - _Requirements: 12.8_

- [x] 3. Build Sticky CTA shell (HTML + CSS, no JS behaviour yet)
  - [x] 3.1 Add Sticky CTA markup to shared components
    - Write the `.sticky-cta` `<div>` with the `<a>` button per the design spec
    - Include `data-fallback-href="contact.html"` attribute
    - Ensure `min-height: 48px; min-width: 48px` applied via CSS
    - Confirm it is `position: fixed` at the bottom of viewport on mobile
    - _Requirements: 1.3, 1.4, 1.5, 15.5_

- [x] 4. Create all 9 HTML page shells
  - [x] 4.1 Create `healthsync/index.html` — Home page shell
    - `<!DOCTYPE html>`, `<html lang="en">`, `<meta charset="UTF-8">`, viewport meta
    - `<title>Health Synchrony | Wellness in Centurion</title>` (≤60 chars)
    - `<meta name="description">` 50–160 chars with "Centurion" and at least one service keyword
    - Link all CSS files: `tokens.css` → `base.css` → `layout.css` → `components.css` → `pages/home.css`
    - Google Fonts preconnect + stylesheet link with `display=swap`
    - Shared header/nav markup (from task 2.2)
    - Hero section: `<picture>` with WebP + JPEG fallback, `fetchpriority="high"`, `width`/`height` set, placeholder alt text, 60vh min-height, headline `<h1>` ≤12 words with "Centurion" / "Irene Security Estate", inline CTA button
    - "Who We Are" section: ≤150 words placeholder, Dr. van Dyk credential reference, "Centurion" or "Irene Security Estate" text
    - Services overview section: 5 `.card` elements linking to each service sub-page
    - Booking widget placeholder `<div id="booking-widget">` with inline "Book a Consultation" CTA fallback button
    - Treatment quiz section placeholder `<section id="treatment-quiz">`
    - Google Reviews widget placeholder `<div id="review-widget">`
    - `<script type="application/ld+json">` placeholder comment for MedicalBusiness schema
    - Sticky CTA markup
    - Shared footer (from task 2.3)
    - _Requirements: 1.1, 1.7, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 16.1, 16.2, 16.5_

  - [x] 4.2 Create `healthsync/about.html` — About Us page shell
    - Standard `<head>` with unique title ≤60 chars and unique description 50–160 chars ("Centurion")
    - Link tokens → base → layout → components → `pages/about.css`
    - Shared header/nav + Sticky CTA + shared footer
    - `<h1>` with Dr. van Dyk's name and practice context
    - Credential section: University of Pretoria degree + Advanced Diploma in Aesthetics as `.credential-badge` components, min 16px font, 4.5:1 contrast
    - Two `<picture>` placeholder images of Dr. van Dyk with descriptive `alt` attributes
    - Provider Introduction Video placeholder section: `aria-label`, title, descriptive text, no `<video>` element (flag `data-video-available="false"`)
    - Cybersecurity disclaimer: exact text "The doctor will never ask for payment before a consultation"
    - Single CTA linking to `contact.html` or `#booking-widget`
    - `<script type="application/ld+json">` placeholder comment for Physician schema
    - _Requirements: 4.1, 4.2, 4.4, 4.6, 4.7, 14.4, 16.2, 16.5_

  - [x] 4.3 Create `healthsync/aesthetics.html` — Aesthetics page shell
    - Standard `<head>` with unique title and description
    - Link tokens → base → layout → components → `pages/aesthetics.css`
    - Shared header/nav + Sticky CTA + shared footer
    - `<h1>` using a benefit-driven heading (not a procedure name)
    - At least one treatment section with a benefit-driven `<h2>`, HPCSA generic treatment name as `<h3>` or inline, and a Before/After Slider placeholder `<div class="before-after-slider">` with `data-before` and `data-after` attributes pointing to placeholder images
    - No stock photography, no prices, no promotional terms
    - Booking widget placeholder `<div id="booking-widget">` + inline CTA fallback
    - _Requirements: 5.1, 5.2, 5.4, 5.5, 5.6, 5.7, 5.8, 16.2, 16.5_

  - [x] 4.4 Create `healthsync/weight-loss.html` — Weight Loss page shell
    - Standard `<head>` with unique title and description
    - Link tokens → base → layout → components → `pages/weight-loss.css`
    - Shared header/nav + Sticky CTA + shared footer
    - `<h1>` naming a patient outcome (not a procedure)
    - Journey Map placeholder: `<ol class="journey-map">` with 5 static `<li>` step placeholders (to be hydrated by JS in Phase 2), each with 10–40-word description text
    - Dr. van Dyk credentials displayed within the same section as transformation content
    - Booking widget placeholder `<div id="booking-widget">` + inline CTA fallback (min 48×48px)
    - No prices, no promotional terms
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 16.2, 16.5_

  - [x] 4.5 Create `healthsync/iv-therapy.html` — IV Therapy page shell
    - [x] 4.5.1 Create page skeleton — `<head>`, CSS links, header/nav, footer, Sticky CTA
      - `<!DOCTYPE html>`, `<html lang="en">`, `<meta charset="UTF-8">`, viewport meta
      - `<title>IV Drip Therapy | Health Synchrony Centurion</title>` (≤60 chars)
      - `<meta name="description">` 50–160 chars with "Centurion" and IV therapy keyword
      - Link all CSS: `tokens.css` → `base.css` → `layout.css` → `components.css` → `pages/iv-therapy.css`
      - Google Fonts preconnect links
      - Shared header/nav markup with `aria-current="page"` on IV Therapy link
      - Shared footer markup
      - Sticky CTA markup (`data-fallback-href="contact.html"`)
      - Empty `<main>` placeholder (filled by 4.5.2 and 4.5.3)
      - _Requirements: 16.2, 16.5_

    - [x] 4.5.2 Add `<h1>` hero section and IV cards placeholder (`#iv-menu`)
      - Benefit-driven `<h1>` heading (e.g. "Restore Your Energy, Beauty and Immunity")
      - Introductory paragraph (no prices, no promotional terms, no stock-photo `<img>`)
      - `<div id="iv-menu" class="section container">` containing 3 static `.iv-card` HTML placeholders:
        - **Energy**: `<article class="iv-card iv-card--energy" aria-labelledby="card-energy-title">` with `<div class="iv-card__category-bar">`, `<h3 id="card-energy-title">Energy Boost Drip</h3>`, `<ul class="iv-card__ingredients">` ≥3 items, `<p class="iv-card__best-for"><strong>Best for:</strong> Fatigue recovery and sustained daily energy</p>` (≤60 chars), `<a href="#booking-widget" class="btn-secondary iv-card__cta">Book This Drip</a>`
        - **Beauty**: same structure, category `iv-card--beauty`, e.g. "Radiance Drip", ingredients Vitamin C / Glutathione / Biotin / Zinc, bestFor ≤60 chars
        - **Immunity**: same structure, category `iv-card--immunity`, e.g. "Immunity Shield Drip", ≥3 ingredients, bestFor ≤60 chars
      - _Requirements: 7.1, 7.2, 7.3, 7.4_

    - [x] 4.5.3 Add booking widget placeholder and inline CTA fallback
      - `<section class="section container" id="booking-widget">` with heading "Book Your IV Drip Session"
      - Inline CTA `<a href="contact.html" class="btn-primary">Book a Consultation</a>` visible without scrolling at ≥768px
      - `<div class="booking-fallback">` with phone, email, and `<a href="contact.html">` (hidden by default via CSS; booking-widget.js will show on timeout)
      - `<script type="module" src="js/booking-widget.js"></script>` stub comment
      - `<script type="module" src="js/nav.js"></script>` and `<script type="module" src="js/sticky-cta.js"></script>` tags
      - _Requirements: 7.5, 16.2_

  - [x] 4.6 Create `healthsync/consultations.html` — Consultations page shell
    - Standard `<head>` with unique title and description
    - Link tokens → base → layout → components → `pages/consultations.css`
    - Shared header/nav + Sticky CTA + shared footer
    - `<h1>` benefit-driven heading
    - Two `<picture>` placeholder images of Dr. van Dyk in consultation, descriptive `alt` (≥10 chars each)
    - Provider Introduction Video placeholder (same pattern as `about.html`, `data-video-available="false"`)
    - Consultation process section: Grade-8 reading level, what to expect, typical duration, preparation — placeholder copy of ≥3 paragraphs
    - Cybersecurity disclaimer: exact text "The doctor will never ask for payment before a consultation" visible on 1024×768 viewport without scrolling
    - Booking widget `<div id="booking-widget">` + inline CTA fallback
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 14.4, 16.2, 16.5_

  - [x] 4.7 Create `healthsync/dispensary.html` — Dispensary page shell
    - Standard `<head>` with unique title and description
    - Link tokens → base → layout → components → `pages/dispensary.css`
    - Shared header/nav + Sticky CTA + shared footer
    - `<h1>` benefit-driven heading
    - Minimum 3 named product category sections (Supplements, Skincare, Nutraceuticals) each with a brief description — no prices, no promotional values
    - Contact CTA within main content directing to Contact Us page or phone
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 16.2, 16.5_

  - [x] 4.8 Create `healthsync/contact.html` — Contact Us page shell
    - Standard `<head>` with unique title and description
    - Link tokens → base → layout → components → `pages/contact.css`
    - Shared header/nav + Sticky CTA + shared footer
    - `<h1>` heading
    - Practice address including "Irene Security Estate, Centurion, Gauteng"
    - Phone number and email address displayed
    - Embedded Google Map `<iframe>` (static placeholder with correct `src` attribute structure) or static map image with `alt`
    - Enquiry form with fully labelled fields: full name, email (`type="email"`), phone (`placeholder="0XX XXX XXXX"`), reason for enquiry (`<textarea maxlength="500">`), preferred contact method (`<select>` with Phone/Email options)
    - Two separate POPIA consent checkboxes: "I consent to appointment communication" and "I consent to marketing and educational communications" — neither pre-checked
    - Privacy Policy link immediately above the form
    - Form submit button (min 48×48px)
    - Confirmation message placeholder `<div role="status" hidden>`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.7, 10.8, 13.1, 13.2, 13.5, 16.2, 16.5_

  - [x] 4.9 Create `healthsync/privacy-policy.html` — Privacy Policy page shell
    - Standard `<head>` with unique title and description
    - Link tokens → base → layout → components
    - Shared header/nav + shared footer
    - `<h1>` "Privacy Policy"
    - Sections covering: categories of personal information collected (name, contact details, appointment info), purpose of processing, Visitor rights to access and correction
    - Effective date, practice name and contact details
    - _Requirements: 13.6, 16.2, 16.5_

- [x] 5. Phase 1 Checkpoint — Skeleton review
  - All 9 pages are browsable by opening `healthsync/index.html` in a browser
  - Header, nav, footer, sticky CTA, and hero sections render correctly at 320px, 768px, and 1440px
  - Navy/Gold colour palette and Playfair Display / Montserrat typography are visually applied
  - No JS errors in the console (no JS modules loaded yet)
  - Ensure all tests pass, ask the user if questions arise.

---

### Phase 2 — Core Interactive JS Components

- [x] 6. Implement `nav.js` — mobile hamburger navigation
  - [x] 6.1 Create `healthsync/js/nav.js` as an ES module
    - Toggle `aria-expanded` on `.nav-toggle` button and CSS open class on `<nav>`
    - Trap focus within open nav drawer (Tab and Shift+Tab cycle within nav links)
    - Close drawer on `Escape` key or outside click
    - Set `aria-current="page"` on the link matching `window.location.pathname`
    - Add `<script type="module" src="js/nav.js">` to all 9 HTML pages
    - _Requirements: 1.2, 1.8, 18.3_

- [x] 7. Implement `sticky-cta.js` — Sticky CTA behaviour
  - [x] 7.1 Create `healthsync/js/sticky-cta.js` as an ES module
    - On click of `.sticky-cta__btn`: check for `document.querySelector('#booking-widget')`
    - If found → `element.scrollIntoView({ behavior: 'smooth' })`
    - If not found → `window.location.href = element.dataset.fallbackHref`
    - Add `<script type="module" src="js/sticky-cta.js">` to all 9 HTML pages
    - _Requirements: 1.5_

  - [x]* 7.2 Write property test for Sticky CTA routing (Property 1)
    - **Property 1: Sticky CTA routing correctness**
    - **Validates: Requirements 1.5**
    - Test both branches: DOM with `#booking-widget` present → scrollIntoView called; DOM without → navigate to fallback href
    - Use jsdom to simulate each DOM state

- [x] 8. Implement `before-after-slider.js` — Before/After image comparison
  - [x] 8.1 Create `healthsync/js/before-after-slider.js` as an ES module
    - Query all `.before-after-slider` elements on DOMContentLoaded
    - For each: inject the `bas__track`, two `<img>` elements (before/after), divider and handle `<button>` per the design spec
    - `<img>` alt attributes: before image `alt="Before treatment"`, after image `alt="After treatment"`; handle `aria-label="Drag to compare before and after"`, `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-valuenow="50"`
    - Apply `clip-path: inset(0 50% 0 0)` to the after image; `transition: clip-path 300ms ease`
    - Mouse/touch drag: update clip-path % clamped to `[0, 100]`
    - Keyboard: ArrowLeft / ArrowRight move handle in 5% increments, update `aria-valuenow`
    - Add `<script type="module" src="js/before-after-slider.js">` to `aesthetics.html`
    - _Requirements: 5.2, 5.3, 18.5_

  - [x]* 8.2 Write property test for Before/After Slider ARIA and transition (Property 26)
    - **Property 26: Before/After Slider ARIA and transition**
    - **Validates: Requirements 5.3, 18.5**
    - Assert non-empty `alt` on both images, non-empty `aria-label` on handle, `transition` duration is 300ms for every slider instance

- [x] 9. Implement `journey-map.js` — Interactive weight loss journey
  - [x] 9.1 Create `healthsync/js/journey-map.js` as an ES module
    - Export `validateJourneyMap(steps)`: return `{ valid: true }` if `steps.length` is 3–5 and every description is 10–40 words; otherwise `{ valid: false, error: '...' }` and `console.warn`
    - Export `selectStep(stepId, steps, containerEl)`: set `aria-selected="true"` on selected step `<li>`, `aria-selected="false"` on all others, render description panel below
    - On DOMContentLoaded: query `<ol class="journey-map">`, read step data from `data-*` attributes or embedded `<script type="application/json">` sibling, call `validateJourneyMap`, wire click handlers
    - Add `<script type="module" src="js/journey-map.js">` to `weight-loss.html`
    - _Requirements: 6.2, 6.3_

  - [x]* 9.2 Write property test for journey map step count and description length (Property 9)
    - **Property 9: Journey map step count and description length**
    - **Validates: Requirements 6.2, 6.3**
    - Use fast-check: generate arrays of 3–5 step objects with descriptions of 10–40 words; assert `validateJourneyMap(steps).valid === true`
    - Generate arrays outside the bounds (0–2, 6+) and assert `valid === false`

- [x] 10. Implement `iv-menu.js` — IV therapy card rendering
  - [x] 10.1 Create `healthsync/js/iv-menu.js` as an ES module
    - Define the IV card data array (minimum 3 cards: Energy, Beauty, Immunity; total ≤10) per design data contract
    - Export `validateIVCards(cards)`: assert count 3–10, all three category types present, each card has `ingredients.length >= 3` and `bestFor.length <= 60`; return `{ valid: true/false }`
    - Render each card as `<article class="iv-card iv-card--{category}">` with category bar, `<h3>`, ingredients `<ul>`, "Best for" paragraph, CTA `<a>`; use `aria-labelledby` linking to the card title
    - Replace the static HTML placeholders in `iv-therapy.html#iv-menu` on DOMContentLoaded
    - Add `<script type="module" src="js/iv-menu.js">` to `iv-therapy.html`
    - _Requirements: 7.1, 7.2, 7.3_

  - [x]* 10.2 Write property test for IV card collection and structure (Property 10)
    - **Property 10: IV card collection and individual card structure**
    - **Validates: Requirements 7.2, 7.3**
    - Use fast-check: generate card arrays with required category coverage; assert `validateIVCards(cards).valid === true`
    - Assert boundary violations are detected

- [x] 11. Implement `treatment-quiz.js` — Multi-step quiz engine
  - [x] 11.1 Create `healthsync/js/treatment-quiz.js` as an ES module
    - Define quiz question data: 5 questions (3–7 range), each with options that carry `weight` per service category
    - Export `runQuiz(answers)`: weighted scoring over answers, return `QuizResult` `{ recommendedService, headline, ctaHref }` — never null for valid answer arrays of length 3–7
    - Validate question count on module load: throw console error if `questions.length < 3 || > 7`
    - Progressive render: show one question at a time with `<div class="quiz__progress" role="progressbar">`, update `aria-valuenow`
    - On completion: inject `QuizResult` into `.quiz__result` and un-hide it (`aria-live="polite"`)
    - Add `<script type="module" src="js/treatment-quiz.js">` to `index.html`
    - _Requirements: 3.6, 3.7_

  - [x]* 11.2 Write property test for treatment quiz recommendation completeness (Property 5)
    - **Property 5: Treatment quiz recommendation completeness**
    - **Validates: Requirements 3.7**
    - Use fast-check: generate answer arrays of length 3–7; assert `runQuiz(answers)` is non-null, `recommendedService` is non-empty, `ctaHref` ends with `.html`

- [x] 12. Implement `contact-form.js` — Form validation and POPIA consent
  - [x] 12.1 Create `healthsync/js/contact-form.js` as an ES module
    - Export `VALIDATORS` object with `name`, `email`, `phone`, `message`, `consentAppointment` validators per design spec
    - SA phone regex: `/^(\+27|0)[0-9]{9}$/` applied after `value.replace(/\s/g, "")`
    - Export `submitForm(payload)`: run all validators; if any fail, return `{ blocked: true, errors: { fieldName: 'message' } }` without submission; if `consentAppointment === false`, always block
    - On DOM: wire form `submit` event; on validation failure, render `<span role="alert">` adjacent to each invalid field, retain valid field values; on success, show `<div role="status">` confirmation message
    - Two separate consent checkboxes: no shared selection logic, neither pre-checked
    - Add `<script type="module" src="js/contact-form.js">` to `contact.html`
    - _Requirements: 10.5, 10.6, 10.7, 10.8, 13.1, 13.2, 13.3, 13.4_

  - [x]* 12.2 Write property test for contact form validators (Property 11)
    - **Property 11: Contact form validators accept/reject correctly**
    - **Validates: Requirements 10.5**
    - Use fast-check `fc.emailAddress()`: assert `VALIDATORS.email(email) === true` for all generated emails
    - Use fast-check string filter for non-matching emails: assert `VALIDATORS.email(s) === false`
    - Test SA phone validator with valid and invalid inputs

  - [x]* 12.3 Write property test for form validation error display and value retention (Property 12)
    - **Property 12: Form validation error display and value retention**
    - **Validates: Requirements 10.6, 13.3**
    - Assert: on invalid submission, `submitForm` returns `blocked: true`, `errors` keys map to invalid fields, valid field values unchanged in returned payload

  - [x]* 12.4 Write property test for POPIA consent logic (Property 16)
    - **Property 16: POPIA consent logic correctness**
    - **Validates: Requirements 13.3, 13.4**
    - Use fast-check: generate valid payloads with `consentAppointment: false`; assert always blocked with `errors.consentAppointment` defined
    - Generate valid payloads with `consentAppointment: true`, `consentMarketing: false`; assert not blocked

- [x] 13. Phase 2 Checkpoint
  - All JS modules load without errors on their respective pages
  - Before/After Slider drags and transitions at 300ms on aesthetics.html
  - Journey Map steps highlight and show descriptions on weight-loss.html
  - Treatment Quiz completes and shows a recommendation on index.html
  - Contact form validates inline and shows POPIA errors correctly
  - Ensure all tests pass, ask the user if questions arise.

---

### Phase 3 — Third-Party Integrations

- [x] 14. Implement `booking-widget.js` — Booking embed and fallback
  - [x] 14.1 Create `healthsync/js/booking-widget.js` as an ES module
    - Export `initBookingWidget(containerSelector, fallbackSelector)`:
      - Inject `<iframe>` with Jane App / Vagaro embed URL into container element
      - Iframe container: `max-width: 100%`, `overflow: auto`, no fixed height that clips controls; responsive aspect-ratio trick from design
      - Start 10-second `setTimeout` on page interaction
      - On `iframe.onload`: clear timeout, hide fallback element
      - On timeout fire: hide iframe, show fallback div (`role="alert"`) with phone number, email, `<a href="contact.html">`
      - If fallback div itself absent from DOM: Contact Us nav link remains the safety net (no additional JS needed)
    - Add `initBookingWidget` calls in `index.html`, `aesthetics.html`, `weight-loss.html`, `iv-therapy.html`, `consultations.html` (via inline `<script type="module">` block or separate page script)
    - _Requirements: 3.4, 5.7, 5.8, 6.5, 7.5, 8.4, 11.1, 11.2, 11.3, 11.4_

  - [x]* 14.2 Write property test for booking widget fallback invariant (Property 3)
    - **Property 3: Booking widget fallback invariant**
    - **Validates: Requirements 3.4, 5.7, 5.8, 11.2**
    - Simulate timeout firing without `iframe.onload`; assert fallback element visible, contains phone, email, and `contact.html` link
    - Simulate `iframe.onload` within 10s; assert fallback stays hidden

- [x] 15. Implement `ai-receptionist.js` — Chatbot embed and HPCSA filter
  - [x] 15.1 Create `healthsync/js/ai-receptionist.js` as an ES module
    - Define `BLOCKED_PATTERNS` array per design spec (7 regex patterns)
    - Export `filterResponse(responseText)`: return `{ allowed: false, text: fallbackMessage }` if any pattern matches; `{ allowed: true, text: responseText }` otherwise
    - Define `FAQ_ENTRIES` array (4+ entries: hours, location, booking, services)
    - Export `matchFAQ(query)`: lowercase tokenise query, find first `FAQ_ENTRIES` entry with a keyword match; return entry answer or `null`; every answer in `FAQ_ENTRIES` must be ≤500 characters
    - Inject third-party chatbot widget (Tidio / Crisp / Tawk.to) via script tag on DOMContentLoaded; start 10s response timeout per query; on timeout → show offline fallback message
    - Render initial greeting with three prompt buttons: "Book an appointment", "Learn about our services", "Ask a question"
    - Chat trigger button: `aria-label="Open AI receptionist chat"`, `min-width: 48px; min-height: 48px`
    - Add `<script type="module" src="js/ai-receptionist.js">` to all 9 HTML pages
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8_

  - [x]* 15.2 Write property test for FAQ response length (Property 13)
    - **Property 13: FAQ response length constraint**
    - **Validates: Requirements 12.3**
    - For every entry in `FAQ_ENTRIES`, assert `answer.length <= 500`
    - Use fast-check to generate arbitrary query strings; for any that match, assert returned answer ≤500 chars

  - [x]* 15.3 Write property test for unmatched FAQ fallback (Property 14)
    - **Property 14: Unmatched FAQ produces fallback**
    - **Validates: Requirements 12.4**
    - Use fast-check: generate strings guaranteed not to contain any FAQ keyword; assert `matchFAQ(query) === null`

  - [x]* 15.4 Write property test for HPCSA content filter (Property 15)
    - **Property 15: HPCSA content filter correctness**
    - **Validates: Requirements 12.5, 12.6**
    - Generate strings containing each blocked trigger word; assert `filterResponse(s).allowed === false`
    - Generate strings containing no blocked patterns (filter out); assert `filterResponse(s).allowed === true`

- [x] 16. Implement `review-widget.js` — Google Reviews loader and fallback
  - [x] 16.1 Create `healthsync/js/review-widget.js` as an ES module
    - Attempt to load Google Places API JS SDK with configured API key
    - Filter reviews to ≤24 months old; compute aggregate star rating
    - If aggregate ≥ 4.0: render star rating element + review excerpts (each ≤250 chars, 3–10 total)
    - If aggregate < 4.0: hide star rating element (`display: none`), render review excerpts + Google Business Profile link
    - Start 10-second timeout; on timeout: render static fallback (`<section class="reviews-fallback">`) with ≥1 hardcoded review excerpt and Google Business Profile link, visible in viewport
    - Add `<script type="module" src="js/review-widget.js">` to `index.html`
    - _Requirements: 3.5, 17.1, 17.2, 17.3, 17.4, 17.5_

  - [x]* 16.2 Write property test for review widget fallback invariant (Property 4)
    - **Property 4: Review widget fallback invariant**
    - **Validates: Requirements 3.5, 17.4, 17.5**
    - Simulate API timeout; assert fallback section rendered in viewport, contains ≥1 excerpt and Google Business Profile link

  - [x]* 16.3 Write property test for review rating display rule (Property 23)
    - **Property 23: Review widget rating display rule**
    - **Validates: Requirements 17.2, 17.3**
    - Use fast-check: generate aggregate ratings ≥ 4.0; assert star rating element visible
    - Generate ratings < 4.0; assert star rating element hidden, Google Business link present
    - Assert all excerpt lengths ≤ 250 and total count 3–10

- [x] 17. Phase 3 Checkpoint
  - Booking widget iframes render without horizontal scroll at 320px and 1440px
  - Booking widget fallback message appears after simulated 10s timeout
  - AI Receptionist chat opens with greeting and three prompt options on all pages
  - Google Reviews widget renders on home page (or fallback section if API unavailable)
  - Ensure all tests pass, ask the user if questions arise.

---

### Phase 4 — Performance, SEO & Compliance Polish

- [x] 18. WebP image pipeline and lazy loading
  - [x] 18.1 Audit all `<img>` and `<picture>` elements across all 9 pages
    - Confirm hero images use `fetchpriority="high"` and no `loading="lazy"`
    - Add `loading="lazy" decoding="async"` to every below-fold `<img>` and `<picture>` source
    - Wrap all `<img>` that are not already in `<picture>` elements in `<picture>` with `<source type="image/webp">` sibling + original JPEG/PNG `<img>` fallback
    - Confirm all content images have non-empty descriptive `alt`; decorative images have `alt=""`
    - Set explicit `width` and `height` on all `<img>` elements to prevent layout shift
    - _Requirements: 2.6, 15.2, 15.3, 18.1_

  - [x]* 18.2 Write static analysis test for image hygiene (Property 2)
    - **Property 2: Comprehensive image hygiene**
    - **Validates: Requirements 2.6, 15.2, 18.1**
    - Node.js + jsdom: for each page, assert every non-decorative `<img>` has non-empty `alt`, every `<picture>` has a `<source type="image/webp">`, every non-hero `<img>` and `<iframe>` has `loading="lazy"`

- [x] 19. JSON-LD schema injection
  - [x] 19.1 Create `healthsync/js/schema.js` — schema injection helper
    - Export `injectSchema(schemaObject)`: create `<script type="application/ld+json">` element, set `textContent` to `JSON.stringify(schemaObject)`, append to `document.head`
    - _Requirements: 16.3, 16.4_

  - [x] 19.2 Inject MedicalBusiness schema on `index.html`
    - Add inline `<script type="module">` to `index.html` that imports `schema.js` and calls `injectSchema` with the full `MedicalBusiness` object: name, address (Irene Security Estate, Centurion, Gauteng, ZA), telephone, url, `openingHoursSpecification` (Mon–Fri 08:00–17:00)
    - Remove the placeholder comment added in task 4.1
    - _Requirements: 16.3_

  - [x] 19.3 Inject Physician schema on `about.html`
    - Add inline `<script type="module">` to `about.html` that imports `schema.js` and calls `injectSchema` with the full `Physician` object: name "Dr. van Dyk", `medicalSpecialty`, `worksFor` referencing the practice
    - Remove the placeholder comment added in task 4.2
    - _Requirements: 16.4_

- [x] 20. HPCSA compliance audit pass
  - [x] 20.1 Audit all 9 pages for prohibited terms and patterns
    - Search all HTML files for: "Specials", "Discounts", "Deals", "BOGO", "buy one get one", "Sale", "Free", "% off", "Save", "Limited offer", "guaranteed result", "you will lose", "guaranteed improvement"
    - Remove or rewrite any matching text nodes, heading text, button labels, and `alt` attributes
    - Verify all treatment labels use HPCSA generic names (not trade names) as primary labels
    - Verify no Schedule 2+ medication prices appear anywhere
    - Confirm cybersecurity disclaimer text is exact and visible (not hidden) on `about.html` and `consultations.html`
    - _Requirements: 5.4, 5.5, 5.6, 6.6, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_

  - [x]* 20.2 Write static analysis tests for prohibited terms (Properties 7, 8, 18)
    - **Property 7: No prohibited promotional terms on any page**
    - **Property 8: No guaranteed outcome language on any page**
    - **Property 18: Cybersecurity disclaimer on required pages**
    - **Validates: Requirements 5.6, 14.2, 14.3, 14.4, 14.5, 4.6, 8.5**
    - Node.js + jsdom: extract all visible text nodes (exclude `<script>`, `<style>`); assert no matches against each prohibited pattern list; assert disclaimer exact string present on `about.html` and `consultations.html`

- [x] 21. WCAG 2.1 AA audit pass
  - [x] 21.1 Audit all pages for WCAG 2.1 AA compliance
    - Confirm all body text and interactive element foreground/background combinations meet 4.5:1 contrast ratio (verify Navy #0A1F3C on Ivory #F5F0E8, Gold #C9A84C on Navy, etc.)
    - Confirm all interactive elements have visible `:focus-visible` outlines
    - Confirm all form inputs have explicit `<label for="...">` associations (matching `id` attributes)
    - Confirm heading hierarchy is `h1` → `h2` → `h3` with no skipped levels on every page
    - Confirm `<html lang="en">` and `<meta charset="UTF-8">` on every page
    - Confirm Before/After Slider handle has `aria-label`, `aria-valuemin/max/now`; images have non-empty `alt`
    - Confirm AI Receptionist trigger button has `aria-label`
    - _Requirements: 15.7, 16.5, 18.1, 18.2, 18.3, 18.4, 18.5_

  - [x]* 21.2 Write static analysis tests for heading hierarchy and form labels (Properties 24, 25)
    - **Property 24: Logical heading hierarchy on every page**
    - **Property 25: Form inputs associated with labels**
    - **Validates: Requirements 18.2, 18.4**
    - Node.js + jsdom: extract heading elements in DOM order; assert no skipped levels, exactly one `<h1>` per page
    - Assert every `<input>`, `<select>`, `<textarea>` with an `id` has a matching `<label for="...">` on the same page

  - [x]* 21.3 Write static analysis tests for per-page meta constraints and lang/charset (Properties 21, 22)
    - **Property 21: Per-page meta title and description constraints**
    - **Property 22: html lang and charset declarations on every page**
    - **Validates: Requirements 16.2, 16.5**
    - Node.js + jsdom: for each page assert `<title>` ≤60 chars, `<meta name="description">` 50–160 chars, both unique across pages, both contain a location keyword
    - Assert `<html lang="en">` and `<meta charset="UTF-8">` present on every page

  - [x]* 21.4 Write static analysis test for Privacy Policy footer link (Property 17)
    - **Property 17: Privacy Policy link in every page footer**
    - **Validates: Requirements 13.5**
    - Node.js + jsdom: for each page assert `<footer>` contains `<a href="privacy-policy.html">`

- [x] 22. Phase 4 Checkpoint
  - All 9 pages pass manual HPCSA copy review (no prohibited terms)
  - Cybersecurity disclaimer visible on about.html and consultations.html
  - JSON-LD schema visible in page source for index.html and about.html
  - All lazy-load attributes and WebP `<picture>` wrappers in place
  - Ensure all tests pass, ask the user if questions arise.

---

### Phase 5 — Testing

- [x] 23. Set up test infrastructure
  - [x] 23.1 Initialise test dependencies
    - Confirm `jsdom` and `fast-check` are listed in the root `package.json` `devDependencies` (add if missing: `npm install --save-dev jsdom fast-check`)
    - Create `healthsync/tests/` directory (already exists from task 1.1)
    - Create `healthsync/tests/README.md` documenting all four test layers and run commands
    - _Requirements: (testing infrastructure)_

- [x] 24. Layer 1 — Static analysis tests (Node.js + jsdom)
  - [x] 24.1 Create `healthsync/tests/static-analysis.test.js`
    - Consolidate all static analysis assertions from tasks 18.2, 20.2, 21.2, 21.3, 21.4 into a single runnable Node.js test file
    - Load each of the 9 HTML files via `fs.readFileSync` and `new JSDOM(html)`
    - Assertions (one `console.assert` or throw per check):
      - Property 2: image alt + WebP sources + lazy loading
      - Property 7: no prohibited promotional terms
      - Property 8: no guaranteed outcome language
      - Property 17: Privacy Policy link in every footer
      - Property 18: cybersecurity disclaimer on about.html and consultations.html
      - Property 21: meta title ≤60 chars, description 50–160 chars, unique across pages, location keyword present
      - Property 22: `lang="en"` and `charset="UTF-8"` on every page
      - Property 24: heading hierarchy (no skipped levels, exactly one h1)
      - Property 25: all form inputs have matching label
    - Print pass/fail summary to stdout
    - _Requirements: all of the above_

- [x] 25. Layer 2 — JS module unit and property-based tests (fast-check)
  - [x] 25.1 Create `healthsync/tests/modules.test.js`
    - Consolidate all property tests from tasks 7.2, 8.2, 9.2, 10.2, 11.2, 12.2, 12.3, 12.4, 14.2, 15.2, 15.3, 15.4, 16.2, 16.3 into a single runnable Node.js test file
    - Import each module under test using ES module syntax (`import`)
    - Each `fc.assert(fc.property(...))` runs with `{ numRuns: 200 }`
    - Annotate each test with a comment: `// Feature: health-synchrony-website, Property N: [title]`
    - Include example-based unit tests for:
      - Booking widget: `iframe.onload` fires → fallback hidden; timeout fires → fallback visible with phone, email, contact link
      - Review widget: API success with rating ≥4.0 → star rating visible; rating <4.0 → star hidden; 10s timeout → fallback visible
      - Contact form success path: valid payload + `consentAppointment: true` → `submitForm` returns `{ blocked: false }`
      - Sticky CTA: DOM with `#booking-widget` → `scrollIntoView` called; without → navigate to fallback href
      - Before/After Slider: drag to 0%, 50%, 100% → `aria-valuenow` matches, clip-path set correctly
      - Treatment Quiz: specific answer sequences → expected `recommendedService` values
      - AI Receptionist: FAQ keyword queries → expected responses ≤500 chars
    - _Requirements: all properties listed above_

- [x] 26. Layer 3 — Browser rendering tests (Playwright)
  - [x] 26.1 Create `healthsync/tests/browser.test.js` (Playwright)
    - Add Playwright as a dev dependency: `npm install --save-dev @playwright/test`
    - Add `npx playwright install --with-deps chromium` step to test README
    - Tests:
      - Property 19: for each of 9 pages × 5 viewport widths (320, 375, 768, 1024, 1440px) — assert `document.body.scrollWidth <= document.documentElement.clientWidth` (no horizontal overflow)
      - Property 20: for each page — query all buttons, anchors, inputs, selects, textareas; assert `offsetWidth >= 48 && offsetHeight >= 48` for all
      - Property 6: on about.html with `data-video-available="false"` — assert no `<video>` in DOM; assert placeholder section has non-empty `aria-label` and `title`
      - Property 1 (Playwright variant): navigate to a page with `#booking-widget`; click Sticky CTA; assert URL did not change and `#booking-widget` is in viewport; navigate to a page without widget; click CTA; assert navigation to `contact.html`
      - Property 26 (Playwright variant): on aesthetics.html — check computed transition duration of `.bas__after` is "0.3s" (300ms)
    - _Requirements: 1.5, 4.4, 4.5, 15.4, 15.5, 5.3_

- [x] 27. Layer 4 — SEO and schema validation tests (Node.js)
  - [x] 27.1 Create `healthsync/tests/seo-validation.test.js`
    - Property 21 assertions (duplicate from static analysis to run standalone): title ≤60 chars, description 50–160 chars, unique, location keywords present
    - Property 22 assertions: `lang="en"`, `charset="UTF-8"` on every page
    - MedicalBusiness schema validation on `index.html`: parse JSON-LD from `<script type="application/ld+json">`, assert `@type === "MedicalBusiness"`, `address.addressLocality` contains "Centurion", `telephone` present, `openingHoursSpecification` non-empty array
    - Physician schema validation on `about.html`: assert `@type === "Physician"`, `name` contains "van Dyk", `medicalSpecialty` non-empty, `worksFor.@type === "MedicalBusiness"`
    - _Requirements: 16.2, 16.3, 16.4, 16.5_

- [x] 28. Final Checkpoint — All tests green
  - Run `node healthsync/tests/static-analysis.test.js` — all assertions pass
  - Run `node healthsync/tests/modules.test.js` — all property tests pass (200 runs each)
  - Run `npx playwright test` — all browser rendering tests pass across all 5 viewport widths
  - Run `node healthsync/tests/seo-validation.test.js` — all schema and SEO assertions pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; they validate correctness properties defined in the design document
- Each phase builds directly on the previous; do not start Phase 2 until Phase 1 is browsable in a browser
- All HTML files must have `<html lang="en">` and `<meta charset="UTF-8">` from the very first shell (task 4)
- Placeholder images should be consistent-sized solid colour `<div>` elements or low-res placeholder JPEGs until real assets are provided
- The video placeholder pattern (`data-video-available="false"`) must be used consistently on `about.html` and `consultations.html` until the video asset is supplied; when supplied, the `data-video-available` flag is set to `"true"` and the `<video>` element is rendered in place of the placeholder
- No trade names for Schedule 2+ medications at any point — use generic names throughout
- The `healthsync/` folder is fully self-contained; no file outside that folder should be needed to open the site in a browser
- Property-based tests run with `{ numRuns: 200 }` — minimum per design document is 100

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "1.4", "1.5"] },
    { "id": 2, "tasks": ["1.6", "2.1", "2.4"] },
    { "id": 3, "tasks": ["2.2", "2.3"] },
    { "id": 4, "tasks": ["3.1"] },
    { "id": 5, "tasks": ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6", "4.7", "4.8", "4.9"] },
    { "id": 6, "tasks": ["6.1"] },
    { "id": 7, "tasks": ["7.1", "8.1", "9.1", "10.1", "11.1", "12.1"] },
    { "id": 8, "tasks": ["7.2", "8.2", "9.2", "10.2", "11.2", "12.2", "12.3", "12.4"] },
    { "id": 9, "tasks": ["14.1", "15.1", "16.1"] },
    { "id": 10, "tasks": ["14.2", "15.2", "15.3", "15.4", "16.2", "16.3"] },
    { "id": 11, "tasks": ["19.1"] },
    { "id": 12, "tasks": ["18.1", "19.2", "19.3", "20.1", "21.1"] },
    { "id": 13, "tasks": ["18.2", "20.2", "21.2", "21.3", "21.4"] },
    { "id": 14, "tasks": ["23.1"] },
    { "id": 15, "tasks": ["24.1", "25.1", "27.1"] },
    { "id": 16, "tasks": ["26.1"] }
  ]
}
```
