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
        const data = await this.request('/login', {
            method: 'POST',
            body: JSON.stringify({ name }),
        });
        this.setToken(data.token);
        return data;
    }

    // Travelers
    async getTravelers() {
        return this.request('/travelers');
    }

    // Dashboard
    async getDashboard() {
        return this.request('/dashboard');
    }

    // Activities
    async getActivities(userId = null) {
        const query = userId ? `?user_id=${userId}` : '';
        return this.request(`/activities${query}`);
    }

    async createActivity(activity) {
        return this.request('/activities', {
            method: 'POST',
            body: JSON.stringify(activity),
        });
    }

    // Weight
    async getWeightEntries(userId) {
        return this.request(`/weight?user_id=${userId}`);
    }

    async createWeightEntry(entry) {
        return this.request('/weight', {
            method: 'POST',
            body: JSON.stringify(entry),
        });
    }

    // Gear
    async getGear(userId) {
        return this.request(`/gear?user_id=${userId}`);
    }

    async createGear(gear) {
        return this.request('/gear', {
            method: 'POST',
            body: JSON.stringify(gear),
        });
    }

    // Videos
    async getVideos() {
        return this.request('/videos');
    }

    async updateVideo(video) {
        return this.request('/videos', {
            method: 'PUT',
            body: JSON.stringify(video),
        });
    }

    // Weekly Progress
    async getWeeklyProgress() {
        return this.request('/progress/weekly');
    }
}

// Global API instance
const api = new API();
