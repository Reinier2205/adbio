/**
 * carousel.test.js — Carousel renderCarousel() and goTo() verification
 * Run: node --experimental-vm-modules healthsync/tests/carousel.test.js
 *
 * Covers correctness of Task 2.1 (renderCarousel) and Task 3.1 (goTo).
 * Verifies Properties 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 from design.md.
 */

import { JSDOM } from 'jsdom';

// ── Setup globals BEFORE the carousel module is evaluated ─────────────────────
// The carousel module reads window.matchMedia at parse time (module-level code),
// so we must establish global.window before the static import is resolved.
// We do this by assigning to globalThis before any import runs.

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost/',
});

// Patch globalThis so that hero-carousel.js sees window / matchMedia
globalThis.window = dom.window;
globalThis.document = dom.window.document;

// jsdom doesn't implement matchMedia — provide a minimal stub
if (!dom.window.matchMedia) {
  dom.window.matchMedia = () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
}
globalThis.matchMedia = dom.window.matchMedia;

// Import the carousel module (ES module)
// NOTE: static imports are hoisted, but globalThis assignments above run first
// in Node.js because the module loader evaluates the graph after the top-level
// script body starts. However, to be safe we use a dynamic import so that
// globalThis is definitely patched before the module evaluates.
const { SLIDES, init, goTo } = await import('../js/hero-carousel.js');

// ── Test harness ─────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

function runTest(label, fn) {
  try {
    fn();
  } catch (e) {
    console.error(`  ❌ FAIL: ${label}\n     ${e.message}`);
    failed++;
  }
}

// ── Helper: create a fresh hero section and run init() ───────────────────────

function makeHero() {
  const section = dom.window.document.createElement('section');
  section.className = 'hero section';
  section.setAttribute('aria-label', 'Hero');
  dom.window.document.body.appendChild(section);
  return section;
}

// Create one hero and initialise the carousel
const heroEl = makeHero();
init('.hero');   // selector matches the first .hero we appended

// ── Property 1: Slide Count and Order Invariant ──────────────────────────────

console.log('\n── Property 1: Slide count and order ──');
runTest('Property 1', () => {
  const slides = heroEl.querySelectorAll('.carousel-hero__slide');
  assert(slides.length === 5, `Exactly 5 slides rendered (found ${slides.length})`);

  const expectedOrder = ['Aesthetics', 'Weight Loss', 'IV Therapy', 'Consultations', 'Dispensary'];
  slides.forEach((slide, i) => {
    const heading = slide.querySelector('h1, h2');
    // Slide 0 heading is the full site headline, not just "Aesthetics"
    const text = heading ? heading.textContent.trim() : '';
    if (i === 0) {
      assert(text.includes('Integrated Wellness'), `Slide 0 heading is the site headline`);
    } else {
      assert(text === expectedOrder[i], `Slide ${i} heading is "${expectedOrder[i]}" (got "${text}")`);
    }
    // aria-label encodes the service name
    const label = slide.getAttribute('aria-label');
    assert(
      label === `${i + 1} of 5: ${SLIDES[i].heading}`,
      `Slide ${i} aria-label = "${i + 1} of 5: ${SLIDES[i].heading}"`
    );
  });
});

// ── Property 2: Slide Structure — Image and Overlay ─────────────────────────

console.log('\n── Property 2: Image and overlay structure ──');
runTest('Property 2', () => {
  const slides = heroEl.querySelectorAll('.carousel-hero__slide');
  slides.forEach((slide, i) => {
    const img = slide.querySelector('img.carousel-hero__img');
    assert(img !== null, `Slide ${i} has <img class="carousel-hero__img">`);
    assert(
      img && img.src.includes('picsum.photos'),
      `Slide ${i} image src is a Picsum URL`
    );
    const overlay = slide.querySelector('.carousel-hero__overlay');
    assert(overlay !== null, `Slide ${i} has overlay element`);
    assert(
      overlay && overlay.getAttribute('aria-hidden') === 'true',
      `Slide ${i} overlay has aria-hidden="true"`
    );
  });
});

// ── Property 3: Heading Element by Slide Index ───────────────────────────────

console.log('\n── Property 3: Heading element by slide index ──');
runTest('Property 3', () => {
  const slides = heroEl.querySelectorAll('.carousel-hero__slide');
  const h1 = slides[0].querySelector('h1');
  assert(h1 !== null, `Slide 0 uses <h1>`);
  assert(slides[0].querySelector('h2') === null, `Slide 0 does NOT use <h2>`);

  for (let i = 1; i < 5; i++) {
    const h2 = slides[i].querySelector('h2');
    assert(h2 !== null, `Slide ${i} uses <h2>`);
    assert(slides[i].querySelector('h1') === null, `Slide ${i} does NOT use <h1>`);
  }
});

// ── Property 4: Tagline Word Count ───────────────────────────────────────────

