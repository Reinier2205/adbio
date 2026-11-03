/**
 * Overview Page
 */

async function renderOverviewPage() {
    const user = auth.getCurrentUser();
    const container = document.getElementById('page-container');

    container.innerHTML = `
        <div class="ov-hero">
            <div class="ov-hero-left">
                <h1>Welcome back, ${user.name}!</h1>
                <p class="ov-hero-sub">Camino del Norte &mdash; <span id="ov-days">...</span> days to go</p>
            </div>
            <div class="ov-phase-card" id="ov-phase-card">
                <div class="ov-phase-pill" id="ov-phase-pill">Loading...</div>
            </div>
        </div>

        <section class="ov-section">
            <h2 class="ov-section-title">Team totals &mdash; all time</h2>
            <div id="ov-totals"><div class="ov-loading">Loading...</div></div>
        </section>

        <section class="ov-section">
            <h2 class="ov-section-title">This week &mdash; the team</h2>
            <div id="ov-week"><div class="ov-loading">Loading...</div></div>
        </section>

        <section class="ov-section">
            <div class="ov-section-header">
                <h2 class="ov-section-title">My activities</h2>
                <button class="ov-log-btn" data-navigate="log-progress">+ Log activity</button>
            </div>
            <div id="ov-my-activities"><div class="ov-loading">Loading...</div></div>
        </section>
    `;

    document.getElementById('ov-days').textContent = getDaysUntilCamino();
    const phase = getCurrentPhase();
    document.getElementById('ov-phase-pill').textContent = phase.name + ' phase';
    document.getElementById('ov-phase-card').innerHTML = `
        <div class="ov-phase-pill">${phase.name} phase</div>
        <p class="ov-phase-desc">${phase.description}</p>
        <p class="ov-phase-weekly"><strong>Weekly:</strong> ${phase.weeklyStructure}</p>
    `;

    try {
        const [allActivities, dashboard] = await Promise.all([
            api.getActivities(),
            api.getDashboard()
        ]);
        renderAllTimeTotals(allActivities);
        renderWeekTable(dashboard);
    } catch (e) {
        console.error('Overview group error:', e);
        document.getElementById('ov-totals').innerHTML = '<p class="ov-error">Could not load team data.</p>';
        document.getElementById('ov-week').innerHTML   = '<p class="ov-error">Could not load week data.</p>';
    }

    try {
        const mine = await api.getActivities(user.id);
        renderMyActivities(mine);
    } catch (e) {
        console.error('Overview my-activities error:', e);
        document.getElementById('ov-my-activities').innerHTML = '<p class="ov-error">Could not load your activities.</p>';
    }
}

/* -------------------------------------------------------
   All-time totals: one row per person, sorted by km
------------------------------------------------------- */
function renderAllTimeTotals(activities) {
    const NAMES = ['Reinier', 'Drikkie', 'Annatjie', 'Letitia'];
    const stats = {};
    NAMES.forEach(n => { stats[n] = { count: 0, km: 0, min: 0 }; });

    (activities || []).forEach(a => {
        const name = a.travelers && a.travelers.name;
        if (name && stats[name]) {
            stats[name].count++;
            stats[name].km  += parseFloat(a.distance_km || 0);
            stats[name].min += parseInt(a.duration_min  || 0);
        }
    });

    const sorted = NAMES.slice().sort((a, b) => stats[b].km - stats[a].km);

    let rows = '';
    sorted.forEach((name, idx) => {
        const s   = stats[name];
        const hrs = Math.floor(s.min / 60);
        const min = s.min % 60;
        const dur = s.min > 0 ? (hrs > 0 ? hrs + 'h ' + min + 'm' : min + 'm') : '&mdash;';
        const isLeader = idx === 0 && s.km > 0;
        rows += `
            <tr class="${isLeader ? 'ov-leader' : ''}">
                <td>${isLeader ? '<span class="ov-crown">&#9733;</span> ' : ''}${name}</td>
                <td class="ov-num">${s.count}</td>
                <td class="ov-num">${s.km.toFixed(1)}</td>
                <td class="ov-num">${dur}</td>
            </tr>
        `;
    });

    document.getElementById('ov-totals').innerHTML = `
        <div class="ov-table-wrap">
            <table class="ov-table ov-auto-table">
                <thead><tr>
                    <th>Traveller</th>
                    <th class="ov-th-num">Activities</th>
                    <th class="ov-th-num">Km</th>
                    <th class="ov-th-num">Time trained</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
}

/* -------------------------------------------------------
   This week table
------------------------------------------------------- */
function renderWeekTable(dashboard) {
    const NAMES = ['Reinier', 'Drikkie', 'Annatjie', 'Letitia'];
    const stats = dashboard.userStats || {};

    let rows = '';
    NAMES.forEach(name => {
        const s       = stats[name] || {};
        const walks   = s.walking_count    || 0;
        const pilates = s.pilates_count    || 0;
        const other   = s.other_activities || 0;
        const total   = walks + pilates + other;
        const km      = parseFloat(s.walking_km || 0).toFixed(1);

        let breakdown = '';
        if (walks)   breakdown += '<span class="ov-badge ov-badge-walk">Walk ' + walks + '</span>';
        if (pilates) breakdown += '<span class="ov-badge ov-badge-pilates">Pilates ' + pilates + '</span>';
        if (other)   breakdown += '<span class="ov-badge ov-badge-other">Other ' + other + '</span>';
        if (!total)  breakdown  = '<span class="ov-badge ov-badge-none">Rest week</span>';

        rows += `
            <tr>
                <td>${name}</td>
                <td class="ov-num">${total}</td>
                <td class="ov-num">${km}</td>
                <td class="ov-td-badges">${breakdown}</td>
            </tr>
        `;
    });

    document.getElementById('ov-week').innerHTML = `
        <div class="ov-table-wrap">
            <table class="ov-table ov-auto-table">
                <thead><tr>
                    <th>Traveller</th>
                    <th class="ov-th-num">Activities</th>
                    <th class="ov-th-num">Km</th>
                    <th>Breakdown</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
}

