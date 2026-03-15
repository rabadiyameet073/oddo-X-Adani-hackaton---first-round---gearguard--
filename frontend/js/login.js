/**
 * GearGuard Login/Registration Page JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
    // Redirect if already logged in
    if (Auth.isAuthenticated()) {
        window.location.href = 'dashboard.html';
        return;
    }

    initTabs();
    initLoginForm();
    initRegisterForm();
});

// ============== Tab Switching ==============

function initTabs() {
    const tabs = document.querySelectorAll('.auth-tab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Show corresponding form
            if (tab.dataset.tab === 'login') {
                loginForm.classList.add('active');
                registerForm.classList.remove('active');
            } else {
                registerForm.classList.add('active');
                loginForm.classList.remove('active');
            }

            // Clear errors
            clearErrors();
        });
    });
}

// ============== Login Form ==============

function initLoginForm() {
    const form = document.getElementById('loginForm');
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const errorDiv = document.getElementById('loginError');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearErrors();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        // Validate
        if (!validateEmail(email)) {
            showFieldError('loginEmailError', 'Please enter a valid email');
            return;
        }
        if (!password) {
            showFieldError('loginPasswordError', 'Password is required');
            return;
        }

        // Submit
        setLoading(form, true);

        try {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            // Save auth and redirect
            Auth.setAuth(data.token, data.user);
            window.location.href = 'dashboard.html';

        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        } finally {
            setLoading(form, false);
        }
    });
}

// ============== Register Form ==============

function initRegisterForm() {
    const form = document.getElementById('registerForm');
    const nameInput = document.getElementById('regName');
    const emailInput = document.getElementById('regEmail');
    const passwordInput = document.getElementById('regPassword');
    const roleSelect = document.getElementById('regRole');
    const errorDiv = document.getElementById('registerError');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearErrors();

        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const role = roleSelect.value;

        // Validate
        if (!name || name.length < 2) {
            showFieldError('regNameError', 'Name must be at least 2 characters');
            return;
        }
        if (!validateEmail(email)) {
            showFieldError('regEmailError', 'Please enter a valid email');
            return;
        }
        if (password.length < 6) {
            showFieldError('regPasswordError', 'Password must be at least 6 characters');
            return;
        }

        // Submit
        setLoading(form, true);

        try {
            const response = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, role })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            // Save auth and redirect
            Auth.setAuth(data.token, data.user);
            window.location.href = 'dashboard.html';

        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        } finally {
            setLoading(form, false);
        }
    });
}

// ============== Helpers ==============

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showFieldError(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = message;
        el.style.display = 'block';
    }
}

function clearErrors() {
    document.querySelectorAll('.field-error').forEach(el => {
        el.textContent = '';
        el.style.display = 'none';
    });
    document.querySelectorAll('.form-error').forEach(el => {
        el.textContent = '';
        el.style.display = 'none';
    });
}

function setLoading(form, isLoading) {
    const btn = form.querySelector('.btn-submit');
    btn.classList.toggle('loading', isLoading);
    btn.disabled = isLoading;
}