console.log('\n── Property 4: Tagline word count ──');
runTest('Property 4', () => {
  for (const slide of SLIDES) {
    const words = slide.tagline.trim().split(/\s+/).length;
    assert(words <= 15, `"${slide.id}" tagline has ${words} words (≤15 required)`);
  }
});

// ── Property 5: CTA Button Destination and Class ─────────────────────────────

console.log('\n── Property 5: CTA button href and class ──');
runTest('Property 5', () => {
  const expectedHrefs = [
    'aesthetics.html', 'weight-loss.html', 'iv-therapy.html',
    'consultations.html', 'dispensary.html',
  ];
  const slides = heroEl.querySelectorAll('.carousel-hero__slide');
  slides.forEach((slide, i) => {
    const cta = slide.querySelector('a.btn-primary');
    assert(cta !== null, `Slide ${i} has a.btn-primary CTA`);
    // jsdom resolves href to absolute; check it ends with the expected page
    const href = cta ? cta.getAttribute('href') : '';
    assert(
      href === expectedHrefs[i],
      `Slide ${i} CTA href="${expectedHrefs[i]}" (got "${href}")`
    );
  });
});

// ── Property 11: Slide Image Alt Attributes ───────────────────────────────────

console.log('\n── Property 11: Image alt attributes ──');
runTest('Property 11', () => {
  const slides = heroEl.querySelectorAll('.carousel-hero__slide');
  const serviceNames = ['Aesthetics', 'Weight', 'IV', 'consultation', 'Dispensary'];
  slides.forEach((slide, i) => {
    const img = slide.querySelector('img');
    const alt = img ? img.getAttribute('alt') : '';
    assert(alt && alt.trim().length > 0, `Slide ${i} image has non-empty alt`);
    assert(
      alt && alt.toLowerCase().includes(serviceNames[i].toLowerCase()),
      `Slide ${i} alt references the service ("${serviceNames[i]}"): "${alt}"`
    );
  });
});

// ── Property 12: Lazy Loading for Non-First Slides ───────────────────────────

console.log('\n── Property 12: Lazy loading ──');
runTest('Property 12', () => {
  const slides = heroEl.querySelectorAll('.carousel-hero__slide');
  const img0 = slides[0].querySelector('img');
  // jsdom reflects img.loading as a DOM property; getAttribute('loading') returns null
  // in jsdom because the 'loading' IDL attribute is not reflected back to the content
  // attribute. Use the .loading property instead.
  assert(img0?.loading === 'eager', `Slide 0 image loading="eager" (.loading="${img0?.loading}")`);
  assert(img0?.getAttribute('fetchpriority') === 'high', `Slide 0 image fetchpriority="high"`);

  for (let i = 1; i < 5; i++) {
    const img = slides[i].querySelector('img');
    assert(img?.loading === 'lazy', `Slide ${i} image loading="lazy" (.loading="${img?.loading}")`);
  }
});

// ── ARIA structure ────────────────────────────────────────────────────────────

console.log('\n── ARIA structure ──');
runTest('ARIA: carousel region', () => {
  assert(heroEl.getAttribute('aria-roledescription') === 'carousel', `hero has aria-roledescription="carousel"`);
  assert(heroEl.getAttribute('aria-label') === 'Service carousel', `hero aria-label="Service carousel"`);
});

runTest('ARIA: live region', () => {
  const live = heroEl.querySelector('#carousel-live');
  assert(live !== null, `Live region #carousel-live exists`);
  assert(live?.getAttribute('aria-live') === 'polite', `aria-live="polite"`);
  assert(live?.getAttribute('aria-atomic') === 'true', `aria-atomic="true"`);
});

runTest('ARIA: arrow labels', () => {
  const prev = heroEl.querySelector('.carousel-hero__arrow--prev');
  const next = heroEl.querySelector('.carousel-hero__arrow--next');
  assert(prev?.getAttribute('aria-label') === 'Previous slide', `prev arrow aria-label`);
  assert(next?.getAttribute('aria-label') === 'Next slide', `next arrow aria-label`);
});

runTest('ARIA: dots tablist', () => {
  const dots = heroEl.querySelectorAll('.carousel-hero__dot');
  assert(dots.length === 5, `5 navigation dots rendered`);
  assert(
    heroEl.querySelector('.carousel-hero__dots')?.getAttribute('role') === 'tablist',
    `dots wrapper role="tablist"`
  );
  // Initial state: dot 0 is active
  assert(dots[0].classList.contains('is-active'), `Dot 0 initially has is-active`);
  assert(dots[0].getAttribute('aria-current') === 'true', `Dot 0 initially aria-current="true"`);
  assert(dots[0].getAttribute('aria-selected') === 'true', `Dot 0 initially aria-selected="true"`);
  for (let i = 1; i < 5; i++) {
    assert(!dots[i].classList.contains('is-active'), `Dot ${i} initially not active`);
    assert(dots[i].getAttribute('aria-current') === null, `Dot ${i} initially no aria-current`);
  }
});

