import { bindInternalLinks, escapeHtml, layout, pretty } from '../../src/ui.js';

const META_AI_PROMPT =
  'Analyse this song: what is the title, artist, genre, mood, tempo, key instruments, and main lyrical themes? Give me a structured breakdown.';

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
          <div class="meta-prompt-box">
            <code id="metaPrompt">${escapeHtml(META_AI_PROMPT)}</code>
            <button class="button" type="button" id="copyPromptBtn">Copy prompt</button>
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
          <div class="actions">
            <button class="button primary" type="button" id="generateBtn">Generate with Gemini</button>
          </div>
        </section>

        <section class="card panel" id="outputSection" style="display:none">
          <h2>3. Your Suno song design</h2>

          <div id="originalBlock">
            <h3>Original song</h3>
            <div class="field-row"><span class="label">Title</span><span id="origTitle" class="value"></span></div>
            <div class="field-row"><span class="label">Style tags</span><span id="origStyle" class="value"></span></div>
            <div class="field-row"><span class="label">Themes</span><ul id="origThemes" class="value themes-list"></ul></div>
          </div>

          <hr>

          <div id="newBlock">
            <h3>Your new song</h3>
            <div class="field-row editable">
              <span class="label">Title</span>
              <input type="text" id="newTitle" class="value inline-input">
            </div>
            <div class="field-row editable">
              <span class="label">Style tags</span>
              <input type="text" id="newStyle" class="value inline-input">
              <span class="hint">Paste directly into Suno's Style field</span>
            </div>
            <div class="field-row editable">
              <span class="label">Lyrics prompt</span>
              <textarea id="newLyricsPrompt" class="value inline-input" rows="5"></textarea>
              <span class="hint">Paste directly into Suno's Lyrics field</span>
            </div>
            <div class="actions">
              <button class="button" type="button" id="copyStyleBtn">Copy style tags</button>
              <button class="button" type="button" id="copyLyricsBtn">Copy lyrics prompt</button>
              <button class="button primary" type="button" id="saveBtn">Save to history</button>
            </div>
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

  const songAnalysis = root.querySelector('#songAnalysis');
  const myIdea = root.querySelector('#myIdea');
  const outputSection = root.querySelector('#outputSection');

  const origTitle = root.querySelector('#origTitle');
  const origStyle = root.querySelector('#origStyle');
  const origThemes = root.querySelector('#origThemes');
  const newTitle = root.querySelector('#newTitle');
  const newStyle = root.querySelector('#newStyle');
  const newLyricsPrompt = root.querySelector('#newLyricsPrompt');
  const historyEl = root.querySelector('#history');

  let lastOutput = null;

  // Copy Meta AI prompt
  root.querySelector('#copyPromptBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(META_AI_PROMPT).then(() => toast('Prompt copied!'));
  });

  // Copy style tags
  root.querySelector('#copyStyleBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(newStyle.value).then(() => toast('Style tags copied!'));
  });

  // Copy lyrics prompt
  root.querySelector('#copyLyricsBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(newLyricsPrompt.value).then(() => toast('Lyrics prompt copied!'));
  });

  // Generate
  root.querySelector('#generateBtn').addEventListener('click', async () => {
    const analysis = songAnalysis.value.trim();
    const idea = myIdea.value.trim();
    if (!analysis) { toast('Paste the Meta AI song analysis first.'); return; }
    if (!idea) { toast('Tell me what your new song should be about.'); return; }

    const combinedText =
      `--- SONG ANALYSIS FROM META AI ---\n${analysis}\n\n--- MY CREATIVE DIRECTION ---\n${idea}`;

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
      newLyricsPrompt.value = out.new_lyrics_prompt || '';

      outputSection.style.display = '';
      toast('Song design ready — review and copy to Suno!');
    } catch (err) {
      toast(err.message);
    }
  });

  // Save
  root.querySelector('#saveBtn').addEventListener('click', async () => {
    if (!lastOutput) { toast('Generate a song design first.'); return; }
    const payload = {
      ...lastOutput,
      new_title: newTitle.value,
      new_style: newStyle.value,
      new_lyrics_prompt: newLyricsPrompt.value,
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
            <article class="history-item">
              <strong>${escapeHtml(row.title)}</strong>
              <pre>${escapeHtml(pretty(row.payload))}</pre>
            </article>`).join('')
        : '<p class="empty">No saved songs yet.</p>';
    } catch (err) {
      historyEl.innerHTML = `<p class="empty">${escapeHtml(err.message)}</p>`;
    }
  }

  loadHistory();
}
