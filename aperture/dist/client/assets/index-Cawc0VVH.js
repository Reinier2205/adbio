(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))a(r);new MutationObserver(r=>{for(const n of r)if(n.type==="childList")for(const l of n.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&a(l)}).observe(document,{childList:!0,subtree:!0});function i(r){const n={};return r.integrity&&(n.integrity=r.integrity),r.referrerPolicy&&(n.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?n.credentials="include":r.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function a(r){if(r.ep)return;r.ep=!0;const n=i(r);fetch(r.href,n)}})();const $="demo-intake",R="Demo intake",I="Paste text and/or drop an image. Gemini extracts a title, summary, date, and list of items. Review the JSON, then save.",P="text + image",N={id:$,title:R,description:I,inputs:P};function d(e=""){return String(e).replace(/[&<>'"]/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[t])}function j(){return`<span class="brand-mark" aria-hidden="true">
    <svg viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="13" stroke="currentColor" stroke-width="2"/>
      <circle cx="16" cy="16" r="5" stroke="currentColor" stroke-width="1.6"/>
      <path d="M16 3v5M16 24v5M3 16h5M24 16h5M7.2 7.2l3.5 3.5M21.3 21.3l3.5 3.5M7.2 24.8l3.5-3.5M21.3 10.7l3.5-3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    </svg>
  </span>`}function E({title:e,subtitle:t,actions:i="",body:a,showBack:r=!1}){return`
    <div class="shell">
      <header class="topbar">
        <a class="brand" href="/">${j()}<span>Aperture</span></a>
        ${r?'<a class="nav-link" href="/">All solutions</a>':""}
      </header>
      <main class="content">
        <section class="welcome">
          <div>
            <p class="eyebrow">Reusable pipeline</p>
            <h1>${e}</h1>
            ${t?`<p>${t}</p>`:""}
          </div>
          ${i?`<div class="welcome-actions">${i}</div>`:""}
        </section>
        ${a}
      </main>
    </div>
    <div class="toast" id="toast" role="status"></div>`}function b(e){const t=document.querySelector("#toast");t&&(t.textContent=e,t.classList.add("show"),clearTimeout(b.timer),b.timer=setTimeout(()=>t.classList.remove("show"),3500))}function S(e,t){e.querySelectorAll('a[href^="/"]').forEach(i=>{i.addEventListener("click",a=>{a.metaKey||a.ctrlKey||a.shiftKey||a.altKey||(a.preventDefault(),t(i.getAttribute("href")))})})}function M(e){try{return JSON.stringify(typeof e=="string"?JSON.parse(e):e,null,2)}catch{return String(e??"")}}const C=35e5,G=1280;function q(e){return new Promise((t,i)=>{const a=URL.createObjectURL(e),r=new Image;r.onload=()=>{URL.revokeObjectURL(a),t(r)},r.onerror=()=>{URL.revokeObjectURL(a),i(new Error("Could not read that image."))},r.src=a})}async function J(e){if(!(e!=null&&e.type.startsWith("image/")))throw new Error("Please choose an image file.");if(e.size>C)throw new Error("Image is too large. Use a smaller screenshot.");const t=await q(e),i=Math.min(1,G/Math.max(t.width,t.height)),a=Math.max(1,Math.round(t.width*i)),r=Math.max(1,Math.round(t.height*i)),n=document.createElement("canvas");n.width=a,n.height=r,n.getContext("2d").drawImage(t,0,0,a,r);const u=n.toDataURL("image/jpeg",.72);return{mimeType:"image/jpeg",imageBase64:u.slice(u.indexOf(",")+1),preview:u}}function A(e){return(e==null?void 0:e.title)||(e==null?void 0:e.summary)||"Untitled capture"}function D(e,{api:t,toast:i,navigate:a,solution:r}){let n=null;e.innerHTML=E({title:d(r.title),subtitle:d(r.description),showBack:!0,body:`
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
    `}),S(e,a);const l=e.querySelector("#inputText"),u=e.querySelector("#outputJson"),h=e.querySelector("#dropZone"),m=e.querySelector("#fileInput"),f=e.querySelector("#previewImage"),g=e.querySelector("#history");function x(s){n=s,s?(f.src=s.preview,f.hidden=!1):(f.hidden=!0,f.removeAttribute("src"))}async function v(s){try{x(await J(s))}catch(o){i(o.message)}}async function w(){try{const s=await t.listRecords(r.id);if(!s.length){g.innerHTML='<p class="empty">No saved records yet.</p>';return}g.innerHTML=s.map(o=>`
        <article class="history-item" data-id="${o.id}">
          <div>
            <strong>${d(o.title||"Untitled")}</strong>
            <div class="history-meta">${d(o.createdAt)}</div>
          </div>
          <button class="button ghost-danger" type="button" data-delete="${o.id}">Delete</button>
          <pre>${d(M(o.payload))}</pre>
        </article>
      `).join("")}catch(s){g.innerHTML=`<p class="empty">${d(s.message)}</p>`}}e.querySelector("#chooseImage").addEventListener("click",()=>m.click()),e.querySelector("#clearImage").addEventListener("click",()=>{n=null,m.value="",x(null)}),m.addEventListener("change",s=>s.target.files[0]&&v(s.target.files[0])),["dragenter","dragover"].forEach(s=>h.addEventListener(s,o=>{o.preventDefault(),h.classList.add("dragging")})),["dragleave","drop"].forEach(s=>h.addEventListener(s,o=>{o.preventDefault(),h.classList.remove("dragging")})),h.addEventListener("drop",s=>{var c;const o=[...((c=s.dataTransfer)==null?void 0:c.files)||[]].find(p=>p.type.startsWith("image/"));o&&v(o)}),h.addEventListener("click",()=>m.click()),document.addEventListener("paste",k);function k(s){var c;if(!e.isConnected){document.removeEventListener("paste",k);return}const o=[...((c=s.clipboardData)==null?void 0:c.items)||[]].find(p=>p.type.startsWith("image/"));o&&v(o.getAsFile())}e.querySelector("#generateBtn").addEventListener("click",async()=>{const s=l.value.trim();if(!s&&!n)return i("Add some text or an image first.");const o=e.querySelector("#generateBtn");o.disabled=!0,o.textContent=n?"Generating… (image can take ~20s)":"Generating…";try{const c=await t.generate({solutionId:r.id,text:s,imageBase64:n==null?void 0:n.imageBase64,mimeType:n==null?void 0:n.mimeType});u.value=M(c.output),i("Review the JSON, then save.")}catch(c){i(c.message)}finally{o.disabled=!1,o.textContent="Generate with Gemini"}}),e.querySelector("#saveBtn").addEventListener("click",async()=>{let s;try{s=JSON.parse(u.value)}catch{return i("Output is not valid JSON.")}try{await t.saveRecord({solutionId:r.id,title:A(s),payload:s}),i("Record saved."),await w()}catch(o){i(o.message)}}),g.addEventListener("click",async s=>{var c;const o=(c=s.target.dataset)==null?void 0:c.delete;if(o&&confirm("Delete this record?"))try{await t.deleteRecord(o),i("Record deleted."),await w()}catch(p){i(p.message)}}),w()}const O=[{...N,render:D}];async function y(e){try{return(await e.json()).error||`HTTP ${e.status}`}catch{return`HTTP ${e.status}`}}async function B({solutionId:e,text:t,imageBase64:i,mimeType:a}){let r;try{r=await fetch("/api/generate",{method:"POST",headers:{"Content-Type":"application/json"},signal:AbortSignal.timeout(5e4),body:JSON.stringify({solutionId:e,text:t,imageBase64:i,mimeType:a})})}catch(n){throw(n==null?void 0:n.name)==="TimeoutError"||(n==null?void 0:n.name)==="AbortError"?new Error("Generate timed out. Try a smaller image, or text only."):n}if(!r.ok)throw new Error(await y(r));return r.json()}async function U(e){const t=await fetch(`/api/records?solution=${encodeURIComponent(e)}`);if(!t.ok)throw new Error(await y(t));return t.json()}async function _({solutionId:e,title:t,payload:i}){const a=await fetch("/api/records",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({solutionId:e,title:t,payload:i})});if(!a.ok)throw new Error(await y(a));return a.json()}async function H(e){const t=await fetch(`/api/records/${encodeURIComponent(e)}`,{method:"DELETE"});if(!t.ok&&t.status!==204)throw new Error(await y(t))}const K=Object.freeze(Object.defineProperty({__proto__:null,deleteRecord:H,generate:B,listRecords:U,saveRecord:_},Symbol.toStringTag,{value:"Module"}));function L(e){location.pathname!==e&&history.pushState({},"",e),T()}function W(e){const t=O.map(i=>`
    <a class="card solution-card" href="/s/${d(i.id)}">
      <p class="eyebrow">${d(i.inputs||"custom")}</p>
      <h2>${d(i.title)}</h2>
      <p>${d(i.description)}</p>
      <span class="card-cta">Open page</span>
    </a>
  `).join("");e.innerHTML=E({title:"Point, focus, develop.",subtitle:"Each idea has its own page. Input goes through a standard prompt, Gemini returns JSON, and you review before saving.",body:`<section class="card-grid">${t||'<p class="empty">No solutions registered yet. Copy solutions/_starter.</p>'}</section>
      <section class="card how">
        <h2>The same path every time</h2>
        <ol>
          <li><strong>Input</strong> — text, a screenshot, or whatever that idea needs.</li>
          <li><strong>Prompt + schema</strong> — files next to the solution, not hardcoded parsers.</li>
          <li><strong>Gemini</strong> — called from the Worker with <code>GEMINI_API_KEY</code>.</li>
          <li><strong>Review</strong> — check the JSON, then persist it in D1.</li>
        </ol>
      </section>`}),S(e,L)}function F(e){e.innerHTML=E({title:"Solution not found",subtitle:"That idea is not registered in the catalog yet.",body:'<p class="empty">Add a folder under <code>solutions/</code>, then import it in <code>src/catalog.js</code> and <code>worker/catalog.js</code>.</p>'}),S(e,L)}function T(){const e=document.querySelector("#app"),t=location.pathname.replace(/\/$/,"")||"/";if(t==="/"){W(e);return}const i=t.match(/^\/s\/([^/]+)$/),a=i&&O.find(r=>r.id===i[1]);if(!a){F(e);return}a.render(e,{api:K,toast:b,navigate:L,solution:a})}window.addEventListener("popstate",T);T();
