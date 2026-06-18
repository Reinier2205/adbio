# Implementation Plan: healthsync-hero-carousel

## Overview

Implement a full-viewport accessible service carousel to replace the static hero section on the Health Synchrony homepage. Three files are modified: `js/hero-carousel.js` (new), `css/pages/home.css` (extended), and `index.html` (updated). The implementation is a vanilla JS ES module with no build tool or third-party dependencies.

## Tasks

- [x] 0. Add wordmark to site header — "Health Synchrony" text next to logo icon
  - [x] 0.1 Add Dancing Script Google Font to `<head>` of all HTML pages
    - Add `<link rel="preconnect" href="https://fonts.googleapis.com">` and `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` if not already present (most pages already have them for Inter)
    - Append `&family=Dancing+Script:wght@600` to the existing Google Fonts `<link>` stylesheet URL on each page, so both Inter and Dancing Script are fetched in a single request
    - Apply to all 9 HTML pages: `index.html`, `aesthetics.html`, `weight-loss.html`, `iv-therapy.html`, `consultations.html`, `dispensary.html`, `about.html`, `contact.html`, `privacy-policy.html`
    - Also update `_shared-snippets.html` if it contains a `<head>` font link for documentation reference
    - _Requirements: (new) Wordmark Req 1_

  - [x] 0.2 Add `.logo__name` CSS rules to `css/components.css`
    - Add a new section (e.g. `/* Logo Wordmark */`) inside the existing `/* Logo */` block under section 2 (HEADER / NAV SHELLS)
    - `.logo__name` rules:
      - `font-family: 'Dancing Script', cursive`
      - `font-size: 1.5rem` (approx. 24px — visually balanced against the 48px icon)
      - `font-weight: 600`
      - `color: var(--color-ivory)`
      - `line-height: 1`
      - `white-space: nowrap`
      - `letter-spacing: 0.01em`
    - The existing `.site-header .logo { display: inline-flex; align-items: center; }` already vertically centres children — no additional flex rules needed on the anchor
    - Add a small left gap: `.site-header .logo__name { margin-inline-start: var(--spacing-8); }` (or `gap` on `.logo` if preferred)
    - _Requirements: (new) Wordmark Req 2, 3_

  - [x] 0.3 Insert `<span class="logo__name">Health Synchrony</span>` inside `.logo` anchor on all HTML pages and update `alt`
    - For each of the 9 HTML pages and `_shared-snippets.html`, locate the `.logo` anchor block:
      ```html
      <a href="..." class="logo" aria-label="Health Synchrony home">
        <img src="images/logo.png" alt="Health Synchrony logo" ...>
      </a>
      ```
    - Update `alt` on the `<img>` from `"Health Synchrony logo"` to `"Health Synchrony logo icon"` (name is now present as visible text, so alt should describe the icon only)
    - Add `<span class="logo__name">Health Synchrony</span>` immediately after the closing `</img>` (self-closing) tag, still inside the `<a>`:
      ```html
      <a href="..." class="logo" aria-label="Health Synchrony home">
        <img src="images/logo.png" alt="Health Synchrony logo icon" width="180" height="48">
        <span class="logo__name">Health Synchrony</span>
      </a>
      ```
    - The `aria-label="Health Synchrony home"` on the anchor covers the whole lockup for screen readers — no further ARIA changes needed
    - Note: `href` value varies per page (e.g. `index.html`, `../index.html`) — preserve each page's existing value
    - _Requirements: (new) Wordmark Req 3, 4_

- [x] 1. Create `js/hero-carousel.js` — module scaffold and SLIDES data
  - Create `js/hero-carousel.js` as an ES module with a named `init()` export
  - Define the `SLIDES` frozen array with all five slide definitions (id, heading, tagline, cta, img) exactly as specified in the design
  - Add the `SlideDefinition` JSDoc typedef
  - Set up module-scoped state variables: `currentIndex` and `autoPlayTimer`
  - Read `prefers-reduced-motion` once via `window.matchMedia?.()` and attach a `change` listener
  - Add guard: if the hero section is not found, return early without throwing
  - Add guard: if `.carousel-hero__track` already exists, return early without re-rendering
  - _Requirements: 1.6, 2.2, 8.1, 8.4_

