/**
 * Copy this folder to solutions/<id>/ and customize.
 *
 * Then:
 * 1. Set manifest.json id/title/description/inputs.
 * 2. Edit prompt.md and schema.json.
 * 3. Import this render function in src/catalog.js.
 * 4. Import prompt + schema + manifest in worker/catalog.js.
 *
 * Shared helpers: api.generate, api.listRecords, api.saveRecord, api.deleteRecord.
 * Gemini is always called via the Worker — never put GEMINI_API_KEY in the browser.
 */
import { bindInternalLinks, escapeHtml, layout, pretty } from '../../src/ui.js';

export function render(root, { api, toast, navigate, solution }) {
  root.innerHTML = layout({
    title: escapeHtml(solution.title),
    subtitle: escapeHtml(solution.description),
    backHref: '/',
    body: `
      <div class="stack">
        <section class="card panel">
          <h2>Input</h2>
          <p class="hint">Replace this form with whatever this idea needs: fields, files, or a canvas.</p>
          <label class="field">Text
            <textarea id="inputText" placeholder="Describe the input for this idea…"></textarea>
          </label>
          <div class="actions">
            <button class="button primary" type="button" id="generateBtn">Generate with Gemini</button>
          </div>
        </section>
        <section class="card panel">
          <h2>Review</h2>
          <label class="field">JSON
            <textarea id="outputJson" placeholder="{}"></textarea>
          </label>
          <div class="actions">
            <button class="button primary" type="button" id="saveBtn">Save record</button>
          </div>
        </section>
        <section class="card panel">
          <h2>History</h2>
          <div class="history" id="history"></div>
        </section>
      </div>
    `,
  });

  bindInternalLinks(root, navigate);
  const inputText = root.querySelector('#inputText');
  const outputJson = root.querySelector('#outputJson');
  const historyEl = root.querySelector('#history');

  async function loadHistory() {
    try {
      const rows = await api.listRecords(solution.id);
      historyEl.innerHTML = rows.length
        ? rows.map((row) => `<article class="history-item"><strong>${escapeHtml(row.title)}</strong><pre>${escapeHtml(pretty(row.payload))}</pre></article>`).join('')
        : '<p class="empty">No saved records yet.</p>';
    } catch (err) {
      historyEl.innerHTML = `<p class="empty">${escapeHtml(err.message)}</p>`;
    }
  }

  root.querySelector('#generateBtn').addEventListener('click', async () => {
    try {
      const result = await api.generate({ solutionId: solution.id, text: inputText.value.trim() });
      outputJson.value = pretty(result.output);
      toast('Review the JSON, then save.');
    } catch (err) {
      toast(err.message);
    }
  });

  root.querySelector('#saveBtn').addEventListener('click', async () => {
    try {
      const payload = JSON.parse(outputJson.value);
      await api.saveRecord({ solutionId: solution.id, title: payload.title || 'Untitled', payload });
      toast('Record saved.');
      await loadHistory();
    } catch (err) {
      toast(err.message);
    }
  });

  loadHistory();
}
