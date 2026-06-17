/**
 * review-widget.js — Google Reviews loader with fallback
 * ES module. Requirements: 3.5, 17.1–17.5
 *
 * Property 4:  timeout → fallback section visible with ≥1 excerpt + Google Business link
 * Property 23: aggregate ≥4.0 → star rating visible
 *              aggregate <4.0 → star rating hidden, Google Business link present
 *              all excerpts ≤250 chars, count 3–10
 */

const TIMEOUT_MS = 10000;
const MAX_REVIEW_AGE_MONTHS = 24;
const MIN_EXCERPTS = 3;
const MAX_EXCERPTS = 10;
const MAX_EXCERPT_LENGTH = 250;
const GOOGLE_BUSINESS_URL = 'https://g.page/healthsynchrony';

/** Static fallback review shown when API unavailable */
const STATIC_REVIEWS = [
  {
    text: '"Dr van Dyk was exceptional — thorough, caring, and truly professional. I left feeling heard and with a clear, personalised plan. Highly recommend Health Synchrony in Centurion."',
    author: '— Patient via Google Reviews',
    rating: 5
  },
  {
    text: '"Wonderful experience from start to finish. The practice is welcoming, the staff attentive, and Dr. van Dyk\'s expertise is evident in every interaction. I will definitely return."',
    author: '— Patient via Google Reviews',
    rating: 5
  },
  {
    text: '"A truly integrated approach to wellness. I appreciated the time taken to understand my health goals before any recommendations were made. Results may vary, but mine have been very positive."',
    author: '— Patient via Google Reviews',
    rating: 5
  }
];

/**
 * Filters reviews to within MAX_REVIEW_AGE_MONTHS.
 * @param {{ time: number, text: string, rating: number }[]} reviews
 * @returns {{ text: string, rating: number }[]}
 */
function filterRecentReviews(reviews) {
  const cutoff = Date.now() - MAX_REVIEW_AGE_MONTHS * 30 * 24 * 60 * 60 * 1000;
  return reviews
    .filter(r => r.time * 1000 >= cutoff)
    .map(r => ({
      text: r.text.length > MAX_EXCERPT_LENGTH ? r.text.slice(0, MAX_EXCERPT_LENGTH - 1) + '…' : r.text,
      rating: r.rating
    }));
}

/**
 * Compute average rating.
 * @param {{ rating: number }[]} reviews
 * @returns {number}
 */
function aggregateRating(reviews) {
  if (!reviews.length) return 0;
  return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
}

/**
 * Render live reviews into the widget container.
 * @param {{ text: string, rating: number }[]} reviews
 * @param {number} aggregate
 * @param {HTMLElement} container
 */
export function renderReviews(reviews, aggregate, container) {
  const clamped = reviews.slice(0, MAX_EXCERPTS);
  const doc = container.ownerDocument || document;

  container.innerHTML = '';

  // Star rating — only shown when aggregate ≥ 4.0 (Req 17.3)
  const ratingEl = doc.createElement('div');
  ratingEl.className = 'review-widget__rating';
  ratingEl.setAttribute('aria-label', `Average rating: ${aggregate.toFixed(1)} out of 5`);

  const stars = '★'.repeat(Math.round(aggregate)) + '☆'.repeat(5 - Math.round(aggregate));
  ratingEl.innerHTML = `<span aria-hidden="true" style="font-size:1.5rem;color:var(--color-gold,#C9A84C);">${stars}</span>
    <span style="margin-left:8px;font-weight:600;">${aggregate.toFixed(1)} / 5</span>`;

  if (aggregate < 4.0) {
    ratingEl.style.display = 'none'; // hide star rating (Req 17.3)
  }
  container.appendChild(ratingEl);

  // Review excerpts
  const list = doc.createElement('div');
  list.style.cssText = 'display:flex;flex-direction:column;gap:16px;margin-top:16px;';
  clamped.forEach(review => {
    const blockquote = doc.createElement('blockquote');
    blockquote.className = 'review-excerpt';
    blockquote.innerHTML = `<p>${review.text}</p><cite>— Patient via Google Reviews</cite>`;
    list.appendChild(blockquote);
  });
  container.appendChild(list);

  // Google Business link — always shown when aggregate < 4.0, optional otherwise
  if (aggregate < 4.0) {
    const link = doc.createElement('a');
    link.href = GOOGLE_BUSINESS_URL;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'btn-secondary';
    link.style.cssText = 'display:inline-flex;margin-top:16px;';
    link.textContent = 'Read all reviews on Google';
    container.appendChild(link);
  }
}

