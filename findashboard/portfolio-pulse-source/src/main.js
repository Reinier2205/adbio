import './styles.css';
import Chart from 'chart.js/auto';
import { createIcons, Upload, Clipboard, WalletCards, TrendingUp, CalendarDays, ShieldCheck, MoreHorizontal, ArrowUpRight, ArrowDownRight, Minus, X, ImagePlus, Trash2, Download, FileUp, Check, Plus, ChevronDown, Info, RotateCcw } from 'lucide';
import { createWorker } from 'tesseract.js';

const STORAGE_KEY = 'portfolio-pulse-v1';
const RANGE_KEY = 'portfolio-pulse-range';
const seed = [{
  date: '2026-07-10',
  total: 11084990.03,
  funds: [
    { name: 'Living Annuity', code: 'AGLA1133029', value: 9285784.84 },
    { name: 'Investment Platform Unit Trust', code: 'AGLP1134728', value: 1540739.04 },
    { name: 'Tax-Free Investment', code: 'AGTF1219326', value: 258466.15 }
  ]
}];

let records = loadRecords();
let range = localStorage.getItem(RANGE_KEY) || '4w';
let charts = {};
let pendingImage = null;

const currency = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2 });
const compactCurrency = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', notation: 'compact', maximumFractionDigits: 1 });
const dateLong = new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });

