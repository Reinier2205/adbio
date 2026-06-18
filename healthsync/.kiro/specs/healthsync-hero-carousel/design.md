# Design Document — healthsync-hero-carousel

## Overview

This design covers replacing the static `<section class="hero section">` in `index.html` with a full-viewport, accessible service carousel. The carousel is delivered as a vanilla JS ES module (`js/hero-carousel.js`) with all styles in `css/pages/home.css`. No build tool, bundler, or third-party library is introduced — the implementation stays within the existing project constraints.

---

## Architecture

The feature consists of three layers:

```
index.html
  └── <script type="module"> calls init()
        │
        ▼
js/hero-carousel.js          (behaviour — ES module)
  ├── SLIDES data array       (5 slide definitions)
  ├── renderCarousel()        (builds DOM from SLIDES)
  ├── bindEvents()            (arrows, dots, keyboard, hover, focus)
  ├── startAutoPlay()         (setInterval, respects reduced-motion)
  ├── stopAutoPlay()          (clearInterval)
  └── goTo(index)             (transitions, ARIA updates, live region)

css/pages/home.css            (all carousel-specific CSS)
  ├── .carousel-hero          (full-viewport container)
  ├── .carousel-hero__slide   (individual slide)
  ├── .carousel-hero__img     (background image)
  ├── .carousel-hero__overlay (dark semi-transparent layer)
  ├── .carousel-hero__content (heading + tagline + CTA)
  ├── .carousel-hero__controls (arrows + dots wrapper)
  ├── .carousel-hero__arrow   (prev/next buttons)
  ├── .carousel-hero__dots    (dots list)
  ├── .carousel-hero__dot     (individual dot)
  └── .carousel-hero--no-motion (overrides for reduced motion)
```

The module is self-contained: it owns no global state beyond the single interval handle stored in a module-scoped variable. The Hero Section element is the only DOM dependency.

---

## Component Design

### Slide Data

All slide content is defined as a frozen array of objects at the top of the module. Nothing is fetched at runtime.

```js
const SLIDES = Object.freeze([
  {
    id:       'aesthetics',
    heading:  'Aesthetics',
    tagline:  'Reveal your natural radiance with personalised, medically supervised treatments.',
    cta:      { text: 'Explore Aesthetics', href: 'aesthetics.html' },
    img:      { src: 'https://picsum.photos/seed/aesthetics/1440/810', alt: 'Aesthetics treatment room at Health Synchrony' },
  },
  {
    id:       'weight-loss',
    heading:  'Weight Loss',
    tagline:  'Achieve sustainable results with a medically guided weight-loss programme.',
    cta:      { text: 'Explore Weight Loss', href: 'weight-loss.html' },
    img:      { src: 'https://picsum.photos/seed/weightloss/1440/810', alt: 'Weight loss consultation at Health Synchrony' },
  },
  {
    id:       'iv-therapy',
    heading:  'IV Therapy',
    tagline:  'Replenish and energise with customised intravenous nutrient drips.',
    cta:      { text: 'Explore IV Therapy', href: 'iv-therapy.html' },
    img:      { src: 'https://picsum.photos/seed/ivtherapy/1440/810', alt: 'IV therapy drip preparation at Health Synchrony' },
  },
  {
    id:       'consultations',
    heading:  'Consultations',
    tagline:  'Begin your wellness journey with a thorough one-on-one consultation.',
    cta:      { text: 'Book a Consultation', href: 'consultations.html' },
    img:      { src: 'https://picsum.photos/seed/consultations/1440/810', alt: 'Doctor consultation at Health Synchrony' },
  },
  {
    id:       'dispensary',
    heading:  'Dispensary',
    tagline:  'Access curated supplements and skincare dispensed by our medical team.',
    cta:      { text: 'Visit the Dispensary', href: 'dispensary.html' },
    img:      { src: 'https://picsum.photos/seed/dispensary/1440/810', alt: 'Dispensary products at Health Synchrony' },
  },
]);
```

The first slide uses `<h1>` to preserve the site-level headline. Slides 2–5 use `<h2>`.

### HTML Structure (rendered by `renderCarousel()`)