- [x] 2. Implement `renderCarousel()` — DOM construction
  - [x] 2.1 Implement `renderCarousel()` to build the full carousel HTML from `SLIDES`
    - Add `carousel-hero` and `aria-roledescription="carousel"` to the hero section element
    - Update `aria-label` to `"Service carousel"` (Requirement 8.3)
    - Render the `sr-only` live region div with `aria-live="polite"` and `aria-atomic="true"` and `id="carousel-live"`
    - Render the `carousel-hero__track` containing all five slides
    - Slide 0: use `<h1>` with the full site headline, `fetchpriority="high"`, `loading="eager"`; slides 1–4: use `<h2>`, `loading="lazy"`
    - Each slide: `role="group"`, `aria-roledescription="slide"`, `aria-label="N of 5: {heading}"`, `id="carousel-slide-{n}"`
    - Each slide contains: `<img>` (with descriptive `alt`), overlay div with `aria-hidden="true"`, content div with heading/tagline/CTA
    - Render the controls section: prev arrow, dots tablist, next arrow with correct `aria-label` and `aria-controls` attributes
    - First slide and first dot get `is-active` / `aria-current="true"` initially
    - Attach `onerror` handler on each `<img>` that removes the `src` attribute on failure
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 5.1, 5.2, 5.3, 5.4, 7.1, 7.2, 7.3, 7.4, 8.3_
  - [ ]* 2.2 Write property test for slide count and order (Property 1)
    - **Property 1: Slide Count and Order Invariant**
    - Call `renderCarousel()` against a mock hero element and assert exactly 5 slides are rendered in the order: Aesthetics, Weight Loss, IV Therapy, Consultations, Dispensary
    - **Validates: Requirements 1.1**
  - [ ]* 2.3 Write property test for heading element by slide index (Property 3)
    - **Property 3: Heading Element by Slide Index**
    - For each index 0–4, assert index 0 renders `<h1>` and indices 1–4 render `<h2>`
    - **Validates: Requirements 2.2**
  - [ ]* 2.4 Write property test for tagline word count (Property 4)
    - **Property 4: Tagline Word Count**
    - For all entries in `SLIDES`, assert the tagline contains ≤ 15 words when split on whitespace
    - **Validates: Requirements 2.3**
  - [ ]* 2.5 Write property test for CTA button destination and class (Property 5)
    - **Property 5: CTA Button Destination and Class**
    - For each slide index 0–4, assert the rendered `<a>` has class `btn-primary` and the expected `href`
    - **Validates: Requirements 2.4, 2.5**
  - [ ]* 2.6 Write property test for image alt attributes (Property 11)
    - **Property 11: Slide Image Alt Attributes**
    - For each slide index 0–4, assert the rendered `<img>` has a non-empty `alt` that references the service name
    - **Validates: Requirements 5.4**
  - [ ]* 2.7 Write property test for lazy loading (Property 12)
    - **Property 12: Lazy Loading for Non-First Slides**
    - For slide 0, assert `loading="eager"` and `fetchpriority="high"`; for slides 1–4, assert `loading="lazy"`
    - **Validates: Requirements 7.1, 7.2**
  - [ ]* 2.8 Write property test for slide image and overlay structure (Property 2)
    - **Property 2: Slide Structure — Image and Overlay**
    - For each slide index 0–4, assert the slide contains an `<img>` with a Picsum URL and an overlay element with `aria-hidden="true"`
    - **Validates: Requirements 2.1**

