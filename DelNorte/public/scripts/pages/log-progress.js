/**
 * Log Progress Page
 */

async function renderLogProgressPage() {
    const user = auth.getCurrentUser();
    const container = document.getElementById('page-container');
    
    container.innerHTML = `
        <div class="page-header">
            <h1>Log progress</h1>
            <p class="subtitle">Track your training activities</p>
        </div>
        
        <div class="content-grid">
            <div class="card">
                <div class="card-header">
                    <h2>New Activity</h2>
                </div>
                <div class="card-body">
                    <form id="activity-form" class="form">
                        <div class="form-group">
                            <label for="activity-type">Activity Type</label>
                            <select id="activity-type" class="input-field" required>
                                <option value="walk">🚶 Walk</option>
                                <option value="pilates">🧘 Pilates</option>
                                <option value="hike">⛰️ Hike</option>
                                <option value="cycle">🚴 Cycle</option>
                                <option value="swim">🏊 Swim</option>
                            </select>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="activity-date">Date</label>
                                <input type="date" id="activity-date" class="input-field" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="duration">Duration (minutes)</label>
                                <input type="number" id="duration" class="input-field" min="1" required>
                            </div>
                        </div>
                        
                        <div class="form-row" id="distance-group">
                            <div class="form-group">
                                <label for="distance">Distance (km)</label>
                                <input type="number" id="distance" class="input-field" min="0" step="0.1">
                            </div>
                            
                            <div class="form-group">
                                <label for="elevation">Elevation gain (m)</label>
                                <input type="number" id="elevation" class="input-field" min="0" value="0">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="wore-boots">
                                <span>Wore Camino boots</span>
                            </label>
                        </div>
                        
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="stretched">
                                <span>Stretched after</span>
                            </label>
                        </div>
                        
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="conversation-test">
                                <span>Passed conversation test (could talk comfortably)</span>
                            </label>
                        </div>
                        
                        <div class="form-group">
                            <label for="notes">Notes (optional)</label>
                            <textarea id="notes" class="input-field" rows="3" placeholder="How did you feel? Any discomfort or hotspots?"></textarea>
                        </div>
                        
                        <button type="submit" class="btn-primary">Log Activity</button>
                    </form>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h2>Your Recent Activities</h2>
                </div>
                <div class="card-body" id="activities-list">
                    <div class="loading">Loading...</div>
                </div>
            </div>
        </div>
    `;
    
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('activity-date').value = today;
    
    // Handle activity type change
    const activityTypeSelect = document.getElementById('activity-type');
    const distanceGroup = document.getElementById('distance-group');
    
    activityTypeSelect.addEventListener('change', () => {
        // Hide distance for Pilates
        if (activityTypeSelect.value === 'pilates') {
            distanceGroup.style.display = 'none';
        } else {
            distanceGroup.style.display = 'flex';
        }
    });
    
    // Handle form submission
    const form = document.getElementById('activity-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleActivitySubmit(user);
    });
    
    // Load activities
    await loadActivities(user);
}

async function handleActivitySubmit(user) {
    const submitBtn = document.querySelector('#activity-form button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
    
    try {
        const activityType = document.getElementById('activity-type').value;
        const activity = {
            activity_type: activityType,
            activity_date: document.getElementById('activity-date').value,
            duration_min: parseInt(document.getElementById('duration').value),
            stretched_after: document.getElementById('stretched').checked,
            conversation_test: document.getElementById('conversation-test').checked,
            wore_camino_boots: document.getElementById('wore-boots').checked,
            notes: document.getElementById('notes').value || null
        };
        
        // Add distance/elevation for non-Pilates activities
        if (activityType !== 'pilates') {
            const distance = document.getElementById('distance').value;
            const elevation = document.getElementById('elevation').value;
            if (distance) activity.distance_km = parseFloat(distance);
            if (elevation) activity.elevation_gain_m = parseInt(elevation);
        }
        
        await api.createActivity(activity);
        
        // Reset form
        document.getElementById('activity-form').reset();
        document.getElementById('activity-date').value = new Date().toISOString().split('T')[0];
        
        // Reload activities
        await loadActivities(user);
        
        // Show success message
        showNotification('Activity logged successfully! 🎉', 'success');
        
    } catch (error) {
        console.error('Error logging activity:', error);
        showNotification('Failed to log activity. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Log Activity';
    }
}

async function loadActivities(user) {
    try {
        const activities = await api.getActivities(user.id);
        const listContainer = document.getElementById('activities-list');
        
        if (!activities || activities.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state">
                    <p>No activities logged yet.</p>
                    <p>Start tracking your training above!</p>
                </div>
            `;
            return;
        }
        
        let html = '<div class="activity-list">';
        activities.forEach(activity => {
            const icon = getActivityIcon(activity.activity_type);
            html += `
                <div class="activity-card">
                    <div class="activity-header">
                        <div>
                            <span class="activity-icon-large">${icon}</span>
                            <strong>${capitalize(activity.activity_type)}</strong>
                        </div>
                        <span class="activity-date">${formatDate(activity.activity_date)}</span>
                    </div>
                    <div class="activity-stats-grid">
                        ${activity.distance_km ? `<div><span class="label">Distance:</span> ${activity.distance_km} km</div>` : ''}
                        <div><span class="label">Duration:</span> ${activity.duration_min} min</div>
                        ${activity.elevation_gain_m ? `<div><span class="label">Elevation:</span> ${activity.elevation_gain_m} m</div>` : ''}
                    </div>
                    <div class="activity-badges">
                        ${activity.wore_camino_boots ? '<span class="badge">👟 Boots</span>' : ''}
                        ${activity.stretched_after ? '<span class="badge">🧘 Stretched</span>' : ''}
                        ${activity.conversation_test ? '<span class="badge">💬 Conv. test</span>' : ''}
                    </div>
                    ${activity.notes ? `<div class="activity-notes">${activity.notes}</div>` : ''}
                </div>
            `;
        });
        html += '</div>';
        
        listContainer.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading activities:', error);
        document.getElementById('activities-list').innerHTML = `
            <div class="error">Failed to load activities</div>
        `;
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

function showNotification(message, type = 'info') {
    // Simple notification - you can enhance this
    alert(message);
}
