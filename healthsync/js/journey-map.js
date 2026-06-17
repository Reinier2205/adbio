/**
 * journey-map.js — Interactive weight loss journey steps
 * ES module. Requirements: 6.2, 6.3
 *
 * Property 9: step count 3–5, description 10–40 words each
 */

/**
 * @param {{ id: number, title: string, description: string }[]} steps
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateJourneyMap(steps) {
  if (!Array.isArray(steps) || steps.length < 3 || steps.length > 5) {
    const msg = `Journey map must have 3–5 steps; got ${Array.isArray(steps) ? steps.length : 'non-array'}.`;
    console.warn(msg);
    return { valid: false, error: msg };
  }
  for (const step of steps) {
    const words = step.description.trim().split(/\s+/).length;
    if (words < 10 || words > 40) {
      const msg = `Step "${step.title}" description has ${words} words; must be 10–40.`;
      console.warn(msg);
      return { valid: false, error: msg };
    }
  }
  return { valid: true };
}

/**
 * @param {number} stepId
 * @param {{ id: number }[]} steps
 * @param {HTMLElement} containerEl
 */
export function selectStep(stepId, steps, containerEl) {
  const items = containerEl.querySelectorAll('li[data-step]');
  items.forEach(li => {
    const isSelected = Number(li.dataset.step) === stepId;
    li.setAttribute('aria-selected', String(isSelected));
  });
}

function initJourneyMap() {
  const ol = document.querySelector('ol.journey-map');
  if (!ol) return;

  const items = Array.from(ol.querySelectorAll('li[data-step]'));
  if (!items.length) return;

  // Build steps array from DOM
  const steps = items.map(li => ({
    id: Number(li.dataset.step),
    title: li.querySelector('.journey-map__title')?.textContent.trim() || '',
    description: li.querySelector('.journey-map__description')?.textContent.trim() || ''
  }));

  const result = validateJourneyMap(steps);
  if (!result.valid) return;

  // Wire click and keyboard handlers
  items.forEach(li => {
    li.setAttribute('role', 'button');
    li.setAttribute('aria-selected', 'false');

    li.addEventListener('click', () => {
      selectStep(Number(li.dataset.step), steps, ol);
    });

    li.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectStep(Number(li.dataset.step), steps, ol);
      }
    });
  });

  // Select first step by default
  selectStep(steps[0].id, steps, ol);
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initJourneyMap);
}
