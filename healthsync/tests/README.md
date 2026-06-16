# Health Synchrony — Test Suite

Four test layers covering static analysis, JS module logic, SEO/schema validation, and browser rendering.

---

## Prerequisites

```bash
# From repo root
npm install
```

For browser tests (Layer 3), also install Playwright:

```bash
npm install --save-dev @playwright/test
npx playwright install --with-deps chromium
```

---

## Running Tests

| Layer | Command | What it checks |
|-------|---------|----------------|
| 1 — Static analysis | `npm run test:static` | Image hygiene, HPCSA compliance, WCAG structure, Privacy Policy links, meta constraints |
| 2 — Module unit + property | `npm run test:modules` | JS module logic via fast-check property tests (200 runs each) |
| 3 — Browser rendering | `npm run test:browser` | Viewport overflow, touch targets, video placeholder, Sticky CTA, slider transition |
| 4 — SEO & schema | `npm run test:seo` | JSON-LD schema validity, per-page title/description, lang/charset |
| All (excl. browser) | `npm test` | Layers 1, 4, 2 in sequence |

---

## Test Files

- `static-analysis.test.js` — Layer 1 (Node.js + jsdom)
- `modules.test.js` — Layer 2 (Node.js + fast-check)
- `browser.test.js` — Layer 3 (Playwright)
- `seo-validation.test.js` — Layer 4 (Node.js + jsdom)

---

## Property Index

| Property | File | Description |
|----------|------|-------------|
| 1 | modules.test.js | Sticky CTA routing correctness |
| 2 | static-analysis.test.js | Comprehensive image hygiene |
| 3 | modules.test.js | Booking widget fallback invariant |
| 4 | modules.test.js | Review widget fallback invariant |
| 5 | modules.test.js | Treatment quiz recommendation completeness |
| 7 | static-analysis.test.js | No prohibited promotional terms |
| 8 | static-analysis.test.js | No guaranteed outcome language |
| 9 | modules.test.js | Journey map step count and description length |
| 10 | modules.test.js | IV card collection and structure |
| 11 | modules.test.js | Contact form validators accept/reject |
| 12 | modules.test.js | Form validation error and value retention |
| 13 | modules.test.js | FAQ response length ≤500 chars |
| 14 | modules.test.js | Unmatched FAQ produces null |
| 15 | modules.test.js | HPCSA content filter correctness |
| 16 | modules.test.js | POPIA consent logic |
| 17 | static-analysis.test.js | Privacy Policy link in every footer |
| 18 | static-analysis.test.js | Cybersecurity disclaimer on required pages |
| 21 | seo-validation.test.js | Per-page meta title and description constraints |
| 22 | seo-validation.test.js | html lang and charset on every page |
| 23 | modules.test.js | Review widget rating display rule |
| 24 | static-analysis.test.js | Heading hierarchy on every page |
| 25 | static-analysis.test.js | Form inputs associated with labels |
| 26 | modules.test.js | Before/After Slider ARIA and transition |
