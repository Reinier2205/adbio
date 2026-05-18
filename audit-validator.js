#!/usr/bin/env node
/**
 * audit-validator.js
 * Validates a Travel Games HTML file against the master skill standards.
 * Usage: node audit-validator.js <path-to-html-file>
 */

const fs = require('fs');
const path = require('path');

// ── Colours ──────────────────────────────────────────────────────────────────
const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BOLD   = '\x1b[1m';
const RESET  = '\x1b[0m';

const PASS = `${GREEN}[✓]${RESET}`;
const FAIL = `${RED}[✗]${RESET}`;

// ── Argument handling ─────────────────────────────────────────────────────────
const [,, targetArg] = process.argv;

if (!targetArg) {
  console.error(`${RED}Usage: node audit-validator.js <path-to-html-file>${RESET}`);
  process.exit(1);
}

const filePath = path.resolve(targetArg);

if (!fs.existsSync(filePath)) {
  console.error(`${RED}File not found: ${filePath}${RESET}`);
  process.exit(1);
}

const html = fs.readFileSync(filePath, 'utf8');

// ── Helpers ───────────────────────────────────────────────────────────────────
/**
 * @param {string} label      - Display label for the check
 * @param {boolean} passed    - Whether the assertion passed
 * @param {string} [detail]   - Optional detail shown on failure
 * @returns {boolean} passed
 */
function assert(label, passed, detail) {
  if (passed) {
    console.log(`  ${PASS} ${label}`);
  } else {
    console.log(`  ${FAIL} ${BOLD}${label}${RESET}${detail ? `\n       ${RED}→ ${detail}${RESET}` : ''}`);
  }
  return passed;
}

// ── Checks ────────────────────────────────────────────────────────────────────
let failures = 0;

console.log(`\n${BOLD}Travel Games — Audit Validator${RESET}`);
console.log(`${YELLOW}File:${RESET} ${filePath}\n`);

// §1 — Navigation Buttons
console.log(`${BOLD}§1 Navigation Buttons${RESET}`);
if (!assert('Home button present (class="nav-btn home-btn")',
  html.includes('class="nav-btn home-btn"'),
  'Add <button class="nav-btn home-btn"> linking to /TravelGames/index.html'
)) failures++;

if (!assert('Home button links to /TravelGames/index.html',
  html.includes("location.href='/TravelGames/index.html'") ||
  html.includes('location.href="/TravelGames/index.html"'),
  "onclick must contain location.href='/TravelGames/index.html'"
)) failures++;

if (!assert('Help button present (class="nav-btn help-btn")',
  html.includes('class="nav-btn help-btn"'),
  'Add <button class="nav-btn help-btn"> that opens #help-modal'
)) failures++;

if (!assert('Help button opens #help-modal',
  html.includes("'help-modal'") || html.includes('"help-modal"'),
  "onclick must reference document.getElementById('help-modal')"
)) failures++;

// §2 — CSS Variables
console.log(`\n${BOLD}§2 CSS Variables (Casino Palette)${RESET}`);
const cssVars = ['--felt-green', '--dark-wood', '--gold', '--teal', '--maroon'];
for (const v of cssVars) {
  if (!assert(`CSS variable ${v} declared`, html.includes(v),
    `Add ${v} to :root { }`
  )) failures++;
}

// §2 — Google Fonts
console.log(`\n${BOLD}§2 Typography — Google Fonts${RESET}`);
const fontsUrl = 'fonts.googleapis.com/css2';
if (!assert('Google Fonts link tag present', html.includes(fontsUrl),
  'Add <link href="https://fonts.googleapis.com/css2?family=Cinzel..."> to <head>'
)) failures++;

for (const font of ['Cinzel', 'Lato', 'Inter']) {
  if (!assert(`Font '${font}' included in Google Fonts link`,
    html.includes(font),
    `Add family=${font} to the Google Fonts URL`
  )) failures++;
}

// §2 — Casino Table
console.log(`\n${BOLD}§2 Casino Table Container${RESET}`);
if (!assert('.casino-table container present',
  html.includes('casino-table'),
  'Wrap game content in <div class="casino-table">'
)) failures++;

// §5 — PeerJS (conditional — only checked when a multiplayer JS file is imported)
console.log(`\n${BOLD}§5 Multiplayer — PeerJS (conditional)${RESET}`);
const multiplayerPattern = /src=["'][^"']*multiplayer[^"']*\.js["']/i;
const hasMultiplayerScript = multiplayerPattern.test(html);

if (hasMultiplayerScript) {
  if (!assert('PeerJS 1.5.4 CDN script tag present',
    html.includes('peerjs@1.5.4') || html.includes('peerjs.min.js'),
    'Add <script src="https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js"></script> before the multiplayer script'
  )) failures++;
} else {
  console.log(`  ${YELLOW}[–]${RESET} PeerJS check skipped — no multiplayer JS import detected`);
}

// ── Summary ───────────────────────────────────────────────────────────────────
// nav(4) + vars(5) + fonts(4) + table(1) + peerjs(0|1)
const total   = 14 + (hasMultiplayerScript ? 1 : 0);
const passing = total - failures;

console.log('\n' + '─'.repeat(50));
if (failures === 0) {
  console.log(`${GREEN}${BOLD}All checks passed (${passing}/${total})${RESET} — file meets master skill standards.\n`);
} else {
  console.log(`${RED}${BOLD}${failures} check(s) failed${RESET} (${passing}/${total} passed) — fix the issues above.\n`);
  process.exit(1);
}
