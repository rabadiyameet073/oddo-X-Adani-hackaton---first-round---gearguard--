/**
 * GearGuard Requests / Kanban Board JavaScript
 */

let equipmentList = [];
let teamsList = [];
let techniciansList = [];
let usersList = [];
let draggedCard = null;

document.addEventListener('DOMContentLoaded', async () => {
    const isAuth = await Auth.requireAuth();
    if (!isAuth) return;

    await loadFormData();
    initFilters();
    initDragDrop();
    initForms();
    loadRequests();

    // Check URL params for auto-actions
    checkUrlParams();
});

// ============== Load Form Data ==============

async function loadFormData() {
    try {
        const [equipment, teams, users] = await Promise.all([
            API.get('/equipment'),
            API.get('/teams'),
            API.get('/users')
        ]);

        // Filter out scrapped equipment for new requests
        equipmentList = equipment;
        teamsList = teams;
        usersList = users;
        techniciansList = users.filter(u => u.role === 'technician');

        // Populate filter dropdowns (show all equipment including scrapped for filtering)
        populateEquipmentSelect('filterEquipment', equipment, '', 'All Equipment', false);
        populateSelect('filterTeam', teams, 'name', '', 'All Teams');

        // Populate form dropdowns (exclude scrapped equipment)
        const activeEquipment = equipment.filter(e => e.status !== 'scrapped');
        populateEquipmentSelect('reqEquipment', activeEquipment, '', 'Select Equipment', true);
        populateSelect('reqTeam', teams, 'name', '', 'Auto-fill from Equipment');
        populateSelect('reqAssignee', users, 'name', '', 'Auto-fill from Equipment');

    } catch (error) {
        console.error('Failed to load form data:', error);
    }
}

function populateSelect(elementId, items, labelKey, defaultValue = '', placeholder = '') {
    const select = document.getElementById(elementId);
    select.innerHTML = `<option value="${defaultValue}">${placeholder}</option>`;
    items.forEach(item => {
        select.add(new Option(item[labelKey], item.id));
    });
}

function populateEquipmentSelect(elementId, items, defaultValue = '', placeholder = '', showCategory = false) {
    const select = document.getElementById(elementId);
    select.innerHTML = `<option value="${defaultValue}">${placeholder}</option>`;
    items.forEach(item => {
        const categoryIcon = getCategoryIcon(item.category);
        const label = showCategory ? `${categoryIcon} ${item.name}` : item.name;
        const option = new Option(label, item.id);
        if (item.status === 'scrapped') {
            option.disabled = true;
            option.text += ' (Scrapped)';
        }
        select.add(option);
    });
}

function getCategoryIcon(category) {
    const icons = { machine: '🏭', vehicle: '🚗', computer: '💻', other: '📦' };
    return icons[category] || '📦';
}

// ============== Load Requests ==============

async function loadRequests() {
    try {
        const params = new URLSearchParams();
        
        const equipment = document.getElementById('filterEquipment').value;
        const team = document.getElementById('filterTeam').value;
        const type = document.getElementById('filterType').value;

        if (equipment) params.append('equipment', equipment);
        if (team) params.append('team', team);
        if (type) params.append('type', type);

        const queryString = params.toString();
        const requests = await API.get(`/requests${queryString ? '?' + queryString : ''}`);

        // Clear columns
        document.querySelectorAll('.column-content').forEach(col => {
            col.innerHTML = '';
        });

        // Reset counts
        const counts = { new: 0, in_progress: 0, repaired: 0, scrap: 0 };

        // Distribute cards to columns
        requests.forEach(req => {
            const column = document.querySelector(`.column-content[data-stage="${req.stage}"]`);
            if (column) {
                column.innerHTML += createRequestCard(req);
                counts[req.stage]++;
            }
        });

        // Update counts
        Object.keys(counts).forEach(stage => {
            document.getElementById(`count-${stage}`).textContent = counts[stage];
        });

        // Re-attach drag events
        attachDragEvents();

    } catch (error) {
        console.error('Failed to load requests:', error);
        UI.showToast('Failed to load requests', 'error');
    }
}

// ============== Create Request Card ==============

