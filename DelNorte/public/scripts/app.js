/**
 * Main Application Entry Point
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize screens
    const loginScreen = document.getElementById('login-screen');
    const appScreen = document.getElementById('app-screen');
    const travelerSelect = document.getElementById('traveler-select');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');

    // Load travelers for login dropdown
    try {
        const travelers = await api.getTravelers();
        travelers.forEach(traveler => {
            const option = document.createElement('option');
            option.value = traveler.name;
            option.textContent = traveler.name;
            travelerSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load travelers:', error);
    }

    // Enable login button when name is selected
    travelerSelect.addEventListener('change', () => {
        loginBtn.disabled = !travelerSelect.value;
    });

    // Handle login
    loginBtn.addEventListener('click', async () => {
        const name = travelerSelect.value;
        if (!name) return;

        loginBtn.disabled = true;
        loginBtn.textContent = 'Logging in...';

        try {
            console.log('Attempting login for:', name);
            await auth.login(name);
            console.log('Login successful');
            showApp();
        } catch (error) {
            console.error('Login error:', error);
            alert('Login failed: ' + error.message);
            loginBtn.disabled = false;
            loginBtn.textContent = 'Start training';
        }
    });

    // Handle logout
    logoutBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to logout?')) {
            auth.logout();
            showLogin();
        }
    });

    // Check if already logged in
    if (auth.isAuthenticated()) {
        showApp();
    } else {
        showLogin();
    }

    function showLogin() {
        loginScreen.classList.add('active');
        appScreen.classList.remove('active');
        travelerSelect.value = '';
        loginBtn.disabled = true;
        loginBtn.textContent = 'Start training';
    }

    function showApp() {
        console.log('showApp called');
        console.log('loginScreen before:', loginScreen.classList.contains('active'));
        console.log('appScreen before:', appScreen.classList.contains('active'));
        
        loginScreen.classList.remove('active');
        appScreen.classList.add('active');
        
        console.log('loginScreen after:', loginScreen.classList.contains('active'));
        console.log('appScreen after:', appScreen.classList.contains('active'));
        
        // Initialize router
        const pageContainer = document.getElementById('page-container');
        router.init(pageContainer);
        
        // Register all pages
        router.registerPage('overview', renderOverviewPage);
        router.registerPage('log-progress', renderLogProgressPage);
        router.registerPage('training-plan', renderTrainingPlanPage);
        router.registerPage('strength-stretch', renderStrengthStretchPage);
        router.registerPage('gear-audit', renderGearAuditPage);
        router.registerPage('trail-fuel', renderTrailFuelPage);
        
        // Navigate to default page
        router.navigate('overview');
    }
});

// Utility functions
function formatDate(date) {
    if (typeof date === 'string') date = new Date(date);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function formatDistance(km) {
    return `${parseFloat(km).toFixed(1)} km`;
}

function formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
        return `${hours}h ${mins}m`;
    }
    return `${mins} min`;
}

function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function getDaysUntilCamino() {
    const now = new Date();
    const diff = CONFIG.CAMINO_DATE - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getCurrentPhase() {
    const now = new Date();
    return TRAINING_PHASES.find(phase => now >= phase.start && now <= phase.end) || TRAINING_PHASES[0];
}
