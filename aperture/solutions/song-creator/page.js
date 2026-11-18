import { bindInternalLinks, escapeHtml, layout } from '../../src/ui.js';

// The command the user copies and pastes into Meta AI on a Reel. Meta AI then returns
// ONE block = the app link at the top + the Suno design JSON (Block 1) + the plain
// source link (Block 2), which the user pastes straight into Song Creator.
// TODO: Replace with a Meta AI API call when available. Current implementation is a manual paste flow.
const META_AI_SETUP_COMMAND =
`Analyze this Instagram post and create a Suno soundtrack design for it.

Output in this format:

1. Clickable link to my app at the top: https://aperture.reinier-olivier.workers.dev/s/song-creator

2. Block 1: Suno soundtrack design JSON with genre, mood, emotion, tempo_bpm, rhythm, instruments, vocal_style, energy, song_structure, production_style, suno_style_tags

3. Block 2: Plain source link string only, no JSON wrapper

Base the soundtrack on the visual style, mood, and pacing of the post content.`;

// Mirror of the server-side prompt template — kept in sync with solutions/song-creator/prompt.md.
// Also includes explicit JSON output format instructions (Gemini gets these via responseSchema;
// other LLMs need them spelled out in the prompt).
const SYSTEM_PROMPT = `You are a professional songwriter and Suno AI expert. The user has analysed an existing song with Meta AI and received a Suno soundtrack design JSON. Your job is to write complete, ready-to-use lyrics for a new original song inspired by it.

The input contains up to four parts:
1. A Suno soundtrack design JSON from Meta AI (genre, mood, emotion, tempo, instruments, etc., including a suno_style_tags field)
2. The Suno style tags to use verbatim (extracted from that JSON, provided explicitly)
3. The user's creative direction for their own new song
4. The song structure the user wants (e.g. intro, 2 verses, chorus, bridge, outro)

Rules:
- new_style: copy the provided Suno style tags EXACTLY. Do NOT alter them. Do NOT let the creative direction change the genre, mood, instruments, tempo, or any other style element. The style must stay true to the original song's vibe.
- new_title: suggest a catchy, original title that fits the user's creative direction.
- new_lyrics: write COMPLETE song lyrics — not a prompt, not a description, actual words the singer will sing. Follow the song structure the user requested. Use Suno section tags exactly as follows on their own line before each section:
  [Intro], [Verse 1], [Verse 2], [Verse 3], [Pre-Chorus], [Chorus], [Bridge], [Hook], [Outro], [Break], [Instrumental]
  Write 4–8 lines per section. Make the lyrics vivid, personal, and emotionally resonant. The chorus should be catchy and memorable. Rhyme scheme should feel natural, not forced.

OUTPUT FORMAT — respond with a single valid JSON object, no markdown fences, no explanation:

{
  "new_title": "Your suggested title for the new song",
  "new_style": "the provided Suno style tags, copied verbatim",
  "new_lyrics": "[Intro]\\nLine one\\nLine two\\n\\n[Verse 1]\\nLine one\\nLine two\\nLine three\\nLine four\\n\\n[Chorus]\\nLine one\\nLine two\\nLine three\\nLine four\\n\\n[Outro]\\nLine one\\nLine two"
}

CRITICAL RULES FOR new_lyrics:
- Each section tag ([Intro], [Verse 1], [Chorus], etc.) must be on its own line, with a blank line before and after it — exactly as Suno expects.
- Write actual sung words — not descriptions, not placeholders.
- Do NOT write anything like "verse about..." or "(optional)". Write the real lyrics.
- The entire lyrics field is a single JSON string. Use \\n for line breaks inside it.
- Only include the sections the user requested in the song structure part of the input.

CRITICAL RULE FOR new_style:
- Copy the Suno style tags from the input EXACTLY. Do not paraphrase, add, remove, or adjust them based on the creative direction. The creative direction shapes only the title and the lyrics.`;