- [x] 3. Implement `goTo(index)` — active slide transitions and ARIA updates
  - [x] 3.1 Implement `goTo(index)` with wrap-around and all ARIA side effects
    - Wrap `index` to `[0, SLIDES.length - 1]` circularly
    - Remove `.is-active` from current slide and dot; add to new slide and dot
    - Update `aria-current="true"` on the newly active dot and remove from all others; update `aria-selected` on tablist dots
    - Update `aria-controls` on both arrows to point to the new active slide id
    - Update the live region `textContent` to the heading text of the newly active slide
    - Reset the autoplay timer (stop then start) so the 5 s window restarts on manual navigation
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.2_
  - [ ]* 3.2 Write property test for next navigation circular wrap (Property 6)
    - **Property 6: Next Navigation Wraps Circularly**
    - Starting from each index 0–4, simulate advancing 5 times and assert the carousel returns to the starting index
    - **Validates: Requirements 4.1**
  - [ ]* 3.3 Write property test for prev navigation circular wrap (Property 7)
    - **Property 7: Prev Navigation Wraps Circularly**
    - Starting from each index 0–4, simulate retreating 5 times and assert the carousel returns to the starting index
    - **Validates: Requirements 4.2**
  - [ ]* 3.4 Write property test for dot activation (Property 8)
    - **Property 8: Dot Activation Sets Active Slide**
    - For each dot index 0–4, activate that dot and assert only that slide has `.is-active`; all others do not
    - **Validates: Requirements 4.3**
  - [ ]* 3.5 Write property test for active dot ARIA exclusivity (Property 9)
    - **Property 9: Active Dot ARIA State Exclusivity**
    - For each slide index 0–4, call `goTo(index)` and assert exactly one dot carries `aria-current="true"` corresponding to that index
    - **Validates: Requirements 4.4**
  - [ ]* 3.6 Write property test for live region updates (Property 10)
    - **Property 10: Live Region Updates on Slide Change**
    - For each navigation action (next, prev, dot), assert the live region `textContent` equals the heading of the newly active slide
    - **Validates: Requirements 5.2**

- [x] 4. Checkpoint — Ensure all goTo and rendering tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement `bindEvents()`, `startAutoPlay()`, and `stopAutoPlay()`
  - [x] 5.1 Implement `bindEvents()` for arrows, dots, keyboard, hover, and focus
    - Next arrow click → `goTo(currentIndex + 1)`; prev arrow click → `goTo(currentIndex - 1)`
    - Each dot click → `goTo(dotIndex)`
    - `keydown` on the hero section: Right Arrow → next, Left Arrow → prev (Requirement 4.5, 4.6)
    - `mouseenter` on carousel → `stopAutoPlay()`; `mouseleave` → `startAutoPlay()`
    - `focusin` on any control → `stopAutoPlay()`; `focusout` on any control (when focus leaves all controls) → `startAutoPlay()`
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.5, 4.6, 5.6_
  - [x] 5.2 Implement `startAutoPlay()` and `stopAutoPlay()`
    - `startAutoPlay()`: guard on `reducedMotion` and `autoPlayTimer !== null`; set `setInterval` advancing one slide every 5000 ms
    - `stopAutoPlay()`: `clearInterval(autoPlayTimer)` then set `autoPlayTimer = null`
    - If reduced motion is active, skip auto-play and add `.carousel-hero--no-motion` to the container
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  - [x] 5.3 Wire `init()` — call `renderCarousel()`, then `bindEvents()`, then `startAutoPlay()`
    - Ensure `init()` exits silently if the hero section is absent or already initialized
    - _Requirements: 1.6, 3.1, 8.1, 8.4_

