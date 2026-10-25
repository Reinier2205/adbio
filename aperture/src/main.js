import './styles.css';
import { solutions } from './catalog.js';
import * as api from './api.js';
import { bindInternalLinks, escapeHtml, layout, showToast } from './ui.js';

function navigate(path) {
  if (location.pathname !== path) history.pushState({}, '', path);
  route();
}

function renderHub(app) {
  const cards = solutions.map((solution) => `
    <a class="card solution-card" href="/s/${escapeHtml(solution.id)}">
      <p class="eyebrow">${escapeHtml(solution.inputs || 'custom')}</p>
      <h2>${escapeHtml(solution.title)}</h2>
      <p>${escapeHtml(solution.description)}</p>
      <span class="card-cta">Open page</span>
    </a>
  `).join('');

  app.innerHTML = layout({
    title: 'Point, focus, develop.',
    subtitle: 'Each idea has its own page. Input goes through a standard prompt, Gemini returns JSON, and you review before saving.',
    body: `<section class="card-grid">${cards || '<p class="empty">No solutions registered yet. Copy solutions/_starter.</p>'}</section>
      <section class="card how">
        <h2>The same path every time</h2>
        <ol>
          <li><strong>Input</strong> — text, a screenshot, or whatever that idea needs.</li>
          <li><strong>Prompt + schema</strong> — files next to the solution, not hardcoded parsers.</li>
          <li><strong>Gemini</strong> — called from the Worker with <code>GEMINI_API_KEY</code>.</li>
          <li><strong>Review</strong> — check the JSON, then persist it in D1.</li>
        </ol>
      </section>`,
  });
  bindInternalLinks(app, navigate);
}

function renderMissing(app) {
  app.innerHTML = layout({
    title: 'Solution not found',
    subtitle: 'That idea is not registered in the catalog yet.',
    body: `<p class="empty">Add a folder under <code>solutions/</code>, then import it in <code>src/catalog.js</code> and <code>worker/catalog.js</code>.</p>`,
  });
  bindInternalLinks(app, navigate);
}

function route() {
  const app = document.querySelector('#app');
  const path = location.pathname.replace(/\/$/, '') || '/';
  if (path === '/') {
    renderHub(app);
    return;
  }
  const match = path.match(/^\/s\/([^/]+)$/);
  const solution = match && solutions.find((item) => item.id === match[1]);
  if (!solution) {
    renderMissing(app);
    return;
  }
  solution.render(app, { api, toast: showToast, navigate, solution });
}

window.addEventListener('popstate', route);
route();