/* -------------------------------------------------------
   My activities detail table  (shared helper)
   containerId  — DOM id to render into
   activities   — array
   onRefresh    — async fn() to reload the list after edit/delete
------------------------------------------------------- */
function renderActivityTable(containerId, activities, onRefresh) {
    const el = document.getElementById(containerId);

    if (!activities || activities.length === 0) {
        el.innerHTML = `
            <div class="ov-empty">
                <p>No activities yet. Start logging your training!</p>
                <button class="ov-log-btn" data-navigate="log-progress">Log your first activity</button>
            </div>`;
        return;
    }

    // Store activities keyed by id for modal lookup
    const actMap = {};
    activities.forEach(a => { actMap[a.id] = a; });

    let rows = '';
    activities.forEach(a => {
        const typeLabel = capitalize(a.activity_type);
        const typeCls   = 'ov-dot-' + a.activity_type;
        const km        = a.distance_km      ? parseFloat(a.distance_km).toFixed(1) + ' km' : '&mdash;';
        const elev      = a.elevation_gain_m ? a.elevation_gain_m + ' m' : '&mdash;';
        const dur       = a.duration_min     ? a.duration_min + ' min'   : '&mdash;';

        let badges = [];
        if (a.wore_camino_boots) badges.push('<span class="ov-badge ov-badge-boots">Boots</span>');
        if (a.stretched_after)   badges.push('<span class="ov-badge ov-badge-stretch">Stretch</span>');
        if (a.conversation_test) badges.push('<span class="ov-badge ov-badge-conv">Conv</span>');

        rows += `
            <tr class="act-row" data-id="${a.id}" title="Tap to edit">
                <td><span class="ov-type-dot ${typeCls}"></span>${typeLabel}</td>
                <td class="ov-td-date">${formatDate(a.activity_date)}</td>
                <td class="ov-num">${km}</td>
                <td class="ov-num ov-hide-xs">${elev}</td>
                <td class="ov-num">${dur}</td>
                <td>${badges.join(' ') || '&mdash;'}</td>
                <td class="act-edit-cell"><span class="act-edit-icon">&#9998;</span></td>
            </tr>
        `;
    });

    el.innerHTML = `
        <div class="ov-table-wrap">
            <table class="ov-table ov-auto-table ov-act-table">
                <thead><tr>
                    <th>Activity</th>
                    <th>Date</th>
                    <th class="ov-th-num">Km</th>
                    <th class="ov-th-num ov-hide-xs">Elevation</th>
                    <th class="ov-th-num">Duration</th>
                    <th>Tags</th>
                    <th></th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
        <p class="act-tap-hint">Tap a row to edit or delete</p>
    `;

    // Wire up row clicks
    el.querySelectorAll('.act-row').forEach(row => {
        row.addEventListener('click', () => {
            const activity = actMap[row.dataset.id];
            if (!activity) return;
            activityModal.open(
                activity,
                async () => { await onRefresh(); },   // onSaved
                async () => { await onRefresh(); }    // onDeleted
            );
        });
    });
}

function renderMyActivities(activities) {
    const user = auth.getCurrentUser();
    renderActivityTable('ov-my-activities', activities, async () => {
        const fresh = await api.getActivities(user.id);
        renderMyActivities(fresh);
    });
}

function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}