- [x] 6. Add carousel styles to `css/pages/home.css`
  - [x] 6.1 Add layout and sizing rules for `.carousel-hero` and `.carousel-hero__track`
    - `.carousel-hero`: `min-height: 100vh; min-height: 100dvh; position: relative; overflow: hidden; background-color: var(--color-navy)`
    - `.carousel-hero__track`: `position: absolute; inset: 0`
    - _Requirements: 1.2, 6.1, 6.2, 7.4_
  - [x] 6.2 Add slide, image, and overlay styles
    - `.carousel-hero__slide`: `position: absolute; inset: 0; opacity: 0; transition: opacity var(--transition-normal); pointer-events: none`
    - `.carousel-hero__slide.is-active`: `opacity: 1; pointer-events: auto`
    - `.carousel-hero__img`: `width: 100%; height: 100%; object-fit: cover; display: block`
    - `.carousel-hero__overlay`: full-bleed semi-transparent navy gradient with `aria-hidden` visually; z-index above image
    - _Requirements: 2.1, 2.6, 6.2, 6.3_
  - [x] 6.3 Add content, controls, arrow, and dot styles
    - `.carousel-hero__content`: centered column, z-index above overlay, color `var(--color-ivory)` for headings, `var(--color-gold)` for tagline
    - `.carousel-hero__controls`: `position: absolute; bottom: var(--space-6); width: 100%; display: flex; justify-content: center; align-items: center; gap: var(--space-4); z-index: var(--z-sticky)`
    - `.carousel-hero__arrow`: min-size 48×48 px matching `var(--touch-target)`, ghost button style, `position: absolute` left/right
    - `.carousel-hero__dots`: flex row, centred; `.carousel-hero__dot`: 12px circle, white; `.carousel-hero__dot.is-active`: `background-color: var(--color-gold)`
    - _Requirements: 2.2, 2.3, 4.4, 5.5, 6.4, 6.5, 6.6_
  - [x] 6.4 Add responsive overrides and reduced-motion overrides
    - At `max-width: 767px`: reduce heading font sizes and CTA padding so text is readable without horizontal scrolling
    - `.carousel-hero--no-motion .carousel-hero__slide`: `transition: none`
    - `.carousel-hero--no-motion` any other animated elements: `transition: none; animation: none`
    - _Requirements: 3.6, 5.7, 6.3, 6.4_

- [x] 7. Update `index.html` — remove static hero markup and add module script
  - Remove the static content inside `<section class="hero section">`: the `<img class="hero__image">`, `.hero__overlay`, and `.hero__content` elements
  - Leave the `<section class="hero section">` element itself in place (the module will populate it)
  - Add the carousel module script after all existing `<script type="module">` blocks:
    ```html
    <script type="module">
      import { init } from './js/hero-carousel.js';
      init();
    </script>
    ```
  - Verify all existing module script tags (`nav.js`, `sticky-cta.js`, `booking-widget.js`, `review-widget.js`, `ai-receptionist.js`) remain unchanged
  - _Requirements: 1.3, 1.6, 8.1, 8.2, 8.3_

- [-] 8. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The design document's Correctness Properties are mapped 1-to-1 to property test sub-tasks
- All carousel styles must use only CSS custom properties from `tokens.css` — no hard-coded hex or pixel values that duplicate tokens
- The `goTo()` timer reset ensures the auto-play interval is always measured from the last user interaction
- The `onerror` handler on slide images preserves layout integrity with a navy background fallback
- Task 0 (wordmark) is a site-wide header change independent of the carousel; it can be executed in parallel with carousel tasks but should be completed before any cross-browser visual review

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["0.1", "1"] },
    { "id": 1, "tasks": ["0.2", "2.1"] },
    { "id": 2, "tasks": ["0.3", "2.2", "2.3", "2.4", "2.5", "2.6", "2.7", "2.8", "3.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "3.4", "3.5", "3.6", "5.1"] },
    { "id": 4, "tasks": ["5.2"] },
    { "id": 5, "tasks": ["5.3", "6.1"] },
    { "id": 6, "tasks": ["6.2", "6.3"] },
    { "id": 7, "tasks": ["6.4"] },
    { "id": 8, "tasks": ["7"] }
  ]
}
```
