/**
 * GearGuard Shared JavaScript Utilities
 * Authentication, API helpers, and common functions
 */

// Production base URL - same-origin when deployed on Vercel
const SITE_BASE = 'https://oddo-x-adani-hackaton.vercel.app';
const API_BASE = '/api';

// ============== Authentication ==============

const Auth = {
    // Get stored token
    getToken() {
        return localStorage.getItem('gearguard_token');
    },

    // Get stored user
    getUser() {
        const user = localStorage.getItem('gearguard_user');
        return user ? JSON.parse(user) : null;
    },

    // Save auth data
    setAuth(token, user) {
        localStorage.setItem('gearguard_token', token);
        localStorage.setItem('gearguard_user', JSON.stringify(user));
    },

    // Clear auth data
    clearAuth() {
        localStorage.removeItem('gearguard_token');
        localStorage.removeItem('gearguard_user');
    },

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.getToken();
    },

    // Logout and redirect (uses <base> or same origin)
    logout() {
        this.clearAuth();
        window.location.href = 'index.html';
    },

    // Verify token with backend
    async verify() {
        const token = this.getToken();
        if (!token) return false;

        try {
            const response = await fetch(`${API_BASE}/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return response.ok;
        } catch {
            return false;
        }
    },

    // Require authentication - redirect if not logged in
    async requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = 'login.html';
            return false;
        }

        const isValid = await this.verify();
        if (!isValid) {
            this.clearAuth();
            window.location.href = 'login.html';
            return false;
        }

        // Display user name in header
        this.displayUserName();
        return true;
    },

    // Display user name in the header
    displayUserName() {
        const user = this.getUser();
        const userNameEl = document.getElementById('userName');
        if (userNameEl && user) {
            userNameEl.textContent = `👤 ${user.name || user.email || 'User'}`;
        }
    }
};

// ============== API Helper ==============

const API = {
    // Make authenticated request
    async request(endpoint, options = {}) {
        const token = Auth.getToken();
        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        };

        if (options.body && typeof options.body === 'object') {
            config.body = JSON.stringify(options.body);
        }

        const response = await fetch(`${API_BASE}${endpoint}`, config);

        // Handle auth errors
        if (response.status === 401) {
            Auth.clearAuth();
            window.location.href = 'login.html';
            throw new Error('Session expired');
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }

        return data;
    },

    // GET request
    get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },

    // POST request
    post(endpoint, body) {
        return this.request(endpoint, { method: 'POST', body });
    },

    // PUT request
    put(endpoint, body) {
        return this.request(endpoint, { method: 'PUT', body });
    },

    // PATCH request
    patch(endpoint, body) {
        return this.request(endpoint, { method: 'PATCH', body });
    },

    // DELETE request
    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
};

// ============== UI Helpers ==============

const UI = {
    // Show loading spinner
    showLoading(container) {
        container.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Loading...</p>
            </div>
        `;
    },

    // Show error message
    showError(container, message) {
        container.innerHTML = `
            <div class="error-message">
                <span class="error-icon">⚠️</span>
                <p>${message}</p>
                <button onclick="location.reload()" class="btn-retry">Retry</button>
            </div>
        `;
    },

    // Show toast notification
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
            <span class="toast-message">${message}</span>
        `;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // Format date
    formatDate(dateStr) {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    },

    // Format relative time
    formatRelativeTime(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return this.formatDate(dateStr);
    },

    // Get priority color class
    getPriorityClass(priority) {
        const classes = {
            critical: 'priority-critical',
            high: 'priority-high',
            medium: 'priority-medium',
            low: 'priority-low'
        };
        return classes[priority] || 'priority-medium';
    },

    // Get status color class
    getStatusClass(status) {
        const classes = {
            active: 'status-active',
            maintenance: 'status-maintenance',
            scrapped: 'status-scrapped'
        };
        return classes[status] || 'status-active';
    },

    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// ============== Initialize Header ==============

function initializeHeader() {
    const user = Auth.getUser();
    const headerUserEl = document.getElementById('headerUser');

    if (headerUserEl && user) {
        // Get first letter of name for avatar fallback
        const initials = user.name ? user.name.charAt(0).toUpperCase() : '?';

        headerUserEl.innerHTML = `
            <div class="user-info">
                <div class="user-avatar" title="${user.name}">${initials}</div>
                <span class="user-name">${user.name || 'User'}</span>
            </div>
            <button class="btn-logout" onclick="Auth.logout()" title="Logout">
                <span>🚪</span>
            </button>
        `;
    }
}

// Initialize navigation link highlighting
function initializeNavigation() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.app-nav .nav-link');

    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (currentPath.includes(href.replace('.html', ''))) {
            link.classList.add('active');
        } else if (href !== '#') {
            link.classList.remove('active');
        }
    });
}

// Initialize on DOM load for protected pages
document.addEventListener('DOMContentLoaded', () => {
    // Check if this is a protected page (not login or index)
    const path = window.location.pathname;
    const isProtectedPage = !path.includes('login.html') &&
                            !path.endsWith('index.html') &&
                            !path.endsWith('/') &&
                            document.body.classList.contains('app-page');

    if (isProtectedPage) {
        initializeHeader();
        initializeNavigation();
    }
});

