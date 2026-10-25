import { bindInternalLinks, escapeHtml, layout, pretty } from '../../src/ui.js';

const META_AI_PROMPT =
  'Analyse this song: what is the title, artist, genre, mood, tempo, key instruments, and main lyrical themes? Give me a structured breakdown.';

// Song structure blocks the user can toggle on/off and reorder
const STRUCTURE_BLOCKS = [
  { id: 'intro',       label: 'Intro',       tag: '[Intro]',       default: true  },
  { id: 'verse1',      label: 'Verse 1',     tag: '[Verse 1]',     default: true  },
  { id: 'prechorus',   label: 'Pre-Chorus',  tag: '[Pre-Chorus]',  default: false },
  { id: 'chorus',      label: 'Chorus',      tag: '[Chorus]',      default: true  },
  { id: 'verse2',      label: 'Verse 2',     tag: '[Verse 2]',     default: true  },
  { id: 'prechorus2',  label: 'Pre-Chorus 2',tag: '[Pre-Chorus]',  default: false },
  { id: 'chorus2',     label: 'Chorus 2',    tag: '[Chorus]',      default: false },
  { id: 'verse3',      label: 'Verse 3',     tag: '[Verse 3]',     default: false },
  { id: 'bridge',      label: 'Bridge',      tag: '[Bridge]',      default: true  },
  { id: 'hook',        label: 'Hook',        tag: '[Hook]',        default: false },
  { id: 'break',       label: 'Break',       tag: '[Break]',       default: false },
  { id: 'instrumental',label: 'Instrumental',tag: '[Instrumental]',default: false },
  { id: 'chorus3',     label: 'Final Chorus',tag: '[Chorus]',      default: true  },
  { id: 'outro',       label: 'Outro',       tag: '[Outro]',       default: true  },
];

function buildStructureHTML() {
  return STRUCTURE_BLOCKS.map((b) => `
    <label class="structure-block ${b.default ? 'active' : ''}" data-id="${b.id}">
      <input type="checkbox" class="structure-cb" data-id="${b.id}" ${b.default ? 'checked' : ''} hidden>
      <span class="structure-tag">${escapeHtml(b.label)}</span>
    </label>
  `).join('');
}

function getSelectedStructure(root) {
  const checked = [...root.querySelectorAll('.structure-cb:checked')].map((cb) => cb.dataset.id);
  return STRUCTURE_BLOCKS
    .filter((b) => checked.includes(b.id))
    .map((b) => b.tag)
    .join(', ');
}