```html
<section class="hero section carousel-hero" role="region"
         aria-label="Service carousel"
         aria-roledescription="carousel">

  <!-- Live region — announces slide changes to screen readers -->
  <div class="sr-only" aria-live="polite" aria-atomic="true"
       id="carousel-live"></div>

  <!-- Slide track -->
  <div class="carousel-hero__track">

    <!-- Slide 0 (Aesthetics) — first slide uses h1 -->
    <div class="carousel-hero__slide is-active"
         role="group" aria-roledescription="slide"
         aria-label="1 of 5: Aesthetics"
         id="carousel-slide-0">
      <img
        class="carousel-hero__img"
        src="https://picsum.photos/seed/aesthetics/1440/810"
        alt="Aesthetics treatment room at Health Synchrony"
        width="1440" height="810"
        fetchpriority="high" loading="eager"
        decoding="async">
      <div class="carousel-hero__overlay" aria-hidden="true"></div>
      <div class="carousel-hero__content">
        <h1>Integrated Wellness &amp; Aesthetics in Centurion, Irene Security Estate</h1>
        <p class="carousel-hero__tagline">
          Reveal your natural radiance with personalised, medically supervised treatments.
        </p>
        <a href="aesthetics.html" class="btn-primary">Explore Aesthetics</a>
      </div>
    </div>

    <!-- Slides 1–4 follow the same pattern, with h2 and loading="lazy" -->

  </div>

  <!-- Controls -->
  <div class="carousel-hero__controls">

    <button class="carousel-hero__arrow carousel-hero__arrow--prev"
            aria-label="Previous slide"
            aria-controls="carousel-slide-0">
      <!-- SVG chevron-left -->
    </button>

    <div class="carousel-hero__dots" role="tablist" aria-label="Slide navigation">
      <button class="carousel-hero__dot is-active"
              role="tab"
              aria-selected="true"
              aria-controls="carousel-slide-0"
              aria-label="Slide 1: Aesthetics"></button>
      <!-- dots 1–4 … -->
    </div>

    <button class="carousel-hero__arrow carousel-hero__arrow--next"
            aria-label="Next slide"
            aria-controls="carousel-slide-0">
      <!-- SVG chevron-right -->
    </button>

  </div>

</section>
```

### Module Interface

```js
// js/hero-carousel.js

export function init(selector = '.hero') { … }
```

Calling `init()` on a page without the Hero Section returns immediately without throwing. The `selector` parameter is optional to ease testing.

### State Machine

The module tracks two pieces of state:

| Variable | Type | Description |
|---|---|---|
| `currentIndex` | `number` | Index (0–4) of the active slide |
| `autoPlayTimer` | `number \| null` | `setInterval` return value, or `null` when paused |

State transitions:

```
init()
  → reduced motion? → no autoplay, add .carousel-hero--no-motion
  → else            → startAutoPlay()

mouseenter / focusin(control) → stopAutoPlay()
mouseleave / focusout(control) → startAutoPlay()

goTo(n)
  → clamp/wrap n to [0, SLIDES.length - 1]
  → remove .is-active from current slide + dot
  → add .is-active to new slide + dot
  → update aria-current on dots
  → update live region text
  → update arrow aria-controls
  → restart autoplay timer (reset the 5 s window)
```

### Auto-play

```js
const AUTOPLAY_INTERVAL = 5000; // ms

function startAutoPlay() {
  if (reducedMotion || autoPlayTimer !== null) return;
  autoPlayTimer = setInterval(() => goTo((currentIndex + 1) % SLIDES.length), AUTOPLAY_INTERVAL);
}

function stopAutoPlay() {
  clearInterval(autoPlayTimer);
  autoPlayTimer = null;
}
```

The `reducedMotion` flag is read once from `window.matchMedia('(prefers-reduced-motion: reduce)')` and also listened to via `addEventListener('change', …)` so late changes (user adjusting OS preference) are respected.

### CSS Transition Strategy

Slides are stacked absolutely within the track. Only the `.is-active` slide has `opacity: 1` and `pointer-events: auto`; all others have `opacity: 0`. Transitioning via `opacity` achieves a cross-fade:

```css
.carousel-hero__slide {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity var(--transition-normal);
  pointer-events: none;
}

.carousel-hero__slide.is-active {
  opacity: 1;
  pointer-events: auto;
}

/* Reduced motion: kill the transition */
.carousel-hero--no-motion .carousel-hero__slide {
  transition: none;
}
```

---

## Data Models

### SlideDefinition (internal type)

```js
/**
 * @typedef {Object} SlideDefinition
 * @property {string} id        - URL-safe identifier
 * @property {string} heading   - Service name (h1 text for slide 0 is overridden by site headline)
 * @property {string} tagline   - ≤15 words describing the service
 * @property {{ text: string, href: string }} cta
 * @property {{ src: string, alt: string }}   img
 */
```

No external data fetching. No persistence. The module is stateless between page loads.

---

## Error Handling

| Scenario | Handling |
|---|---|
| Hero section not found on page | `init()` checks for the element and returns early if absent — no console error, no thrown exception |
| Slide image fails to load | `onerror` handler on `<img>` removes the `src` attribute; the dark overlay + `var(--color-navy)` background remain visible, preserving slide content without layout shift |
| `matchMedia` not supported (old browser) | Guard: `window.matchMedia?.()` — falls back to auto-play on |
| Module called more than once | Guard: if `.carousel-hero__track` already exists inside the hero section, `init()` returns without re-rendering |

---

## Integration with `index.html`

The following changes are made to `index.html`:

