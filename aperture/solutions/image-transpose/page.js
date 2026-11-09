import { bindInternalLinks, escapeHtml, layout } from '../../src/ui.js';

// ─── helpers ────────────────────────────────────────────────────────────────

/** Read a File and return { base64, mimeType, dataUrl }. */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const comma = dataUrl.indexOf(',');
      resolve({ base64: dataUrl.slice(comma + 1), mimeType: file.type || 'image/jpeg', dataUrl });
    };
    reader.onerror = () => reject(new Error('Could not read image file'));
    reader.readAsDataURL(file);
  });
}

/** Build a compact text representation of the design JSON for the Phase 2 prompt. */
function designToText(design) {
  const s = design.target_scene || {};
  const id = design.subject_identity || {};
  const rules = design.identity_preservation_rules || {};
  return [
    `SCENE: ${s.subject || ''}`,
    `COMPOSITION: ${s.composition || ''}`,
    `STYLE: ${s.style || ''}`,
    `LIGHTING: ${s.lighting || ''}`,
    `COLORS (primary): ${s.color_palette_primary || ''}`,
    `COLORS (secondary): ${s.color_palette_secondary || ''}`,
    `ELEMENTS: ${s.elements || ''}`,
    `BACKGROUND: ${s.background || ''}`,
    `SUBJECT — gender: ${id.gender || ''}, age: ${id.approximate_age || ''}, pose: ${id.pose || ''}, clothing: ${id.clothing || ''}`,
    `IDENTITY RULES — priority: ${rules.priority || 'maximum'}, facial lock: ${rules.facial_structure_lock || 'maintain all proportions'}, asymmetry: ${rules.natural_asymmetry || 'preserve'}`,
    `EXISTING GENERATION PROMPT:\n${design.final_generation_prompt || ''}`,
  ].join('\n');
}

const PHASE1_PROMPT_TEXT = `IMPORTANT: You must respond with a single valid JSON object only. No markdown, no prose, no explanation — raw JSON only. If you add any text outside the JSON object, the response will be unusable.

The JSON must match this exact structure:
{
  "subject_identity": {
    "gender": "string",
    "approximate_age": "string",
    "facial_features": "string describing facial structure, expression, and defining features",
    "hair": "string describing hair color, length, texture, and style",
    "pose": "string describing body position and posture",
    "clothing": "string describing what the subject is wearing"
  },
  "target_scene": {
    "subject": "one-sentence description of the scene's main subject and action",
    "composition": "string describing framing, angle, depth of field",
    "style": "string describing visual style (e.g. cinematic photography, digital painting)",
    "lighting": "string describing lighting type, direction, and mood",
    "color_palette_primary": "dominant colors",
    "color_palette_secondary": "supporting colors",
    "elements": "key visual elements present in the scene, comma-separated",
    "background": "background description"
  },
  "identity_preservation_rules": {
    "priority": "maximum",
    "facial_structure_lock": "string instruction to lock facial proportions and structure",
    "eyes": "same shape and color as reference photo",
    "nose_shape": "unchanged",
    "lips_shape": "unchanged",
    "face_oval": "unchanged",
    "natural_asymmetry": "preserve",
    "hair_blending_mode": "string",
    "skin_tone_adaptation": "string"
  },
  "final_generation_prompt": "An image generation prompt — written as a vivid visual description to be submitted directly to an AI image generator (Midjourney, DALL-E, Adobe Firefly, Stable Diffusion) to produce an actual output image. Must be a complete, paste-ready single string."
}

TASK: Analyse this scene image and extract the complete design code filling in all fields above. Also write a final_generation_prompt — this is an image generation prompt that will be submitted directly to an AI image generator (such as Midjourney, DALL-E, Adobe Firefly, or Stable Diffusion) to produce an actual output image. It must be written as a vivid, detailed visual description that an image model can render. It must open with 'A photorealistic [style] image of [subject description with MY FACE transposed onto the subject]', include all scene elements, lighting, color palette, and composition details, include the identity preservation rules as explicit directives (e.g. 'preserve exact facial features: unchanged nose, lips, eyes, face oval, and natural asymmetry'), and end with 'Ultra high resolution, cinematic quality.'

Respond with the JSON object only. No other text.`;