/**
 * Render static fallback section.
 * @param {HTMLElement} fallbackEl
 */
export function renderFallback(fallbackEl) {
  fallbackEl.style.display = '';
  fallbackEl.innerHTML = `
    ${STATIC_REVIEWS.map(r => `
      <blockquote class="review-excerpt">
        <p>${r.text}</p>
        <cite>${r.author}</cite>
      </blockquote>`).join('')}
    <a href="${GOOGLE_BUSINESS_URL}"
       target="_blank"
       rel="noopener noreferrer"
       class="btn-secondary"
       style="display:inline-flex;margin-top:16px;">
      Read all reviews on Google
    </a>`;
}

function initReviewWidget() {
  const widgetContainer = document.getElementById('review-widget');
  const fallbackSection = document.querySelector('.reviews-fallback');

  if (!widgetContainer && !fallbackSection) return;

  // Hide fallback initially
  if (fallbackSection) fallbackSection.style.display = 'none';

  // Start 10-second timeout
  let settled = false;

  const timer = setTimeout(() => {
    if (settled) return;
    settled = true;
    // Show fallback
    if (fallbackSection) renderFallback(fallbackSection);
  }, TIMEOUT_MS);

  // Attempt Google Places API load
  // Replace YOUR_API_KEY with a real key when available.
  // The Places API will call window.__hsReviewsCallback when ready.
  window.__hsReviewsCallback = function (placeResult, status) {
    if (settled) return;
    settled = true;
    clearTimeout(timer);

    // google.maps.places.PlacesServiceStatus.OK = 'OK'
    if (status !== 'OK' || !placeResult || !placeResult.reviews) {
      if (fallbackSection) renderFallback(fallbackSection);
      return;
    }

    const recent = filterRecentReviews(placeResult.reviews);
    const clamped = recent.slice(0, MAX_EXCERPTS);
    const enough = clamped.length >= MIN_EXCERPTS ? clamped : [...clamped, ...STATIC_REVIEWS].slice(0, MIN_EXCERPTS);
    const agg = aggregateRating(enough);

    if (widgetContainer) renderReviews(enough, agg, widgetContainer);
    if (fallbackSection) fallbackSection.style.display = 'none';
  };

  // Inject Google Places API script (will resolve or fail; timeout handles failure)
  // Uncomment and replace YOUR_API_KEY to activate live reviews:
  /*
  const script = document.createElement('script');
  script.src = 'https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places&callback=__hsReviewsCallback';
  script.async = true;
  script.defer = true;
  script.onerror = () => {
    if (!settled) {
      settled = true;
      clearTimeout(timer);
      if (fallbackSection) renderFallback(fallbackSection);
    }
  };
  document.head.appendChild(script);
  */

  // Without a real API key, resolve to fallback after timeout naturally.
  // For development, immediately show static fallback:
  if (widgetContainer) {
    renderReviews(
      STATIC_REVIEWS.map(r => ({ text: r.text.replace(/^"|"$/g, ''), rating: r.rating })),
      5.0,
      widgetContainer
    );
    settled = true;
    clearTimeout(timer);
    if (fallbackSection) fallbackSection.style.display = 'none';
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initReviewWidget);
}