function createRequestCard(req) {
    const priorityClass = UI.getPriorityClass(req.priority);
    const overdueClass = req.is_overdue ? 'overdue' : '';
    const categoryIcon = getCategoryIcon(req.equipment_category);
    const initials = getInitials(req.assigned_to_name);
    const priorityLabel = req.priority?.charAt(0).toUpperCase() + req.priority?.slice(1) || 'Medium';

    return `
        <div class="request-card ${priorityClass} ${overdueClass}"
             draggable="true"
             data-id="${req.id}"
             data-stage="${req.stage}"
             data-equipment="${req.equipment_id}">
            <div class="card-header">
                <div class="card-priority-info">
                    <span class="priority-dot ${priorityClass}" title="${priorityLabel} Priority"></span>
                    <span class="card-id">#${req.id}</span>
                </div>
                <span class="card-type type-${req.type}">${req.type}</span>
            </div>

            <h4 class="card-subject">${escapeHtml(req.subject)}</h4>

            <div class="card-equipment">
                <span class="eq-icon">${categoryIcon}</span>
                <span class="eq-name">${escapeHtml(req.equipment_name)}</span>
            </div>

            ${req.team_name ? `
                <div class="card-team">
                    <span>👥</span> ${escapeHtml(req.team_name)}
                </div>
            ` : ''}

            <div class="card-meta">
                ${req.assigned_to_name ? `
                    <div class="card-assignee" title="${escapeHtml(req.assigned_to_name)}">
                        <div class="assignee-avatar">${initials}</div>
                        <span class="assignee-name">${escapeHtml(req.assigned_to_name.split(' ')[0])}</span>
                    </div>
                ` : '<span class="unassigned">⚠️ Unassigned</span>'}

                ${req.scheduled_date ? `
                    <span class="card-date ${req.is_overdue ? 'overdue' : ''}">
                        📅 ${UI.formatDate(req.scheduled_date)}
                    </span>
                ` : ''}
            </div>

            ${req.is_overdue ? '<div class="overdue-badge">⚠️ OVERDUE</div>' : ''}
        </div>
    `;
}

function getInitials(name) {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

// ============== Drag & Drop ==============

function initDragDrop() {
    document.querySelectorAll('.column-content').forEach(column => {
        column.addEventListener('dragover', handleDragOver);
        column.addEventListener('drop', handleDrop);
        column.addEventListener('dragleave', handleDragLeave);
    });
}

function attachDragEvents() {
    document.querySelectorAll('.request-card').forEach(card => {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
        card.addEventListener('click', () => viewRequest(card.dataset.id));
    });
}

function handleDragStart(e) {
    draggedCard = e.target;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', e.target.dataset.id);
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.column-content').forEach(col => {
        col.classList.remove('drag-over');
    });
}

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

async function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');

    const requestId = e.dataTransfer.getData('text/plain');
    const newStage = e.currentTarget.dataset.stage;
    const oldStage = draggedCard?.dataset.stage;

    if (!requestId || newStage === oldStage) return;

    // Special handling for repaired stage (ask for duration)
    if (newStage === 'repaired') {
        document.getElementById('durationRequestId').value = requestId;
        document.getElementById('durationModal').classList.add('active');
        return;
    }

    // Special handling for scrap stage (confirmation)
    if (newStage === 'scrap') {
        document.getElementById('scrapRequestId').value = requestId;
        document.getElementById('scrapModal').classList.add('active');
        return;
    }

    await updateRequestStage(requestId, newStage);
}

async function updateRequestStage(requestId, stage, duration = null) {
    try {
        const data = { stage };
        if (duration !== null) data.duration = duration;

        await API.put(`/requests/${requestId}`, data);
        UI.showToast(`Request moved to ${stage.replace('_', ' ')}`);
        loadRequests();
    } catch (error) {
        UI.showToast(error.message, 'error');
    }
}

// ============== Filters ==============

function initFilters() {
    ['filterEquipment', 'filterTeam', 'filterType'].forEach(id => {
        document.getElementById(id).addEventListener('change', loadRequests);
    });
}

// ============== Forms ==============

function initForms() {
    // Request form
    document.getElementById('requestForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveRequest();
    });

    // Duration form
    document.getElementById('durationForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const requestId = document.getElementById('durationRequestId').value;
        const duration = parseFloat(document.getElementById('reqDuration').value) || null;
        closeDurationModal();
        await updateRequestStage(requestId, 'repaired', duration);
    });

    // Equipment change auto-fills team/technician with visual feedback
    document.getElementById('reqEquipment').addEventListener('change', (e) => {
        const eq = equipmentList.find(eq => eq.id == e.target.value);
        const categoryDisplay = document.getElementById('eqCategoryDisplay');
        const teamSelect = document.getElementById('reqTeam');
        const assigneeSelect = document.getElementById('reqAssignee');

        if (eq) {
            // Show category context
            if (categoryDisplay) {
                const categoryIcon = getCategoryIcon(eq.category);
                categoryDisplay.innerHTML = `${categoryIcon} ${eq.category?.charAt(0).toUpperCase() + eq.category?.slice(1) || 'Other'}`;
                categoryDisplay.classList.add('show');
            }

            // Auto-fill team with highlight
            if (eq.team_id) {
                teamSelect.value = eq.team_id;
                highlightAutoFill(teamSelect);
            }

            // Auto-fill technician with highlight
            if (eq.default_technician_id) {
                assigneeSelect.value = eq.default_technician_id;
                highlightAutoFill(assigneeSelect);
            }

            // Show auto-fill notification
            UI.showToast(`Auto-filled team & technician from ${eq.name}`, 'info');
        } else {
            if (categoryDisplay) {
                categoryDisplay.classList.remove('show');
            }
        }
    });
}

