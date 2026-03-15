/**
 * GearGuard Equipment Manager JavaScript
 */

let departments = [];
let teams = [];
let technicians = [];

document.addEventListener('DOMContentLoaded', async () => {
    const isAuth = await Auth.requireAuth();
    if (!isAuth) return;

    await loadFilterData();
    loadEquipment();
    initFilters();
    initForm();
});

// ============== Load Filter Data ==============

async function loadFilterData() {
    try {
        const [deptData, teamData, userData] = await Promise.all([
            API.get('/departments'),
            API.get('/teams'),
            API.get('/users')
        ]);

        departments = deptData;
        teams = teamData;
        technicians = userData.filter(u => u.role === 'technician');

        // Populate department filter
        const deptSelect = document.getElementById('filterDepartment');
        const eqDeptSelect = document.getElementById('eqDepartment');
        
        departments.forEach(d => {
            deptSelect.add(new Option(d.name, d.id));
            eqDeptSelect.add(new Option(d.name, d.id));
        });

        // Populate team select
        const eqTeamSelect = document.getElementById('eqTeam');
        eqTeamSelect.add(new Option('Select Team', ''));
        teams.forEach(t => {
            eqTeamSelect.add(new Option(t.name, t.id));
        });

        // Populate technician select
        const eqTechSelect = document.getElementById('eqTechnician');
        eqTechSelect.add(new Option('Select Technician', ''));
        technicians.forEach(t => {
            eqTechSelect.add(new Option(t.name, t.id));
        });

    } catch (error) {
        console.error('Failed to load filter data:', error);
    }
}

// ============== Load Equipment ==============

