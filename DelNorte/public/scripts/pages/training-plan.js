/**
 * Training Plan Page
 */

async function renderTrainingPlanPage() {
    const user = auth.getCurrentUser();
    const container = document.getElementById('page-container');
    const currentPhase = getCurrentPhase();

    container.innerHTML = `
        <div class="lp-hero">
            <div>
                <h1>Training plan</h1>
                <p class="lp-hero-sub">${getDaysUntilCamino()} days to Camino &mdash; ${formatDate(CONFIG.TRAINING_START)} &rarr; ${formatDate(CONFIG.CAMINO_DATE)}</p>
            </div>
        </div>

        <section class="ov-section">
            <h2 class="ov-section-title">Training phases</h2>
            <div class="tp-phases" id="tp-phases"></div>
        </section>

        <section class="ov-section">
            <h2 class="ov-section-title">Training guidelines</h2>
            <div class="tp-guidelines-grid">
                ${[
                    ['Boot break-in',      '100 km minimum',          'Walk in your Camino boots as much as possible. Prevents blisters and ensures comfort for the full trek.'],
                    ['Conversation test',  '2 hours minimum',         'You should be able to talk comfortably while walking. If you cannot, slow down.'],
                    ['Pack training',      'Full Camino load',           'Train with your full pack in the final 2 months. Start light and increase gradually.'],
                    ['Strength & stretch', '2 sessions per week',     'Pilates and stretching prevent injuries and improve endurance. Non-negotiable.'],
                    ['Hill training',      'Expansion phase onwards',  'Camino del Norte has real elevation. Introduce hills and varied terrain from January.'],
                    ['Consecutive days',   'Camino-readiness phase',    'Walk 2&ndash;3 days back-to-back to simulate the Camino rhythm before you go.'],
                ].map(([title, target, desc]) => `
                    <div class="tp-guideline">
                        <div class="tp-guideline-title">${title}</div>
                        <div class="tp-guideline-target">${target}</div>
                        <p class="tp-guideline-desc">${desc}</p>
                    </div>
                `).join('')}
            </div>
        </section>
    `;

    renderTPPhases();
}

function renderTPPhases() {
    const now = new Date();
    let html = '';
    TRAINING_PHASES.forEach((phase, i) => {
        const isActive = now >= phase.start && now <= phase.end;
        const isPast   = now > phase.end;
        html += `
            <div class="tp-phase${isActive ? ' tp-phase-active' : isPast ? ' tp-phase-past' : ''}">
                <div class="tp-phase-num">${String(i + 1).padStart(2,'0')}</div>
                <div class="tp-phase-body">
                    <div class="tp-phase-top">
                        <div>
                            <div class="tp-phase-name">${phase.name}</div>
                            <div class="tp-phase-dates">${formatDate(phase.start)} &rarr; ${formatDate(phase.end)}</div>
                        </div>
                        <span class="tp-status-pill${isActive ? ' tp-pill-active' : isPast ? ' tp-pill-past' : ' tp-pill-future'}">
                            ${isActive ? 'Current' : isPast ? 'Done' : 'Upcoming'}
                        </span>
                    </div>
                    <p class="tp-phase-desc">${phase.description}</p>
                    <div class="tp-phase-weekly"><strong>Weekly:</strong> ${phase.weeklyStructure}</div>
                </div>
            </div>
        `;
    });
    document.getElementById('tp-phases').innerHTML = html;
}

function getWeekKey(date) {
    return date.getFullYear() + '-W' + String(getWeekNumber(date)).padStart(2,'0');
}