export function render(root, { api, toast, navigate, solution }) {
  root.innerHTML = layout({
    title: escapeHtml(solution.title),
    subtitle: escapeHtml(solution.description),
    backHref: '/',
    body: `
      <div class="stack">

        <section class="card panel">
          <h2>1. Get song info from Meta AI</h2>
          <p class="hint">When you hear a song on Instagram, open Meta AI and paste this prompt:</p>
          <div class="meta-prompt-box" style="display:flex;gap:10px;align-items:flex-start;background:#f6f1e8;border-radius:10px;padding:12px 14px;margin-bottom:12px;">
            <code id="metaPrompt" style="flex:1;white-space:pre-wrap;font-size:12px;">${escapeHtml(META_AI_PROMPT)}</code>
            <button class="button secondary" type="button" id="copyPromptBtn" style="flex-shrink:0;">Copy</button>
          </div>
          <p class="hint">Then paste Meta AI's response below.</p>
          <label class="field">Meta AI song analysis
            <textarea id="songAnalysis" rows="6" placeholder="Paste Meta AI's response here…"></textarea>
          </label>
        </section>

        <section class="card panel">
          <h2>2. Your creative direction</h2>
          <label class="field">What should your new song be about?
            <textarea id="myIdea" rows="3" placeholder="e.g. A late-night drive through the city, feeling free and unstoppable…"></textarea>
          </label>
        </section>

        <section class="card panel">
          <h2>3. Song structure</h2>
          <p class="hint">Toggle the sections you want. Gemini will write lyrics for each one.</p>
          <div class="structure-grid" id="structureGrid">
            ${buildStructureHTML()}
          </div>
        </section>

        <section class="card panel">
          <div class="actions">
            <button class="button secondary" type="button" id="saveInputsBtn">Save inputs</button>
            <button class="button primary" type="button" id="generateBtn">
              <span id="generateLabel">Generate with Gemini</span>
              <span id="spinner" class="spinner" style="display:none"></span>
            </button>
          </div>
        </section>

        <section class="card panel" id="outputSection" style="display:none">
          <h2>4. Your Suno song</h2>

          <div id="originalBlock" style="margin-bottom:18px;">
            <h3 style="margin:0 0 10px;font-size:14px;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;">Original song</h3>
            <div class="field-row" style="margin-bottom:6px;"><span class="label" style="font-size:12px;color:var(--muted);font-weight:700;min-width:90px;display:inline-block;">Title</span><span id="origTitle"></span></div>
            <div class="field-row" style="margin-bottom:6px;"><span class="label" style="font-size:12px;color:var(--muted);font-weight:700;min-width:90px;display:inline-block;">Style tags</span><span id="origStyle"></span></div>
            <div class="field-row"><span class="label" style="font-size:12px;color:var(--muted);font-weight:700;min-width:90px;display:inline-block;vertical-align:top;">Themes</span><ul id="origThemes" style="margin:0;padding-left:18px;display:inline-block;"></ul></div>
          </div>

          <hr style="border:none;border-top:1px solid var(--line);margin:18px 0;">

          <h3 style="margin:0 0 14px;font-size:14px;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;">Your new song</h3>

          <label class="field" style="margin-bottom:12px;">Title
            <input type="text" id="newTitle">
          </label>

          <label class="field" style="margin-bottom:4px;">Style tags
            <input type="text" id="newStyle">
          </label>
          <p class="hint" style="margin-bottom:16px;">Paste directly into Suno's Style field</p>

          <label class="field" style="margin-bottom:4px;">Lyrics
            <textarea id="newLyrics" rows="20" style="font-family:ui-monospace,Consolas,monospace;font-size:13px;"></textarea>
          </label>
          <p class="hint" style="margin-bottom:16px;">Paste directly into Suno's Lyrics field. Edit freely before copying.</p>

          <div class="actions">
            <button class="button secondary" type="button" id="copyStyleBtn">Copy style tags</button>
            <button class="button secondary" type="button" id="copyLyricsBtn">Copy lyrics</button>
            <button class="button primary" type="button" id="saveBtn">Save to history</button>
          </div>
        </section>

        <section class="card panel">
          <h2>History</h2>
          <div class="history" id="history"></div>
        </section>

      </div>

      <style>
        .structure-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 4px;
        }
        .structure-block {
          padding: 7px 14px;
          border-radius: 20px;
          border: 1.5px solid var(--line);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          user-select: none;
          background: #fff;
          color: var(--muted);
          transition: 0.15s;
        }
        .structure-block.active {
          border-color: var(--accent);
          background: #fdf0ea;
          color: var(--accent);
        }
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

  const songAnalysis = root.querySelector('#songAnalysis');
  const myIdea = root.querySelector('#myIdea');
  const outputSection = root.querySelector('#outputSection');
  const origTitle = root.querySelector('#origTitle');
  const origStyle = root.querySelector('#origStyle');
  const origThemes = root.querySelector('#origThemes');
  const newTitle = root.querySelector('#newTitle');
  const newStyle = root.querySelector('#newStyle');
  const newLyrics = root.querySelector('#newLyrics');
  const historyEl = root.querySelector('#history');
  const generateBtn = root.querySelector('#generateBtn');
  const generateLabel = root.querySelector('#generateLabel');
  const spinner = root.querySelector('#spinner');

  let lastOutput = null;

  // Structure block toggles
  root.querySelector('#structureGrid').addEventListener('click', (e) => {
    const block = e.target.closest('.structure-block');
    if (!block) return;
    const cb = block.querySelector('.structure-cb');
    cb.checked = !cb.checked;
    block.classList.toggle('active', cb.checked);
  });

  // Copy helpers
  root.querySelector('#copyPromptBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(META_AI_PROMPT).then(() => toast('Prompt copied!'));
  });
  root.querySelector('#copyStyleBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(newStyle.value).then(() => toast('Style tags copied!'));
  });
  root.querySelector('#copyLyricsBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(newLyrics.value).then(() => toast('Lyrics copied!'));
  });

  function setLoading(loading) {
    generateBtn.disabled = loading;
    generateLabel.textContent = loading ? 'Generating…' : 'Generate with Gemini';
    spinner.style.display = loading ? 'inline-block' : 'none';
  }

  // Save inputs (before generation)
  root.querySelector('#saveInputsBtn').addEventListener('click', async () => {
    const analysis = songAnalysis.value.trim();
    const idea = myIdea.value.trim();
    if (!analysis && !idea) { toast('Nothing to save yet.'); return; }
    const structure = getSelectedStructure(root);
    const payload = {
      saved_analysis: analysis,
      saved_idea: idea,
      saved_structure: structure,
      status: 'inputs-only',
    };
    const title = idea ? idea.slice(0, 60) : 'Saved inputs';
    try {
      await api.saveRecord({ solutionId: solution.id, title, payload });
      toast('Inputs saved — come back to generate later.');
      await loadHistory();
    } catch (err) {
      toast(err.message);
    }
  });

  // Generate
  root.querySelector('#generateBtn').addEventListener('click', async () => {
    const analysis = songAnalysis.value.trim();
    const idea = myIdea.value.trim();
    const structure = getSelectedStructure(root);

    if (!analysis) { toast('Paste the Meta AI song analysis first.'); return; }
    if (!idea) { toast('Tell me what your new song should be about.'); return; }
    if (!structure) { toast('Select at least one song section.'); return; }

    const combinedText =
      `--- SONG ANALYSIS FROM META AI ---\n${analysis}\n\n--- MY CREATIVE DIRECTION ---\n${idea}\n\n--- SONG STRUCTURE (write these sections in this order) ---\n${structure}`;

    setLoading(true);
    try {
      const result = await api.generate({ solutionId: solution.id, text: combinedText });
      const out = result.output;
      lastOutput = out;

      origTitle.textContent = out.original_title || '—';
      origStyle.textContent = out.original_style || '—';
      origThemes.innerHTML = (out.original_lyrics_themes || [])
        .map((t) => `<li>${escapeHtml(t)}</li>`).join('') || '<li>—</li>';

      newTitle.value = out.new_title || '';
      newStyle.value = out.new_style || '';
      newLyrics.value = out.new_lyrics || '';

      outputSection.style.display = '';
      outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      toast('Lyrics ready — review, edit, then copy to Suno!');
    } catch (err) {
      toast(err.message);
    } finally {
      setLoading(false);
    }
  });

  // Save
  root.querySelector('#saveBtn').addEventListener('click', async () => {
    if (!lastOutput) { toast('Generate a song first.'); return; }
    const payload = {
      ...lastOutput,
      new_title: newTitle.value,
      new_style: newStyle.value,
      new_lyrics: newLyrics.value,
    };
    try {
      await api.saveRecord({ solutionId: solution.id, title: payload.new_title || 'Untitled', payload });
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
        : '<p class="empty">No saved songs yet.</p>';

      // Load button handler
      historyEl.querySelectorAll('.load-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.id;
          const row = rows.find((r) => String(r.id) === String(id));
          if (!row) return;
          const p = row.payload;

          // Inputs-only save: restore form fields
          if (p.status === 'inputs-only') {
            if (p.saved_analysis) songAnalysis.value = p.saved_analysis;
            if (p.saved_idea) myIdea.value = p.saved_idea;

            // Restore structure checkboxes
            if (p.saved_structure) {
              const tags = p.saved_structure.split(',').map((s) => s.trim());
              root.querySelectorAll('.structure-cb').forEach((cb) => {
                const block = STRUCTURE_BLOCKS.find((b) => b.id === cb.dataset.id);
                const active = block && tags.includes(block.tag);
                cb.checked = active;
                cb.closest('.structure-block').classList.toggle('active', active);
              });
            }

            songAnalysis.scrollIntoView({ behavior: 'smooth', block: 'start' });
            toast('Inputs loaded — ready to generate.');
          } else {
            // Full song save: restore output section
            newTitle.value = p.new_title || '';
            newStyle.value = p.new_style || '';
            newLyrics.value = p.new_lyrics || '';

            origTitle.textContent = p.original_title || '—';
            origStyle.textContent = p.original_style || '—';
            origThemes.innerHTML = (p.original_lyrics_themes || [])
              .map((t) => `<li>${escapeHtml(t)}</li>`).join('') || '<li>—</li>';

            lastOutput = p;
            outputSection.style.display = '';
            outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            toast('Song loaded.');
          }
        });
      });
    } catch (err) {
      historyEl.innerHTML = `<p class="empty">${escapeHtml(err.message)}</p>`;
    }
  }

  loadHistory();
}