function loadRecords() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) && saved.length ? saved.sort(sortDate) : seed;
  } catch { return seed; }
}
function saveRecords() { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); }
function sortDate(a, b) { return new Date(a.date) - new Date(b.date); }
function money(value) { return currency.format(value).replace('ZAR', 'R'); }
function latest() { return records.at(-1); }
function previous() { return records.at(-2); }
function delta(current, old) { return old == null ? null : current - old; }
function percent(current, old) { return !old ? null : ((current - old) / old) * 100; }
function escapeHtml(s = '') { return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

function changeMarkup(value, pct, label = 'since last upload') {
  if (value == null) return `<span class="change neutral"><i data-lucide="minus"></i> First record</span>`;
  const type = value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral';
  const icon = value > 0 ? 'arrow-up-right' : value < 0 ? 'arrow-down-right' : 'minus';
  const sign = value > 0 ? '+' : '';
  return `<span class="change ${type}"><i data-lucide="${icon}"></i>${sign}${money(value)} <small>(${sign}${pct.toFixed(2)}%) ${label}</small></span>`;
}

function render() {
  const now = latest();
  const before = previous();
  const totalDelta = delta(now.total, before?.total);
  const totalPct = percent(now.total, before?.total);
  const fundRows = now.funds.map(fund => {
    const oldFund = before?.funds.find(f => f.name.toLowerCase() === fund.name.toLowerCase() || (fund.code && f.code === fund.code));
    const d = delta(fund.value, oldFund?.value);
    const p = percent(fund.value, oldFund?.value);
    return `<tr><td><div class="fund-name">${escapeHtml(fund.name)}</div><div class="fund-code">${escapeHtml(fund.code || 'No account code')}</div></td><td class="amount">${money(fund.value)}</td><td>${changeMarkup(d, p)}</td><td><button class="icon-btn row-menu" aria-label="More options"><i data-lucide="more-horizontal"></i></button></td></tr>`;
  }).join('');

  document.querySelector('#app').innerHTML = `
    <div class="shell">
      <aside class="sidebar">
        <a class="brand" href="#"><span class="brand-mark"><i data-lucide="trending-up"></i></span><span>Portfolio <b>Pulse</b></span></a>
        <nav aria-label="Main navigation">
          <a class="active" href="#overview"><i data-lucide="wallet-cards"></i>Overview</a>
          <a href="#history"><i data-lucide="calendar-days"></i>History</a>
          <a href="#privacy"><i data-lucide="shield-check"></i>Privacy</a>
        </nav>
        <div class="privacy-note"><i data-lucide="shield-check"></i><div><strong>Private by design</strong><span>Your records stay in this browser.</span></div></div>
      </aside>
      <main>
        <header class="topbar">
          <button class="mobile-brand" aria-label="Portfolio Pulse"><span class="brand-mark"><i data-lucide="trending-up"></i></span>Portfolio Pulse</button>
          <div class="header-actions">
            <button class="button secondary" id="pasteBtn"><i data-lucide="clipboard"></i><span>Paste screenshot</span></button>
            <button class="button primary" id="uploadBtn"><i data-lucide="upload"></i><span>Upload weekly update</span></button>
            <input id="fileInput" type="file" accept="image/*" hidden />
          </div>
        </header>
        <div class="content" id="overview">
          <section class="welcome">
            <div><p class="eyebrow">Portfolio overview</p><h1>Your money, clearly tracked.</h1><p>Last updated ${dateLong.format(new Date(now.date + 'T12:00:00'))}</p></div>
            <button class="button primary desktop-upload" id="heroUpload"><i data-lucide="upload"></i>Upload weekly update</button>
          </section>
          <section class="summary-grid">
            <article class="card balance-card">
              <div class="card-label"><span>Total portfolio balance</span><span class="status-dot">Current</span></div>
              <div class="hero-number">${money(now.total)}</div>
              ${changeMarkup(totalDelta, totalPct)}
            </article>
            <article class="card stat-card"><div class="stat-icon"><i data-lucide="trending-up"></i></div><div><span>Latest weekly change</span><strong class="${totalDelta > 0 ? 'green' : totalDelta < 0 ? 'red' : ''}">${totalDelta == null ? '—' : `${totalDelta > 0 ? '+' : ''}${money(totalDelta)}`}</strong><small>${totalPct == null ? 'Add another week to compare' : `${totalPct > 0 ? '+' : ''}${totalPct.toFixed(2)}%`}</small></div></article>
            <article class="card stat-card"><div class="stat-icon gold"><i data-lucide="calendar-days"></i></div><div><span>Records saved</span><strong>${records.length}</strong><small>${records.length === 1 ? 'week tracked' : 'weeks tracked'}</small></div></article>
          </section>
          <section class="dashboard-grid">
            <article class="card chart-card">
              <div class="card-head"><div><h2>Portfolio performance</h2><p>Track the total balance over time</p></div><div class="range-tabs" role="tablist"><button data-range="4w" class="${range==='4w'?'active':''}">4 weeks</button><button data-range="12m" class="${range==='12m'?'active':''}">12 months</button><button data-range="yearly" class="${range==='yearly'?'active':''}">Yearly</button></div></div>
              <div class="chart-wrap"><canvas id="performanceChart"></canvas><div class="chart-empty" id="chartEmpty"><i data-lucide="info"></i>Add more weekly updates to build your trend.</div></div>
            </article>
            <article class="card allocation-card">
              <div class="card-head"><div><h2>Current allocation</h2><p>Balance by fund</p></div></div>
              <div class="donut-wrap"><canvas id="allocationChart"></canvas><div class="donut-center"><strong>${now.funds.length}</strong><span>funds</span></div></div>
              <div class="legend">${now.funds.map((f,i)=>`<div><span class="legend-dot c${i%6}"></span><span>${escapeHtml(f.name)}</span><b>${(f.value/now.total*100).toFixed(1)}%</b></div>`).join('')}</div>
            </article>
          </section>
          <section class="card holdings" id="history">
            <div class="card-head"><div><h2>Fund balances</h2><p>Values from your latest upload</p></div><button class="text-button" id="exportBtn"><i data-lucide="download"></i>Export data</button></div>
            <div class="table-scroll"><table><thead><tr><th>Fund</th><th>Current balance</th><th>Change</th><th></th></tr></thead><tbody>${fundRows}</tbody></table></div>
          </section>
          <section class="manage-row" id="privacy"><div><strong>Own your data</strong><span>Export a backup or import it on another device.</span></div><div><label class="button secondary" for="jsonInput"><i data-lucide="file-up"></i>Import backup</label><input id="jsonInput" type="file" accept="application/json" hidden /><button class="button ghost-danger" id="resetBtn"><i data-lucide="rotate-ccw"></i>Reset</button></div></section>
        </div>
      </main>
    </div>
    <div class="modal-backdrop" id="uploadModal" hidden>
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <div class="modal-head"><div><p class="eyebrow">Weekly update</p><h2 id="modalTitle">Review before saving</h2></div><button class="icon-btn" id="closeModal" aria-label="Close"><i data-lucide="x"></i></button></div>
        <div class="modal-body">
          <div class="image-panel" id="dropZone"><div class="image-placeholder" id="imagePlaceholder"><i data-lucide="image-plus"></i><strong>Drop, paste or choose a screenshot</strong><span>PNG, JPG or WEBP</span><button class="button secondary" id="chooseInside">Choose image</button></div><img id="previewImage" alt="Uploaded investment screenshot preview" hidden /><div class="ocr-progress" id="ocrProgress" hidden><span id="progressBar"></span><strong id="progressText">Reading image…</strong></div></div>
          <form id="recordForm" class="review-form">
            <label>Statement date<input id="recordDate" name="date" type="date" required /></label>
            <label>Total portfolio value <span>R</span><input id="recordTotal" name="total" inputmode="decimal" placeholder="0.00" required /></label>
            <div class="fund-editor-head"><strong>Funds</strong><button type="button" class="text-button" id="addFund"><i data-lucide="plus"></i>Add fund</button></div>
            <div id="fundEditor"></div>
            <div class="notice"><i data-lucide="info"></i><span>Image reading can make mistakes. Check the date and every amount before saving.</span></div>
            <div class="modal-actions"><button type="button" class="button secondary" id="cancelModal">Cancel</button><button type="submit" class="button primary"><i data-lucide="check"></i>Save weekly record</button></div>
          </form>
        </div>
      </section>
    </div>
    <div class="toast" id="toast" role="status"></div>`;

  bindEvents();
  renderCharts();
  createIcons({ icons: { Upload, Clipboard, WalletCards, TrendingUp, CalendarDays, ShieldCheck, MoreHorizontal, ArrowUpRight, ArrowDownRight, Minus, X, ImagePlus, Trash2, Download, FileUp, Check, Plus, ChevronDown, Info, RotateCcw } });
}

function bindEvents() {
  document.querySelectorAll('#uploadBtn,#heroUpload').forEach(b => b?.addEventListener('click', () => document.querySelector('#fileInput').click()));
  document.querySelector('#fileInput').addEventListener('change', e => e.target.files[0] && handleImage(e.target.files[0]));
  document.querySelector('#pasteBtn').addEventListener('click', async () => {
    try {
      const items = await navigator.clipboard.read();
      const imageItem = items.find(i => i.types.some(t => t.startsWith('image/')));
      if (!imageItem) throw new Error('No image');
      const type = imageItem.types.find(t => t.startsWith('image/'));
      handleImage(await imageItem.getType(type));
    } catch { openModal(); showToast('Copy an image, then press Ctrl+V or choose a file.'); }
  });
  document.addEventListener('paste', e => {
    const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'));
    if (item) handleImage(item.getAsFile());
  });
  document.querySelectorAll('[data-range]').forEach(btn => btn.addEventListener('click', () => { range = btn.dataset.range; localStorage.setItem(RANGE_KEY, range); render(); }));
  document.querySelector('#exportBtn').addEventListener('click', exportData);
  document.querySelector('#jsonInput').addEventListener('change', importData);
  document.querySelector('#resetBtn').addEventListener('click', resetData);
  ['#closeModal','#cancelModal'].forEach(id => document.querySelector(id).addEventListener('click', closeModal));
  document.querySelector('#uploadModal').addEventListener('click', e => { if (e.target.id === 'uploadModal') closeModal(); });
  document.querySelector('#chooseInside').addEventListener('click', e => { e.preventDefault(); document.querySelector('#fileInput').click(); });
  document.querySelector('#addFund').addEventListener('click', () => addFundRow());
  document.querySelector('#recordForm').addEventListener('submit', saveRecord);
  const dz = document.querySelector('#dropZone');
  ['dragenter','dragover'].forEach(type => dz.addEventListener(type, e => { e.preventDefault(); dz.classList.add('dragging'); }));
  ['dragleave','drop'].forEach(type => dz.addEventListener(type, e => { e.preventDefault(); dz.classList.remove('dragging'); }));
  dz.addEventListener('drop', e => { const f = [...e.dataTransfer.files].find(f => f.type.startsWith('image/')); if (f) handleImage(f); });
}

function openModal() {
  const modal = document.querySelector('#uploadModal');
  modal.hidden = false;
  document.body.classList.add('modal-open');
  if (!document.querySelector('.fund-edit-row')) {
    document.querySelector('#recordDate').value = new Date().toISOString().slice(0,10);
    latest().funds.forEach(f => addFundRow({ ...f, value: '' }));
  }
}
function closeModal() { document.querySelector('#uploadModal').hidden = true; document.body.classList.remove('modal-open'); resetModal(); }
function resetModal() {
  pendingImage = null;
  document.querySelector('#recordForm')?.reset();
  if (document.querySelector('#fundEditor')) document.querySelector('#fundEditor').innerHTML = '';
  const img = document.querySelector('#previewImage');
  if (img) { if (img.src?.startsWith('blob:')) URL.revokeObjectURL(img.src); img.hidden = true; img.removeAttribute('src'); }
  document.querySelector('#imagePlaceholder')?.removeAttribute('hidden');
  const progress = document.querySelector('#ocrProgress');
  if (progress) { progress.hidden = true; progress.classList.remove('complete', 'error'); }
  const bar = document.querySelector('#progressBar'); if (bar) bar.style.width = '0';
}

function addFundRow(fund = { name: '', code: '', value: '' }) {
  const row = document.createElement('div'); row.className = 'fund-edit-row';
  row.innerHTML = `<div><input class="fund-edit-name" value="${escapeHtml(fund.name)}" placeholder="Fund name" required><input class="fund-edit-code" value="${escapeHtml(fund.code || '')}" placeholder="Account code (optional)"></div><label><span>R</span><input class="fund-edit-value" inputmode="decimal" value="${fund.value === '' ? '' : Number(fund.value).toFixed(2)}" placeholder="0.00" required></label><button type="button" class="icon-btn delete-fund" aria-label="Remove fund"><i data-lucide="trash-2"></i></button>`;
  row.querySelector('.delete-fund').addEventListener('click', () => row.remove());
  document.querySelector('#fundEditor').append(row);
  createIcons({ icons: { Trash2 } });
}

async function handleImage(file) {
  if (!file?.type.startsWith('image/')) return showToast('Please select an image file.');
  openModal(); pendingImage = file;
  const img = document.querySelector('#previewImage'); img.src = URL.createObjectURL(file); img.hidden = false;
  document.querySelector('#imagePlaceholder').hidden = true;
  const progress = document.querySelector('#ocrProgress'); progress.hidden = false;
  const progressBar = document.querySelector('#progressBar'); const progressText = document.querySelector('#progressText');
  try {
    const worker = await createWorker('eng', 1, {
      langPath: '/tessdata',
      workerPath: '/tesseract/worker.min.js',
      corePath: '/tesseract-core',
      logger: m => { if (m.progress != null) { progressBar.style.width = `${Math.round(m.progress*100)}%`; progressText.textContent = `${m.status.replace(/_/g,' ')} ${Math.round(m.progress*100)}%`; } }
    });
    const result = await worker.recognize(file); await worker.terminate();
    const parsed = parseScreenshot(result.data.text);
    populateReview(parsed);
    progressText.textContent = 'Image read — check the values'; progress.classList.add('complete');
  } catch (err) {
    console.error(err); progressText.textContent = 'Could not read automatically — enter the values'; progress.classList.add('error');
    showToast('Automatic image reading failed. You can still enter the figures.');
  }
}

function parseAmount(raw) {
  if (!raw) return null;
  let cleaned = String(raw).replace(/[Rr\s]/g, '').replace(/[^0-9,.-]/g, '');
  if (cleaned.includes(',') && !cleaned.includes('.')) cleaned = cleaned.replace(',', '.'); else cleaned = cleaned.replace(/,/g, '');
  const n = Number(cleaned); return Number.isFinite(n) ? n : null;
}
function amountAfter(text, phrase) {
  const i = text.toLowerCase().indexOf(phrase.toLowerCase()); if (i < 0) return null;
  const section = text.slice(i, i + 220); const match = section.match(/R\s*[\d\s,.]+\d{2}/i); return parseAmount(match?.[0]);
}
function parseScreenshot(text) {
  const normalized = text.replace(/\u00a0/g,' ');
  const dateMatch = normalized.match(/(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(20\d{2})/i);
  const monthMap = {jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
  let date = new Date().toISOString().slice(0,10);
  if (dateMatch) { const d = new Date(Date.UTC(+dateMatch[3],monthMap[dateMatch[2].slice(0,3).toLowerCase()],+dateMatch[1])); date = d.toISOString().slice(0,10); }
  const definitions = [
    ['Living Annuity','AGLA'],
    ['Investment Platform Unit Trust','AGLP'],
    ['Tax-Free Investment','AGTF']
  ];
  const funds = definitions.map(([name, codePrefix]) => {
    const code = normalized.match(new RegExp(`${codePrefix}\\s*\\d+`,'i'))?.[0]?.replace(/\s/g,'').toUpperCase() || '';
    return { name, code, value: amountAfter(normalized, name) };
  }).filter(f => f.value != null);
  const allAmounts = [...normalized.matchAll(/R\s*[\d\s,.]+\d{2}/gi)].map(m => parseAmount(m[0])).filter(Number.isFinite);
  let total = amountAfter(normalized, 'Total investment value') || (allAmounts.length ? Math.max(...allAmounts) : null);
  if (!funds.length && allAmounts.length > 1) allAmounts.filter(v => v !== total).forEach((v,i) => funds.push({name:`Fund ${i+1}`,code:'',value:v}));
  return { date, total, funds };
}
function populateReview(data) {
  if (data.date) document.querySelector('#recordDate').value = data.date;
  if (data.total != null) document.querySelector('#recordTotal').value = data.total.toFixed(2);
  if (data.funds?.length) { document.querySelector('#fundEditor').innerHTML=''; data.funds.forEach(addFundRow); }
}

function saveRecord(e) {
  e.preventDefault();
  const date = document.querySelector('#recordDate').value;
  const total = parseAmount(document.querySelector('#recordTotal').value);
  const funds = [...document.querySelectorAll('.fund-edit-row')].map(row => ({ name: row.querySelector('.fund-edit-name').value.trim(), code: row.querySelector('.fund-edit-code').value.trim().toUpperCase(), value: parseAmount(row.querySelector('.fund-edit-value').value) })).filter(f => f.name && f.value != null);
  if (!date || total == null || !funds.length) return showToast('Complete the date, total and at least one fund.');
  const fundTotal = funds.reduce((s,f)=>s+f.value,0);
  if (Math.abs(fundTotal-total) > 1 && !confirm(`The fund balances total ${money(fundTotal)}, which differs from the portfolio total by ${money(Math.abs(fundTotal-total))}. Save anyway?`)) return;
  const existing = records.findIndex(r => r.date === date);
  if (existing >= 0 && !confirm('A record already exists for this date. Replace it?')) return;
  const record = { date, total, funds };
  if (existing >= 0) records[existing] = record; else records.push(record);
  records.sort(sortDate); saveRecords(); closeModal(); render(); showToast('Weekly portfolio record saved.');
}

function getRangeRecords() {
  if (range === '4w') return records.slice(-4);
  if (range === '12m') { const cutoff = new Date(latest().date); cutoff.setMonth(cutoff.getMonth()-12); return records.filter(r => new Date(r.date)>=cutoff); }
  const byYear = new Map(); records.forEach(r => byYear.set(new Date(r.date).getFullYear(), r)); return [...byYear.values()];
}
function renderCharts() {
  Object.values(charts).forEach(c => c?.destroy()); charts = {};
  const shown = getRangeRecords();
  const ctx = document.querySelector('#performanceChart');
  charts.performance = new Chart(ctx, { type:'line', data:{ labels:shown.map(r => range==='yearly' ? String(new Date(r.date).getFullYear()) : dateLong.format(new Date(r.date+'T12:00:00'))), datasets:[{data:shown.map(r=>r.total), borderColor:'#18a36b', backgroundColor:'rgba(24,163,107,.12)', fill:true, tension:.32, pointBackgroundColor:'#fff', pointBorderColor:'#18a36b', pointBorderWidth:3, pointRadius:shown.length===1?5:3}]}, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>money(c.raw)}}},scales:{x:{grid:{display:false},ticks:{color:'#71807a'}},y:{grid:{color:'rgba(24,55,44,.08)'},ticks:{color:'#71807a',callback:v=>compactCurrency.format(v).replace('ZAR','R')}}}}});
  document.querySelector('#chartEmpty').hidden = shown.length > 1;
  const colors=['#18a36b','#edb24a','#306e61','#8f7bd8','#de7468','#53a9c1'];
  charts.allocation = new Chart(document.querySelector('#allocationChart'), { type:'doughnut', data:{labels:latest().funds.map(f=>f.name),datasets:[{data:latest().funds.map(f=>f.value),backgroundColor:colors,borderWidth:0,hoverOffset:4}]},options:{responsive:true,maintainAspectRatio:false,cutout:'72%',plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${c.label}: ${money(c.raw)}`}}}}});
}

function exportData() { const blob=new Blob([JSON.stringify({app:'Portfolio Pulse',version:1,exportedAt:new Date().toISOString(),records},null,2)],{type:'application/json'}); const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`portfolio-pulse-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);showToast('Backup downloaded.'); }
async function importData(e) { try { const data=JSON.parse(await e.target.files[0].text()); const incoming=Array.isArray(data)?data:data.records; if(!Array.isArray(incoming)||!incoming.length) throw new Error(); if(!confirm(`Import ${incoming.length} records and replace the current history?`)) return; records=incoming.sort(sortDate);saveRecords();render();showToast('Backup imported.'); } catch { showToast('That backup file is not valid.'); } e.target.value=''; }
function resetData() { if(!confirm('Remove all saved history and restore the sample record from 10 July 2026?')) return; records=structuredClone(seed);saveRecords();render();showToast('Dashboard reset.'); }
function showToast(message) { const t=document.querySelector('#toast');t.textContent=message;t.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>t.classList.remove('show'),3500); }

render();
