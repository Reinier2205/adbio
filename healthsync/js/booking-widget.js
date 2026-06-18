/**
 * booking-widget.js — Booking contact fallback
 * ES module. Requirements: 3.4, 11.1, 11.2, 11.3
 *
 * NOTE: Online booking iframe is disabled — no booking system is currently
 * connected. The contact fallback is shown by default.
 *
 * To re-enable when a booking URL is available:
 *   1. Set BOOKING_EMBED_URL to your booking system's embed URL
 *   2. Uncomment the iframe injection block
 *   3. Some providers (JaneApp, Calendly, etc.) block iframes — use a
 *      redirect button instead: <a href="{URL}" target="_blank">
 */

/**
 * Shows the booking fallback immediately.
 * @param {string} containerSelector  CSS selector for the widget container element
 * @param {string} fallbackSelector   CSS selector for the fallback element
 */
export function initBookingWidget(containerSelector, fallbackSelector) {
  const fallback = document.querySelector(fallbackSelector);
  if (fallback) {
    fallback.style.display = '';  /* show — overrides the default display:none */
  }
}

// Auto-initialise on pages that have #booking-widget
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('booking-widget')) {
      initBookingWidget('#booking-widget', '#booking-widget .booking-fallback');
    }
  });
}
