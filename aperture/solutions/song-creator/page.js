import { bindInternalLinks, escapeHtml, layout, pretty } from '../../src/ui.js';

const META_AI_PROMPT =
  'Create compact, copy-ready Suno soundtrack design JSON and Suno style tags for this post. JSON fields: genre, mood, emotion, tempo_bpm, rhythm, instruments, vocal_style, energy, song_structure, production_style, and suno_style_tags. No lyrics.';

export function render(root, { api, toast, navigate, solution }) {
  root.innerHTML = layout({
    title: escapeHtml(solution.title),
    subtitle: escapeHtml(solution.description),
    backHref: '/',
    body: `
      <div class="stack">

        <section class="card panel">
          <h2>1. Copy the prompt for Meta AI</h2>
          <p class="hint">Paste this into Meta AI along with the post or song description you want to design for:</p>
          <div class="meta-prompt-box" style="display:flex;gap:10px;align-items:flex-start;background:#f6f1e8;border-radius:10px;padding:12px 14px;margin-bottom:12px;">
            <code id="metaPrompt" style="flex:1;white-space:pre-wrap;font-size:12px;">${escapeHtml(META_AI_PROMPT)}</code>
            <button class="button secondary" type="button" id="copyPromptBtn" style="flex-shrink:0;">Copy</button>
          </div>
        </section>

        <section class="card panel">
          <h2>2. Paste the post or description</h2>
          <label class="field">Post or song description
            <textarea id="postText" rows="6" placeholder="Paste the post, caption, or song description you want a Suno soundtrack for\u2026"></textarea>
          </label>
        </section>

        <section class="card panel">
          <div class="actions">
            <button class="button primary" type="button" id="generateBtn">
              <span id="generateLabel">Generate with Gemini</span>
              <span id="spinner" class="spinner" style="display:none"></span>
            </button>
          </div>
        </section>

        <section class="card panel" id="outputSection" style="display:none">
          <h2>3. Your Suno soundtrack design</h2>

          <div id="designFields" style="margin-bottom:18px;"></div>

          <label class="field" style="margin-bottom:4px;">Suno style tags
            <input type="text" id="sunoStyleTags">
          </label>
          <p class="hint" style="margin-bottom:16px;">Paste directly into Suno\u2019s Style field</p>

          <div class="actions">
            <button class="button secondary" type="button" id="copyTagsBtn">Copy style tags</button>
            <button class="button primary" type="button" id="saveBtn">Save to history</button>
          </div>
        </section>

        <section class="card panel">
          <h2>History</h2>
          <div class="history" id="history"></div>
        </section>

      </div>

      <style>
        .design-row { display:flex; gap:8px; align-items:baseline; margin-bottom:8px; }
        .design-label { font-size:12px; color:var(--muted); font-weight:700; min-width:130px; flex-shrink:0; }
        .design-value { font-size:14px; }
        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.4);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      </style>
    `,
  });

  bindInternalLinks(root, navigate);

  const postText      = root.querySelector('#postText');
  const outputSection = root.querySelector('#outputSection');
  const designFields  = root.querySelector('#designFields');
  const sunoStyleTags = root.querySelector('#sunoStyleTags');
  const historyEl     = root.querySelector('#history');
  const generateBtn   = root.querySelector('#generateBtn');
  const generateLabel = root.querySelector('#generateLabel');
  const spinner       = root.querySelector('#spinner');

  let lastOutput = null;

  root.querySelector('#copyPromptBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(META_AI_PROMPT).then(() => toast('Prompt copied!'));
  });

  root.querySelector('#copyTagsBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(sunoStyleTags.value).then(() => toast('Style tags copied!'));
  });

  function setLoading(loading) {
    generateBtn.disabled = loading;
    generateLabel.textContent = loading ? 'Generating\u2026' : 'Generate with Gemini';
    spinner.style.display = loading ? 'inline-block' : 'none';
  }

  function renderDesignFields(out) {
    const FIELDS = [
      { key: 'genre',            label: 'Genre' },
      { key: 'mood',             label: 'Mood' },
      { key: 'emotion',          label: 'Emotion' },
      { key: 'tempo_bpm',        label: 'Tempo (BPM)' },
      { key: 'rhythm',           label: 'Rhythm' },
      { key: 'instruments',      label: 'Instruments' },
      { key: 'vocal_style',      label: 'Vocal style' },
      { key: 'energy',           label: 'Energy' },
      { key: 'song_structure',   label: 'Song structure' },
      { key: 'production_style', label: 'Production style' },
    ];
    designFields.innerHTML = FIELDS.map(({ key, label }) => {
      const val = Array.isArray(out[key]) ? out[key].join(', ') : (out[key] ?? '\u2014');
      return `<div class="design-row"><span class="design-label">${escapeHtml(label)}</span><span class="design-value">${escapeHtml(String(val))}</span></div>`;
    }).join('');
  }

  root.querySelector('#generateBtn').addEventListener('click', async () => {
    const text = postText.value.trim();
    if (!text) { toast('Paste a post or description first.'); return; }

    setLoading(true);
    try {
      const result = await api.generate({ solutionId: solution.id, text });
      const out = result.output;
      lastOutput = out;

      renderDesignFields(out);
      sunoStyleTags.value = out.suno_style_tags || '';

      outputSection.style.display = '';
      outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      toast('Soundtrack design ready \u2014 copy your style tags to Suno!');
    } catch (err) {
      toast(err.message);
    } finally {
      setLoading(false);
    }
  });

  root.querySelector('#saveBtn').addEventListener('click', async () => {
    if (!lastOutput) { toast('Generate a design first.'); return; }
    const payload = { ...lastOutput, suno_style_tags: sunoStyleTags.value };
    const title = [lastOutput.genre, lastOutput.mood].filter(Boolean).join(' \u00b7 ') || 'Untitled design';
    try {
      await api.saveRecord({ solutionId: solution.id, title, payload });
      toast('Saved to history.');
      await loadHistory();
    } catch (err) {
      toast(err.message);
    }
  });

  async function loadHistory() {
    try {
      const rows = await api.listRecords(solution.id);
      historyEl.innerHTML = rows.length
        ? rows.map((row) => `
            <article class="history-item" data-id="${row.id}">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                <strong>${escapeHtml(row.title)}</strong>
                <button class="button secondary load-btn" type="button" data-id="${row.id}" style="flex-shrink:0;font-size:12px;min-height:32px;padding:0 10px;">Load</button>
              </div>
              <pre>${escapeHtml(pretty(row.payload))}</pre>
            </article>`).join('')
        : '<p class="empty">No saved designs yet.</p>';

      historyEl.querySelectorAll('.load-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.id;
          const row = rows.find((r) => String(r.id) === String(id));
          if (!row) return;
          const p = row.payload;

          renderDesignFields(p);
          sunoStyleTags.value = p.suno_style_tags || '';
          lastOutput = p;
          outputSection.style.display = '';
          outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          toast('Design loaded.');
        });
      });
    } catch (err) {
      historyEl.innerHTML = `<p class="empty">${escapeHtml(err.message)}</p>`;
    }
  }

  loadHistory();
}
