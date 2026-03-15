/**
 * GearGuard Calendar JavaScript
 */

let currentDate = new Date();
let requestsByDate = {};
let currentDayDateStr = null; // Track current day modal date

document.addEventListener('DOMContentLoaded', async () => {
    const isAuth = await Auth.requireAuth();
    if (!isAuth) return;

    renderCalendar();
    loadCalendarData();
});

// ============== Calendar Rendering ==============

function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Update header
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('currentMonth').textContent = `${monthNames[month]} ${year}`;

    // Get first day of month and total days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = '';

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        grid.innerHTML += createDayCell(day, 'other-month', null);
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = formatDateKey(year, month, day);
        const isToday = isCurrentMonth && day === today.getDate();
        const classes = isToday ? 'today' : '';
        grid.innerHTML += createDayCell(day, classes, dateStr);
    }

    // Next month days
    const totalCells = grid.children.length;
    const remainingCells = 42 - totalCells; // 6 rows * 7 days
    for (let day = 1; day <= remainingCells; day++) {
        grid.innerHTML += createDayCell(day, 'other-month', null);
    }
}

function createDayCell(day, classes, dateStr) {
    const events = dateStr ? (requestsByDate[dateStr] || []) : [];
    const hasEvents = events.length > 0;
    const hasOverdue = events.some(e => e.is_overdue);

    let eventsHtml = '';
    if (hasEvents) {
        const displayEvents = events.slice(0, 3);
        eventsHtml = displayEvents.map(e => `
            <div class="event-dot ${e.type} ${e.is_overdue ? 'overdue' : ''}" 
                 title="${escapeHtml(e.subject)}"></div>
        `).join('');
        
        if (events.length > 3) {
            eventsHtml += `<span class="more-events">+${events.length - 3}</span>`;
        }
    }

    return `
        <div class="calendar-day ${classes} ${hasOverdue ? 'has-overdue' : ''}" 
             ${dateStr ? `onclick="openDayModal('${dateStr}')"` : ''}>
            <span class="day-number">${day}</span>
            <div class="day-events">${eventsHtml}</div>
        </div>
    `;
}

