/**
 * sticky-cta.js — Sticky CTA scroll/navigate behaviour
 * ES module. Requirements: 1.5
 *
 * Property 1: if #booking-widget present → scrollIntoView; else → navigate to fallbackHref
 */

function initStickyCta() {
  const btn = document.querySelector('.sticky-cta__btn');
  if (!btn) return;

  btn.addEventListener('click', e => {
    const target = document.querySelector('#booking-widget');
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    } else {
      // fallback navigation — allow default href or use data attribute
      const fallback = btn.dataset.fallbackHref;
      if (fallback) {
        e.preventDefault();
        window.location.href = fallback;
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', initStickyCta);
