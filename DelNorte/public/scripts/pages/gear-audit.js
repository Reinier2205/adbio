/**
 * Gear Audit Page
 */

async function renderGearAuditPage() {
    const user = auth.getCurrentUser();
    const container = document.getElementById('page-container');

    container.innerHTML = `
        <div class="lp-hero">
            <div>
                <h1>Gear audit</h1>
                <p class="lp-hero-sub">Track your equipment &mdash; especially boot break-in progress</p>
            </div>
        </div>

        <section class="ov-section">
            <h2 class="ov-section-title">Boot break-in</h2>
            <div id="ga-boot-status"><div class="ov-loading">Loading...</div></div>
        </section>

        <div class="lp-layout">
            <!-- Add gear form -->
            <div class="lp-form-col">
                <div class="lp-card">
                    <h2 class="lp-card-title">Add gear item</h2>

                    <div class="lp-field-label">Item type</div>
                    <div class="lp-type-grid ga-type-grid" id="ga-type-grid">
                        <button type="button" class="lp-type-tile lp-selected" data-type="boots">
                            <span class="lp-tile-icon ga-dot-boots"></span><span>Boots</span>
                        </button>
                        <button type="button" class="lp-type-tile" data-type="backpack">
                            <span class="lp-tile-icon ga-dot-backpack"></span><span>Pack</span>
                        </button>
                        <button type="button" class="lp-type-tile" data-type="poles">
                            <span class="lp-tile-icon ga-dot-poles"></span><span>Poles</span>
                        </button>
                        <button type="button" class="lp-type-tile" data-type="jacket">
                            <span class="lp-tile-icon ga-dot-jacket"></span><span>Jacket</span>
                        </button>
                        <button type="button" class="lp-type-tile" data-type="other">
                            <span class="lp-tile-icon ga-dot-other"></span><span>Other</span>
                        </button>
                    </div>

                    <div class="lp-field-label">Name / brand</div>
                    <input type="text" id="ga-name" class="lp-date-input" placeholder="e.g. Salomon Quest 4 GTX">

                    <div class="lp-field-label">Comfort rating</div>
                    <div class="lp-toggle-row" id="ga-rating-row">
                        <button type="button" class="lp-toggle" data-rating="1">1</button>
                        <button type="button" class="lp-toggle" data-rating="2">2</button>
                        <button type="button" class="lp-toggle" data-rating="3">3</button>
                        <button type="button" class="lp-toggle" data-rating="4">4</button>
                        <button type="button" class="lp-toggle" data-rating="5">5 &mdash; Best</button>
                    </div>

                    <div class="lp-field-label">First used <span class="lp-optional">(optional)</span></div>
                    <input type="date" id="ga-first-used" class="lp-date-input">

                    <div class="lp-field-label">Notes <span class="lp-optional">(optional)</span></div>
                    <textarea id="ga-notes" class="lp-notes" rows="2" placeholder="Any issues, adjustments, or observations..."></textarea>

                    <button type="button" id="ga-submit" class="lp-submit-btn">Add gear item</button>
                </div>
            </div>

            <!-- Gear list -->
            <div class="lp-history-col">
                <h2 class="lp-card-title" style="margin-bottom:var(--spacing-md)">Your gear</h2>
                <div id="ga-gear-list"><div class="ov-loading">Loading...</div></div>
            </div>
        </div>

        <section class="ov-section" style="margin-top:var(--spacing-xl)">
            <h2 class="ov-section-title">Gear tips</h2>
            <div class="tp-guidelines-grid">
                ${[
                    ['Boots: 100 km minimum',  'Fully break in your boots before the Camino. 100 km of walking prevents blisters and ensures comfort.'],
                    ['Pack weight: 10% rule',  'Your full pack should weigh no more than 10% of your body weight. Practice with full weight in the final 2 months.'],
                    ['Socks matter',           'Invest in quality merino wool hiking socks. Test them during training to find what works for your feet.'],
                    ['Trekking poles',         'Poles reduce knee strain and improve stability on descents. Practice with them during training.'],
                ].map(([t, d]) => `<div class="tp-guideline"><div class="tp-guideline-title">${t}</div><p class="tp-guideline-desc">${d}</p></div>`).join('')}
            </div>
        </section>
    `;

    // Type tiles
    let selectedGearType = 'boots';
    document.getElementById('ga-type-grid').addEventListener('click', e => {
        const tile = e.target.closest('.lp-type-tile');
        if (!tile) return;
        document.querySelectorAll('#ga-type-grid .lp-type-tile').forEach(t => t.classList.remove('lp-selected'));
        tile.classList.add('lp-selected');
        selectedGearType = tile.dataset.type;
    });

    // Rating toggles (single-select)
    let selectedRating = null;
    document.getElementById('ga-rating-row').addEventListener('click', e => {
        const btn = e.target.closest('[data-rating]');
        if (!btn) return;
        document.querySelectorAll('#ga-rating-row .lp-toggle').forEach(b => b.classList.remove('lp-toggle-on'));
        btn.classList.add('lp-toggle-on');
        selectedRating = parseInt(btn.dataset.rating);
    });

    // Submit
    document.getElementById('ga-submit').addEventListener('click', async () => {
        await handleGASubmit(user, () => selectedGearType, () => selectedRating);
    });

    await loadGAGear(user);
}