function formatDateKey(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ============== Load Calendar Data ==============

async function loadCalendarData() {
    try {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1; // API expects 1-indexed month

        // Use the calendar endpoint with proper filters
        const requests = await API.get(`/requests/calendar?month=${month}&year=${year}`);

        // Group by date
        requestsByDate = {};
        requests.forEach(req => {
            if (req.scheduled_date) {
                const dateKey = req.scheduled_date.split('T')[0];
                if (!requestsByDate[dateKey]) {
                    requestsByDate[dateKey] = [];
                }
                requestsByDate[dateKey].push(req);
            }
        });

        // Re-render with data
        renderCalendar();

    } catch (error) {
        console.error('Failed to load calendar data:', error);
    }
}

// ============== Navigation ==============

function changeMonth(delta) {
    currentDate.setMonth(currentDate.getMonth() + delta);
    renderCalendar();
    loadCalendarData();
}

function goToToday() {
    currentDate = new Date();
    renderCalendar();
    loadCalendarData();
}

// ============== Day Modal ==============

function openDayModal(dateStr) {
    currentDayDateStr = dateStr;
    const events = requestsByDate[dateStr] || [];

    // Format date for display
    const date = new Date(dateStr + 'T00:00:00');
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('dayModalTitle').textContent = date.toLocaleDateString('en-US', options);

    const container = document.getElementById('dayRequests');

    if (events.length === 0) {
        container.innerHTML = `
            <div class="empty-day">
                <span>📭</span>
                <p>No scheduled maintenance for this day</p>
                <button class="btn btn-gold" onclick="openCreateEventModal('${dateStr}')">
                    ➕ Schedule Maintenance
                </button>
            </div>
        `;
    } else {
        // Sort by priority (critical first)
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        events.sort((a, b) => (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2));

        container.innerHTML = `
            <div class="day-actions-bar">
                <button class="btn btn-gold btn-sm" onclick="openCreateEventModal('${dateStr}')">
                    ➕ Add Event
                </button>
            </div>
        ` + events.map(req => `
            <div class="day-request-item ${req.is_overdue ? 'overdue' : ''} priority-${req.priority || 'medium'}">
                <div class="request-header">
                    <span class="priority-indicator priority-${req.priority || 'medium'}"></span>
                    <div class="request-type type-${req.type}">${req.type}</div>
                    <button class="btn-delete-event" onclick="event.stopPropagation(); confirmDeleteEvent(${req.id}, '${escapeHtml(req.subject)}')" title="Delete Event">
                        ✕
                    </button>
                </div>
                <div class="request-info" onclick="window.location.href='requests.html?id=${req.id}'">
                    <h4>#${req.id} - ${escapeHtml(req.subject)}</h4>
                    <p class="equipment-line">🔧 ${escapeHtml(req.equipment_name)}</p>
                    ${req.team_name ? `<p class="team-line">👥 ${escapeHtml(req.team_name)}</p>` : ''}
                    ${req.assigned_to_name ? `<p class="assignee-line">👤 ${escapeHtml(req.assigned_to_name)}</p>` : '<p class="unassigned-line">⚠️ Unassigned</p>'}
                </div>
                <span class="request-stage stage-${req.stage}">${formatStage(req.stage)}</span>
            </div>
        `).join('');
    }

    document.getElementById('dayModal').classList.add('active');
}

function formatStage(stage) {
    const stages = {
        'new': 'New',
        'in_progress': 'In Progress',
        'repaired': 'Repaired',
        'scrap': 'Scrapped'
    };
    return stages[stage] || stage;
}

function closeDayModal() {
    document.getElementById('dayModal').classList.remove('active');
    currentDayDateStr = null;
}

// ============== Delete Event ==============

function confirmDeleteEvent(eventId, eventName) {
    const modal = document.getElementById('deleteConfirmModal');
    document.getElementById('deleteEventName').textContent = eventName;
    document.getElementById('deleteEventId').value = eventId;
    modal.classList.add('active');
}

function closeDeleteModal() {
    document.getElementById('deleteConfirmModal').classList.remove('active');
}

async function deleteEvent() {
    const eventId = document.getElementById('deleteEventId').value;

    try {
        await API.delete(`/requests/${eventId}`);
        UI.showToast('Event deleted successfully', 'success');
        closeDeleteModal();

        // Refresh calendar data
        await loadCalendarData();

        // Refresh the day modal if it's still open
        if (currentDayDateStr) {
            openDayModal(currentDayDateStr);
        }
    } catch (error) {
        console.error('Failed to delete event:', error);
        UI.showToast('Failed to delete event', 'error');
    }
}

// ============== Create Event Modal ==============

function openCreateEventModal(dateStr) {
    // Store the date in the hidden input
    document.getElementById('newEventDate').value = dateStr;

    // Format and display the date in the modal header
    const date = new Date(dateStr + 'T00:00:00');
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = date.toLocaleDateString('en-US', options);
    document.getElementById('createEventDateDisplay').textContent = formattedDate;

    // Also show in the visible date input field
    document.getElementById('newEventDateVisible').value = dateStr;

    document.getElementById('createEventModal').classList.add('active');
    loadEquipmentOptions();
}

function closeCreateEventModal() {
    document.getElementById('createEventModal').classList.remove('active');
    document.getElementById('createEventForm').reset();
}

async function loadEquipmentOptions() {
    try {
        const equipment = await API.get('/equipment');
        const select = document.getElementById('newEventEquipment');
        select.innerHTML = '<option value="">Select Equipment</option>';
        equipment.filter(e => e.status !== 'scrapped').forEach(eq => {
            select.add(new Option(eq.name, eq.id));
        });
    } catch (error) {
        console.error('Failed to load equipment:', error);
    }
}

async function createCalendarEvent() {
    const subject = document.getElementById('newEventSubject').value;
    const equipmentId = document.getElementById('newEventEquipment').value;
    const type = document.getElementById('newEventType').value;
    const priority = document.getElementById('newEventPriority').value;
    // Use the visible date input so users can modify the date if needed
    const scheduledDate = document.getElementById('newEventDateVisible').value;

    if (!subject || !equipmentId) {
        UI.showToast('Please fill in subject and equipment', 'error');
        return;
    }

    if (!scheduledDate) {
        UI.showToast('Please select a date', 'error');
        return;
    }

    try {
        await API.post('/requests', {
            subject,
            equipment_id: parseInt(equipmentId),
            type,
            priority,
            scheduled_date: scheduledDate
        });

        UI.showToast('Event created successfully', 'success');
        closeCreateEventModal();

        // Refresh calendar
        await loadCalendarData();

        // Refresh day modal
        if (currentDayDateStr) {
            openDayModal(currentDayDateStr);
        }
    } catch (error) {
        console.error('Failed to create event:', error);
        UI.showToast(error.message || 'Failed to create event', 'error');
    }
}

// ============== Helpers ==============

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

