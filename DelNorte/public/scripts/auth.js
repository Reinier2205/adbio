/**
 * Authentication Module
 */

class Auth {
    constructor() {
        this.currentUser = null;
        this.loadFromStorage();
    }

    loadFromStorage() {
        const stored = localStorage.getItem('currentUser');
        if (stored) {
            this.currentUser = JSON.parse(stored);
        }
    }

    saveToStorage() {
        if (this.currentUser) {
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        } else {
            localStorage.removeItem('currentUser');
        }
    }

    async login(name) {
        try {
            const data = await api.login(name);
            this.currentUser = data.user;
            this.saveToStorage();
            return data.user;
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    }

    logout() {
        this.currentUser = null;
        api.clearToken();
        localStorage.clear();
    }

    isAuthenticated() {
        return !!this.currentUser && !!api.getToken();
    }

    getCurrentUser() {
        return this.currentUser;
    }
}

// Global auth instance
const auth = new Auth();
