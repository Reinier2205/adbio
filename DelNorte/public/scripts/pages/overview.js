/**
 * Overview Page
 */

async function renderOverviewPage() {
    const user = auth.getCurrentUser();
    const container = document.getElementById('page-container');
    
    container.innerHTML = `
        <div class="page-header">
            <h1>Welcome back, ${user.name}!</h1>
            <p class="subtitle">Your Camino del Norte training overview</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon">📅</div>
                <div class="stat-content">
                    <div class="stat-value" id="days-until">-</div>
                    <div class="stat-label">Days until Camino</div>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon">👟</div>
                <div class="stat-content">
                    <div class="stat-value" id="this-week-walks">-</div>
                    <div class="stat-label">Walks this week</div>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon">🚶</div>
                <div class="stat-content">
                    <div class="stat-value" id="this-week-km">-</div>
                    <div class="stat-label">Kilometers this week</div>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon">🧘</div>
                <div class="stat-content">
                    <div class="stat-value" id="this-week-pilates">-</div>
                    <div class="stat-label">Pilates sessions</div>
                </div>
            </div>
        </div>
        
        <div class="content-grid">
            <div class="card">
                <div class="card-header">
                    <h2>Current Training Phase</h2>
                </div>
                <div class="card-body" id="current-phase">
                    <div class="loading">Loading...</div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h2>Group Progress This Week</h2>
                </div>
                <div class="card-body" id="group-progress">
                    <div class="loading">Loading...</div>
                </div>
            </div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h2>Recent Activities</h2>
            </div>
            <div class="card-body" id="recent-activities">
                <div class="loading">Loading...</div>
            </div>
        </div>
    `;
    
    // Load data
    await loadOverviewData(user);
}

async function loadOverviewData(user) {
    try {
        // Days until Camino
        const daysUntil = getDaysUntilCamino();
        document.getElementById('days-until').textContent = daysUntil;
        
        // Current phase
        const currentPhase = getCurrentPhase();
        document.getElementById('current-phase').innerHTML = `
            <div class="phase-info">
                <h3>${currentPhase.name}</h3>
                <p class="phase-dates">${formatDate(currentPhase.start)} → ${formatDate(currentPhase.end)}</p>
                <p class="phase-description">${currentPhase.description}</p>
                <div class="phase-structure">
                    <strong>Weekly structure:</strong>
                    <p>${currentPhase.weeklyStructure}</p>
                </div>
            </div>
        `;
        
        // Dashboard stats
        const dashboard = await api.getDashboard();
        const userStats = dashboard.userStats[user.name] || {
            walking_km: 0,
            walking_count: 0,
            pilates_count: 0
        };
        
        document.getElementById('this-week-walks').textContent = userStats.walking_count;
        document.getElementById('this-week-km').textContent = `${userStats.walking_km.toFixed(1)} km`;
        document.getElementById('this-week-pilates').textContent = userStats.pilates_count;
        
        // Group progress
        let groupHTML = '<div class="group-stats">';
        for (const [name, stats] of Object.entries(dashboard.userStats)) {
            groupHTML += `
                <div class="group-stat-row">
                    <div class="traveler-name">${name}</div>
                    <div class="traveler-stats">
                        <span>🚶 ${stats.walking_km.toFixed(1)} km</span>
                        <span>🧘 ${stats.pilates_count}</span>
                    </div>
                </div>
            `;
        }
        groupHTML += '</div>';
        document.getElementById('group-progress').innerHTML = groupHTML;
        
        // Recent activities
        const activities = await api.getActivities(user.id);
        if (activities && activities.length > 0) {
            let activitiesHTML = '<div class="activity-list">';
            activities.slice(0, 5).forEach(activity => {
                const icon = getActivityIcon(activity.activity_type);
                activitiesHTML += `
                    <div class="activity-item">
                        <div class="activity-icon">${icon}</div>
                        <div class="activity-details">
                            <div class="activity-type">${capitalize(activity.activity_type)}</div>
                            <div class="activity-date">${formatDate(activity.activity_date)}</div>
                        </div>
                        <div class="activity-stats">
                            ${activity.distance_km ? `<span>${activity.distance_km} km</span>` : ''}
                            <span>${activity.duration_min} min</span>
                        </div>
                    </div>
                `;
            });
            activitiesHTML += '</div>';
            document.getElementById('recent-activities').innerHTML = activitiesHTML;
        } else {
            document.getElementById('recent-activities').innerHTML = `
                <div class="empty-state">
                    <p>No activities yet. Start logging your training!</p>
                    <a href="#log-progress" class="btn-primary">Log your first activity</a>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('Error loading overview:', error);
        document.getElementById('current-phase').innerHTML = '<div class="error">Failed to load data</div>';
    }
}

function getActivityIcon(type) {
    const icons = {
        walk: '🚶',
        pilates: '🧘',
        cycle: '🚴',
        swim: '🏊',
        hike: '⛰️'
    };
    return icons[type] || '✓';
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
