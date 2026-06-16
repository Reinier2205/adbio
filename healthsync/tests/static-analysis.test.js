/**
 * static-analysis.test.js — Layer 1: Static HTML analysis
 * Run: node healthsync/tests/static-analysis.test.js
 *
 * Covers: Properties 2, 7, 8, 17, 18, 21, 22, 24, 25
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGES_DIR = resolve(__dirname, '..');

const PAGES = [
  'index.html', 'about.html', 'aesthetics.html', 'weight-loss.html',
  'iv-therapy.html', 'consultations.html', 'dispensary.html',
  'contact.html', 'privacy-policy.html'
];

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

function loadPage(filename) {
  const html = readFileSync(resolve(PAGES_DIR, filename), 'utf8');
  return new JSDOM(html, { url: `file://${PAGES_DIR}/${filename}` });
}

// ── Property 22: lang="en" and charset="UTF-8" on every page ────────────────

console.log('\n── Property 22: html lang and charset ──');
for (const page of PAGES) {
  const { window: { document } } = loadPage(page);
  assert(
    document.documentElement.getAttribute('lang') === 'en',
    `${page}: <html lang="en">`
  );
  const charset = document.querySelector('meta[charset]');
  assert(
    charset && charset.getAttribute('charset').toUpperCase() === 'UTF-8',
    `${page}: <meta charset="UTF-8">`
  );
}

// ── Property 21: title ≤60 chars, description 50–160 chars, unique, location keyword ──

console.log('\n── Property 21: per-page meta constraints ──');
const titles = [];
const descriptions = [];
for (const page of PAGES) {
  const { window: { document } } = loadPage(page);
  const title = document.title;
  const descMeta = document.querySelector('meta[name="description"]');
  const desc = descMeta ? descMeta.getAttribute('content') : '';

  assert(title.length <= 60, `${page}: title ≤60 chars (${title.length}): "${title}"`);
  assert(desc.length >= 50 && desc.length <= 160, `${page}: description 50–160 chars (${desc.length})`);
  assert(
    /centurion|irene|gauteng/i.test(title + desc),
    `${page}: title or description contains location keyword`
  );

  titles.push(title);
  descriptions.push(desc);
}
// Uniqueness
assert(new Set(titles).size === titles.length, 'All page titles are unique');
assert(new Set(descriptions).size === descriptions.length, 'All page descriptions are unique');

// ── Property 2: image hygiene ───────────────────────────────────────────────

console.log('\n── Property 2: image hygiene ──');
for (const page of PAGES) {
  const { window: { document } } = loadPage(page);
  const imgs = Array.from(document.querySelectorAll('img'));

  for (const img of imgs) {
    const alt = img.getAttribute('alt');
    const src = img.getAttribute('src') || '';
    const isDecorative = alt === '';
    const isLogo = src.includes('logo');

    // Non-decorative images must have non-empty alt
    if (!isDecorative) {
      assert(
        typeof alt === 'string' && alt.trim().length > 0,
        `${page}: <img src="${src.slice(0, 40)}"> has non-empty alt`
      );
    }

    // Below-fold images (not hero, not logo) must have loading="lazy"
    const isHero = img.closest('.hero') !== null;
    if (!isHero && !isLogo) {
      assert(
        img.getAttribute('loading') === 'lazy',
        `${page}: below-fold <img src="${src.slice(0, 40)}"> has loading="lazy"`
      );
    }
  }

  // Every <picture> with a content image should have a webp <source>
  const pictures = Array.from(document.querySelectorAll('picture'));
  for (const pic of pictures) {
    const webpSource = pic.querySelector('source[type="image/webp"]');
    assert(
      webpSource !== null,
      `${page}: <picture> has <source type="image/webp">`
    );
  }
}

// ── Property 7: no prohibited promotional terms ─────────────────────────────

console.log('\n── Property 7: no prohibited promotional terms ──');
const PROHIBITED = [
  /\bspecials\b/i, /\bdiscounts?\b/i, /\bdeals?\b/i, /\bBOGO\b/i,
  /buy one get one/i, /\bsale\b/i, /\b\d+%\s*off\b/i,
  /limited offer/i, /\bsave \$?\d/i
];

for (const page of PAGES) {
  const { window: { document } } = loadPage(page);
  // Get all visible text nodes (exclude script/style)
  const walker = document.createTreeWalker(
    document.body,
    0x1, // NodeFilter.SHOW_TEXT = 4, but jsdom uses numeric
    { acceptNode: n => {
      const p = n.parentElement?.tagName;
      return (p === 'SCRIPT' || p === 'STYLE') ? 2 : 1; // FILTER_REJECT : FILTER_ACCEPT
    }}
  );
  let text = '';
  let node;
  while ((node = walker.nextNode())) text += node.nodeValue + ' ';

  for (const pattern of PROHIBITED) {
    assert(!pattern.test(text), `${page}: no "${pattern.source}" in visible text`);
  }
}

// ── Property 8: no guaranteed outcome language ──────────────────────────────

console.log('\n── Property 8: no guaranteed outcome language ──');
const OUTCOME_PATTERNS = [
  /guaranteed?\s+result/i, /guaranteed?\s+outcome/i,
  /guaranteed?\s+improvement/i, /you will lose/i,
  /will definitely lose/i, /100%\s+results/i
];

for (const page of PAGES) {
  const { window: { document } } = loadPage(page);
  const text = document.body?.textContent || '';
  for (const pattern of OUTCOME_PATTERNS) {
    assert(!pattern.test(text), `${page}: no guaranteed outcome language ("${pattern.source}")`);
  }
}

// ── Property 18: cybersecurity disclaimer on about.html and consultations.html

console.log('\n── Property 18: cybersecurity disclaimer ──');
const DISCLAIMER = 'The doctor will never ask for payment before a consultation';
for (const page of ['about.html', 'consultations.html']) {
  const { window: { document } } = loadPage(page);
  const text = document.body?.textContent || '';
  assert(text.includes(DISCLAIMER), `${page}: cybersecurity disclaimer present`);
}

// ── Property 17: Privacy Policy link in every footer ────────────────────────

console.log('\n── Property 17: Privacy Policy link in footer ──');
for (const page of PAGES) {
  const { window: { document } } = loadPage(page);
  const footer = document.querySelector('footer');
  const link = footer?.querySelector('a[href="privacy-policy.html"]');
  assert(link !== null, `${page}: footer has <a href="privacy-policy.html">`);
}

// ── Property 24: heading hierarchy (no skipped levels, exactly one h1) ──────

console.log('\n── Property 24: heading hierarchy ──');
for (const page of PAGES) {
  const { window: { document } } = loadPage(page);
  const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6'));

  const h1s = headings.filter(h => h.tagName === 'H1');
  assert(h1s.length === 1, `${page}: exactly one <h1> (found ${h1s.length})`);

  // Check no level is skipped
  let prevLevel = 0;
  let ok = true;
  for (const h of headings) {
    const level = parseInt(h.tagName[1]);
    if (level > prevLevel + 1 && prevLevel !== 0) {
      assert(false, `${page}: heading skips from h${prevLevel} to h${level} ("${h.textContent.trim().slice(0, 40)}")`);
      ok = false;
    }
    prevLevel = level;
  }
  if (ok) assert(true, `${page}: no skipped heading levels`);
}

// ── Property 25: all form inputs have matching <label for="..."> ─────────────

console.log('\n── Property 25: form labels ──');
for (const page of PAGES) {
  const { window: { document } } = loadPage(page);
  const fields = Array.from(document.querySelectorAll('input[id], select[id], textarea[id]'));

  for (const field of fields) {
    const id = field.getAttribute('id');
    const label = document.querySelector(`label[for="${id}"]`);
    assert(label !== null, `${page}: <label for="${id}"> exists for <${field.tagName.toLowerCase()} id="${id}">`);
  }
}

// ── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(50)}`);
console.log(`Static Analysis: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