1. The hero section's static content (existing `<img class="hero__image">`, `.hero__overlay`, `.hero__content`) is removed and replaced by `renderCarousel()` at runtime — the `<section class="hero section">` element itself is retained.
2. One new `<script type="module">` block is added **after** the existing module scripts:
   ```html
   <script type="module">
     import { init } from './js/hero-carousel.js';
     init();
   </script>
   ```
3. All existing `<script type="module">` tags (`nav.js`, `sticky-cta.js`, `booking-widget.js`, `review-widget.js`, `ai-receptionist.js`) are untouched.

> Note: The static hero markup could alternatively be left in `index.html` as a no-JS fallback and replaced by `renderCarousel()`. However, since the project does not have a progressive-enhancement requirement and all existing JS modules expect a working DOM, the simpler approach (empty section + JS renders slides) is used.

---

## CSS File Changes

Only `css/pages/home.css` is modified. No other CSS file is touched.

The new rules added to `home.css` cover:

- `.carousel-hero` — full viewport sizing (`100dvh` + `100vh` fallback), `position: relative`, overflow hidden, navy background fallback
- `.carousel-hero__track` — absolutely fills the carousel, stacks slides
- `.carousel-hero__slide` — absolutely positioned, full-bleed, opacity cross-fade
- `.carousel-hero__img` — `object-fit: cover`, full bleed
- `.carousel-hero__overlay` — semi-transparent navy gradient
- `.carousel-hero__content` — centered column layout, z-index above overlay
- `.carousel-hero__controls` — absolute bottom row, z-index `var(--z-sticky)`
- `.carousel-hero__arrow` — touch-target size, ghost button style
- `.carousel-hero__dots` + `.carousel-hero__dot` — dot indicators, gold active state
- Responsive overrides at `max-width: 767px` for font scaling and padding
- `.carousel-hero--no-motion` — `transition: none` on all animated elements

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Slide Count and Order Invariant

*For any* initialized carousel, the rendered DOM shall contain exactly 5 slide elements whose service identifiers and headings match the specified order: Aesthetics, Weight Loss, IV Therapy, Consultations, Dispensary.

**Validates: Requirements 1.1**

---

### Property 2: Slide Structure — Image and Overlay

*For any* slide index in [0, 4], the rendered slide element shall contain an `<img>` element with a Picsum Photos URL as its `src` and a sibling overlay element with `aria-hidden="true"`.

**Validates: Requirements 2.1**

---

### Property 3: Heading Element by Slide Index

*For any* slide index, the rendered slide shall contain an `<h1>` element if the index is 0 (Aesthetics) and an `<h2>` element for all other indices (1–4), with both heading types using `var(--color-ivory)` via CSS class.

**Validates: Requirements 2.2**

---

### Property 4: Tagline Word Count

*For any* slide in the SLIDES data array, the tagline string shall contain no more than 15 words when split on whitespace.

**Validates: Requirements 2.3**

---

### Property 5: CTA Button Destination and Class

*For any* slide index in [0, 4], the rendered CTA button (`<a>`) shall have the `btn-primary` class and its `href` shall equal the expected service page URL for that index: `aesthetics.html`, `weight-loss.html`, `iv-therapy.html`, `consultations.html`, or `dispensary.html`.

**Validates: Requirements 2.4, 2.5**

---

### Property 6: Next Navigation Wraps Circularly

*For any* starting slide index, advancing via the Next Arrow exactly 5 times (one full cycle) shall return the carousel to the starting index.

**Validates: Requirements 4.1**

---

### Property 7: Prev Navigation Wraps Circularly

*For any* starting slide index, retreating via the Prev Arrow exactly 5 times (one full cycle) shall return the carousel to the starting index.

**Validates: Requirements 4.2**

---

### Property 8: Dot Activation Sets Active Slide

*For any* dot index in [0, 4], activating that dot shall make the slide at that index the active slide (`.is-active` class present) and all other slides inactive.

**Validates: Requirements 4.3**

---

### Property 9: Active Dot ARIA State Exclusivity

*For any* active slide index, exactly one Navigation Dot shall carry `aria-current="true"` (or `aria-selected="true"`) and that dot shall correspond to the active slide index; all other dots shall not carry that attribute.

**Validates: Requirements 4.4**

---

### Property 10: Live Region Updates on Slide Change

*For any* slide navigation action (Next Arrow, Prev Arrow, or Dot activation) that results in a new active slide, the Live Region element's text content shall equal the heading text of the newly active slide.

**Validates: Requirements 5.2**

---

### Property 11: Slide Image Alt Attributes

*For any* slide index in [0, 4], the rendered `<img>` element's `alt` attribute shall be a non-empty string that references the name of the service depicted on that slide.

**Validates: Requirements 5.4**

---

### Property 12: Lazy Loading for Non-First Slides

*For any* slide index in [1, 4], the rendered `<img>` element shall have `loading="lazy"`, while the slide at index 0 shall have `loading="eager"` and `fetchpriority="high"`.

**Validates: Requirements 7.1, 7.2**
