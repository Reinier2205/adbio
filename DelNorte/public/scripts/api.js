/**
 * API Client
 */

class API {
    constructor() {
        this.baseURL = CONFIG.API_BASE_URL;
        this.token = null;
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('authToken', token);
    }

    getToken() {
        if (!this.token) {
            this.token = localStorage.getItem('authToken');
        }
        return this.token;
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('authToken');
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (this.getToken()) {
            headers['Authorization'] = `Bearer ${this.getToken()}`;
        }

        const config = {
            ...options,
            headers,
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Auth
    async login(name) {
        const data = await this.request('/api/login', {
            method: 'POST',
            body: JSON.stringify({ name }),
        });
        this.setToken(data.token);
        return data;
    }

    // Travelers
    async getTravelers() {
        return this.request('/api/travelers');
    }

    // Dashboard
    async getDashboard() {
        return this.request('/api/dashboard');
    }

    // Activities
    async getActivities(userId = null) {
        const query = userId ? `?user_id=${userId}` : '';
        return this.request(`/api/activities${query}`);
    }

    async createActivity(activity) {
        return this.request('/api/activities', {
            method: 'POST',
            body: JSON.stringify(activity),
        });
    }

    // Weight
    async getWeightEntries(userId) {
        return this.request(`/api/weight?user_id=${userId}`);
    }

    async createWeightEntry(entry) {
        return this.request('/api/weight', {
            method: 'POST',
            body: JSON.stringify(entry),
        });
    }

    // Gear
    async getGear(userId) {
        return this.request(`/api/gear?user_id=${userId}`);
    }

    async createGear(gear) {
        return this.request('/api/gear', {
            method: 'POST',
            body: JSON.stringify(gear),
        });
    }

    // Videos
    async getVideos() {
        return this.request('/api/videos');
    }

    async updateVideo(video) {
        return this.request('/api/videos', {
            method: 'PUT',
            body: JSON.stringify(video),
        });
    }

    // Weekly Progress
    async getWeeklyProgress() {
        return this.request('/api/progress/weekly');
    }
}

// Global API instance
const api = new API();