function buildPhase2Prompt(extractedDesign) {
  const designText = designToText(extractedDesign);
  return `IMPORTANT: You must respond with a single valid JSON object only. No markdown, no prose, no explanation — raw JSON only. If you add any text outside the JSON object, the response will be unusable.

The JSON must match this exact structure:
{
  "subject_identity": {
    "gender": "string",
    "approximate_age": "string",
    "facial_features": "string describing the reference person's face",
    "hair": "string",
    "pose": "string",
    "clothing": "string"
  },
  "target_scene": {
    "subject": "string",
    "composition": "string",
    "style": "string",
    "lighting": "string",
    "color_palette_primary": "string",
    "color_palette_secondary": "string",
    "elements": "string",
    "background": "string"
  },
  "identity_preservation_rules": {
    "priority": "maximum",
    "facial_structure_lock": "string",
    "eyes": "same shape and color as reference photo",
    "nose_shape": "unchanged",
    "lips_shape": "unchanged",
    "face_oval": "unchanged",
    "natural_asymmetry": "preserve",
    "hair_blending_mode": "string",
    "skin_tone_adaptation": "string"
  },
  "final_generation_prompt": "An image generation prompt — written as a vivid visual description to be submitted directly to an AI image generator (Midjourney, DALL-E, Adobe Firefly, Stable Diffusion) to produce an actual output image. Must be a complete, paste-ready single string."
}

TASK: This is the reference person photo. Using the face and identity from this photo, fill in the JSON above with an identity-preserved design code and a final_generation_prompt. The final_generation_prompt is an image generation prompt that will be submitted directly to an AI image generator (Midjourney, DALL-E, Adobe Firefly, Stable Diffusion) to produce an actual output image. Write it as a vivid, detailed visual description. It must open with 'A photorealistic [style] image of [subject with MY FACE and exact identity transposed onto the subject]', include all scene elements, lighting, composition, and color details, include identity preservation directives (unchanged nose, lips, eyes, face oval, natural asymmetry), and end with 'Ultra high resolution, cinematic quality.'

IDENTITY PRESERVATION BLOCK:
- priority: maximum
- facial_features: keep exactly as in my photo
- nose_shape: unchanged
- lips_shape: unchanged
- eyes: same shape and color
- face_oval: unchanged
- natural_asymmetry: preserve

SCENE DESIGN CODE:
${designText}

Respond with the JSON object only. No other text.`;
}

// ─── render ─────────────────────────────────────────────────────────────────