async function handleGASubmit(user, getType, getRating) {
    const btn = document.getElementById('ga-submit');
    const name = document.getElementById('ga-name').value.trim();
    if (!name) { alert('Please enter an item name.'); return; }

    btn.disabled = true; btn.textContent = 'Adding...';
    try {
        await api.createGear({
            item_type:      getType(),
            item_name:      name,
            comfort_rating: getRating(),
            first_used:     document.getElementById('ga-first-used').value || null,
            notes:          document.getElementById('ga-notes').value || null,
            total_km:       0,
            is_trail_ready: false,
        });
        document.getElementById('ga-name').value = '';
        document.getElementById('ga-first-used').value = '';
        document.getElementById('ga-notes').value = '';
        document.querySelectorAll('#ga-rating-row .lp-toggle').forEach(b => b.classList.remove('lp-toggle-on'));
        await loadGAGear(user);
    } catch (e) {
        console.error(e);
        alert('Could not add gear item.');
    } finally {
        btn.disabled = false; btn.textContent = 'Add gear item';
    }
}

async function loadGAGear(user) {
    try {
        const gear = await api.getGear(user.id);

        // Boot progress bar
        const boots = gear.filter(g => g.item_type === 'boots');
        const bootEl = document.getElementById('ga-boot-status');
        if (boots.length === 0) {
            bootEl.innerHTML = '<div class="ov-empty"><p>No boots tracked yet. Add your Camino boots below.</p></div>';
        } else {
            const b = boots[0];
            const pct = Math.min((b.total_km / CONFIG.BOOT_READY_KM) * 100, 100);
            const rem = Math.max(CONFIG.BOOT_READY_KM - b.total_km, 0);
            bootEl.innerHTML = `
                <div class="ga-boot-card">
                    <div class="ga-boot-name">${b.item_name}</div>
                    <div class="ga-boot-stats">
                        <div class="ga-boot-stat"><span class="ga-boot-val">${b.total_km.toFixed(1)}</span><span class="ga-boot-lbl">km walked</span></div>
                        <div class="ga-boot-stat"><span class="ga-boot-val">${rem.toFixed(1)}</span><span class="ga-boot-lbl">km remaining</span></div>
                        <div class="ga-boot-stat"><span class="ga-boot-val">${pct.toFixed(0)}%</span><span class="ga-boot-lbl">complete</span></div>
                    </div>
                    <div class="ga-progress-wrap">
                        <div class="ga-progress-bar">
                            <div class="ga-progress-fill" style="width:${pct}%"></div>
                        </div>
                        <span class="ga-progress-label ${pct >= 100 ? 'ga-ready' : ''}">${pct >= 100 ? 'Trail-ready!' : 'Break-in in progress'}</span>
                    </div>
                </div>
            `;
        }

        // Gear list
        const listEl = document.getElementById('ga-gear-list');
        if (gear.length === 0) {
            listEl.innerHTML = '<div class="ov-empty"><p>No gear tracked yet.</p></div>';
            return;
        }

        const GEAR_LABELS = { boots:'Boots', backpack:'Pack', poles:'Poles', jacket:'Jacket', 'sleeping-bag':'Sleeping bag', other:'Other' };
        const rows = gear.map(g => {
            const stars = g.comfort_rating ? Array(g.comfort_rating).fill('&#9733;').join('') + Array(5 - g.comfort_rating).fill('&#9734;').join('') : '&mdash;';
            return `
                <tr>
                    <td><span class="ov-type-dot ga-dot-${g.item_type}"></span>${g.item_name}</td>
                    <td>${GEAR_LABELS[g.item_type] || 'Other'}</td>
                    <td class="ov-num">${g.total_km ? g.total_km.toFixed(1) + ' km' : '&mdash;'}</td>
                    <td class="ga-stars">${stars}</td>
                    <td>${g.is_trail_ready ? '<span class="ov-badge ov-badge-boots">Trail-ready</span>' : '<span class="ov-badge ov-badge-none">Training</span>'}</td>
                </tr>
            `;
        }).join('');

        listEl.innerHTML = `
            <div class="ov-table-wrap">
                <table class="ov-table ov-auto-table">
                    <thead><tr>
                        <th>Item</th>
                        <th>Type</th>
                        <th class="ov-th-num">Km</th>
                        <th>Rating</th>
                        <th>Status</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    } catch (e) {
        document.getElementById('ga-gear-list').innerHTML = '<p class="ov-error">Could not load gear.</p>';
    }
}