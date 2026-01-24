/**
 * auth.js - Authentication Module
 * Handles JWT token management and auth state
 */

const auth = {
    tokenKey: 'ashacare_token',
    userKey: 'ashacare_user',

    /**
     * Get stored token
     */
    getToken() {
        return localStorage.getItem(this.tokenKey);
    },

    /**
     * Get stored user
     */
    getUser() {
        const user = localStorage.getItem(this.userKey);
        return user ? JSON.parse(user) : null;
    },

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        const token = this.getToken();
        if (!token) return false;
        
        // Check if token is expired (basic check)
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const exp = payload.exp * 1000;
            return Date.now() < exp;
        } catch (e) {
            return false;
        }
    },

    /**
     * Save auth data
     */
    saveAuth(token, user) {
        localStorage.setItem(this.tokenKey, token);
        localStorage.setItem(this.userKey, JSON.stringify(user));
    },

    /**
     * Clear auth data and redirect to login
     */
    logout() {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
        window.location.href = '/';
    },

    /**
     * Get authorization header
     */
    getAuthHeader() {
        const token = this.getToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    },

    /**
     * Make authenticated API request
     */
    async apiRequest(url, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...this.getAuthHeader(),
            ...options.headers
        };

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            // Handle 401 - token expired
            if (response.status === 401) {
                this.logout();
                return null;
            }

            return response;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    },

    /**
     * Initialize auth module
     */
    init() {
        // Check if authenticated
        if (!this.isAuthenticated()) {
            // Redirect to login if not on login page
            if (!window.location.pathname.includes('login') && window.location.pathname !== '/') {
                window.location.href = '/';
            }
            return false;
        }

        // Update UI with user info
        const user = this.getUser();
        if (user) {
            const userInitial = document.getElementById('user-initial');
            const userName = document.getElementById('user-name');
            const userEmail = document.getElementById('user-email');

            if (userInitial) userInitial.textContent = user.username[0].toUpperCase();
            if (userName) userName.textContent = user.full_name || user.username;
            if (userEmail) userEmail.textContent = user.email;
        }

        // Setup logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        // Setup user menu toggle
        const userBtn = document.getElementById('user-btn');
        const userDropdown = document.getElementById('user-dropdown');
        if (userBtn && userDropdown) {
            userBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                userDropdown.classList.toggle('show');
            });

            document.addEventListener('click', () => {
                userDropdown.classList.remove('show');
            });
        }

        return true;
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    auth.init();
});
