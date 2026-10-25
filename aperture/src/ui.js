export function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[char]));
}

export function apertureMark() {
  return `<span class="brand-mark" aria-hidden="true">
    <svg viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="13" stroke="currentColor" stroke-width="2"/>
      <circle cx="16" cy="16" r="5" stroke="currentColor" stroke-width="1.6"/>
      <path d="M16 3v5M16 24v5M3 16h5M24 16h5M7.2 7.2l3.5 3.5M21.3 21.3l3.5 3.5M7.2 24.8l3.5-3.5M21.3 10.7l3.5-3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    </svg>
  </span>`;
}

export function layout({ title, subtitle, actions = '', body, showBack = false }) {
  return `
    <div class="shell">
      <header class="topbar">
        <a class="brand" href="/">${apertureMark()}<span>Aperture</span></a>
        ${showBack ? '<a class="nav-link" href="/">All solutions</a>' : ''}
      </header>
      <main class="content">
        <section class="welcome">
          <div>
            <p class="eyebrow">Reusable pipeline</p>
            <h1>${title}</h1>
            ${subtitle ? `<p>${subtitle}</p>` : ''}
          </div>
          ${actions ? `<div class="welcome-actions">${actions}</div>` : ''}
        </section>
        ${body}
      </main>
    </div>
    <div class="toast" id="toast" role="status"></div>`;
}

export function showToast(message) {
  const toast = document.querySelector('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 3500);
}

export function bindInternalLinks(root, navigate) {
  root.querySelectorAll('a[href^="/"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      navigate(link.getAttribute('href'));
    });
  });
}

export function pretty(value) {
  try {
    return JSON.stringify(typeof value === 'string' ? JSON.parse(value) : value, null, 2);
  } catch {
    return String(value ?? '');
  }
}
