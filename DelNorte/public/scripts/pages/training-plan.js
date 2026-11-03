/**
 * Training Plan Page
 */

async function renderTrainingPlanPage() {
    const user = auth.getCurrentUser();
    const container = document.getElementById('page-container');
    
    container.innerHTML = `
        <div class="page-header">
            <h1>Training plan</h1>
            <p class="subtitle">Your 7-month preparation for Camino del Norte</p>
        </div>
        
        <div class="timeline-container">
            <div class="timeline-header">
                <div class="timeline-dates">
                    <span>📅 ${formatDate(CONFIG.TRAINING_START)}</span>
                    <span class="timeline-arrow">→</span>
                    <span>🎯 ${formatDate(CONFIG.CAMINO_DATE)}</span>
                </div>
                <div class="timeline-countdown">
                    <strong>${getDaysUntilCamino()} days</strong> until departure
                </div>
            </div>
            
            <div class="phases-container" id="phases-container">
                <!-- Phases will be rendered here -->
            </div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h2>Weekly Progress Chart</h2>
            </div>
            <div class="card-body" id="progress-chart">
                <div class="loading">Loading your progress...</div>
            </div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h2>Training Guidelines</h2>
            </div>
            <div class="card-body">
                <div class="guidelines-grid">
                    <div class="guideline-card">
                        <div class="guideline-icon">🥾</div>
                        <h3>Boot Break-in</h3>
                        <p>Target: <strong>100km minimum</strong></p>
                        <p>Walk in your Camino boots as much as possible during training. This prevents blisters and ensures comfort for the full trek.</p>
                    </div>
                    
                    <div class="guideline-card">
                        <div class="guideline-icon">💬</div>
                        <h3>Conversation Test</h3>
                        <p>Duration: <strong>2 hours minimum</strong></p>
                        <p>You should be able to maintain a conversation comfortably while walking. This ensures you're not overexerting.</p>
                    </div>
                    
                    <div class="guideline-card">
                        <div class="guideline-icon">🎒</div>
                        <h3>Pack Training</h3>
                        <p>Weight: <strong>Full trek load</strong></p>
                        <p>Practice with your full pack during the final 2 months. Start light and gradually increase weight.</p>
                    </div>
                    
                    <div class="guideline-card">
                        <div class="guideline-icon">🧘</div>
                        <h3>Strength & Flexibility</h3>
                        <p>Frequency: <strong>2x per week</strong></p>
                        <p>Pilates and stretching prevent injuries and improve endurance. Never skip these sessions!</p>
                    </div>
                    
                    <div class="guideline-card">
                        <div class="guideline-icon">⛰️</div>
                        <h3>Hill Training</h3>
                        <p>Focus: <strong>Expansion phase</strong></p>
                        <p>Camino del Norte has significant elevation. Practice hills and varied terrain from January onwards.</p>
                    </div>
                    
                    <div class="guideline-card">
                        <div class="guideline-icon">🔄</div>
                        <h3>Consecutive Days</h3>
                        <p>Target: <strong>Back-to-back walks</strong></p>
                        <p>In the final phase, practice 2-3 consecutive days of walking to simulate the trek rhythm.</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Render phases
    renderPhases();
    
    // Load progress chart
    await loadProgressChart(user);
}

function renderPhases() {
    const container = document.getElementById('phases-container');
    const currentDate = new Date();
    
    let html = '';
    TRAINING_PHASES.forEach((phase, index) => {
        const isActive = currentDate >= phase.start && currentDate <= phase.end;
        const isPast = currentDate > phase.end;
        const isFuture = currentDate < phase.start;
        
        let statusClass = '';
        let statusLabel = '';
        if (isActive) {
            statusClass = 'phase-active';
            statusLabel = '▶ Current Phase';
        } else if (isPast) {
            statusClass = 'phase-past';
            statusLabel = '✓ Completed';
        } else {
            statusClass = 'phase-future';
            statusLabel = '○ Upcoming';
        }
        
        html += `
            <div class="phase-card ${statusClass}">
                <div class="phase-number">${String(index + 1).padStart(2, '0')}</div>
                <div class="phase-content">
                    <div class="phase-header">
                        <h3>${phase.name}</h3>
                        <span class="phase-status">${statusLabel}</span>
                    </div>
                    <div class="phase-dates">
                        ${formatDate(phase.start)} → ${formatDate(phase.end)}
                    </div>
                    <p class="phase-description">${phase.description}</p>
                    <div class="phase-structure">
                        <strong>Weekly structure:</strong>
                        <p>${phase.weeklyStructure}</p>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

async function loadProgressChart(user) {
    try {
        const data = await api.getWeeklyProgress();
        
        // Group activities by week
        const weeklyData = {};
        data.forEach(activity => {
            const date = new Date(activity.activity_date);
            const weekKey = getWeekKey(date);
            
            if (!weeklyData[weekKey]) {
                weeklyData[weekKey] = {
                    walking_km: 0,
                    walking_count: 0,
                    pilates_count: 0,
                    other_count: 0
                };
            }
            
            if (activity.activity_type === 'walk') {
                weeklyData[weekKey].walking_km += parseFloat(activity.distance_km || 0);
                weeklyData[weekKey].walking_count++;
            } else if (activity.activity_type === 'pilates') {
                weeklyData[weekKey].pilates_count++;
            } else {
                weeklyData[weekKey].other_count++;
            }
        });
        
        // Render chart (simple text-based for now)
        let chartHTML = '<div class="progress-table">';
        chartHTML += `
            <div class="progress-table-header">
                <div>Week</div>
                <div>Walking (km)</div>
                <div>Walks</div>
                <div>Pilates</div>
                <div>Other</div>
            </div>
        `;
        
        const weeks = Object.keys(weeklyData).sort().reverse().slice(0, 8);
        weeks.forEach(weekKey => {
            const stats = weeklyData[weekKey];
            chartHTML += `
                <div class="progress-table-row">
                    <div>${weekKey}</div>
                    <div><strong>${stats.walking_km.toFixed(1)}</strong></div>
                    <div>${stats.walking_count}</div>
                    <div>${stats.pilates_count}</div>
                    <div>${stats.other_count}</div>
                </div>
            `;
        });
        
        chartHTML += '</div>';
        
        if (weeks.length === 0) {
            chartHTML = `
                <div class="empty-state">
                    <p>No activity data yet. Start logging your training to see progress!</p>
                </div>
            `;
        }
        
        document.getElementById('progress-chart').innerHTML = chartHTML;
        
    } catch (error) {
        console.error('Error loading progress chart:', error);
        document.getElementById('progress-chart').innerHTML = `
            <div class="error">Failed to load progress data</div>
        `;
    }
}

function getWeekKey(date) {
    const weekNum = getWeekNumber(date);
    const year = date.getFullYear();
    return `${year}-W${String(weekNum).padStart(2, '0')}`;
}
