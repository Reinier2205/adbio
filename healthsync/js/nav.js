/**
 * nav.js — Mobile hamburger navigation
 * ES module. Requirements: 1.2, 1.8, 18.3
 */

const FOCUSABLE = 'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])';

function initNav() {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.primary-nav');
  if (!toggle || !nav) return;

  // Set aria-current="page" on the link matching the current pathname
  const path = window.location.pathname.split('/').pop() || 'index.html';
  nav.querySelectorAll('a[href]').forEach(link => {
    const href = link.getAttribute('href').split('/').pop();
    if (href === path) {
      link.setAttribute('aria-current', 'page');
    }
  });

  // Toggle open/close
  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('nav-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
    if (isOpen) {
      trapFocus(nav);
    }
  });

  // Close on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav.classList.contains('nav-open')) {
      closeNav();
      toggle.focus();
    }
  });

  // Close on outside click
  document.addEventListener('click', e => {
    if (nav.classList.contains('nav-open') && !nav.contains(e.target) && !toggle.contains(e.target)) {
      closeNav();
    }
  });

  // Services dropdown button toggle (keyboard)
  const dropdownBtn = nav.querySelector('.has-dropdown > button');
  if (dropdownBtn) {
    dropdownBtn.addEventListener('click', () => {
      const expanded = dropdownBtn.getAttribute('aria-expanded') === 'true';
      dropdownBtn.setAttribute('aria-expanded', String(!expanded));
    });
  }

  function closeNav() {
    nav.classList.remove('nav-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation menu');
  }

  function trapFocus(container) {
    const focusable = Array.from(container.querySelectorAll(FOCUSABLE));
    if (!focusable.length) return;
    focusable[0].focus();

    container.addEventListener('keydown', handleTrap);

    function handleTrap(e) {
      if (e.key !== 'Tab') return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      if (!nav.classList.contains('nav-open')) {
        container.removeEventListener('keydown', handleTrap);
      }
    }
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initNav);
}
