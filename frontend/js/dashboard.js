/**
 * GearGuard Dashboard JavaScript
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication (also displays user name)
    const isAuth = await Auth.requireAuth();
    if (!isAuth) return;

    // Add staggered animation to KPI cards
    animateKPICards();

    // Load dashboard data
    loadDashboardData();
    loadAlerts();
});

// ============== Animate KPI Cards ==============

function animateKPICards() {
    const kpiCards = document.querySelectorAll('.kpi-card');
    kpiCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
            card.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 100 + (index * 100));
    });
}

// ============== Load Dashboard Data ==============

async function loadDashboardData() {
    try {
        const data = await API.get('/reports/dashboard');

        // Update KPI cards with animation
        animateKPI('kpiEquipment', data.totalEquipment);
        animateKPI('kpiActive', data.activeRequests);
        animateKPI('kpiOverdue', data.overdueRequests);
        animateKPI('kpiCompleted', data.completedThisMonth);

        // Highlight overdue if any
        if (data.overdueRequests > 0) {
            document.querySelector('.kpi-warning').classList.add('highlight');
        }

        // Load recent activity
        displayRecentActivity(data.recentRequests);

    } catch (error) {
        console.error('Failed to load dashboard:', error);
        UI.showToast('Failed to load dashboard data', 'error');
    }
}

// ============== Animate KPI Values ==============

function animateKPI(elementId, targetValue) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const duration = 1000;
    const startTime = performance.now();
    const startValue = 0;

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease out quad
        const eased = 1 - (1 - progress) * (1 - progress);
        const current = Math.round(startValue + (targetValue - startValue) * eased);
        
        element.textContent = current;

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

// ============== Load Alerts ==============

async function loadAlerts() {
    const container = document.getElementById('alertsContainer');

    try {
        // Get all requests and filter for urgent ones
        const requests = await API.get('/requests');
        
        // Filter critical/high priority requests that are new or in progress
        const alerts = requests.filter(r => 
            (r.stage === 'new' || r.stage === 'in_progress') &&
            (r.priority === 'critical' || r.priority === 'high' || r.is_overdue)
        ).slice(0, 5);

        if (alerts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">✨</span>
                    <p>No urgent alerts - all systems operational!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = alerts.map((alert, index) => `
            <div class="alert-item ${alert.is_overdue ? 'overdue' : ''} ${UI.getPriorityClass(alert.priority)}"
                 onclick="window.location.href='requests.html?id=${alert.id}'"
                 style="animation-delay: ${index * 0.1}s">
                <div class="alert-priority">
                    ${getPriorityIcon(alert.priority)}
                </div>
                <div class="alert-content">
                    <h4>${escapeHtml(alert.subject)}</h4>
                    <p>
                        <span class="alert-equipment">${escapeHtml(alert.equipment_name)}</span>
                        ${alert.is_overdue ? '<span class="badge badge-overdue">OVERDUE</span>' : ''}
                    </p>
                </div>
                <a href="requests.html?id=${alert.id}" class="alert-action" onclick="event.stopPropagation()">View →</a>
            </div>
        `).join('');

        // Animate alerts in
        animateListItems('.alert-item');

    } catch (error) {
        console.error('Failed to load alerts:', error);
        container.innerHTML = `
            <div class="error-state">
                <p>Failed to load alerts</p>
            </div>
        `;
    }
}

// ============== Display Recent Activity ==============

function displayRecentActivity(requests) {
    const container = document.getElementById('activityContainer');

    if (!requests || requests.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📋</span>
                <p>No recent activity</p>
            </div>
        `;
        return;
    }

    container.innerHTML = requests.map((req, index) => `
        <div class="activity-item" onclick="window.location.href='requests.html?id=${req.id}'">
            <div class="activity-icon">${getStageIcon(req.stage)}</div>
            <div class="activity-content">
                <h4>${escapeHtml(req.subject)}</h4>
                <p>${escapeHtml(req.equipment_name || 'Unknown Equipment')}</p>
            </div>
            <div class="activity-meta">
                <span class="activity-stage stage-${req.stage}">${formatStage(req.stage)}</span>
                <span class="activity-time">${UI.formatRelativeTime(req.created_at)}</span>
            </div>
        </div>
    `).join('');

    // Animate activity items in
    animateListItems('.activity-item');
}

// ============== Animate List Items ==============

function animateListItems(selector) {
    const items = document.querySelectorAll(selector);
    items.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateX(-20px)';
        setTimeout(() => {
            item.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
            item.style.opacity = '1';
            item.style.transform = 'translateX(0)';
        }, 50 + (index * 80));
    });
}

// ============== Helper Functions ==============

function getPriorityIcon(priority) {
    const icons = {
        critical: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🟢'
    };
    return icons[priority] || '⚪';
}

function getStageIcon(stage) {
    const icons = {
        new: '🆕',
        in_progress: '🔧',
        repaired: '✅',
        scrap: '🗑️'
    };
    return icons[stage] || '📋';
}

function formatStage(stage) {
    const labels = {
        new: 'New',
        in_progress: 'In Progress',
        repaired: 'Repaired',
        scrap: 'Scrapped'
    };
    return labels[stage] || stage;
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

