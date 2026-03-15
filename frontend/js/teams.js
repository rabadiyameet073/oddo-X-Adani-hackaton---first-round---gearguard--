/**
 * GearGuard Teams Page JavaScript
 */

document.addEventListener('DOMContentLoaded', async () => {
    const isAuth = await Auth.requireAuth();
    if (!isAuth) return;

    loadTeams();
});

// ============== Load Teams ==============

async function loadTeams() {
    const grid = document.getElementById('teamsGrid');
    grid.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

    try {
        const teams = await API.get('/teams');
        
        // Load additional data for each team
        const teamsWithDetails = await Promise.all(
            teams.map(async (team) => {
                const [details, equipment, requests] = await Promise.all([
                    API.get(`/teams/${team.id}`),
                    API.get(`/equipment?team=${team.id}`),
                    API.get(`/requests?team=${team.id}`)
                ]);
                
                return {
                    ...team,
                    members: details.members || [],
                    equipment: equipment,
                    activeRequests: requests.filter(r => r.stage !== 'repaired' && r.stage !== 'scrap').length
                };
            })
        );

        if (teamsWithDetails.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">👥</span>
                    <p>No teams found</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = teamsWithDetails.map(team => createTeamCard(team)).join('');

        // Add click handlers for expandable sections
        document.querySelectorAll('.team-expand-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.target.closest('.team-card');
                card.classList.toggle('expanded');
            });
        });

    } catch (error) {
        console.error('Failed to load teams:', error);
        grid.innerHTML = `
            <div class="error-state">
                <p>Failed to load teams</p>
                <button onclick="loadTeams()" class="btn-secondary">Retry</button>
            </div>
        `;
    }
}

// ============== Create Team Card ==============

function createTeamCard(team) {
    const membersHtml = team.members.map(member => `
        <div class="member-item">
            <img src="${member.avatar || `https://i.pravatar.cc/40?u=${member.id}`}" 
                 alt="${escapeHtml(member.name)}" class="member-avatar">
            <div class="member-info">
                <span class="member-name">${escapeHtml(member.name)}</span>
                <span class="member-role">${escapeHtml(member.role)}</span>
            </div>
            <span class="member-email">${escapeHtml(member.email)}</span>
        </div>
    `).join('') || '<p class="no-members">No members assigned</p>';

    const equipmentHtml = team.equipment.slice(0, 5).map(eq => `
        <div class="equipment-item">
            <span class="eq-icon">${getCategoryIcon(eq.category)}</span>
            <span class="eq-name">${escapeHtml(eq.name)}</span>
            <span class="eq-status status-badge ${UI.getStatusClass(eq.status)}">${eq.status}</span>
        </div>
    `).join('') || '<p class="no-equipment">No equipment assigned</p>';

    const workloadClass = team.activeRequests > 5 ? 'high' : team.activeRequests > 2 ? 'medium' : 'low';

    return `
        <div class="glass-card team-card">
            <div class="team-header">
                <div class="team-icon">👥</div>
                <div class="team-title">
                    <h3>${escapeHtml(team.name)}</h3>
                    <p>${escapeHtml(team.description) || 'No description'}</p>
                </div>
            </div>

            <div class="team-stats">
                <div class="stat-item">
                    <span class="stat-value">${team.members.length}</span>
                    <span class="stat-label">Members</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${team.equipment.length}</span>
                    <span class="stat-label">Equipment</span>
                </div>
                <div class="stat-item workload-${workloadClass}">
                    <span class="stat-value">${team.activeRequests}</span>
                    <span class="stat-label">Active Requests</span>
                </div>
            </div>

            <button class="team-expand-btn">
                <span>View Details</span>
                <span class="expand-icon">▼</span>
            </button>

            <div class="team-details">
                <div class="detail-section">
                    <h4>Team Members</h4>
                    <div class="members-list">
                        ${membersHtml}
                    </div>
                </div>

                <div class="detail-section">
                    <h4>Assigned Equipment</h4>
                    <div class="equipment-list">
                        ${equipmentHtml}
                        ${team.equipment.length > 5 ? `<p class="more-items">+${team.equipment.length - 5} more</p>` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ============== Helpers ==============

function getCategoryIcon(category) {
    const icons = {
        machine: '🏭',
        vehicle: '🚗',
        computer: '💻',
        other: '📦'
    };
    return icons[category] || '📦';
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

