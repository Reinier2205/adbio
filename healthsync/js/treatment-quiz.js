/**
 * treatment-quiz.js — Multi-step treatment recommendation quiz
 * ES module. Requirements: 3.6, 3.7
 *
 * Property 5: runQuiz(answers) always returns non-null QuizResult
 *             with non-empty recommendedService and ctaHref ending in .html
 */

/**
 * @typedef {{ id: string, text: string, options: { value: string, label: string, weight: Record<string,number> }[] }} QuizQuestion
 * @typedef {{ recommendedService: string, headline: string, ctaHref: string }} QuizResult
 */

/** @type {QuizQuestion[]} */
const QUESTIONS = [
  {
    id: 'q1',
    text: 'What is your primary health goal right now?',
    options: [
      { value: 'aesthetics',    label: 'Look and feel my best',       weight: { aesthetics: 3, consultations: 1 } },
      { value: 'weight-loss',   label: 'Manage my weight',            weight: { 'weight-loss': 3, consultations: 1 } },
      { value: 'iv-therapy',    label: 'Boost my energy and immunity', weight: { 'iv-therapy': 3, consultations: 1 } },
      { value: 'dispensary',    label: 'Support my health naturally',  weight: { dispensary: 2, consultations: 1 } }
    ]
  },
  {
    id: 'q2',
    text: 'How would you describe your current energy levels?',
    options: [
      { value: 'low',      label: 'Consistently low or drained',  weight: { 'iv-therapy': 3, 'weight-loss': 1 } },
      { value: 'moderate', label: 'Variable — good and bad days', weight: { consultations: 2, 'iv-therapy': 1 } },
      { value: 'good',     label: 'Generally good',               weight: { aesthetics: 1, dispensary: 1 } },
      { value: 'great',    label: 'High energy',                  weight: { aesthetics: 2, dispensary: 1 } }
    ]
  },
  {
    id: 'q3',
    text: 'Which area matters most to you personally?',
    options: [
      { value: 'skin',      label: 'Skin health and appearance',       weight: { aesthetics: 3 } },
      { value: 'weight',    label: 'Sustainable weight management',    weight: { 'weight-loss': 3 } },
      { value: 'vitality',  label: 'Vitality and immune support',      weight: { 'iv-therapy': 3 } },
      { value: 'holistic',  label: 'Overall wellbeing',                weight: { consultations: 2, dispensary: 1 } }
    ]
  },
  {
    id: 'q4',
    text: 'Have you seen a doctor about your current health goals before?',
    options: [
      { value: 'never',     label: 'No, this would be my first time',  weight: { consultations: 3 } },
      { value: 'sometimes', label: 'Yes, but not recently',            weight: { consultations: 2, 'weight-loss': 1 } },
      { value: 'regularly', label: 'Yes, I see a doctor regularly',    weight: { aesthetics: 1, 'iv-therapy': 1 } },
      { value: 'unsure',    label: "I'm not sure where to start",      weight: { consultations: 3 } }
    ]
  },
  {
    id: 'q5',
    text: 'What would a successful outcome look like for you?',
    options: [
      { value: 'confidence', label: 'Greater confidence in how I look',      weight: { aesthetics: 3 } },
      { value: 'health',     label: 'Improved long-term health',             weight: { 'weight-loss': 2, consultations: 1 } },
      { value: 'energy',     label: 'More energy and resilience',            weight: { 'iv-therapy': 3 } },
      { value: 'products',   label: 'Better products to support my routine', weight: { dispensary: 3 } }
    ]
  }
];

const SERVICES = {
  'aesthetics':    { label: 'Aesthetic Treatments', page: 'aesthetics.html' },
  'weight-loss':   { label: 'Weight Loss Programme', page: 'weight-loss.html' },
  'iv-therapy':    { label: 'IV Therapy',            page: 'iv-therapy.html' },
  'consultations': { label: 'a Consultation',        page: 'consultations.html' },
  'dispensary':    { label: 'our Dispensary',        page: 'dispensary.html' }
};

// Validate question count on module load (Req 3.7)
if (QUESTIONS.length < 3 || QUESTIONS.length > 7) {
  console.error(`Quiz must have 3–7 questions; has ${QUESTIONS.length}.`);
}

/**
 * @param {string[]} answers — array of option values, length 3–7
 * @returns {QuizResult}
 */
export function runQuiz(answers) {
  const scores = {};
  answers.forEach((answer, qIndex) => {
    const question = QUESTIONS[qIndex];
    if (!question) return;
    const option = question.options.find(o => o.value === answer);
    if (!option) return;
    Object.entries(option.weight).forEach(([service, points]) => {
      scores[service] = (scores[service] || 0) + points;
    });
  });

  // Pick highest score; default to consultations if no scores
  let topService = 'consultations';
  let topScore = -1;
  Object.entries(scores).forEach(([service, score]) => {
    if (score > topScore) { topScore = score; topService = service; }
  });

  const svc = SERVICES[topService] || SERVICES['consultations'];
  return {
    recommendedService: topService,
    headline: `We recommend ${svc.label} for you`,
    ctaHref: svc.page
  };
}

// ── DOM rendering ────────────────────────────────────────────────

function initQuiz() {
  const section = document.getElementById('treatment-quiz');
  if (!section) return;

  let currentIndex = 0;
  const answers = [];

  // Build quiz shell
  section.innerHTML = `
    <div class="container">
      <h2>Find Your Perfect Treatment</h2>
      <div class="treatment-quiz">
        <div class="quiz__progress" role="progressbar"
             aria-valuenow="1" aria-valuemin="1" aria-valuemax="${QUESTIONS.length}">
          Step 1 of ${QUESTIONS.length}
        </div>
        <form class="quiz__form" novalidate id="quiz-form"></form>
        <div class="quiz__result" hidden aria-live="polite" id="quiz-result"></div>
      </div>
    </div>`;

  const progressEl = section.querySelector('.quiz__progress');
  const formEl = document.getElementById('quiz-form');
  const resultEl = document.getElementById('quiz-result');

  function renderQuestion(index) {
    const q = QUESTIONS[index];
    progressEl.setAttribute('aria-valuenow', String(index + 1));
    progressEl.textContent = `Step ${index + 1} of ${QUESTIONS.length}`;

    formEl.innerHTML = `
      <fieldset>
        <legend>${q.text}</legend>
        ${q.options.map(opt => `
          <label>
            <input type="radio" name="quiz-answer" value="${opt.value}">
            <span>${opt.label}</span>
          </label>`).join('')}
      </fieldset>
      <button type="submit" class="btn-primary" style="margin-top: var(--spacing-16);">
        ${index < QUESTIONS.length - 1 ? 'Next' : 'See My Recommendation'}
      </button>`;
  }

  formEl.addEventListener('submit', e => {
    e.preventDefault();
    const selected = formEl.querySelector('input[name="quiz-answer"]:checked');
    if (!selected) return;

    answers[currentIndex] = selected.value;
    currentIndex++;

    if (currentIndex < QUESTIONS.length) {
      renderQuestion(currentIndex);
    } else {
      const result = runQuiz(answers);
      formEl.hidden = true;
      progressEl.hidden = true;
      resultEl.removeAttribute('hidden');
      resultEl.innerHTML = `
        <h3>${result.headline}</h3>
        <p>Based on your answers, we think you'd benefit most from exploring <strong>${SERVICES[result.recommendedService]?.label || result.recommendedService}</strong>.</p>
        <a href="${result.ctaHref}" class="btn-primary">Learn More</a>`;
    }
  });

  renderQuestion(0);
}

document.addEventListener('DOMContentLoaded', initQuiz);
