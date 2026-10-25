import { bindInternalLinks, escapeHtml, layout, pretty } from '../../src/ui.js';

const MAX_BYTES = 3_500_000;
const MAX_EDGE = 1280;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image.'));
    };
    image.src = url;
  });
}

async function fileToPayload(file) {
  if (!file?.type.startsWith('image/')) throw new Error('Please choose an image file.');
  if (file.size > MAX_BYTES) throw new Error('Image is too large. Use a smaller screenshot.');
  const image = await loadImage(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, width, height);
  const preview = canvas.toDataURL('image/jpeg', 0.72);
  return { mimeType: 'image/jpeg', imageBase64: preview.slice(preview.indexOf(',') + 1), preview };
}

function titleFrom(payload) {
  return payload?.title || payload?.summary || 'Untitled capture';
}

export function render(root, { api, toast, navigate, solution }) {
  let pendingImage = null;

  root.innerHTML = layout({
    title: escapeHtml(solution.title),
    subtitle: escapeHtml(solution.description),
    showBack: true,
    body: `
      <div class="stack">
        <section class="card panel">
          <h2>1. Collect input</h2>
          <p class="hint">Paste notes, drop a screenshot, or both. Nothing is sent to Gemini until you click Generate.</p>
          <label class="field">Text
            <textarea id="inputText" placeholder="Meeting notes, a receipt description, a list…"></textarea>
          </label>
          <div class="dropzone" id="dropZone" tabindex="0">
            <strong>Drop, paste, or choose an image</strong>
            <span>PNG, JPG, or WEBP</span>
            <img class="preview" id="previewImage" alt="" hidden />
          </div>
          <input id="fileInput" type="file" accept="image/*" hidden />
          <div class="actions">
            <button class="button secondary" type="button" id="chooseImage">Choose image</button>
            <button class="button secondary" type="button" id="clearImage">Clear image</button>
            <button class="button primary" type="button" id="generateBtn">Generate with Gemini</button>
          </div>
        </section>
        <section class="card panel">
          <h2>2. Review output</h2>
          <p class="hint">Edit the JSON if Gemini missed something. Saving writes it to D1.</p>
          <label class="field">Structured JSON
            <textarea id="outputJson" placeholder='{"title":"","summary":"","date":"","items":[]}'></textarea>
          </label>
          <div class="actions">
            <button class="button primary" type="button" id="saveBtn">Save record</button>
          </div>
        </section>
        <section class="card panel">
          <h2>3. Saved history</h2>
          <p class="hint">Records for this solution only.</p>
          <div class="history" id="history"></div>
        </section>
      </div>
    `,
  });

  bindInternalLinks(root, navigate);

  const inputText = root.querySelector('#inputText');
  const outputJson = root.querySelector('#outputJson');
  const dropZone = root.querySelector('#dropZone');
  const fileInput = root.querySelector('#fileInput');
  const preview = root.querySelector('#previewImage');
  const historyEl = root.querySelector('#history');

  function setImage(payload) {
    pendingImage = payload;
    if (payload) {
      preview.src = payload.preview;
      preview.hidden = false;
    } else {
      preview.hidden = true;
      preview.removeAttribute('src');
    }
  }

  async function handleFile(file) {
    try {
      setImage(await fileToPayload(file));
    } catch (err) {
      toast(err.message);
    }
  }

  async function loadHistory() {
    try {
      const rows = await api.listRecords(solution.id);
      if (!rows.length) {
        historyEl.innerHTML = '<p class="empty">No saved records yet.</p>';
        return;
      }
      historyEl.innerHTML = rows.map((row) => `
        <article class="history-item" data-id="${row.id}">
          <div>
            <strong>${escapeHtml(row.title || 'Untitled')}</strong>
            <div class="history-meta">${escapeHtml(row.createdAt)}</div>
          </div>
          <button class="button ghost-danger" type="button" data-delete="${row.id}">Delete</button>
          <pre>${escapeHtml(pretty(row.payload))}</pre>
        </article>
      `).join('');
    } catch (err) {
      historyEl.innerHTML = `<p class="empty">${escapeHtml(err.message)}</p>`;
    }
  }

  root.querySelector('#chooseImage').addEventListener('click', () => fileInput.click());
  root.querySelector('#clearImage').addEventListener('click', () => {
    pendingImage = null;
    fileInput.value = '';
    setImage(null);
  });
  fileInput.addEventListener('change', (event) => event.target.files[0] && handleFile(event.target.files[0]));
  ['dragenter', 'dragover'].forEach((type) => dropZone.addEventListener(type, (event) => {
    event.preventDefault();
    dropZone.classList.add('dragging');
  }));
  ['dragleave', 'drop'].forEach((type) => dropZone.addEventListener(type, (event) => {
    event.preventDefault();
    dropZone.classList.remove('dragging');
  }));
  dropZone.addEventListener('drop', (event) => {
    const file = [...(event.dataTransfer?.files || [])].find((item) => item.type.startsWith('image/'));
    if (file) handleFile(file);
  });
  dropZone.addEventListener('click', () => fileInput.click());
  document.addEventListener('paste', onPaste);

  function onPaste(event) {
    if (!root.isConnected) {
      document.removeEventListener('paste', onPaste);
      return;
    }
    const item = [...(event.clipboardData?.items || [])].find((entry) => entry.type.startsWith('image/'));
    if (item) handleFile(item.getAsFile());
  }

  root.querySelector('#generateBtn').addEventListener('click', async () => {
    const text = inputText.value.trim();
    if (!text && !pendingImage) return toast('Add some text or an image first.');
    const button = root.querySelector('#generateBtn');
    button.disabled = true;
    button.textContent = pendingImage ? 'Generating… (image can take ~20s)' : 'Generating…';
    try {
      const result = await api.generate({
        solutionId: solution.id,
        text,
        imageBase64: pendingImage?.imageBase64,
        mimeType: pendingImage?.mimeType,
      });
      outputJson.value = pretty(result.output);
      toast('Review the JSON, then save.');
    } catch (err) {
      toast(err.message);
    } finally {
      button.disabled = false;
      button.textContent = 'Generate with Gemini';
    }
  });

  root.querySelector('#saveBtn').addEventListener('click', async () => {
    let payload;
    try {
      payload = JSON.parse(outputJson.value);
    } catch {
      return toast('Output is not valid JSON.');
    }
    try {
      await api.saveRecord({
        solutionId: solution.id,
        title: titleFrom(payload),
        payload,
      });
      toast('Record saved.');
      await loadHistory();
    } catch (err) {
      toast(err.message);
    }
  });

  historyEl.addEventListener('click', async (event) => {
    const id = event.target.dataset?.delete;
    if (!id) return;
    if (!confirm('Delete this record?')) return;
    try {
      await api.deleteRecord(id);
      toast('Record deleted.');
      await loadHistory();
    } catch (err) {
      toast(err.message);
    }
  });

  loadHistory();
}