// ── Initial state: slide 0 is-active ─────────────────────────────────────────

console.log('\n── Initial state ──');
runTest('Initial active slide', () => {
  const slides = heroEl.querySelectorAll('.carousel-hero__slide');
  assert(slides[0].classList.contains('is-active'), `Slide 0 initially has is-active`);
  for (let i = 1; i < 5; i++) {
    assert(!slides[i].classList.contains('is-active'), `Slide ${i} initially not active`);
  }
});

// ── Property 6: Next Navigation Wraps Circularly ─────────────────────────────

console.log('\n── Property 6: Next circular wrap ──');
runTest('Property 6', () => {
  const slides = heroEl.querySelectorAll('.carousel-hero__slide');

  // From each starting index, advance 5 times → should return to start
  for (let start = 0; start < 5; start++) {
    goTo(start);  // set starting position
    for (let step = 0; step < 5; step++) {
      const currentActive = Array.from(slides).findIndex(s => s.classList.contains('is-active'));
      goTo(currentActive + 1);
    }
    const finalActive = Array.from(slides).findIndex(s => s.classList.contains('is-active'));
    assert(finalActive === start, `Starting at ${start}: after 5 next-advances, back to ${start} (got ${finalActive})`);
  }
});

// ── Property 7: Prev Navigation Wraps Circularly ─────────────────────────────

console.log('\n── Property 7: Prev circular wrap ──');
runTest('Property 7', () => {
  const slides = heroEl.querySelectorAll('.carousel-hero__slide');

  for (let start = 0; start < 5; start++) {
    goTo(start);
    for (let step = 0; step < 5; step++) {
      const currentActive = Array.from(slides).findIndex(s => s.classList.contains('is-active'));
      goTo(currentActive - 1);
    }
    const finalActive = Array.from(slides).findIndex(s => s.classList.contains('is-active'));
    assert(finalActive === start, `Starting at ${start}: after 5 prev-retreats, back to ${start} (got ${finalActive})`);
  }
});

// ── Property 8: Dot Activation Sets Active Slide ─────────────────────────────

console.log('\n── Property 8: Dot activation ──');
runTest('Property 8', () => {
  const slides = heroEl.querySelectorAll('.carousel-hero__slide');

  for (let target = 0; target < 5; target++) {
    goTo(target);
    const activeSlides = Array.from(slides).filter(s => s.classList.contains('is-active'));
    assert(activeSlides.length === 1, `After goTo(${target}): exactly 1 slide is active (found ${activeSlides.length})`);
    assert(
      slides[target].classList.contains('is-active'),
      `After goTo(${target}): slide ${target} is the active one`
    );
    for (let i = 0; i < 5; i++) {
      if (i !== target) {
        assert(
          !slides[i].classList.contains('is-active'),
          `After goTo(${target}): slide ${i} is NOT active`
        );
      }
    }
  }
});

// ── Property 9: Active Dot ARIA State Exclusivity ────────────────────────────

console.log('\n── Property 9: Active dot ARIA exclusivity ──');
runTest('Property 9', () => {
  const dots = heroEl.querySelectorAll('.carousel-hero__dot');

  for (let target = 0; target < 5; target++) {
    goTo(target);
    const currentDots = Array.from(heroEl.querySelectorAll('.carousel-hero__dot'));
    const withCurrent = currentDots.filter(d => d.getAttribute('aria-current') === 'true');
    assert(withCurrent.length === 1, `After goTo(${target}): exactly 1 dot has aria-current="true" (found ${withCurrent.length})`);
    assert(
      currentDots[target].getAttribute('aria-current') === 'true',
      `After goTo(${target}): dot ${target} has aria-current="true"`
    );
    for (let i = 0; i < 5; i++) {
      if (i !== target) {
        assert(
          currentDots[i].getAttribute('aria-current') === null,
          `After goTo(${target}): dot ${i} does NOT have aria-current`
        );
      }
    }
  }
});

// ── Property 10: Live Region Updates on Slide Change ─────────────────────────

console.log('\n── Property 10: Live region update ──');
runTest('Property 10', () => {
  const liveRegion = heroEl.querySelector('#carousel-live');
  const slides = heroEl.querySelectorAll('.carousel-hero__slide');

  for (let target = 0; target < 5; target++) {
    goTo(target);
    const headingEl = slides[target].querySelector('h1, h2');
    const expectedText = headingEl ? headingEl.textContent.trim() : SLIDES[target].heading;
    const actualText = liveRegion ? liveRegion.textContent.trim() : '';
    assert(
      actualText === expectedText,
      `After goTo(${target}): live region = "${expectedText}" (got "${actualText}")`
    );
  }
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(50)}`);
console.log(`Carousel Tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
