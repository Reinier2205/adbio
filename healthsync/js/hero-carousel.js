/**
 * hero-carousel.js — Full-viewport service carousel for the homepage hero section
 * ES module. Requirements: 1.6, 2.2, 3.1–3.6, 4.1–4.6, 5.1–5.7, 6.1–6.6, 7.1–7.4, 8.1, 8.3, 8.4
 */

/**
 * @typedef {Object} SlideDefinition
 * @property {string} id        - URL-safe identifier
 * @property {string} heading   - Service name (h1 text for slide 0 is overridden by site headline)
 * @property {string} tagline   - ≤15 words describing the service
 * @property {{ text: string, href: string }} cta
 * @property {{ src: string, alt: string }}   img
 */

/** @type {ReadonlyArray<SlideDefinition>} */
const SLIDES = Object.freeze([
  {
    id:      'aesthetics',
    heading: 'Aesthetics',
    tagline: 'Reveal your natural radiance with personalised, medically supervised treatments.',
    cta:     { text: 'Explore Aesthetics', href: 'aesthetics.html' },
    img:     { src: 'https://picsum.photos/seed/aesthetics/1440/810', alt: 'Aesthetics treatment room at Health Synchrony' },
  },
  {
    id:      'weight-loss',
    heading: 'Weight Loss',
    tagline: 'Achieve sustainable results with a medically guided weight-loss programme.',
    cta:     { text: 'Explore Weight Loss', href: 'weight-loss.html' },
    img:     { src: 'https://picsum.photos/seed/weightloss/1440/810', alt: 'Weight loss consultation at Health Synchrony' },
  },
  {
    id:      'iv-therapy',
    heading: 'IV Therapy',
    tagline: 'Replenish and energise with customised intravenous nutrient drips.',
    cta:     { text: 'Explore IV Therapy', href: 'iv-therapy.html' },
    img:     { src: 'https://picsum.photos/seed/ivtherapy/1440/810', alt: 'IV therapy drip preparation at Health Synchrony' },
  },
  {
    id:      'consultations',
    heading: 'Consultations',
    tagline: 'Begin your wellness journey with a thorough one-on-one consultation.',
    cta:     { text: 'Book a Consultation', href: 'consultations.html' },
    img:     { src: 'https://picsum.photos/seed/consultations/1440/810', alt: 'Doctor consultation at Health Synchrony' },
  },
  {
    id:      'dispensary',
    heading: 'Dispensary',
    tagline: 'Access curated supplements and skincare dispensed by our medical team.',
    cta:     { text: 'Visit the Dispensary', href: 'dispensary.html' },
    img:     { src: 'https://picsum.photos/seed/dispensary/1440/810', alt: 'Dispensary products at Health Synchrony' },
  },
]);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Interval (ms) between auto-play slide advances. */
const AUTOPLAY_INTERVAL = 5000;

// ---------------------------------------------------------------------------
// Module-scoped state
// ---------------------------------------------------------------------------

/** @type {number} Index of the currently active slide (0–4) */
let currentIndex = 0;

/** @type {number|null} setInterval handle, or null when paused / not running */
let autoPlayTimer = null;

/** @type {HTMLElement|null} Reference to the hero section element set by init() */
let _heroEl = null;

// ---------------------------------------------------------------------------
// Reduced-motion detection
// ---------------------------------------------------------------------------

/**
 * `true` when the user has requested reduced motion.
 * Read once at module parse time; updated via a `change` listener so that
 * live OS-preference changes are respected without a page reload.
 * Uses optional-chaining so old browsers that lack `matchMedia` default to
 * auto-play on (reduced-motion off).
 */
let reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

(function attachReducedMotionListener() {
  const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  if (!mq) return;
  mq.addEventListener('change', e => {
    reducedMotion = e.matches;
  });
})();

// ---------------------------------------------------------------------------
// Stub functions — implemented in later tasks
// ---------------------------------------------------------------------------

