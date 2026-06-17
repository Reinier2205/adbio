/**
 * iv-menu.js — IV therapy card rendering
 * ES module. Requirements: 7.1, 7.2, 7.3
 *
 * Property 10: 3–10 cards, all three categories present,
 *              ingredients ≥3, bestFor ≤60 chars
 */

/** @typedef {{ id: string, category: string, name: string, ingredients: string[], bestFor: string, ctaHref: string }} IVCard */

/** @type {IVCard[]} */
const IV_CARDS = [
  {
    id: 'energy-boost',
    category: 'Energy',
    name: 'Energy Boost Drip',
    ingredients: ['Vitamin B Complex', 'Magnesium', 'Vitamin C', 'Zinc'],
    bestFor: 'Fatigue recovery and sustained daily energy',
    ctaHref: '#booking-widget'
  },
  {
    id: 'radiance-beauty',
    category: 'Beauty',
    name: 'Radiance Beauty Drip',
    ingredients: ['Vitamin C', 'Glutathione', 'Biotin', 'Zinc'],
    bestFor: 'Skin radiance and hair and nail support',
    ctaHref: '#booking-widget'
  },
  {
    id: 'immunity-shield',
    category: 'Immunity',
    name: 'Immunity Shield Drip',
    ingredients: ['High-dose Vitamin C', 'Zinc', 'Selenium', 'Vitamin B Complex'],
    bestFor: 'Immune support and seasonal wellness',
    ctaHref: '#booking-widget'
  }
];

const REQUIRED_CATEGORIES = ['Energy', 'Beauty', 'Immunity'];

/**
 * @param {IVCard[]} cards
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateIVCards(cards) {
  if (!Array.isArray(cards) || cards.length < 3 || cards.length > 10) {
    return { valid: false, error: `Card count must be 3–10; got ${Array.isArray(cards) ? cards.length : 'non-array'}.` };
  }
  for (const cat of REQUIRED_CATEGORIES) {
    if (!cards.some(c => c.category === cat)) {
      return { valid: false, error: `Missing required category: ${cat}` };
    }
  }
  for (const card of cards) {
    if (!Array.isArray(card.ingredients) || card.ingredients.length < 3) {
      return { valid: false, error: `Card "${card.name}" must have ≥3 ingredients.` };
    }
    if (typeof card.bestFor !== 'string' || card.bestFor.length > 60) {
      return { valid: false, error: `Card "${card.name}" bestFor exceeds 60 chars.` };
    }
  }
  return { valid: true };
}

/**
 * @param {IVCard} card
 * @returns {HTMLElement}
 */
function renderCard(card) {
  const catClass = card.category.toLowerCase();
  const titleId = `card-${card.id}-title`;

  const article = document.createElement('article');
  article.className = `iv-card iv-card--${catClass}`;
  article.setAttribute('aria-labelledby', titleId);

  const bar = document.createElement('div');
  bar.className = 'iv-card__category-bar';
  bar.setAttribute('aria-hidden', 'true');

  const h3 = document.createElement('h3');
  h3.id = titleId;
  h3.className = 'iv-card__name';
  h3.textContent = card.name;

  const ul = document.createElement('ul');
  ul.className = 'iv-card__ingredients';
  ul.setAttribute('aria-label', 'Key ingredients');
  card.ingredients.forEach(ing => {
    const li = document.createElement('li');
    li.textContent = ing;
    ul.appendChild(li);
  });

  const bestFor = document.createElement('p');
  bestFor.className = 'iv-card__best-for';
  bestFor.innerHTML = `<strong>Best for:</strong> ${card.bestFor}`;

  const cta = document.createElement('a');
  cta.href = card.ctaHref;
  cta.className = 'btn-secondary iv-card__cta';
  cta.textContent = 'Book This Drip';

  article.append(bar, h3, ul, bestFor, cta);
  return article;
}

function initIVMenu() {
  const container = document.getElementById('iv-menu');
  if (!container) return;

  const result = validateIVCards(IV_CARDS);
  if (!result.valid) {
    console.error('IV card validation failed:', result.error);
    return;
  }

  // Replace static placeholder content with JS-rendered cards
  container.innerHTML = '';
  container.classList.add('grid-3');
  IV_CARDS.forEach(card => container.appendChild(renderCard(card)));
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initIVMenu);
}
