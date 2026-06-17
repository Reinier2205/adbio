/**
 * booking-widget.js — Booking embed loader and fallback
 * ES module. Requirements: 3.4, 5.7, 5.8, 6.5, 7.5, 8.4, 11.1, 11.2, 11.3, 11.4
 *
 * Property 3: if iframe.onload doesn't fire within 10s → fallback visible
 *             with phone, email, and contact.html link.
 *             if iframe loads within 10s → fallback stays hidden.
 */

/**
 * Embed URL — replace with real Jane App / Vagaro URL when available.
 * Using a placeholder that will fail gracefully to trigger fallback.
 */
const BOOKING_EMBED_URL = 'https://healthsynchrony.janeapp.com/';
const TIMEOUT_MS = 10000;

/**
 * @param {string} containerSelector  CSS selector for the widget container element
 * @param {string} fallbackSelector   CSS selector for the fallback element
 */
export function initBookingWidget(containerSelector, fallbackSelector) {
  const container = document.querySelector(containerSelector);
  const fallback = document.querySelector(fallbackSelector);

  if (!container) return;

  // Build responsive iframe wrapper
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:relative;width:100%;overflow:auto;';

  const iframe = document.createElement('iframe');
  iframe.src = BOOKING_EMBED_URL;
  iframe.title = 'Online appointment booking';
  iframe.setAttribute('loading', 'lazy');
  iframe.setAttribute('allowfullscreen', '');
  iframe.style.cssText = 'width:100%;min-height:600px;border:0;display:block;';

  wrapper.appendChild(iframe);

  // Insert iframe before fallback (or append to container)
  if (fallback && container.contains(fallback)) {
    container.insertBefore(wrapper, fallback);
  } else {
    container.appendChild(wrapper);
  }

  // Hide fallback initially — widget is loading
  if (fallback) fallback.style.display = 'none';

  // Start 10-second timeout
  const timer = setTimeout(() => {
    // Timeout fired — show fallback, hide iframe
    wrapper.style.display = 'none';
    if (fallback) {
      fallback.style.display = '';
      fallback.setAttribute('role', 'alert');
    } else {
      // Safety net: Contact Us link in nav remains accessible — no JS needed
      console.warn('Booking widget timed out and no fallback element found. Contact Us nav link is the fallback.');
    }
  }, TIMEOUT_MS);

  // Iframe loaded — clear timeout, keep it visible
  iframe.addEventListener('load', () => {
    clearTimeout(timer);
    if (fallback) fallback.style.display = 'none';
  });

  // Iframe error — treat as timeout
  iframe.addEventListener('error', () => {
    clearTimeout(timer);
    wrapper.style.display = 'none';
    if (fallback) {
      fallback.style.display = '';
      fallback.setAttribute('role', 'alert');
    }
  });
}

// Auto-initialise on pages that have #booking-widget
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('booking-widget')) {
      initBookingWidget('#booking-widget', '#booking-widget .booking-fallback');
    }
  });
}
