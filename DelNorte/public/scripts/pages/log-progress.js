/**
 * Log Progress Page
 */

async function renderLogProgressPage() {
    const user = auth.getCurrentUser();
    const container = document.getElementById('page-container');

    container.innerHTML = `
        <div class="lp-hero">
            <div>
                <h1>Log progress</h1>
                <p class="lp-hero-sub">Track your training, ${user.name}</p>
            </div>
        </div>

        <div class="lp-layout">
            <!-- LEFT: capture form -->
            <div class="lp-form-col">
                <div class="lp-card">
                    <h2 class="lp-card-title">New activity</h2>

                    <!-- Step 1: activity type tiles -->
                    <div class="lp-field-label">What did you do?</div>
                    <div class="lp-type-grid" id="lp-type-grid">
                        <button type="button" class="lp-type-tile lp-selected" data-type="walk">
                            <span class="lp-tile-icon lp-dot-walk"></span>
                            <span>Walk</span>
                        </button>
                        <button type="button" class="lp-type-tile" data-type="hike">
                            <span class="lp-tile-icon lp-dot-hike"></span>
                            <span>Hike</span>
                        </button>
                        <button type="button" class="lp-type-tile" data-type="pilates">
                            <span class="lp-tile-icon lp-dot-pilates"></span>
                            <span>Pilates</span>
                        </button>
                        <button type="button" class="lp-type-tile" data-type="cycle">
                            <span class="lp-tile-icon lp-dot-cycle"></span>
                            <span>Cycle</span>
                        </button>
                        <button type="button" class="lp-type-tile" data-type="swim">
                            <span class="lp-tile-icon lp-dot-swim"></span>
                            <span>Swim</span>
                        </button>
                    </div>

                    <!-- Step 2: date -->
                    <div class="lp-field-label">Date</div>
                    <input type="date" id="lp-date" class="lp-date-input">

                    <!-- Step 3: numbers -->
                    <div class="lp-numbers-row" id="lp-distance-row">
                        <div class="lp-number-box">
                            <div class="lp-field-label">Distance</div>
                            <div class="lp-number-input-wrap">
                                <input type="number" id="lp-distance" class="lp-number-input" min="0" step="0.1" placeholder="0.0">
                                <span class="lp-number-unit">km</span>
                            </div>
                        </div>
                        <div class="lp-number-box">
                            <div class="lp-field-label">Elevation</div>
                            <div class="lp-number-input-wrap">
                                <input type="number" id="lp-elevation" class="lp-number-input" min="0" placeholder="0">
                                <span class="lp-number-unit">m</span>
                            </div>
                        </div>
                        <div class="lp-number-box">
                            <div class="lp-field-label">Duration</div>
                            <div class="lp-number-input-wrap">
                                <input type="number" id="lp-duration" class="lp-number-input" min="1" placeholder="60">
                                <span class="lp-number-unit">min</span>
                            </div>
                        </div>
                    </div>
                    <div class="lp-numbers-row" id="lp-duration-only-row" style="display:none">
                        <div class="lp-number-box">
                            <div class="lp-field-label">Duration</div>
                            <div class="lp-number-input-wrap">
                                <input type="number" id="lp-duration-pilates" class="lp-number-input" min="1" placeholder="45">
                                <span class="lp-number-unit">min</span>
                            </div>
                        </div>
                    </div>

                    <!-- Step 4: toggle tags -->
                    <div class="lp-field-label">How did it go?</div>
                    <div class="lp-toggle-row">
                        <button type="button" class="lp-toggle" id="tog-boots">Boots</button>
                        <button type="button" class="lp-toggle" id="tog-stretch">Stretched</button>
                        <button type="button" class="lp-toggle" id="tog-conv">Conv. test</button>
                    </div>

                    <!-- Step 5: notes -->
                    <div class="lp-field-label">Notes <span class="lp-optional">(optional)</span></div>
                    <textarea id="lp-notes" class="lp-notes" rows="2" placeholder="How did it feel? Any hotspots?"></textarea>

                    <button type="button" id="lp-submit" class="lp-submit-btn">Save activity</button>
                </div>
            </div>

            <!-- RIGHT: recent activities -->
            <div class="lp-history-col">
                <div class="ov-section-header" style="margin-bottom:var(--spacing-md)">
                    <h2 class="lp-card-title" style="margin-bottom:0">Your activities</h2>
                </div>
                <div id="lp-activities"><div class="ov-loading">Loading...</div></div>
            </div>
        </div>
    `;

    // Set today
    document.getElementById('lp-date').value = new Date().toISOString().split('T')[0];

    // Type tile selection
    let selectedType = 'walk';
    document.getElementById('lp-type-grid').addEventListener('click', e => {
        const tile = e.target.closest('.lp-type-tile');
        if (!tile) return;
        document.querySelectorAll('.lp-type-tile').forEach(t => t.classList.remove('lp-selected'));
        tile.classList.add('lp-selected');
        selectedType = tile.dataset.type;

        // Show/hide distance fields
        const isPilates = selectedType === 'pilates';
        document.getElementById('lp-distance-row').style.display    = isPilates ? 'none' : '';
        document.getElementById('lp-duration-only-row').style.display = isPilates ? '' : 'none';
    });

    // Toggle pills
    document.querySelectorAll('.lp-toggle').forEach(btn => {
        btn.addEventListener('click', () => btn.classList.toggle('lp-toggle-on'));
    });

    // Submit
    document.getElementById('lp-submit').addEventListener('click', async () => {
        await handleLPSubmit(user, () => { selectedType; }, () => selectedType);
    });

    // Load history
    await loadLPActivities(user);
}

