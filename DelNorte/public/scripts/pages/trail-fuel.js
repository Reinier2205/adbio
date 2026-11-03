/**
 * Trail Fuel Page
 */

async function renderTrailFuelPage() {
    const user = auth.getCurrentUser();
    const container = document.getElementById('page-container');

    container.innerHTML = `
        <div class="lp-hero">
            <div>
                <h1>Trail fuel</h1>
                <p class="lp-hero-sub">Nutrition and hydration for endurance training and recovery</p>
            </div>
        </div>

        <section class="ov-section">
            <h2 class="ov-section-title">Training superfoods</h2>
            <div class="tf-foods-grid">
                ${CAMINO_SUPERFOODS.map(f => `
                    <div class="tf-food-card">
                        <div class="tf-food-name">${f.name}</div>
                        <div class="tf-food-cat">${f.category}</div>
                        <p class="tf-food-desc">${f.description}</p>
                    </div>
                `).join('')}
            </div>
        </section>

        <section class="ov-section">
            <h2 class="ov-section-title">Daily nutrition timing</h2>
            <div class="ov-table-wrap">
                <table class="ov-table ov-auto-table">
                    <thead><tr><th>When</th><th>What</th><th>Detail</th></tr></thead>
                    <tbody>
                        ${[
                            ['2&ndash;3 h before',   'Carbs + protein',     'Oats with banana, almonds and honey. Scrambled eggs on the side.'],
                            ['30 min before',         'Light snack',         'Avocado toast on whole grain. Small banana.'],
                            ['During (every hour)',   'Quick carbs',         'Banana, trail mix, energy bar. 150&ndash;250 ml water every 20 min.'],
                            ['Within 30 min after',  'Protein + carbs',     'Plain yoghurt with fruit, or a protein shake.'],
                            ['Main meal after',       'Lean protein + carbs', 'Grilled chicken or lentil stew with sweet potato and greens.'],
                        ].map(([when, what, detail]) => `
                            <tr>
                                <td class="ov-td-date">${when}</td>
                                <td><strong>${what}</strong></td>
                                <td>${detail}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </section>

        <section class="ov-section">
            <h2 class="ov-section-title">Hydration</h2>
            <div class="tp-guidelines-grid">
                ${[
                    ['Daily target',        'Aim for 2&ndash;3 litres per day, more on training days. Pale yellow urine = good hydration.'],
                    ['Electrolytes',        'For walks over 90 minutes add electrolyte tablets or a sports drink to prevent cramping.'],
                    ['Caffeine strategy',   'Morning coffee is fine. Avoid excessive caffeine before long walks as it can dehydrate.'],
                    ['Weather adjustment',  'Increase intake in hot weather. Carry 1&ndash;2 litres on every training walk.'],
                ].map(([t, d]) => `<div class="tp-guideline"><div class="tp-guideline-title">${t}</div><p class="tp-guideline-desc">${d}</p></div>`).join('')}
            </div>
        </section>

        <section class="ov-section">
            <h2 class="ov-section-title">Trail snack ideas</h2>
            <div class="tf-snacks-grid">
                ${[
                    ['Trail mix',       'Nuts, seeds, dried fruit, dark chocolate chips'],
                    ['Fresh fruit',     'Bananas, apples, oranges &mdash; easy to carry'],
                    ['Sandwiches',      'Whole grain with lean protein and avocado'],
                    ['Energy bars',     '200&ndash;300 kcal, balanced macros'],
                    ['Hard-boiled eggs','Portable protein for recovery'],
                    ['Cheese & crackers','Whole grain crackers with aged cheese'],
                    ['Nut butter',      'Single-serve packets for quick energy'],
                ].map(([name, desc]) => `
                    <div class="tf-snack">
                        <div class="tf-snack-name">${name}</div>
                        <div class="tf-snack-desc">${desc}</div>
                    </div>
                `).join('')}
            </div>
        </section>
    `;
}