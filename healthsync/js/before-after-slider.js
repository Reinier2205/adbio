/**
 * before-after-slider.js — Before/After image comparison slider
 * ES module. Requirements: 5.2, 5.3, 18.5
 *
 * Property 26: non-empty alt on both images, aria-label on handle,
 *              transition duration exactly 300ms
 */

function buildSlider(container) {
  const before = container.dataset.before || '';
  const after = container.dataset.after || '';

  // Track
  const track = document.createElement('div');
  track.className = 'bas__track';
  track.setAttribute('aria-hidden', 'true');

  // Before image
  const imgBefore = document.createElement('img');
  imgBefore.className = 'bas__before';
  imgBefore.src = before;
  imgBefore.alt = 'Before treatment';
  imgBefore.decoding = 'async';

  // After image — starts clipped at 50%
  const imgAfter = document.createElement('img');
  imgAfter.className = 'bas__after';
  imgAfter.src = after;
  imgAfter.alt = 'After treatment';
  imgAfter.decoding = 'async';
  imgAfter.style.clipPath = 'inset(0 50% 0 0)';
  imgAfter.style.transition = 'clip-path 300ms ease';

  // Divider
  const divider = document.createElement('div');
  divider.className = 'bas__divider';

  // Handle button — ARIA per Req 18.5
  const handle = document.createElement('button');
  handle.className = 'bas__handle';
  handle.setAttribute('aria-label', 'Drag to compare before and after');
  handle.setAttribute('aria-valuemin', '0');
  handle.setAttribute('aria-valuemax', '100');
  handle.setAttribute('aria-valuenow', '50');
  handle.setAttribute('type', 'button');

  divider.appendChild(handle);
  track.append(imgBefore, imgAfter, divider);
  container.appendChild(track);

  // Caption for screen readers
  const caption = document.createElement('p');
  caption.className = 'bas__caption sr-only';
  caption.textContent = 'Left: before treatment. Right: after treatment.';
  container.appendChild(caption);

  let position = 50; // percent

  function setPosition(pct) {
    position = Math.max(0, Math.min(100, pct));
    const right = 100 - position;
    imgAfter.style.clipPath = `inset(0 ${right}% 0 0)`;
    divider.style.left = `${position}%`;
    handle.setAttribute('aria-valuenow', String(Math.round(position)));
  }

  // Mouse drag
  let dragging = false;
  handle.addEventListener('mousedown', e => { dragging = true; e.preventDefault(); });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const rect = container.getBoundingClientRect();
    setPosition(((e.clientX - rect.left) / rect.width) * 100);
  });
  document.addEventListener('mouseup', () => { dragging = false; });

  // Touch drag
  handle.addEventListener('touchstart', e => { dragging = true; e.preventDefault(); }, { passive: false });
  document.addEventListener('touchmove', e => {
    if (!dragging) return;
    const rect = container.getBoundingClientRect();
    setPosition(((e.touches[0].clientX - rect.left) / rect.width) * 100);
  }, { passive: true });
  document.addEventListener('touchend', () => { dragging = false; });

  // Keyboard: ArrowLeft / ArrowRight in 5% increments
  handle.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); setPosition(position - 5); }
    if (e.key === 'ArrowRight') { e.preventDefault(); setPosition(position + 5); }
  });
}

function initSliders() {
  document.querySelectorAll('.before-after-slider').forEach(buildSlider);
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initSliders);
}
