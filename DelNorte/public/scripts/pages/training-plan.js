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
            <h2 class="ov-section-title">Weekly progress &mdash; last 8 weeks</h2>
            <div id="tp-progress"><div class="ov-loading">Loading...</div></div>
        </section>

        <section class="ov-section">
            <h2 class="ov-section-title">Training guidelines</h2>
            <div class="tp-guidelines-grid">
                ${[
                    ['Boot break-in',      '100 km minimum',          'Walk in your Camino boots as much as possible. Prevents blisters and ensures comfort for the full trek.'],
                    ['Conversation test',  '2 hours minimum',         'You should be able to talk comfortably while walking. If you cannot, slow down.'],
                    ['Pack training',      'Full trek load',           'Train with your full pack in the final 2 months. Start light and increase gradually.'],
                    ['Strength & stretch', '2 sessions per week',     'Pilates and stretching prevent injuries and improve endurance. Non-negotiable.'],
                    ['Hill training',      'Expansion phase onwards',  'Camino del Norte has real elevation. Introduce hills and varied terrain from January.'],
                    ['Consecutive days',   'Trek-readiness phase',    'Walk 2&ndash;3 days back-to-back to simulate the Camino rhythm before you go.'],
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
    await loadTPProgress();
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

async function loadTPProgress() {
    try {
        const data = await api.getWeeklyProgress();
        const weekly = {};
        data.forEach(a => {
            const key = getWeekKey(new Date(a.activity_date));
            if (!weekly[key]) weekly[key] = { km: 0, walks: 0, pilates: 0, other: 0 };
            if (a.activity_type === 'walk' || a.activity_type === 'hike') {
                weekly[key].km += parseFloat(a.distance_km || 0);
                weekly[key].walks++;
            } else if (a.activity_type === 'pilates') {
                weekly[key].pilates++;
            } else {
                weekly[key].other++;
            }
        });

        const weeks = Object.keys(weekly).sort().reverse().slice(0, 8);

        if (weeks.length === 0) {
            document.getElementById('tp-progress').innerHTML = '<div class="ov-empty"><p>No data yet. Start logging to see your progress!</p></div>';
            return;
        }

        let rows = weeks.map(w => `
            <tr>
                <td>${w}</td>
                <td class="ov-num">${weekly[w].km.toFixed(1)}</td>
                <td class="ov-num">${weekly[w].walks}</td>
                <td class="ov-num">${weekly[w].pilates}</td>
                <td class="ov-num">${weekly[w].other}</td>
            </tr>
        `).join('');

        document.getElementById('tp-progress').innerHTML = `
            <div class="ov-table-wrap">
                <table class="ov-table ov-auto-table">
                    <thead><tr>
                        <th>Week</th>
                        <th class="ov-th-num">Km</th>
                        <th class="ov-th-num">Walks</th>
                        <th class="ov-th-num">Pilates</th>
                        <th class="ov-th-num">Other</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    } catch (e) {
        document.getElementById('tp-progress').innerHTML = '<p class="ov-error">Could not load progress.</p>';
    }
}

function getWeekKey(date) {
    return date.getFullYear() + '-W' + String(getWeekNumber(date)).padStart(2,'0');
}