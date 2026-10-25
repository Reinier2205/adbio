# Storage Investigation Report — Portfolio Pulse

## Summary Answer

The app is a **100% client-side SPA** (Vite + vanilla JS). There is no backend, no API, no server. All persistence is in two `localStorage` keys. Migrating to Cloudflare D1 (SQLite) via a Cloudflare Worker means adding an entirely new backend layer: a Worker that exposes a REST API backed by D1, plus updating the client to call that API instead of reading/writing `localStorage`.

---

## 1. localStorage Keys and Data Shapes

### Key 1: `portfolio-pulse-v1` (STORAGE_KEY)

**Written by:** `saveRecords()` → `localStorage.setItem(STORAGE_KEY, JSON.stringify(records))`  
**Read by:** `loadRecords()` → `JSON.parse(localStorage.getItem(STORAGE_KEY))`

Source: `src/main.js` lines 6, 35–37

**Shape — array of "record" objects:**

```json
[
  {
    "date": "2026-07-10",
    "total": 11084990.03,
    "funds": [
      { "name": "Living Annuity",                  "code": "AGLA1133029", "value": 9285784.84  },
      { "name": "Investment Platform Unit Trust",   "code": "AGLP1134728", "value": 1540739.04 },
      { "name": "Tax-Free Investment",              "code": "AGTF1219326", "value": 258466.15  }
    ]
  }
]
```

Field types:
| Field | Type | Description |
|---|---|---|
| `date` | `string` (ISO 8601, `YYYY-MM-DD`) | Statement date |
| `total` | `number` (float) | Total portfolio value in ZAR |
| `funds` | `array` | One entry per fund |
| `funds[].name` | `string` | Human-readable fund name |
| `funds[].code` | `string` | Account code (e.g. `AGLA1133029`), may be empty string |
| `funds[].value` | `number` (float) | Fund value in ZAR |

**Seed data** (used when key is absent or empty): one record dated `2026-07-10`, 3 funds, total `R 11,084,990.03` (source: `main.js` lines 8–16).

---

### Key 2: `portfolio-pulse-range` (RANGE_KEY)

**Written by:** `localStorage.setItem(RANGE_KEY, range)` on tab click  
**Read by:** `localStorage.getItem(RANGE_KEY)` at startup

Source: `src/main.js` lines 7, 41

**Shape:** a plain string, one of `'4w'`, `'12m'`, or `'yearly'`.  
Default: `'4w'`.

This is a **UI preference only** (chart time-range selector). It has no financial data. It does not need to go into D1; it can stay in localStorage or be dropped.

---

## 2. Full App Architecture

### Tech stack
- **Build tool:** Vite 6 (`npm run dev` / `npm run build`)
- **Runtime:** vanilla JS module — single file `src/main.js` (~350 lines)
- **Dependencies:** Chart.js 4 (charts), Lucide (icons), Tesseract.js 6 (OCR)
- **No framework** — no React, Vue, Angular, etc.
- **No backend** — no Express, no Worker, no API
- **Deployed to:** Cloudflare Pages (static files only)

### Data flow (current)

```
User uploads screenshot
  → Tesseract.js (OCR, runs entirely in-browser WebWorker)
  → parseScreenshot() extracts date / total / fund values
  → populateReview() fills the review form
  → saveRecord() writes to localStorage['portfolio-pulse-v1']
  → render() reads from the in-memory `records` array to draw UI
```

On page load: `loadRecords()` reads `localStorage['portfolio-pulse-v1']` into the module-level `let records` array. All reads thereafter use the in-memory array; writes go to both the array and localStorage.

### Features
| Feature | Where |
|---|---|
| Dashboard overview (total balance, delta, fund table) | `render()` |
| Performance chart (line) + allocation chart (donut) | `renderCharts()` |
| Screenshot upload + OCR auto-fill | `handleImage()`, `parseScreenshot()`, `populateReview()` |
| Paste screenshot from clipboard | `#pasteBtn` handler |
| Manual record entry / edit | `#recordForm` submit → `saveRecord()` |
| Range selector (4w / 12m / yearly) | `[data-range]` buttons |
| Export backup (JSON download) | `exportData()` |
| Import backup (JSON upload) | `importData()` |
| Reset to seed data | `resetData()` |

### Entry points
- `index.html` → loads `src/main.js` as an ES module
- `src/main.js` → imports CSS + chart.js + lucide + tesseract.js; renders everything into `<div id="app">`