const STRUCTURE_BLOCKS = [
  { id: 'intro',        label: 'Intro',        tag: '[Intro]',        default: true  },
  { id: 'verse1',       label: 'Verse 1',      tag: '[Verse 1]',      default: true  },
  { id: 'prechorus',    label: 'Pre-Chorus',   tag: '[Pre-Chorus]',   default: false },
  { id: 'chorus',       label: 'Chorus',       tag: '[Chorus]',       default: true  },
  { id: 'verse2',       label: 'Verse 2',      tag: '[Verse 2]',      default: true  },
  { id: 'prechorus2',   label: 'Pre-Chorus 2', tag: '[Pre-Chorus]',   default: false },
  { id: 'chorus2',      label: 'Chorus 2',     tag: '[Chorus]',       default: false },
  { id: 'verse3',       label: 'Verse 3',      tag: '[Verse 3]',      default: false },
  { id: 'bridge',       label: 'Bridge',       tag: '[Bridge]',       default: true  },
  { id: 'hook',         label: 'Hook',         tag: '[Hook]',         default: false },
  { id: 'break',        label: 'Break',        tag: '[Break]',        default: false },
  { id: 'instrumental', label: 'Instrumental', tag: '[Instrumental]', default: false },
  { id: 'chorus3',      label: 'Final Chorus', tag: '[Chorus]',       default: true  },
  { id: 'outro',        label: 'Outro',        tag: '[Outro]',        default: true  },
];

const APP_HOST = 'aperture.reinier-olivier.workers.dev';

/** Find and parse the first balanced { ... } JSON object in text. Returns { obj, text } or { null, null }. */
function extractFirstJsonObject(text) {
  const start = text.indexOf('{');
  if (start === -1) return { obj: null, text: null };
  let depth = 0, inStr = false, esc = false, end = -1;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) return { obj: null, text: null };
  const candidate = text.slice(start, end + 1);
  try { return { obj: JSON.parse(candidate), text: candidate }; } catch { return { obj: null, text: null }; }
}

/**
 * Parse Meta AI's response. It contains:
 *   - the app link (our own worker URL) — ignored
 *   - Block 1: a Suno soundtrack design JSON (10 fields incl. suno_style_tags and sometimes source_link)
 *   - Block 2: a plain source link string (may be inside the JSON instead, depending on Meta AI's output)
 * Returns { json, sourceLink }. json is the parsed object (or null), with source_link removed from it.
 */