function highlightAutoFill(element) {
    element.classList.add('auto-filled');
    setTimeout(() => element.classList.remove('auto-filled'), 2000);
}

function openRequestModal(request = null) {
    const modal = document.getElementById('requestModal');
    const title = document.getElementById('requestModalTitle');
    const form = document.getElementById('requestForm');

    form.reset();
    document.getElementById('requestId').value = '';

    if (request) {
        title.textContent = 'Edit Request';
        document.getElementById('requestId').value = request.id;
        document.getElementById('reqSubject').value = request.subject || '';
        document.getElementById('reqDescription').value = request.description || '';
        document.getElementById('reqEquipment').value = request.equipment_id || '';
        document.getElementById('reqType').value = request.type || 'corrective';
        document.getElementById('reqTeam').value = request.team_id || '';
        document.getElementById('reqAssignee').value = request.assigned_to || '';
        document.getElementById('reqPriority').value = request.priority || 'medium';
        document.getElementById('reqScheduled').value = request.scheduled_date?.split('T')[0] || '';
    } else {
        title.textContent = 'Create Request';
    }

    modal.classList.add('active');
}

function closeRequestModal() {
    document.getElementById('requestModal').classList.remove('active');
}

function closeDurationModal() {
    document.getElementById('durationModal').classList.remove('active');
    document.getElementById('reqDuration').value = '';
}

function closeScrapModal() {
    document.getElementById('scrapModal').classList.remove('active');
}

async function confirmScrap() {
    const requestId = document.getElementById('scrapRequestId').value;
    closeScrapModal();
    await updateRequestStage(requestId, 'scrap');
}

async function saveRequest() {
    const id = document.getElementById('requestId').value;
    const data = {
        subject: document.getElementById('reqSubject').value,
        description: document.getElementById('reqDescription').value || null,
        equipment_id: document.getElementById('reqEquipment').value,
        type: document.getElementById('reqType').value,
        team_id: document.getElementById('reqTeam').value || null,
        assigned_to: document.getElementById('reqAssignee').value || null,
        priority: document.getElementById('reqPriority').value,
        scheduled_date: document.getElementById('reqScheduled').value || null
    };

    try {
        if (id) {
            await API.put(`/requests/${id}`, data);
            UI.showToast('Request updated successfully');
        } else {
            await API.post('/requests', data);
            UI.showToast('Request created successfully');
        }
        closeRequestModal();
        loadRequests();
    } catch (error) {
        UI.showToast(error.message, 'error');
    }
}

async function viewRequest(id) {
    try {
        const request = await API.get(`/requests/${id}`);
        openRequestModal(request);
    } catch (error) {
        UI.showToast('Failed to load request', 'error');
    }
}

// ============== URL Params ==============

function checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const equipmentId = params.get('equipment');
    const action = params.get('action');
    const type = params.get('type');
    const date = params.get('date');
    const requestId = params.get('id');

    // Filter by equipment
    if (equipmentId && !action) {
        document.getElementById('filterEquipment').value = equipmentId;
        loadRequests();
    }

    // Open new request modal with pre-filled data
    if (action === 'new') {
        setTimeout(() => {
            openRequestModal();

            // Pre-fill equipment
            if (equipmentId) {
                document.getElementById('reqEquipment').value = equipmentId;
                // Trigger change event to auto-fill team/technician
                document.getElementById('reqEquipment').dispatchEvent(new Event('change'));
            }

            // Pre-fill type
            if (type) {
                document.getElementById('reqType').value = type;
            }

            // Pre-fill date
            if (date) {
                document.getElementById('reqScheduled').value = date;
            }
        }, 500); // Wait for form data to load
    }

    // Open specific request for viewing/editing
    if (requestId) {
        setTimeout(() => viewRequest(requestId), 500);
    }

    // Clear URL params after processing
    if (params.toString()) {
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// ============== Helpers ==============

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