### Public assets
```
public/
  tessdata/eng.traineddata.gz    # Tesseract English language model
  tesseract/worker.min.js        # Tesseract in-browser worker
  tesseract-core/tesseract-core-simd-lstm.wasm(.js)  # WASM runtime
  README.txt                     # Deploy instructions
  _headers                       # Cloudflare Pages security headers
```

### Content Security Policy
The `_headers` file restricts `connect-src 'self'`. Any Worker API must be hosted on the **same origin** (a Pages Function) or the CSP `connect-src` directive must be extended to allow the Worker's domain.

---

## 3. Existing Backend / API Layer

**There is none.** The `portfolio-pulse-cloudflare` directory is a Vite build output (static bundle: `assets/index-BetHZ6fp.js` at 252 KB, a CSS file). It is deployed as a Cloudflare Pages **static site**. No Workers, no D1 binding, no KV, no API routes.

---

## 4. What Is Needed to Migrate to Cloudflare D1

### Database schema (D1 / SQLite)

```sql
CREATE TABLE records (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  date     TEXT NOT NULL UNIQUE,   -- 'YYYY-MM-DD'
  total    REAL NOT NULL
);

CREATE TABLE fund_values (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  record_id INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  code      TEXT NOT NULL DEFAULT '',
  value     REAL NOT NULL
);
```

One row per weekly snapshot in `records`; one row per fund per snapshot in `fund_values`. The `date` column has a UNIQUE constraint to enforce the "one record per date" rule currently managed by `records.findIndex(r => r.date === date)` in `saveRecord()`.

The `portfolio-pulse-range` preference does **not** need a table.

---

### Cloudflare Worker API (Pages Functions or standalone Worker)

The simplest approach is **Cloudflare Pages Functions** (files under `functions/`) so the API lives on the same origin as the SPA and no CSP changes are needed.

Required endpoints:

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/records` | Return all records as JSON array (same shape as localStorage value) |
| `POST` | `/api/records` | Create or replace a record for a given date |
| `DELETE` | `/api/records/:date` | Delete a record by date |

The response JSON shape for `GET /api/records` must match the existing `records` array shape the UI already consumes:

```json
[
  {
    "date": "2026-07-10",
    "total": 11084990.03,
    "funds": [
      { "name": "Living Annuity", "code": "AGLA1133029", "value": 9285784.84 }
    ]
  }
]
```

This means the Worker must JOIN `records` and `fund_values`, then group them in JavaScript before returning.

---

### Client-side changes required (`src/main.js`)

1. **Remove** `loadRecords()` and `saveRecords()` (and all `localStorage.getItem/setItem` calls for `STORAGE_KEY`).
2. **Replace** with async `fetchRecords()` → `GET /api/records` and `pushRecord(record)` → `POST /api/records`.
3. **Make `render()` async** (or restructure): the app currently calls `render()` synchronously at startup. It must await the initial `fetchRecords()` call.
4. **Update `saveRecord()`** to `await pushRecord(record)` and then call `render()`.
5. **Update `resetData()`** to delete all server records and re-seed via the API (or call a `DELETE /api/records` bulk endpoint).
6. **Update `importData()`** to POST each record to the API.
7. **Keep** `portfolio-pulse-range` in localStorage — it is a UI preference, not financial data.
8. **Add error handling** for network failures (toast message already exists as `showToast()`).
9. **Authentication**: the Worker currently has no auth. Since D1 data would be shared across all users/browsers, access control (at minimum a static bearer token or Cloudflare Access) must be added before deploying. This is a new requirement with no equivalent in the current app.

---

## 5. Conclusions and Recommendations

1. **Scope is moderate.** The core data model is simple (two tables). The main work is adding the Worker + D1 layer and making the JS client async.

2. **Keep the CSP tight.** Use Pages Functions (`/functions/api/`) so the API is same-origin. Avoid a separate `*.workers.dev` URL — it would require relaxing `connect-src`.

3. **Authentication is critical.** Once data lives in D1 (server-side), any browser that knows the URL can read or delete all records. Add Cloudflare Access (zero-config SSO gate) or a static pre-shared token in an `Authorization` header before going live.

4. **Preserve the export/import features.** They are still useful as cross-device backup even with server storage.

5. **The OCR pipeline is unaffected.** Tesseract.js runs fully in-browser and produces the parsed record object. Only the final `saveRecord()` call changes — instead of writing to localStorage it will POST to the Worker.

6. **Seed data handling.** The current seed is in the JS source. After migration, the seed should be inserted via a D1 migration SQL file (or the Worker can detect an empty table and insert it on first `GET /api/records`).

7. **No test infrastructure exists** in the source repo. The Worker should be tested with Vitest + `@cloudflare/vitest-pool-workers` before deploying.