export function render(root, { api, toast, navigate, solution }) {
  root.innerHTML = layout({
    title: escapeHtml(solution.title),
    subtitle: escapeHtml(solution.description),
    backHref: '/',
    body: `
      <div class="stack">

        <!-- STEP 1 + 2: Upload both images side by side -->
        <section class="card panel">
          <h2>Upload images</h2>

          <div class="upload-row">
            <div class="upload-col">
              <p class="upload-col-label">Scene image</p>
              <p class="hint">The image you want to appear in</p>
              <div class="drop-zone" id="sceneDropZone" tabindex="0" role="button" aria-label="Upload scene image">
                <input type="file" id="sceneInput" accept="image/*" hidden>
                <div class="drop-inner" id="sceneDropInner">
                  <span class="drop-icon">🖼️</span>
                  <span class="drop-label">Click or drag</span>
                </div>
                <img id="scenePreview" class="img-preview" alt="Scene preview" style="display:none">
              </div>
            </div>

            <div class="upload-col">
              <p class="upload-col-label">Your photo</p>
              <p class="hint">Clear front-facing photo of your face</p>
              <div class="drop-zone" id="selfieDropZone" tabindex="0" role="button" aria-label="Upload your photo">
                <input type="file" id="selfieInput" accept="image/*" hidden>
                <div class="drop-inner" id="selfieDropInner">
                  <span class="drop-icon">🤳</span>
                  <span class="drop-label">Click or drag</span>
                </div>
                <img id="selfiePreview" class="img-preview" alt="Your photo preview" style="display:none">
              </div>
            </div>
          </div>

          <div id="step1Actions" class="actions" style="margin-top:20px;">
            <button class="button primary full-btn" type="button" id="analyseBtn" disabled>
              <span id="analyseLabel">Analyse Scene</span>
              <span id="analyseSpinner" class="spinner" style="display:none"></span>
            </button>
          </div>

          <div id="step2Actions" class="actions" style="margin-top:12px;display:none;">
            <button class="button primary full-btn" type="button" id="transposeBtn" disabled>
              <span id="transposeLabel">Generate Transpose Prompt</span>
              <span id="transposeSpinner" class="spinner" style="display:none"></span>
            </button>
          </div>

          <!-- Progress indicator -->
          <div id="progressRow" style="display:none;margin-top:16px;" class="progress-row">
            <span class="progress-step done" id="prog1">\u2713 Scene analysed</span>
            <span class="progress-sep">\u2192</span>
            <span class="progress-step" id="prog2">Generate prompt</span>
          </div>

          <!-- Technical details (hidden by default) -->
          <details style="margin-top:16px;" id="designDetails">
            <summary class="detail-toggle">View scene analysis</summary>
            <div class="design-grid" id="designGrid" style="margin-top:12px;"></div>
            <details style="margin-top:10px;">
              <summary class="detail-toggle" style="font-size:11px;">View raw JSON</summary>
              <textarea id="designJson" class="design-json-textarea" readonly rows="6"></textarea>
            </details>
          </details>
        </section>

        <!-- PHASE 1 fallback panel -->
        <section class="card panel fallback-panel" id="phase1Fallback" style="display:none">
          <div class="fallback-header">
            <div>
              <h2 class="fallback-title">Gemini couldn\u2019t analyse the scene</h2>
              <p class="hint" style="margin:4px 0 0;">Copy the prompt and send it to <a href="https://gemini.google.com" target="_blank" rel="noopener">gemini.google.com</a> with your scene image attached. Then paste the response below.</p>
            </div>
            <button class="button secondary" type="button" id="dismissPhase1Fallback" aria-label="Dismiss">\u2715</button>
          </div>
          <div class="actions" style="margin-top:14px;">
            <button class="button primary" type="button" id="copyPhase1Prompt">Copy prompt</button>
          </div>
          <details style="margin-top:12px;">
            <summary class="detail-toggle">View prompt text</summary>
            <textarea id="phase1FallbackPrompt" class="fallback-textarea" readonly rows="4" style="margin-top:8px;"></textarea>
          </details>
          <label class="field" style="margin-top:16px;">Paste Gemini\u2019s response here
            <textarea id="phase1PasteJson" class="fallback-textarea" rows="6" placeholder="Paste Gemini\u2019s full response here\u2026" style="cursor:text;margin-top:6px;"></textarea>
          </label>
          <div class="actions" style="margin-top:10px;">
            <button class="button primary" type="button" id="phase1UseResponse">Use this response \u2192</button>
          </div>
        </section>

        <!-- PHASE 2 fallback panel -->
        <section class="card panel fallback-panel" id="phase2Fallback" style="display:none">
          <div class="fallback-header">
            <div>
              <h2 class="fallback-title">Gemini couldn\u2019t generate the prompt</h2>
              <p class="hint" style="margin:4px 0 0;">Copy the prompt and send it to <a href="https://gemini.google.com" target="_blank" rel="noopener">gemini.google.com</a> with your photo attached. Then paste the response below.</p>
            </div>
            <button class="button secondary" type="button" id="dismissPhase2Fallback" aria-label="Dismiss">\u2715</button>
          </div>
          <div class="actions" style="margin-top:14px;">
            <button class="button primary" type="button" id="copyPhase2Prompt">Copy prompt</button>
          </div>
          <details style="margin-top:12px;">
            <summary class="detail-toggle">View prompt text</summary>
            <textarea id="phase2FallbackPrompt" class="fallback-textarea" readonly rows="6" style="margin-top:8px;"></textarea>
          </details>
          <label class="field" style="margin-top:16px;">Paste Gemini\u2019s response here
            <textarea id="phase2PasteJson" class="fallback-textarea" rows="6" placeholder="Paste Gemini\u2019s full response here \u2014 JSON or plain text both work." style="cursor:text;margin-top:6px;"></textarea>
          </label>
          <div class="actions" style="margin-top:10px;">
            <button class="button primary" type="button" id="phase2UseResponse">Use this response \u2192</button>
          </div>
        </section>

        <!-- OUTPUT: final prompt -->
        <section class="card panel" id="outputSection" style="display:none">
          <h2>Your generation prompt \u2713</h2>
          <p style="margin:0 0 6px;font-size:14px;"><strong>📎 Upload both your photo and the scene image alongside this prompt</strong> in your image generator for best results.</p>
          <p class="hint" style="margin:0 0 14px;">Works with Midjourney, DALL-E, Adobe Firefly, Gemini image playground, and more.</p>

          <textarea id="finalPrompt" rows="8" style="font-family:ui-monospace,Consolas,monospace;font-size:13px;"></textarea>

          <div class="actions" style="margin-top:12px;">
            <button class="button primary" type="button" id="copyPromptBtn">Copy prompt</button>
            <button class="button secondary" type="button" id="saveBtn">Save to gallery</button>
          </div>

          <details style="margin-top:14px;">
            <summary class="detail-toggle">View identity preservation rules</summary>
            <div class="design-grid" id="rulesGrid" style="margin-top:10px;"></div>
          </details>
        </section>

        <!-- Gallery -->
        <section class="card panel">
          <h2>Gallery</h2>
          <div class="history" id="history"></div>
        </section>

      </div>

      <style>
        /* Two-column upload row */
        .upload-row { display:flex; gap:16px; }
        .upload-col { flex:1; min-width:0; display:flex; flex-direction:column; }
        .upload-col-label { font-size:14px; font-weight:700; color:var(--ink); margin:0 0 2px; }

        /* Drop zones */
        .drop-zone { border:2px dashed var(--line); border-radius:12px; flex:1; min-height:130px; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:border-color 0.15s, background 0.15s; overflow:hidden; }
        .drop-zone:hover, .drop-zone.drag-over { border-color:var(--accent); background:#fdf0ea; }
        .drop-inner { display:flex; flex-direction:column; align-items:center; gap:6px; padding:18px 12px; pointer-events:none; }
        .drop-icon { font-size:28px; }
        .drop-label { font-size:13px; color:var(--muted); text-align:center; }
        .img-preview { width:100%; max-height:200px; object-fit:cover; border-radius:10px; display:block; }

        /* Full-width button */
        .full-btn { width:100%; justify-content:center; min-height:48px; font-size:15px; }

        /* Progress row */
        .progress-row { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .progress-step { font-size:13px; color:var(--muted); padding:4px 10px; border-radius:20px; background:#f0ede8; }
        .progress-step.done { background:#eaf5ea; color:#2a7a3b; font-weight:700; }
        .progress-step.active { background:#fdf0ea; color:var(--accent); font-weight:700; }
        .progress-sep { font-size:14px; color:var(--muted); }

        /* Detail toggles */
        .detail-toggle { font-size:12px; color:var(--muted); cursor:pointer; user-select:none; }
        .detail-toggle:hover { color:var(--accent); }

        /* Design grid */
        .design-grid { display:flex; flex-direction:column; gap:6px; }
        .design-row { display:flex; gap:8px; flex-wrap:wrap; border-bottom:1px solid var(--line); padding-bottom:6px; }
        .design-label { font-size:11px; color:var(--muted); font-weight:700; min-width:110px; flex-shrink:0; padding-top:2px; text-transform:uppercase; letter-spacing:0.04em; }
        .design-value { font-size:12px; color:var(--ink); flex:1; min-width:0; word-break:break-word; }

        /* Textareas */
        .design-json-textarea { font-family:ui-monospace,Consolas,monospace; font-size:11px; color:var(--ink); background:#f6f1e8; border-color:var(--line); resize:vertical; min-height:100px; cursor:text; margin-top:6px; white-space:pre-wrap; word-break:break-word; overflow-wrap:anywhere; }
        .fallback-textarea { font-family:ui-monospace,Consolas,monospace; font-size:12px; color:var(--ink); background:#f6f1e8; border-color:var(--line); resize:vertical; min-height:80px; white-space:pre-wrap; word-break:break-word; overflow-wrap:anywhere; }

        /* Fallback panel */
        .fallback-panel { border-color:#e8c4c0 !important; background:#fff9f8 !important; }
        .fallback-header { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
        .fallback-title { margin:0; font-size:16px; color:#c0392b; }

        /* Spinner */
        .spinner { width:16px; height:16px; border:2px solid rgba(255,255,255,0.4); border-top-color:#fff; border-radius:50%; animation:spin 0.7s linear infinite; display:inline-block; margin-left:6px; }
        @keyframes spin { to { transform:rotate(360deg); } }

        /* Small result drop zone */
        .result-drop-zone { border:2px dashed var(--line); border-radius:10px; min-height:70px; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:border-color 0.15s, background 0.15s; overflow:hidden; margin-top:10px; }
        .result-drop-zone:hover, .result-drop-zone.drag-over { border-color:var(--accent); background:#fdf0ea; }
        .result-drop-inner { display:flex; align-items:center; gap:8px; padding:10px 14px; pointer-events:none; font-size:13px; color:var(--muted); }

        /* Gallery card */
        .gallery-card { padding:14px 16px; min-width:0; overflow:hidden; }
        .gallery-top { display:flex; justify-content:space-between; align-items:flex-start; gap:10px; }
        .gallery-info { flex:1; min-width:0; overflow:hidden; }
        .gallery-title { font-size:15px; display:block; margin-bottom:3px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .gallery-desc { margin:0 0 3px; font-size:13px; color:var(--text); opacity:0.8; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .gallery-actions { display:flex; gap:6px; flex-shrink:0; align-items:flex-start; flex-wrap:wrap; }
        .gallery-actions .button { font-size:12px; min-height:38px; padding:0 12px; }

        /* Thumbnail strip */
        .ref-strip { display:flex; gap:8px; margin-top:10px; }
        .ref-thumb-wrap { flex:1; min-width:0; }
        .ref-thumb-label { font-size:10px; color:var(--muted); font-weight:700; margin-bottom:3px; text-transform:uppercase; letter-spacing:0.05em; }
        .ref-thumb { width:100%; max-height:110px; object-fit:cover; border-radius:8px; display:block; border:1px solid var(--line); }

        /* Danger button */
        .btn-danger { color:#c0392b !important; border-color:#e8c4c0 !important; }
        .btn-danger:hover { background:#fdf0ea !important; border-color:#c0392b !important; }

        @media (max-width: 500px) {
          .upload-row { flex-direction:column; }
          .gallery-top { flex-direction:column; gap:8px; }
          .gallery-actions { width:100%; justify-content:flex-end; }
          .ref-strip { flex-direction:column; }
        }
      </style>
    `,
  });

  bindInternalLinks(root, navigate);

  // ── element refs ──────────────────────────────────────────────────────────
  const sceneDropZone    = root.querySelector('#sceneDropZone');
  const sceneInput       = root.querySelector('#sceneInput');
  const sceneDropInner   = root.querySelector('#sceneDropInner');
  const scenePreview     = root.querySelector('#scenePreview');
  const analyseBtn       = root.querySelector('#analyseBtn');
  const analyseLabel     = root.querySelector('#analyseLabel');
  const analyseSpinner   = root.querySelector('#analyseSpinner');

  const phase1Fallback       = root.querySelector('#phase1Fallback');
  const phase1FallbackPrompt = root.querySelector('#phase1FallbackPrompt');
  const phase1PasteJson      = root.querySelector('#phase1PasteJson');

  const designGrid       = root.querySelector('#designGrid');
  const designJsonTA     = root.querySelector('#designJson');
  const designDetails    = root.querySelector('#designDetails');

  const selfieDropZone   = root.querySelector('#selfieDropZone');
  const selfieInput      = root.querySelector('#selfieInput');
  const selfieDropInner  = root.querySelector('#selfieDropInner');
  const selfiePreview    = root.querySelector('#selfiePreview');
  const transposeBtn     = root.querySelector('#transposeBtn');
  const transposeLabel   = root.querySelector('#transposeLabel');
  const transposeSpinner = root.querySelector('#transposeSpinner');
  const step1Actions     = root.querySelector('#step1Actions');
  const step2Actions     = root.querySelector('#step2Actions');
  const progressRow      = root.querySelector('#progressRow');
  const prog1            = root.querySelector('#prog1');
  const prog2            = root.querySelector('#prog2');

  const phase2Fallback       = root.querySelector('#phase2Fallback');
  const phase2FallbackPrompt = root.querySelector('#phase2FallbackPrompt');
  const phase2PasteJson      = root.querySelector('#phase2PasteJson');

  const outputSection    = root.querySelector('#outputSection');
  const finalPromptTA    = root.querySelector('#finalPrompt');
  const rulesGrid        = root.querySelector('#rulesGrid');
  const historyEl        = root.querySelector('#history');

  // ── state ─────────────────────────────────────────────────────────────────
  let sceneFile       = null;
  let selfieFile      = null;
  let sceneDataUrl    = null; // stored with gallery record
  let selfieDataUrl   = null; // stored with gallery record
  let extractedDesign = null;

  // ── drop-zone wiring ──────────────────────────────────────────────────────
  function wireZone(zone, input, preview, dropInner, onFileCb) {
    function handleFile(file) {
      if (!file || !file.type.startsWith('image/')) { toast('Please use an image file.'); return; }
      preview.src = URL.createObjectURL(file);
      preview.style.display = 'block';
      dropInner.style.display = 'none';
      onFileCb(file);
    }
    zone.addEventListener('click', () => input.click());
    zone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') input.click(); });
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', (e) => { e.preventDefault(); zone.classList.remove('drag-over'); handleFile(e.dataTransfer?.files?.[0]); });
    input.addEventListener('change', () => handleFile(input.files?.[0]));
  }

  wireZone(sceneDropZone, sceneInput, scenePreview, sceneDropInner, (file) => { sceneFile = file; analyseBtn.disabled = false; });
  wireZone(selfieDropZone, selfieInput, selfiePreview, selfieDropInner, (file) => { selfieFile = file; transposeBtn.disabled = false; });

  // ── loading helpers ────────────────────────────────────────────────────────
  function setAnalysing(loading) {
    analyseBtn.disabled = loading;
    analyseLabel.textContent = loading ? 'Analysing\u2026' : 'Extract Design Code';
    analyseSpinner.style.display = loading ? 'inline-block' : 'none';
  }
  function setTransposing(loading) {
    transposeBtn.disabled = loading;
    transposeLabel.textContent = loading ? 'Generating\u2026' : 'Generate Transpose Prompt';
    transposeSpinner.style.display = loading ? 'inline-block' : 'none';
  }

  // ── design grid helper ─────────────────────────────────────────────────────
  function renderDesignGrid(el, rows) {
    el.innerHTML = rows
      .filter(([, v]) => v)
      .map(([label, value]) => `<div class="design-row">
        <span class="design-label">${escapeHtml(label)}</span>
        <span class="design-value">${escapeHtml(String(value))}</span>
      </div>`).join('');
  }

  // ── apply Phase 1 result ───────────────────────────────────────────────────
  function applyPhase1Result(design) {
    extractedDesign = design;
    const s = design.target_scene || {};
    const id = design.subject_identity || {};
    renderDesignGrid(designGrid, [
      ['Subject',            s.subject],
      ['Style',              s.style],
      ['Composition',        s.composition],
      ['Lighting',           s.lighting],
      ['Colors (primary)',   s.color_palette_primary],
      ['Colors (secondary)', s.color_palette_secondary],
      ['Elements',           s.elements],
      ['Background',         s.background],
      ['Subject gender',     id.gender],
      ['Subject age',        id.approximate_age],
      ['Subject pose',       id.pose],
      ['Subject clothing',   id.clothing],
    ]);
    designJsonTA.value = JSON.stringify(design, null, 2);
    phase1Fallback.style.display = 'none';
    // Show progress + swap to step 2 button
    progressRow.style.display = '';
    prog1.className = 'progress-step done';
    prog2.className = 'progress-step active';
    step1Actions.style.display = 'none';
    step2Actions.style.display = '';
    transposeBtn.disabled = !selfieFile;
  }

  // ── apply Phase 2 result ───────────────────────────────────────────────────
  async function applyPhase2Result(out) {
    const rules = out.identity_preservation_rules || {};
    finalPromptTA.value = out.final_generation_prompt || '';
    renderDesignGrid(rulesGrid, [
      ['Priority',              rules.priority],
      ['Facial structure lock', rules.facial_structure_lock],
      ['Eyes',                  rules.eyes],
      ['Nose shape',            rules.nose_shape],
      ['Lips shape',            rules.lips_shape],
      ['Face oval',             rules.face_oval],
      ['Natural asymmetry',     rules.natural_asymmetry],
      ['Hair blending',         rules.hair_blending_mode],
      ['Skin tone adaptation',  rules.skin_tone_adaptation],
    ]);
    phase2Fallback.style.display = 'none';
    // Mark step 2 done in progress row
    prog2.className = 'progress-step done';
    prog2.textContent = '\u2713 Prompt ready';
    step2Actions.style.display = 'none';
    outputSection.style.display = '';
    outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const sceneSubject = (extractedDesign?.target_scene?.subject || 'Scene').slice(0, 60);
    try {
      await api.saveRecord({
        solutionId: solution.id,
        title: sceneSubject,
        payload: {
          scene_design: extractedDesign,
          transpose_result: out,
          final_generation_prompt: out.final_generation_prompt || '',
          scene_image: sceneDataUrl || null,
          selfie_image: selfieDataUrl || null,
          result_image: null,
        },
      });
      await loadHistory();
    } catch (e) { /* non-fatal */ }
    toast('Prompt ready \u2014 copy and paste into your image generator!');
  }

  // ── PHASE 1 ────────────────────────────────────────────────────────────────
  analyseBtn.addEventListener('click', async () => {
    if (!sceneFile) { toast('Upload a scene image first.'); return; }
    setAnalysing(true);
    try {
      const { base64, mimeType, dataUrl } = await fileToBase64(sceneFile);
      sceneDataUrl = dataUrl;
      const result = await api.generate({ solutionId: solution.id, text: PHASE1_PROMPT_TEXT, imageBase64: base64, mimeType });
      applyPhase1Result(result.output);
      toast('Scene analysed \u2014 now upload your photo and click Generate!');
    } catch (err) {
      phase1FallbackPrompt.value = PHASE1_PROMPT_TEXT;
      phase1PasteJson.value = '';
      phase1Fallback.style.display = '';
      phase1Fallback.scrollIntoView({ behavior: 'smooth', block: 'start' });
      toast(`Analysis failed: ${err.message}`);
    } finally { setAnalysing(false); }
  });

  root.querySelector('#copyPhase1Prompt').addEventListener('click', () =>
    navigator.clipboard.writeText(phase1FallbackPrompt.value).then(() =>
      toast('Prompt copied \u2014 paste into Gemini with your scene image attached!')));

  root.querySelector('#dismissPhase1Fallback').addEventListener('click', () => { phase1Fallback.style.display = 'none'; });

  root.querySelector('#phase1UseResponse').addEventListener('click', () => {
    const raw = phase1PasteJson.value.trim();
    if (!raw) { toast('Paste Gemini\u2019s JSON response first.'); return; }
    let parsed;
    try { parsed = JSON.parse(raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()); }
    catch { toast('Could not parse that as JSON. Make sure you paste the full JSON block from Gemini.'); return; }
    applyPhase1Result(parsed);
    toast('Design code loaded \u2014 now upload your photo!');
  });

  // ── PHASE 2 ────────────────────────────────────────────────────────────────
  transposeBtn.addEventListener('click', async () => {
    if (!selfieFile) { toast('Upload your photo first.'); return; }
    if (!extractedDesign) { toast('Extract the scene design code first (Step 1).'); return; }
    setTransposing(true);
    const combinedText = buildPhase2Prompt(extractedDesign);
    try {
      const { base64, mimeType, dataUrl } = await fileToBase64(selfieFile);
      selfieDataUrl = dataUrl;
      const result = await api.generate({ solutionId: solution.id, text: combinedText, imageBase64: base64, mimeType });
      await applyPhase2Result(result.output);
    } catch (err) {
      phase2FallbackPrompt.value = combinedText;
      phase2PasteJson.value = '';
      phase2Fallback.style.display = '';
      phase2Fallback.scrollIntoView({ behavior: 'smooth', block: 'start' });
      toast(`Transpose failed: ${err.message}`);
    } finally { setTransposing(false); }
  });

  root.querySelector('#copyPhase2Prompt').addEventListener('click', () =>
    navigator.clipboard.writeText(phase2FallbackPrompt.value).then(() =>
      toast('Prompt copied \u2014 paste into Gemini with your photo attached!')));

  root.querySelector('#dismissPhase2Fallback').addEventListener('click', () => { phase2Fallback.style.display = 'none'; });

  root.querySelector('#phase2UseResponse').addEventListener('click', async () => {
    const raw = phase2PasteJson.value.trim();
    if (!raw) { toast('Paste Gemini\u2019s response first.'); return; }
    let parsed = null;
    try { parsed = JSON.parse(raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()); }
    catch { /* try prose */ }
    if (!parsed) {
      const m = raw.match(/(?:#{1,4}\s*Final Generation Prompt|[\*_]{1,2}Final Generation Prompt[\*_]{1,2})[^\n]*\n+([\s\S]+?)(?:\n---|\n#{1,4}|$)/i);
      if (m) {
        parsed = {
          final_generation_prompt: m[1].trim(),
          subject_identity: extractedDesign?.subject_identity || {},
          target_scene: extractedDesign?.target_scene || {},
          identity_preservation_rules: extractedDesign?.identity_preservation_rules || { priority: 'maximum', facial_structure_lock: 'maintain all proportions', natural_asymmetry: 'preserve' },
        };
        toast('Extracted the generation prompt from Gemini\u2019s response \u2014 loading\u2026');
      }
    }
    if (!parsed) { toast('Couldn\u2019t find a JSON block or a "Final Generation Prompt" section. Try copying just the prompt text and pasting it manually.'); return; }
    await applyPhase2Result(parsed);
    toast('Transpose prompt loaded!');
  });

  // ── copy / save ────────────────────────────────────────────────────────────
  root.querySelector('#copyPromptBtn').addEventListener('click', () => {
    const text = finalPromptTA.value;
    if (!text) { toast('Nothing to copy yet.'); return; }
    navigator.clipboard.writeText(text).then(() => toast('Prompt copied!'));
  });

  root.querySelector('#saveBtn').addEventListener('click', async () => {
    const text = finalPromptTA.value;
    if (!text) { toast('Generate a prompt first.'); return; }
    if (!extractedDesign) { toast('No design data to save.'); return; }
    try {
      await api.saveRecord({
        solutionId: solution.id,
        title: (extractedDesign.target_scene?.subject || 'Scene').slice(0, 60),
        payload: {
          scene_design: extractedDesign,
          final_generation_prompt: text,
          scene_image: sceneDataUrl || null,
          selfie_image: selfieDataUrl || null,
          result_image: null,
        },
      });
      toast('Saved to gallery.');
      await loadHistory();
    } catch (err) { toast(err.message); }
  });

  // ── gallery ────────────────────────────────────────────────────────────────
  async function loadHistory() {
    try {
      const rows = await api.listRecords(solution.id);
      if (!rows.length) { historyEl.innerHTML = '<p class="empty">No saved transpositions yet.</p>'; return; }

      historyEl.innerHTML = rows.map((row) => {
        const p = row.payload;
        const desc = (p.scene_design?.target_scene?.subject || p.final_generation_prompt || '').slice(0, 100);
        const style = (p.scene_design?.target_scene?.style || '').slice(0, 80);
        const hasScene  = !!p.scene_image;
        const hasSelfie = !!p.selfie_image;
        const hasResult = !!p.result_image;

        const refStrip = (hasScene || hasSelfie) ? `
          <div class="ref-strip">
            ${hasScene  ? `<div class="ref-thumb-wrap"><p class="ref-thumb-label">Scene</p><img class="ref-thumb" src="${p.scene_image}" alt="Scene"></div>` : ''}
            ${hasSelfie ? `<div class="ref-thumb-wrap"><p class="ref-thumb-label">Your photo</p><img class="ref-thumb" src="${p.selfie_image}" alt="Your photo"></div>` : ''}
            ${hasResult ? `<div class="ref-thumb-wrap"><p class="ref-thumb-label">Result</p><img class="ref-thumb" src="${p.result_image}" alt="Result image"></div>` : ''}
          </div>` : '';

        const resultZone = !hasResult ? `
          <div class="result-drop-zone" id="resultZone-${row.id}" tabindex="0" role="button" aria-label="Upload result image">
            <input type="file" id="resultInput-${row.id}" accept="image/*" hidden>
            <div class="result-drop-inner">
              <span>🖼️</span>
              <span>Upload the generated result image here</span>
            </div>
          </div>` : '';

        return `<article class="history-item gallery-card" data-id="${row.id}">
          <div class="gallery-top">
            <div class="gallery-info">
              <strong class="gallery-title">${escapeHtml(row.title)}</strong>
              ${desc ? `<p class="gallery-desc">${escapeHtml(desc)}</p>` : ''}
              ${style ? `<p class="gallery-desc" style="font-size:11px;opacity:0.7;">${escapeHtml(style)}</p>` : ''}
            </div>
            <div class="gallery-actions">
              <button class="button secondary load-btn" type="button" data-id="${row.id}">Load</button>
              <button class="button secondary btn-danger delete-btn" type="button" data-id="${row.id}">Delete</button>
            </div>
          </div>
          ${refStrip}
          ${resultZone}
        </article>`;
      }).join('');

      // Wire result image drop zones
      rows.forEach((row) => {
        const zone  = historyEl.querySelector(`#resultZone-${row.id}`);
        const input = historyEl.querySelector(`#resultInput-${row.id}`);
        if (!zone || !input) return;

        function handleResultFile(file) {
          if (!file || !file.type.startsWith('image/')) { toast('Please use an image file.'); return; }
          const reader = new FileReader();
          reader.onload = async () => {
            const dataUrl = reader.result;
            const updated = { ...row.payload, result_image: dataUrl };
            try {
              await api.updateRecord(row.id, { title: row.title, payload: updated });
              toast('Result image saved to gallery!');
              await loadHistory();
            } catch (err) { toast(err.message); }
          };
          reader.readAsDataURL(file);
        }

        zone.addEventListener('click', () => input.click());
        zone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') input.click(); });
        zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
        zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
        zone.addEventListener('drop', (e) => { e.preventDefault(); zone.classList.remove('drag-over'); handleResultFile(e.dataTransfer?.files?.[0]); });
        input.addEventListener('change', () => handleResultFile(input.files?.[0]));
      });

      // Load
      historyEl.querySelectorAll('.load-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const row = rows.find((r) => String(r.id) === btn.dataset.id);
          if (!row) return;
          const p = row.payload;
          if (p.scene_design) {
            extractedDesign = p.scene_design;
            const s = extractedDesign.target_scene || {};
            const id = extractedDesign.subject_identity || {};
            renderDesignGrid(designGrid, [
              ['Subject',            s.subject],
              ['Style',              s.style],
              ['Composition',        s.composition],
              ['Lighting',           s.lighting],
              ['Colors (primary)',   s.color_palette_primary],
              ['Colors (secondary)', s.color_palette_secondary],
              ['Elements',           s.elements],
              ['Background',         s.background],
              ['Subject gender',     id.gender],
              ['Subject age',        id.approximate_age],
              ['Subject pose',       id.pose],
              ['Subject clothing',   id.clothing],
            ]);
            designJsonTA.value = JSON.stringify(extractedDesign, null, 2);
            // Restore simplified UI state
            progressRow.style.display = '';
            prog1.className = 'progress-step done';
            sceneDataUrl  = p.scene_image  || null;
            selfieDataUrl = p.selfie_image || null;
            if (p.scene_image)  { scenePreview.src = p.scene_image;   scenePreview.style.display = 'block';   sceneDropInner.style.display = 'none'; }
            if (p.selfie_image) { selfiePreview.src = p.selfie_image; selfiePreview.style.display = 'block'; selfieDropInner.style.display = 'none'; }
          }
          if (p.final_generation_prompt || p.transpose_result?.final_generation_prompt) {
            finalPromptTA.value = p.final_generation_prompt || p.transpose_result?.final_generation_prompt || '';
            outputSection.style.display = '';
            prog2.className = 'progress-step done';
            prog2.textContent = '\u2713 Prompt ready';
            step1Actions.style.display = 'none';
            step2Actions.style.display = 'none';
          } else {
            step1Actions.style.display = 'none';
            step2Actions.style.display = '';
            prog2.className = 'progress-step active';
            transposeBtn.disabled = !selfieFile;
          }
          outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          toast('Record loaded.');
        });
      });

      // Delete
      historyEl.querySelectorAll('.delete-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!confirm('Delete this record from your gallery?')) return;
          try { await api.deleteRecord(btn.dataset.id); toast('Deleted.'); await loadHistory(); }
          catch (err) { toast(err.message); }
        });
      });

    } catch (err) {
      historyEl.innerHTML = `<p class="empty">${escapeHtml(err.message)}</p>`;
    }
  }

  loadHistory();
}