async function loadEquipment() {
    const grid = document.getElementById('equipmentGrid');
    grid.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

    try {
        const params = new URLSearchParams();
        
        const dept = document.getElementById('filterDepartment').value;
        const cat = document.getElementById('filterCategory').value;
        const status = document.getElementById('filterStatus').value;
        const search = document.getElementById('filterSearch').value;

        if (dept) params.append('department', dept);
        if (cat) params.append('category', cat);
        if (status) params.append('status', status);
        if (search) params.append('search', search);

        const queryString = params.toString();
        const equipment = await API.get(`/equipment${queryString ? '?' + queryString : ''}`);

        if (equipment.length === 0) {
            grid.innerHTML = `
                <div class="empty-state full-width">
                    <span class="empty-icon">📦</span>
                    <p>No equipment found</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = equipment.map(eq => createEquipmentCard(eq)).join('');

    } catch (error) {
        console.error('Failed to load equipment:', error);
        grid.innerHTML = `
            <div class="error-state full-width">
                <p>Failed to load equipment</p>
                <button onclick="loadEquipment()" class="btn-secondary">Retry</button>
            </div>
        `;
    }
}

// ============== Create Equipment Card ==============

function createEquipmentCard(eq) {
    const statusClass = UI.getStatusClass(eq.status);
    const categoryIcon = getCategoryIcon(eq.category);
    const warrantyStatus = getWarrantyStatus(eq.warranty_expiry);
    const isScrapped = eq.status === 'scrapped';

    return `
        <div class="glass-card equipment-card ${statusClass} ${isScrapped ? 'scrapped' : ''}" data-id="${eq.id}">
            <div class="eq-header">
                <span class="eq-category">${categoryIcon}</span>
                <span class="eq-status status-badge ${statusClass}">${eq.status}</span>
            </div>

            <h3 class="eq-name">${escapeHtml(eq.name)}</h3>
            <p class="eq-serial">${escapeHtml(eq.serial_number) || 'No Serial'}</p>

            <div class="eq-details">
                <div class="eq-detail">
                    <span class="detail-label">Department</span>
                    <span class="detail-value">${escapeHtml(eq.department_name) || '-'}</span>
                </div>
                <div class="eq-detail">
                    <span class="detail-label">Team</span>
                    <span class="detail-value">${escapeHtml(eq.team_name) || '-'}</span>
                </div>
                <div class="eq-detail">
                    <span class="detail-label">Location</span>
                    <span class="detail-value">${escapeHtml(eq.location) || '-'}</span>
                </div>
                <div class="eq-detail">
                    <span class="detail-label">Warranty</span>
                    <span class="detail-value ${warrantyStatus.class}">${warrantyStatus.text}</span>
                </div>
            </div>

            <div class="eq-actions">
                <button class="btn-smart-action" onclick="openSmartActionModal(${eq.id})" title="Quick Actions">
                    ⚡ Actions
                </button>
                <button class="btn-maintenance ${eq.open_requests > 0 ? 'has-requests' : ''}"
                        onclick="goToRequests(${eq.id})" title="View Maintenance Requests">
                    🔧 <span class="request-count">${eq.open_requests || 0}</span>
                </button>
                <button class="btn-edit" onclick="editEquipment(${eq.id})" title="Edit">✏️</button>
            </div>
        </div>
    `;
}

// ============== Filters ==============

function initFilters() {
    const filterIds = ['filterDepartment', 'filterCategory', 'filterStatus'];
    filterIds.forEach(id => {
        document.getElementById(id).addEventListener('change', loadEquipment);
    });

    // Debounced search
    const searchInput = document.getElementById('filterSearch');
    searchInput.addEventListener('input', UI.debounce(loadEquipment, 300));
}

// ============== Form Handling ==============

function initForm() {
    document.getElementById('equipmentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveEquipment();
    });
}

function openEquipmentModal(equipment = null) {
    const modal = document.getElementById('equipmentModal');
    const title = document.getElementById('modalTitle');
    const form = document.getElementById('equipmentForm');

    form.reset();
    document.getElementById('equipmentId').value = '';

    if (equipment) {
        title.textContent = 'Edit Equipment';
        document.getElementById('equipmentId').value = equipment.id;
        document.getElementById('eqName').value = equipment.name || '';
        document.getElementById('eqSerial').value = equipment.serial_number || '';
        document.getElementById('eqCategory').value = equipment.category || 'other';
        document.getElementById('eqDepartment').value = equipment.department_id || '';
        document.getElementById('eqTeam').value = equipment.team_id || '';
        document.getElementById('eqTechnician').value = equipment.default_technician_id || '';
        document.getElementById('eqPurchase').value = equipment.purchase_date?.split('T')[0] || '';
        document.getElementById('eqWarranty').value = equipment.warranty_expiry?.split('T')[0] || '';
        document.getElementById('eqLocation').value = equipment.location || '';
        document.getElementById('eqNotes').value = equipment.notes || '';
    } else {
        title.textContent = 'Add Equipment';
    }

    modal.classList.add('active');
}

function closeEquipmentModal() {
    document.getElementById('equipmentModal').classList.remove('active');
}

async function saveEquipment() {
    const id = document.getElementById('equipmentId').value;
    const data = {
        name: document.getElementById('eqName').value,
        serial_number: document.getElementById('eqSerial').value || null,
        category: document.getElementById('eqCategory').value,
        department_id: document.getElementById('eqDepartment').value || null,
        team_id: document.getElementById('eqTeam').value || null,
        default_technician_id: document.getElementById('eqTechnician').value || null,
        purchase_date: document.getElementById('eqPurchase').value || null,
        warranty_expiry: document.getElementById('eqWarranty').value || null,
        location: document.getElementById('eqLocation').value || null,
        notes: document.getElementById('eqNotes').value || null
    };

    try {
        if (id) {
            await API.put(`/equipment/${id}`, data);
            UI.showToast('Equipment updated successfully');
        } else {
            await API.post('/equipment', data);
            UI.showToast('Equipment created successfully');
        }
        closeEquipmentModal();
        loadEquipment();
    } catch (error) {
        UI.showToast(error.message, 'error');
    }
}

async function editEquipment(id) {
    try {
        const equipment = await API.get(`/equipment/${id}`);
        openEquipmentModal(equipment);
    } catch (error) {
        UI.showToast('Failed to load equipment', 'error');
    }
}

async function deleteEquipment(id) {
    if (!confirm('Are you sure you want to delete this equipment?')) return;

    try {
        await API.delete(`/equipment/${id}`);
        UI.showToast('Equipment deleted successfully');
        loadEquipment();
    } catch (error) {
        UI.showToast(error.message, 'error');
    }
}

// ============== Navigation ==============

function goToRequests(equipmentId) {
    window.location.href = `requests.html?equipment=${equipmentId}`;
}

// ============== Smart Action Modal ==============

let currentSmartEquipment = null;

async function openSmartActionModal(equipmentId) {
    try {
        // Fetch equipment details with recent requests
        const [equipment, requests] = await Promise.all([
            API.get(`/equipment/${equipmentId}`),
            API.get(`/requests?equipment=${equipmentId}`)
        ]);

        currentSmartEquipment = equipment;

        const modal = document.getElementById('smartActionModal');
        const categoryIcon = getCategoryIcon(equipment.category);
        const isScrapped = equipment.status === 'scrapped';

        // Update modal content
        document.getElementById('smartEqName').innerHTML = `${categoryIcon} ${escapeHtml(equipment.name)}`;
        document.getElementById('smartEqStatus').innerHTML = `
            <span class="status-badge ${UI.getStatusClass(equipment.status)}">${equipment.status}</span>
        `;

        // Recent requests summary
        const openRequests = requests.filter(r => !['repaired', 'scrap'].includes(r.stage));
        const recentHtml = openRequests.length > 0
            ? openRequests.slice(0, 3).map(r => `
                <div class="smart-request-item">
                    <span class="type-badge type-${r.type}">${r.type}</span>
                    <span class="request-subject">${escapeHtml(r.subject)}</span>
                    <span class="request-stage stage-${r.stage}">${r.stage.replace('_', ' ')}</span>
                </div>
            `).join('')
            : '<p class="no-requests">No open requests</p>';

        document.getElementById('smartRecentRequests').innerHTML = recentHtml;

        // Update action buttons based on status
        const actionsContainer = document.getElementById('smartActions');
        actionsContainer.innerHTML = isScrapped
            ? `<p class="scrapped-notice">⚠️ This equipment has been scrapped and cannot have new requests.</p>`
            : `
                <button class="smart-btn corrective" onclick="createQuickRequest('corrective')">
                    🔴 Report Breakdown
                </button>
                <button class="smart-btn preventive" onclick="createQuickRequest('preventive')">
                    🟢 Schedule Maintenance
                </button>
                <button class="smart-btn view" onclick="goToRequests(${equipmentId}); closeSmartActionModal();">
                    📋 View All Requests
                </button>
            `;

        modal.classList.add('active');
    } catch (error) {
        console.error('Failed to load equipment details:', error);
        UI.showToast('Failed to load equipment details', 'error');
    }
}

function closeSmartActionModal() {
    document.getElementById('smartActionModal').classList.remove('active');
    currentSmartEquipment = null;
}

function createQuickRequest(type) {
    if (!currentSmartEquipment) return;

    // Navigate to requests page with pre-filled equipment and type
    const params = new URLSearchParams({
        action: 'new',
        equipment: currentSmartEquipment.id,
        type: type
    });

    window.location.href = `requests.html?${params.toString()}`;
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

function getWarrantyStatus(expiryDate) {
    if (!expiryDate) return { text: '-', class: '' };

    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) return { text: 'Expired', class: 'warranty-expired' };
    if (daysLeft < 30) return { text: `${daysLeft}d left`, class: 'warranty-warning' };
    return { text: UI.formatDate(expiryDate), class: '' };
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