/**
 * Builds and injects the full carousel DOM into the hero section.
 *
 * Requirements satisfied:
 *  - 1.1  Exactly five slides in order
 *  - 1.3  Replaces static hero content; retains section element
 *  - 1.4  Site headline as <h1> on first slide
 *  - 1.5  Prev/Next arrows and dots rendered
 *  - 2.1  Full-bleed background image with overlay
 *  - 2.2  <h1> for slide 0, <h2> for slides 1–4
 *  - 2.3  Tagline rendered per slide
 *  - 2.4  CTA button linking to service page
 *  - 2.5  CTA uses btn-primary class
 *  - 5.1  aria-roledescription="carousel", aria-label="Service carousel"
 *  - 5.2  Live region with aria-live="polite" and aria-atomic="true"
 *  - 5.3  Arrow aria-labels
 *  - 5.4  Descriptive alt on each image
 *  - 7.1  First slide: fetchpriority="high", loading="eager"
 *  - 7.2  Slides 1–4: loading="lazy"
 *  - 7.3  Full carousel HTML rendered on init
 *  - 7.4  onerror removes src (dark overlay + navy bg remain)
 *  - 8.3  aria-label updated to "Service carousel"
 *
 * @param {HTMLElement} heroEl  The hero section element to populate.
 */
function renderCarousel(heroEl) {
  // --- 0. Clear any static fallback content (e.g. no-JS fallback h1) -------
  heroEl.innerHTML = '';

  // --- 1. Update the section element itself ---------------------------------
  heroEl.classList.add('carousel-hero');
  heroEl.setAttribute('aria-roledescription', 'carousel');
  heroEl.setAttribute('aria-label', 'Service carousel');                  // Req 8.3

  // --- 2. Live region -------------------------------------------------------
  const liveRegion = document.createElement('div');
  liveRegion.className = 'sr-only';
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.id = 'carousel-live';
  heroEl.appendChild(liveRegion);

  // --- 3. Slide track -------------------------------------------------------
  const track = document.createElement('div');
  track.className = 'carousel-hero__track';

  SLIDES.forEach((slide, i) => {
    const slideEl = document.createElement('div');
    slideEl.className = 'carousel-hero__slide' + (i === 0 ? ' is-active' : '');
    slideEl.setAttribute('role', 'group');
    slideEl.setAttribute('aria-roledescription', 'slide');
    slideEl.setAttribute('aria-label', `${i + 1} of 5: ${slide.heading}`);
    slideEl.id = `carousel-slide-${i}`;

    // Image
    const img = document.createElement('img');
    img.className = 'carousel-hero__img';
    img.src = slide.img.src;
    img.alt = slide.img.alt;
    img.width = 1440;
    img.height = 810;
    img.setAttribute('decoding', 'async');
    if (i === 0) {
      img.setAttribute('fetchpriority', 'high');
      img.loading = 'eager';
    } else {
      img.loading = 'lazy';
    }
    // Req 7.4 — on load failure remove src; overlay + navy bg remain visible
    img.onerror = function () { this.removeAttribute('src'); };

    // Overlay
    const overlay = document.createElement('div');
    overlay.className = 'carousel-hero__overlay';
    overlay.setAttribute('aria-hidden', 'true');

    // Content
    const content = document.createElement('div');
    content.className = 'carousel-hero__content';

    // Heading — h1 for slide 0 (site headline), h2 for slides 1–4
    const heading = document.createElement(i === 0 ? 'h1' : 'h2');
    if (i === 0) {
      heading.textContent = 'Integrated Wellness & Aesthetics in Centurion, Irene Security Estate';
    } else {
      heading.textContent = slide.heading;
    }

    // Tagline
    const tagline = document.createElement('p');
    tagline.className = 'carousel-hero__tagline';
    tagline.textContent = slide.tagline;

    // CTA button
    const cta = document.createElement('a');
    cta.href = slide.cta.href;
    cta.className = 'btn-primary';
    cta.textContent = slide.cta.text;

    content.appendChild(heading);
    content.appendChild(tagline);
    content.appendChild(cta);

    slideEl.appendChild(img);
    slideEl.appendChild(overlay);
    slideEl.appendChild(content);
    track.appendChild(slideEl);
  });

  heroEl.appendChild(track);

  // --- 4. Controls ---------------------------------------------------------
  const controls = document.createElement('div');
  controls.className = 'carousel-hero__controls';

  // Prev arrow
  const prevBtn = document.createElement('button');
  prevBtn.className = 'carousel-hero__arrow carousel-hero__arrow--prev';
  prevBtn.setAttribute('aria-label', 'Previous slide');
  prevBtn.setAttribute('aria-controls', 'carousel-slide-0');
  prevBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true" focusable="false">
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>`;

  // Dots tablist
  const dotsEl = document.createElement('div');
  dotsEl.className = 'carousel-hero__dots';
  dotsEl.setAttribute('role', 'tablist');
  dotsEl.setAttribute('aria-label', 'Slide navigation');

  SLIDES.forEach((slide, i) => {
    const dot = document.createElement('button');
    dot.className = 'carousel-hero__dot' + (i === 0 ? ' is-active' : '');
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', `Slide ${i + 1}: ${slide.heading}`);
    dot.setAttribute('aria-controls', `carousel-slide-${i}`);
    dot.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    if (i === 0) {
      dot.setAttribute('aria-current', 'true');
    }
    dotsEl.appendChild(dot);
  });

  // Next arrow
  const nextBtn = document.createElement('button');
  nextBtn.className = 'carousel-hero__arrow carousel-hero__arrow--next';
  nextBtn.setAttribute('aria-label', 'Next slide');
  nextBtn.setAttribute('aria-controls', 'carousel-slide-0');
  nextBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true" focusable="false">
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>`;

  controls.appendChild(prevBtn);
  controls.appendChild(dotsEl);
  controls.appendChild(nextBtn);
  heroEl.appendChild(controls);
}

