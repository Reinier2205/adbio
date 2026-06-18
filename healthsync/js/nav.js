/**
 * nav.js — Mobile hamburger navigation + Services dropdown
 * ES module. Requirements: 1.2, 1.8, 18.3
 *
 * Fixes applied:
 *  - Safari iOS: dropdown now always toggled via aria-expanded click,
 *    not relying on :hover alone.
 *  - Mobile drawer: Services sub-links are shown inline when expanded.
 */

const FOCUSABLE = 'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])';

function initNav() {
  const toggle = document.querySelector('.nav-toggle');
  const nav    = document.querySelector('.primary-nav');
  if (!toggle || !nav) return;

  // Set aria-current="page" on the matching nav link
  const path = window.location.pathname.split('/').pop() || 'index.html';
  nav.querySelectorAll('a[href]').forEach(link => {
    const href = link.getAttribute('href').split('/').pop();
    if (href === path) link.setAttribute('aria-current', 'page');
  });

  // Hamburger: open / close drawer
  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('nav-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
    if (isOpen) trapFocus(nav);
  });

  // Close on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (nav.classList.contains('nav-open')) { closeNav(); toggle.focus(); }
      if (dropdownBtn && dropdownBtn.getAttribute('aria-expanded') === 'true') {
        collapseDropdown();
        dropdownBtn.focus();
      }
    }
  });

  // Close drawer on outside click
  document.addEventListener('click', e => {
    if (nav.classList.contains('nav-open') &&
        !nav.contains(e.target) &&
        !toggle.contains(e.target)) {
      closeNav();
    }
    // Also close desktop dropdown on outside click
    if (dropdownParent && !dropdownParent.contains(e.target)) {
      collapseDropdown();
    }
  });

  // Services dropdown
  const dropdownBtn    = nav.querySelector('.has-dropdown > button');
  const dropdownParent = dropdownBtn ? dropdownBtn.closest('.has-dropdown') : null;

  if (dropdownBtn && dropdownParent) {
    // Toggle on click (works on all platforms including Safari iOS)
    dropdownBtn.addEventListener('click', e => {
      e.stopPropagation();
      const expanded = dropdownBtn.getAttribute('aria-expanded') === 'true';
      if (expanded) {
        collapseDropdown();
      } else {
        expandDropdown();
      }
    });

    // Close dropdown when focus leaves the entire .has-dropdown item
    dropdownParent.addEventListener('focusout', e => {
      if (!dropdownParent.contains(e.relatedTarget)) {
        collapseDropdown();
      }
    });
  }

  function expandDropdown() {
    if (!dropdownBtn) return;
    dropdownBtn.setAttribute('aria-expanded', 'true');
  }

  function collapseDropdown() {
    if (!dropdownBtn) return;
    dropdownBtn.setAttribute('aria-expanded', 'false');
  }

  function closeNav() {
    nav.classList.remove('nav-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation menu');
    collapseDropdown();
  }

  function trapFocus(container) {
    const focusable = Array.from(container.querySelectorAll(FOCUSABLE));
    if (!focusable.length) return;
    focusable[0].focus();
    container.addEventListener('keydown', handleTrap);
    function handleTrap(e) {
      if (e.key !== 'Tab') return;
      const first = focusable[0];
      const last  = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
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