function parseMetaAiResponse(text) {
  const { obj: rawJson, text: jsonText } = extractFirstJsonObject(text);

  // Pull source_link out of the JSON if Meta AI put it in there (common), then remove it from
  // the object so it doesn't clutter the analysis field shown to the user.
  let sourceLink = null;
  let json = rawJson;
  if (json && json.source_link) {
    sourceLink = json.source_link;
    json = { ...json };
    delete json.source_link;
  }

  // Also check outside the JSON block for a plain URL (Block 2 as originally spec'd).
  if (!sourceLink) {
    const outside = jsonText ? text.replace(jsonText, ' ') : text;
    const urls = (outside.match(/https?:\/\/[^\s"'<>\]]+/g) || [])
      .map((u) => u.replace(/[)\].,;!?]+$/, ''));
    for (const u of urls) {
      if (u && !u.includes(APP_HOST)) { sourceLink = u; break; }
    }
  }

  return { json, sourceLink };
}

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
    actions: `<button class="button secondary" type="button" id="setupMetaAiBtn">Setup Meta AI</button>`,
    body: `
      <div class="stack">

        <section class="card panel">
          <h2>1. Paste Meta AI's response</h2>
          <p class="hint">Run the Meta AI command (see “Setup Meta AI”) on any Instagram Reel, then paste its whole response here. The Suno style JSON and the source link split automatically — tap “Split response” if they don't.</p>
          <label class="field">Meta AI response
            <textarea id="songAnalysis" rows="7" placeholder="Paste Meta AI's response — the app link, the Suno style JSON, and the source link…"></textarea>
          </label>
          <div class="actions" style="margin-top:8px;">
            <button class="button secondary" type="button" id="splitBtn">Save Insta link</button>
          </div>
          <label class="field" style="margin-top:10px;">Source URL <span class="hint" style="display:inline;font-size:12px;">(auto-filled on paste / Split — saved to your Jukebox as 🔗 Source)</span>
            <input type="url" id="sourceUrl" placeholder="https://…" style="margin-top:4px;">
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
          <p class="hint">Toggle the sections you want. Gemini will write lyrics for each one. The Suno style stays exactly as Meta AI gave it.</p>
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

        <section class="card panel fallback-panel" id="fallbackSection" style="display:none">
          <div class="fallback-header">
            <div>
              <h2 class="fallback-title">Gemini is unavailable</h2>
              <p class="hint" style="margin:4px 0 0;">Copy the prompt, paste it into ChatGPT, Claude, or Gemini on the web, then paste the JSON response into the box below and tap “Use this response”.</p>
            </div>
            <button class="button secondary" type="button" id="dismissFallbackBtn" aria-label="Dismiss">✕</button>
          </div>
          <div class="actions" style="margin-top:14px;margin-bottom:14px;">
            <button class="button primary" type="button" id="copyFallbackBtn">Copy prompt</button>
          </div>
          <details class="fallback-details">
            <summary class="hint" style="cursor:pointer;">Show the prompt that was sent</summary>
            <textarea id="fallbackPrompt" class="fallback-textarea" readonly rows="10" style="margin-top:8px;"></textarea>
          </details>
          <label class="field" style="margin-top:14px;">Paste the AI's response here
            <textarea id="fallbackResponse" rows="10" placeholder='Paste the JSON here, e.g. {"new_title":"…","new_style":"…","new_lyrics":"[Intro]\\n…"}' style="font-family:ui-monospace,Consolas,monospace;font-size:12px;resize:vertical;min-height:160px;"></textarea>
          </label>
          <div class="actions" style="margin-top:12px;">
            <button class="button primary" type="button" id="useResponseBtn">Use this response →</button>
          </div>
        </section>

        <section class="card panel" id="outputSection" style="display:none">
          <h2>4. Your Suno song</h2>

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
            <button class="button secondary" type="button" id="copyLyricsBtn">Copy lyrics</button>
            <button class="button secondary" type="button" id="copyStyleBtn">Copy style tags</button>
          </div>
        </section>

        <section class="card panel">
          <h2>Jukebox</h2>
          <div class="history" id="history"></div>
        </section>

      </div>

      <!-- Setup Meta AI modal -->
      <div class="modal-overlay" id="metaAiModal" hidden>
        <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
          <div class="modal-header">
            <h2 id="modalTitle">Setup Meta AI</h2>
            <button class="button secondary modal-close" type="button" id="closeModalBtn" aria-label="Close setup">✕</button>
          </div>
          <div class="modal-body">
            <section class="modal-section">
              <h3>How to use it · about 30 seconds</h3>
              <ol class="setup-steps">
                <li>Open Instagram and go to any Reel you want to turn into a song &nbsp;<a class="inline-link" href="https://www.instagram.com/" target="_blank" rel="noopener">Open Instagram →</a></li>
                <li>Tap the Meta AI button in the comment box</li>
                <li>Paste the command below and send it</li>
                <li>Copy Meta AI's whole response and paste it into Song Creator — it splits automatically</li>
              </ol>
            </section>
            <section class="modal-section">
              <h3>The command</h3>
              <div class="meta-prompt-box">
                <code id="setupCommand" class="meta-prompt-text">${escapeHtml(META_AI_SETUP_COMMAND)}</code>
                <button class="button primary" type="button" id="copyCommandBtn" style="align-self:flex-start;margin-top:8px;">Copy command</button>
              </div>
              <p class="hint" style="margin-top:12px;">Meta AI returns the app link, the Suno style JSON, and the source link in one block — paste it straight into Song Creator and it splits automatically.</p>
            </section>
          </div>
        </div>
      </div>

      <style>
        /* Meta AI prompt / command box (used in the setup modal) */
        .meta-prompt-box { display:flex; flex-direction:column; background:#f6f1e8; border-radius:10px; padding:12px 14px; margin-bottom:12px; overflow:hidden; }
        .meta-prompt-text { white-space:pre-wrap; font-size:12px; word-break:break-word; overflow-wrap:anywhere; display:block; background:transparent; padding:0; border-radius:0; }

        /* Structure pill grid */
        .structure-grid { display:flex; flex-wrap:wrap; gap:8px; margin-top:4px; }
        .structure-block { padding:9px 14px; border-radius:20px; border:1.5px solid var(--line); font-size:13px; font-weight:600; cursor:pointer; user-select:none; background:#fff; color:var(--muted); transition:0.15s; touch-action:manipulation; -webkit-tap-highlight-color:transparent; min-height:44px; display:inline-flex; align-items:center; }
        .structure-block.active { border-color:var(--accent); background:#fdf0ea; color:var(--accent); }

        /* Spinner */
        .spinner { width:16px; height:16px; border:2px solid rgba(255,255,255,0.4); border-top-color:#fff; border-radius:50%; animation:spin 0.7s linear infinite; display:inline-block; }
        @keyframes spin { to { transform:rotate(360deg); } }

        /* Jukebox card */
        .jukebox-card { padding:14px 16px; min-width:0; overflow:hidden; }
        .jukebox-top { display:flex; justify-content:space-between; align-items:flex-start; gap:10px; }
        .jukebox-info { flex:1; min-width:0; overflow:hidden; }
        .jukebox-title { font-size:15px; display:block; margin-bottom:3px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .jukebox-desc { margin:0 0 3px; font-size:13px; color:var(--text); opacity:0.8; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .jukebox-style { margin:0 0 8px; font-size:11px; color:var(--muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .jukebox-actions { display:flex; gap:6px; flex-shrink:0; align-items:flex-start; flex-wrap:wrap; }
        .jukebox-actions .button { font-size:12px; min-height:38px; padding:0 12px; }

        /* Jukebox link row */
        .jukebox-link-row { display:flex; gap:6px; align-items:center; margin-top:10px; }
        .jukebox-link-row input[type=url] { flex:1; min-width:0; font-size:13px; min-height:44px; padding:0 10px; border:1.5px solid var(--line); border-radius:8px; outline:none; }
        .jukebox-link-row .button { font-size:12px; min-height:38px; padding:0 12px; flex-shrink:0; }

        /* Danger button */
        .btn-danger { color:#c0392b !important; border-color:#e8c4c0 !important; }
        .btn-danger:hover { background:#fdf0ea !important; border-color:#c0392b !important; }

        /* Fallback / manual prompt panel */
        .fallback-panel { border-color:#e8c4c0 !important; background:#fff9f8 !important; }
        .fallback-header { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
        .fallback-title { margin:0; font-size:16px; color:#c0392b; }
        .fallback-textarea { font-family:ui-monospace,Consolas,monospace; font-size:12px; color:var(--ink); background:#f6f1e8; border-color:var(--line); resize:vertical; min-height:180px; cursor:text; }
        .fallback-details summary { list-style:none; }
        .fallback-details summary::-webkit-details-marker { display:none; }

        /* Setup Meta AI modal */
        .modal-overlay { position:fixed; inset:0; background:rgba(26,24,20,0.45); display:flex; align-items:flex-start; justify-content:center; padding:40px 16px; z-index:60; overflow-y:auto; }
        .modal-overlay[hidden] { display:none; }
        .modal-card { background:var(--paper); border-radius:16px; box-shadow:0 20px 60px rgba(26,24,20,0.25); max-width:560px; width:100%; border:1px solid var(--line); margin:auto; }
        .modal-header { display:flex; justify-content:space-between; align-items:center; padding:18px 22px; border-bottom:1px solid var(--line); gap:12px; }
        .modal-header h2 { margin:0; font-size:18px; }
        .modal-close { min-height:36px; padding:0 12px; font-size:16px; }
        .modal-body { padding:22px; display:grid; gap:20px; }
        .modal-section h3 { margin:0 0 10px; font-size:13px; text-transform:uppercase; letter-spacing:0.1em; color:var(--muted); }
        .setup-steps { margin:0; padding-left:20px; display:grid; gap:8px; color:var(--ink); font-size:14px; line-height:1.5; }
        .setup-steps .inline-link { color:var(--accent); font-weight:700; text-decoration:none; white-space:nowrap; }

        @media (max-width: 430px) {
          .jukebox-top { flex-direction:column; gap:8px; }
          .jukebox-actions { width:100%; justify-content:flex-end; }
          .jukebox-link-row { flex-wrap:wrap; }
          .jukebox-link-row input[type=url] { width:100%; }
          .jukebox-link-row .button { flex:1; }
          .modal-overlay { padding:16px 12px; }
        }
      </style>
    `,
  });

  bindInternalLinks(root, navigate);

  const songAnalysis  = root.querySelector('#songAnalysis');
  const sourceUrl     = root.querySelector('#sourceUrl');
  const myIdea        = root.querySelector('#myIdea');
  const outputSection = root.querySelector('#outputSection');
  const newTitle      = root.querySelector('#newTitle');
  const newStyle      = root.querySelector('#newStyle');
  const newLyrics     = root.querySelector('#newLyrics');
  const historyEl     = root.querySelector('#history');
  const generateBtn   = root.querySelector('#generateBtn');
  const generateLabel = root.querySelector('#generateLabel');
  const spinner       = root.querySelector('#spinner');
  const fallbackSection = root.querySelector('#fallbackSection');
  const fallbackPrompt  = root.querySelector('#fallbackPrompt');
  const fallbackResponse = root.querySelector('#fallbackResponse');
  const metaAiModal    = root.querySelector('#metaAiModal');

  // Structure toggles
  root.querySelector('#structureGrid').addEventListener('click', (e) => {
    const block = e.target.closest('.structure-block');
    if (!block) return;
    const cb = block.querySelector('.structure-cb');
    cb.checked = !cb.checked;
    block.classList.toggle('active', cb.checked);
  });

  // Setup Meta AI modal
  function openModal() {
    metaAiModal.hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    metaAiModal.hidden = true;
    document.body.style.overflow = '';
  }
  root.querySelector('#setupMetaAiBtn').addEventListener('click', openModal);
  root.querySelector('#closeModalBtn').addEventListener('click', closeModal);
  metaAiModal.addEventListener('click', (e) => { if (e.target === metaAiModal) closeModal(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !metaAiModal.hidden) closeModal();
  });
  root.querySelector('#copyCommandBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(META_AI_SETUP_COMMAND).then(() => toast('Command copied — paste it into Meta AI!'));
  });

  root.querySelector('#dismissFallbackBtn').addEventListener('click', () => {
    fallbackSection.style.display = 'none';
  });

  root.querySelector('#copyFallbackBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(fallbackPrompt.value).then(() => toast('Prompt copied — paste into any AI!'));
  });
  root.querySelector('#copyStyleBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(newStyle.value).then(() => toast('Style tags copied!'));
  });
  root.querySelector('#copyLyricsBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(newLyrics.value).then(() => toast('Lyrics copied!'));
  });

  // Split Meta AI's response: Suno JSON into the analysis field, source link into Source URL.
  // Returns 'split' | 'json-only' | 'source-only' | 'none'. Only overwrites Source URL when a
  // source link is found, so a manually-entered URL is preserved.
  function splitResponse(text) {
    const { json, sourceLink } = parseMetaAiResponse(text);
    if (json) {
      songAnalysis.value = JSON.stringify(json, null, 2);
      if (sourceLink) { sourceUrl.value = sourceLink; return 'split'; }
      return 'json-only';
    }
    if (sourceLink) { sourceUrl.value = sourceLink; return 'source-only'; }
    songAnalysis.value = text;
    return 'none';
  }

  // One-paste split: paste Meta AI's whole response → splits automatically.
  songAnalysis.addEventListener('paste', (e) => {
    const text = (e.clipboardData || window.clipboardData).getData('text');
    if (!text) return;
    e.preventDefault();
    const res = splitResponse(text);
    if (res === 'split') toast('Suno style + Insta link split automatically.');
    else if (res === 'json-only') toast('Suno style ready — no source link found, add it manually if needed.');
    else if (res === 'source-only') toast('Source link saved — no Suno JSON found, edit if needed.');
    else toast('Pasted — tap “Split response” to split it.');
  });

  // Manual split (in case the paste didn't auto-split, e.g. mobile paste quirks).
  root.querySelector('#splitBtn').addEventListener('click', () => {
    const text = songAnalysis.value.trim();
    if (!text) { toast('Paste Meta AI\'s response first.'); return; }
    const res = splitResponse(text);
    if (res === 'split') toast('Suno style + Insta link saved.');
    else if (res === 'json-only') toast('Suno style ready — no source link found. Paste it into Source URL manually if needed.');
    else if (res === 'source-only') toast('Insta link saved — no Suno JSON found.');
    else toast('Couldn\'t find a Suno JSON or a source link.');
  });

  function setLoading(loading) {
    generateBtn.disabled = loading;
    generateLabel.textContent = loading ? 'Generating…' : 'Generate with Gemini';
    spinner.style.display = loading ? 'inline-block' : 'none';
  }

  // Apply a parsed { new_title, new_style, new_lyrics } object to the output fields and save it.
  function applyResult(obj) {
    newTitle.value = obj.new_title || '';
    newStyle.value = obj.new_style || '';
    newLyrics.value = obj.new_lyrics || '';
    outputSection.style.display = '';
    outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return api.saveRecord({
      solutionId: solution.id,
      title: obj.new_title || 'Untitled',
      payload: { new_title: obj.new_title, new_style: obj.new_style, new_lyrics: obj.new_lyrics, source_url: sourceUrl.value.trim() },
    }).then(() => loadHistory());
  }

  // Save inputs only (Gemini busy / failed fallback)
  root.querySelector('#saveInputsBtn').addEventListener('click', async () => {
    const analysis = songAnalysis.value.trim();
    const idea = myIdea.value.trim();
    if (!analysis && !idea) { toast('Nothing to save yet.'); return; }
    const structure = getSelectedStructure(root);
    const payload = { saved_analysis: analysis, saved_idea: idea, saved_structure: structure, source_url: sourceUrl.value.trim(), status: 'inputs-only' };
    const title = idea ? idea.slice(0, 60) : 'Saved inputs';
    try {
      await api.saveRecord({ solutionId: solution.id, title, payload });
      toast('Inputs saved — come back to generate later.');
      await loadHistory();
    } catch (err) { toast(err.message); }
  });

  // Generate + auto-save on success
  root.querySelector('#generateBtn').addEventListener('click', async () => {
    const analysis = songAnalysis.value.trim();
    const idea = myIdea.value.trim();
    const structure = getSelectedStructure(root);
    if (!analysis) { toast('Paste the Meta AI response first.'); return; }
    if (!idea) { toast('Tell me what your new song should be about.'); return; }
    if (!structure) { toast('Select at least one song section.'); return; }

    // Pull the suno_style_tags out of the pasted JSON so we can hand them to Gemini verbatim.
    const { json } = parseMetaAiResponse(analysis);
    const sunoStyleTags = (json && json.suno_style_tags) || '';
    const analysisForGemini = json ? JSON.stringify(json, null, 2) : analysis;

    const parts = [
      `--- SONG ANALYSIS FROM META AI (Suno soundtrack design JSON) ---\n${analysisForGemini}`,
    ];
    if (sunoStyleTags) {
      parts.push(`--- SUNO STYLE TAGS (use these EXACTLY as new_style — do NOT alter, do NOT let creative direction change them) ---\n${sunoStyleTags}`);
    }
    parts.push(
      `--- MY CREATIVE DIRECTION (shapes the title and lyrics only, NOT the style) ---\n${idea}`,
      `--- SONG STRUCTURE (write these sections in this order) ---\n${structure}`
    );
    const combinedText = parts.join('\n\n');

    setLoading(true);
    try {
      const result = await api.generate({ solutionId: solution.id, text: combinedText });
      const out = result.output;
      await applyResult(out);
      toast('Song ready — copy the style + lyrics to Suno, then add your Suno link in the Jukebox!');
    } catch (err) {
      // Show the fallback panel with the full prompt so the user can copy it to another AI,
      // paste the response back, and tap "Use this response".
      const fullPrompt = `${SYSTEM_PROMPT}\n\n${combinedText}`;
      fallbackPrompt.value = fullPrompt;
      fallbackResponse.value = '';
      fallbackSection.style.display = '';
      fallbackSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      toast(`Gemini failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  });

  // Paste-back: take a manual AI's response, parse it, and populate the output fields.
  root.querySelector('#useResponseBtn').addEventListener('click', async () => {
    const raw = fallbackResponse.value.trim();
    if (!raw) { toast('Paste the AI\'s response first.'); return; }
    let obj = null;
    // Strip markdown fences first.
    const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    try { obj = JSON.parse(stripped); } catch {
      // Otherwise grab the first JSON object in the text.
      obj = extractFirstJsonObject(stripped).obj;
    }
    if (obj && (obj.new_title || obj.new_style || obj.new_lyrics)) {
      try {
        await applyResult(obj);
        fallbackSection.style.display = 'none';
        toast('Response applied — copy the style + lyrics to Suno!');
      } catch (err) { toast(err.message); }
    } else {
      toast('Couldn\'t find new_title / new_style / new_lyrics — paste the JSON response.');
    }
  });

  async function loadHistory() {
    try {
      const rows = await api.listRecords(solution.id);
      if (!rows.length) { historyEl.innerHTML = '<p class="empty">No saved songs yet.</p>'; return; }

      historyEl.innerHTML = rows.map((row) => {
        const p = row.payload;
        const isInputOnly = p.status === 'inputs-only';
        const themes = Array.isArray(p.original_lyrics_themes) && p.original_lyrics_themes.length
          ? p.original_lyrics_themes.slice(0, 2).join(' · ')
          : (p.saved_idea ? p.saved_idea.slice(0, 80) : '');
        const style = (p.new_style || p.original_style || '').slice(0, 100);
        const sunoHref = p.suno_link || '';
        const sourceHref = p.source_url || '';

        const sourceLink = sourceHref
          ? `<a class="button secondary" href="${escapeHtml(sourceHref)}" target="_blank" rel="noopener" title="${escapeHtml(sourceHref)}">🔗 Source</a>`
          : '';

        const linkRow = isInputOnly
          ? (sourceHref ? `<div class="jukebox-link-row">${sourceLink}</div>` : '')
          : sunoHref
          ? `<div class="jukebox-link-row">
               ${sourceLink}
               <a class="button secondary" href="${escapeHtml(sunoHref)}" target="_blank" rel="noopener">▶️ Play on Suno</a>
               <button class="button secondary btn-danger clear-link-btn" type="button" data-id="${row.id}">Remove</button>
             </div>`
          : `<div class="jukebox-link-row">
               ${sourceLink}
               <input type="url" class="suno-link-input" data-id="${row.id}" placeholder="Paste Suno link…">
               <button class="button secondary save-link-btn" type="button" data-id="${row.id}">Save</button>
             </div>`;

        return `<article class="history-item jukebox-card" data-id="${row.id}">
          <div class="jukebox-top">
            <div class="jukebox-info">
              <strong class="jukebox-title">${escapeHtml(row.title)}</strong>
              ${themes ? `<p class="jukebox-desc">${escapeHtml(themes)}</p>` : ''}
              ${style ? `<p class="jukebox-style">${escapeHtml(style)}</p>` : ''}
            </div>
            <div class="jukebox-actions">
              <button class="button secondary load-btn" type="button" data-id="${row.id}">Load</button>
              <button class="button secondary btn-danger delete-btn" type="button" data-id="${row.id}">Delete</button>
            </div>
          </div>
          ${linkRow}
        </article>`;
      }).join('');

      // Load
      historyEl.querySelectorAll('.load-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const row = rows.find((r) => String(r.id) === btn.dataset.id);
          if (!row) return;
          const p = row.payload;
          if (p.status === 'inputs-only') {
            if (p.saved_analysis) songAnalysis.value = p.saved_analysis;
            if (p.saved_idea) myIdea.value = p.saved_idea;
            if (p.source_url) sourceUrl.value = p.source_url;
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
            newTitle.value = p.new_title || '';
            newStyle.value = p.new_style || '';
            newLyrics.value = p.new_lyrics || '';
            sourceUrl.value = p.source_url || '';
            outputSection.style.display = '';
            outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            toast('Song loaded.');
          }
        });
      });

      // Delete
      historyEl.querySelectorAll('.delete-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!confirm('Delete this entry from your Jukebox?')) return;
          try { await api.deleteRecord(btn.dataset.id); toast('Deleted.'); await loadHistory(); }
          catch (err) { toast(err.message); }
        });
      });

      // Save Suno link
      historyEl.querySelectorAll('.save-link-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const input = historyEl.querySelector(`.suno-link-input[data-id="${btn.dataset.id}"]`);
          const link = input ? input.value.trim() : '';
          if (!link) { toast('Paste a Suno link first.'); return; }
          const row = rows.find((r) => String(r.id) === btn.dataset.id);
          if (!row) return;
          try {
            await api.updateRecord(btn.dataset.id, { title: row.title, payload: { ...row.payload, suno_link: link } });
            toast('Suno link saved — ▶️ Play button added!');
            await loadHistory();
          } catch (err) { toast(err.message); }
        });
      });

      // Remove Suno link
      historyEl.querySelectorAll('.clear-link-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const row = rows.find((r) => String(r.id) === btn.dataset.id);
          if (!row) return;
          try {
            const updated = { ...row.payload };
            delete updated.suno_link;
            await api.updateRecord(btn.dataset.id, { title: row.title, payload: updated });
            toast('Link removed.');
            await loadHistory();
          } catch (err) { toast(err.message); }
        });
      });

    } catch (err) {
      historyEl.innerHTML = `<p class="empty">${escapeHtml(err.message)}</p>`;
    }
  }

  loadHistory();
}