/**
 * Attaches all event listeners for the carousel.
 *
 * Requirements satisfied:
 *  - 3.2  Mouse hover pauses auto-play
 *  - 3.3  Mouse leave resumes auto-play
 *  - 3.4  Keyboard focus on controls pauses auto-play
 *  - 3.5  Focus leaving all controls resumes auto-play
 *  - 4.1  Next arrow advances to next slide (with wrap)
 *  - 4.2  Prev arrow retreats to previous slide (with wrap)
 *  - 4.3  Dot click sets corresponding slide as active
 *  - 4.5  Right Arrow key advances to next slide
 *  - 4.6  Left Arrow key retreats to previous slide
 *  - 5.6  Carousel operable by keyboard alone
 *
 * @param {HTMLElement} heroEl  The hero section element containing all controls.
 */
function bindEvents(heroEl) {
  // --- Arrow buttons -------------------------------------------------------
  const prevBtn = heroEl.querySelector('.carousel-hero__arrow--prev');
  const nextBtn = heroEl.querySelector('.carousel-hero__arrow--next');

  prevBtn?.addEventListener('click', () => goTo(currentIndex - 1));  // Req 4.2
  nextBtn?.addEventListener('click', () => goTo(currentIndex + 1));  // Req 4.1

  // --- Dot buttons ---------------------------------------------------------
  const dotsContainer = heroEl.querySelector('.carousel-hero__dots');
  dotsContainer?.addEventListener('click', e => {
    const dot = e.target.closest('.carousel-hero__dot');
    if (!dot) return;
    const dots = Array.from(dotsContainer.querySelectorAll('.carousel-hero__dot'));
    const dotIndex = dots.indexOf(dot);
    if (dotIndex !== -1) goTo(dotIndex);                              // Req 4.3
  });

  // --- Keyboard navigation on the hero section -----------------------------
  // Req 4.5, 4.6: Right Arrow → next, Left Arrow → prev
  heroEl.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      goTo(currentIndex + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goTo(currentIndex - 1);
    }
  });

  // --- Hover: pause on mouseenter, resume on mouseleave -------------------
  heroEl.addEventListener('mouseenter', () => stopAutoPlay());       // Req 3.2
  heroEl.addEventListener('mouseleave', () => startAutoPlay());      // Req 3.3

  // --- Focus: pause when focus enters controls, resume when it leaves -----
  // We watch focusin/focusout on the controls container so that tabbing
  // through multiple controls (prev, dots, next) only pauses once and only
  // resumes after focus has left the controls section entirely.  Using
  // relatedTarget on focusout lets us distinguish "focus moved to another
  // control" from "focus left the controls altogether".              Req 3.4, 3.5
  const controlsEl = heroEl.querySelector('.carousel-hero__controls');
  if (controlsEl) {
    controlsEl.addEventListener('focusin', () => stopAutoPlay());

    controlsEl.addEventListener('focusout', e => {
      // relatedTarget is the element receiving focus; if it is still inside
      // the controls container, we are just moving between controls — keep
      // auto-play paused.  If it is outside (or null), focus has left all
      // controls and we can resume.
      if (!controlsEl.contains(e.relatedTarget)) {
        startAutoPlay();
      }
    });
  }
}