async function handleLPSubmit(user, _unused, getType) {
    const submitBtn = document.getElementById('lp-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    try {
        const activityType = getType();
        const isPilates    = activityType === 'pilates';

        const durationEl = isPilates
            ? document.getElementById('lp-duration-pilates')
            : document.getElementById('lp-duration');

        if (!durationEl.value) {
            alert('Please enter a duration.');
            return;
        }

        const activity = {
            activity_type:     activityType,
            activity_date:     document.getElementById('lp-date').value,
            duration_min:      parseInt(durationEl.value),
            wore_camino_boots: document.getElementById('tog-boots').classList.contains('lp-toggle-on'),
            stretched_after:   document.getElementById('tog-stretch').classList.contains('lp-toggle-on'),
            conversation_test: document.getElementById('tog-conv').classList.contains('lp-toggle-on'),
            notes:             document.getElementById('lp-notes').value || null,
        };

        if (!isPilates) {
            const dist = document.getElementById('lp-distance').value;
            const elev = document.getElementById('lp-elevation').value;
            if (dist) activity.distance_km       = parseFloat(dist);
            if (elev) activity.elevation_gain_m  = parseInt(elev);
        }

        await api.createActivity(activity);

        // Reset form
        document.getElementById('lp-date').value = new Date().toISOString().split('T')[0];
        ['lp-distance','lp-elevation','lp-duration','lp-duration-pilates','lp-notes'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        document.querySelectorAll('.lp-toggle').forEach(b => b.classList.remove('lp-toggle-on'));
        document.querySelectorAll('.lp-type-tile').forEach(t => t.classList.remove('lp-selected'));
        document.querySelector('.lp-type-tile[data-type="walk"]').classList.add('lp-selected');

        showLPNotification('Activity saved!', 'success');
        await loadLPActivities(user);

    } catch (err) {
        console.error('Save error:', err);
        showLPNotification('Could not save. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save activity';
    }
}

async function loadLPActivities(user) {
    try {
        const activities = await api.getActivities(user.id);
        renderActivityTable('lp-activities', activities, async () => {
            await loadLPActivities(user);
        });
    } catch (err) {
        console.error('Load activities error:', err);
        document.getElementById('lp-activities').innerHTML = '<p class="ov-error">Could not load activities.</p>';
    }
}

function showLPNotification(msg, type) {
    const old = document.getElementById('lp-notif');
    if (old) old.remove();
    const el = document.createElement('div');
    el.id = 'lp-notif';
    el.className = 'lp-notif lp-notif-' + type;
    el.textContent = msg;
    document.querySelector('.lp-form-col').prepend(el);
    setTimeout(() => el.remove(), 3000);
}