/**
 * Advances to slide `index` with circular wrap-around, updates the DOM and
 * all ARIA state, updates the live region, and resets the auto-play timer.
 *
 * Requirements satisfied:
 *  - 4.1  Next arrow wraps circularly (last → first)
 *  - 4.2  Prev arrow wraps circularly (first → last)
 *  - 4.3  Dot activation sets the correct active slide
 *  - 4.4  Navigation Dots reflect active slide via aria-current
 *  - 5.2  Live region announces new active slide heading
 *
 * @param {number} index  Target slide index (any integer; wrapped automatically)
 */
export function goTo(index) {
  if (!_heroEl) return;

  // --- 1. Circular wrap to [0, SLIDES.length - 1] --------------------------
  const next = ((index % SLIDES.length) + SLIDES.length) % SLIDES.length;

  // --- 2. Swap .is-active on slides ----------------------------------------
  const slides = _heroEl.querySelectorAll('.carousel-hero__slide');
  slides[currentIndex]?.classList.remove('is-active');
  slides[next]?.classList.add('is-active');

  // --- 3. Update dots: .is-active, aria-current, aria-selected -------------
  const dots = _heroEl.querySelectorAll('.carousel-hero__dot');
  dots.forEach((dot, i) => {
    const isActive = i === next;
    dot.classList.toggle('is-active', isActive);
    dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
    if (isActive) {
      dot.setAttribute('aria-current', 'true');
    } else {
      dot.removeAttribute('aria-current');
    }
  });

  // --- 4. Update aria-controls on both arrows ------------------------------
  const newSlideId = `carousel-slide-${next}`;
  const prevBtn = _heroEl.querySelector('.carousel-hero__arrow--prev');
  const nextBtn = _heroEl.querySelector('.carousel-hero__arrow--next');
  prevBtn?.setAttribute('aria-controls', newSlideId);
  nextBtn?.setAttribute('aria-controls', newSlideId);

  // --- 5. Update live region with the heading of the newly active slide ----
  const liveRegion = _heroEl.querySelector('#carousel-live');
  if (liveRegion) {
    const headingEl = slides[next]?.querySelector('h1, h2');
    liveRegion.textContent = headingEl ? headingEl.textContent : SLIDES[next].heading;
  }

  // --- 6. Reset auto-play timer so 5 s window restarts from this action ----
  stopAutoPlay();
  startAutoPlay();

  // --- 7. Persist the new index --------------------------------------------
  currentIndex = next;
}

/**
 * Starts the auto-play interval.
 *
 * Guards:
 *  - If `reducedMotion` is true, skip auto-play and apply the no-motion CSS
 *    class to `_heroEl` so CSS transitions are also disabled (Req 3.6, 5.7).
 *  - If `autoPlayTimer` is already set, the interval is already running; return
 *    early to avoid stacking duplicate intervals (Req 3.1).
 *
 * Requirements satisfied: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */
export function startAutoPlay() {
  if (reducedMotion) {
    // Req 3.6 / 5.7 — disable animations for reduced-motion users
    if (_heroEl) {
      _heroEl.classList.add('carousel-hero--no-motion');
    }
    return;
  }
  if (autoPlayTimer !== null) return;   // already running
  autoPlayTimer = setInterval(
    () => goTo((currentIndex + 1) % SLIDES.length),
    AUTOPLAY_INTERVAL
  );
}

/**
 * Clears the auto-play interval and resets the handle to null so that
 * subsequent calls to `startAutoPlay()` can start a fresh interval.
 *
 * Requirements satisfied: 3.2, 3.3, 3.4, 3.5
 */
export function stopAutoPlay() {
  clearInterval(autoPlayTimer);
  autoPlayTimer = null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialise the hero carousel.
 *
 * @param {string} [selector='.hero']  CSS selector for the hero section element.
 *
 * Requirements satisfied:
 *  - 1.6  Carousel Module loaded via <script type="module"> calling init()
 *  - 2.2  Hero section aria-label updated to "Service carousel"
 *  - 8.1  Named init() export
 *  - 8.4  Silently exits when hero section is absent
 */
export function init(selector = '.hero') {
  // Guard — hero section must exist on this page
  const heroEl = document.querySelector(selector);
  if (!heroEl) return;

  // Guard — already initialised (track element exists)
  if (heroEl.querySelector('.carousel-hero__track')) return;

  // Render, wire events, and start auto-play
  _heroEl = heroEl;
  renderCarousel(heroEl);
  bindEvents(heroEl);
  startAutoPlay();
}

// ---------------------------------------------------------------------------
// Exports for testing
// ---------------------------------------------------------------------------
export { SLIDES, currentIndex, autoPlayTimer, reducedMotion };
