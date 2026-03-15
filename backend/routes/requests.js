const express = require('express');
const pool = require('../config/db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get all requests (for Kanban)
router.get('/', auth, async (req, res) => {
    try {
        const { stage, team, type, equipment } = req.query;

        let query = `
            SELECT r.*, 
                   e.name as equipment_name,
                   e.category as equipment_category,
                   t.name as team_name,
                   u.name as assigned_to_name,
                   u.avatar as assigned_to_avatar,
                   creator.name as created_by_name,
                   CASE WHEN r.scheduled_date < CURRENT_DATE AND r.stage NOT IN ('repaired', 'scrap') 
                        THEN true ELSE false END as is_overdue
            FROM requests r
            LEFT JOIN equipment e ON r.equipment_id = e.id
            LEFT JOIN teams t ON r.team_id = t.id
            LEFT JOIN users u ON r.assigned_to = u.id
            LEFT JOIN users creator ON r.created_by = creator.id
            WHERE 1=1
        `;

        const params = [];
        let paramCount = 0;

        if (stage) {
            paramCount++;
            query += ` AND r.stage = $${paramCount}`;
            params.push(stage);
        }

        if (team) {
            paramCount++;
            query += ` AND r.team_id = $${paramCount}`;
            params.push(team);
        }

        if (type) {
            paramCount++;
            query += ` AND r.type = $${paramCount}`;
            params.push(type);
        }

        if (equipment) {
            paramCount++;
            query += ` AND r.equipment_id = $${paramCount}`;
            params.push(equipment);
        }

        query += ' ORDER BY r.created_at DESC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Get requests error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get requests for calendar view
router.get('/calendar', auth, async (req, res) => {
    try {
        const { month, year, start_date, end_date } = req.query;

        let query = `
            SELECT r.id, r.subject, r.type, r.scheduled_date, r.stage, r.priority,
                   r.assigned_to,
                   e.name as equipment_name,
                   e.id as equipment_id,
                   t.name as team_name,
                   t.id as team_id,
                   u.name as assigned_to_name,
                   CASE WHEN r.scheduled_date < CURRENT_DATE AND r.stage NOT IN ('repaired', 'scrap')
                        THEN true ELSE false END as is_overdue
            FROM requests r
            LEFT JOIN equipment e ON r.equipment_id = e.id
            LEFT JOIN teams t ON r.team_id = t.id
            LEFT JOIN users u ON r.assigned_to = u.id
            WHERE r.scheduled_date IS NOT NULL
        `;

        const params = [];
        let paramCount = 0;

        if (month && year) {
            paramCount += 2;
            query += ` AND EXTRACT(MONTH FROM r.scheduled_date) = $1 AND EXTRACT(YEAR FROM r.scheduled_date) = $2`;
            params.push(month, year);
        } else if (start_date && end_date) {
            paramCount += 2;
            query += ` AND r.scheduled_date >= $1 AND r.scheduled_date <= $2`;
            params.push(start_date, end_date);
        }

        query += ' ORDER BY r.scheduled_date, r.priority DESC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Get calendar requests error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single request
router.get('/:id', auth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT r.*, 
                   e.name as equipment_name,
                   e.category as equipment_category,
                   t.name as team_name,
                   u.name as assigned_to_name,
                   creator.name as created_by_name
            FROM requests r
            LEFT JOIN equipment e ON r.equipment_id = e.id
            LEFT JOIN teams t ON r.team_id = t.id
            LEFT JOIN users u ON r.assigned_to = u.id
            LEFT JOIN users creator ON r.created_by = creator.id
            WHERE r.id = $1
        `, [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }

        // Get request notes
        const notesResult = await pool.query(`
            SELECT rn.*, u.name as user_name
            FROM request_notes rn
            LEFT JOIN users u ON rn.user_id = u.id
            WHERE rn.request_id = $1
            ORDER BY rn.created_at DESC
        `, [req.params.id]);

        res.json({ ...result.rows[0], notes: notesResult.rows });
    } catch (error) {
        console.error('Get request error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create request (with auto-fill logic)
router.post('/', auth, async (req, res) => {
    try {
        const {
            subject, description, type, equipment_id, team_id,
            assigned_to, scheduled_date, priority
        } = req.body;

        if (!subject || !equipment_id) {
            return res.status(400).json({ error: 'Subject and equipment are required' });
        }

        // Check if equipment is scrapped - prevent new requests
        const equipCheck = await pool.query(
            'SELECT id, team_id, default_technician_id, status FROM equipment WHERE id = $1',
            [equipment_id]
        );

        if (equipCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Equipment not found' });
        }

        const equipment = equipCheck.rows[0];

        if (equipment.status === 'scrapped') {
            return res.status(400).json({ error: 'Cannot create request for scrapped equipment' });
        }

        // Auto-fill team and technician from equipment if not provided
        const finalTeamId = team_id || equipment.team_id;
        const finalAssignedTo = assigned_to || equipment.default_technician_id;

        const result = await pool.query(
            `INSERT INTO requests
             (subject, description, type, equipment_id, team_id, assigned_to,
              scheduled_date, priority, created_by, stage)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'new') RETURNING id`,
            [subject, description, type || 'corrective', equipment_id, finalTeamId,
                finalAssignedTo, scheduled_date, priority || 'medium', req.user.id]
        );

        res.status(201).json({
            message: 'Request created successfully',
            request: { id: result.rows[0].id, subject }
        });
    } catch (error) {
        console.error('Create request error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update request
router.put('/:id', auth, async (req, res) => {
    try {
        const {
            subject, description, type, equipment_id, team_id,
            assigned_to, scheduled_date, duration, priority, stage
        } = req.body;

        // Get current request to check stage transition
        const currentRequest = await pool.query('SELECT * FROM requests WHERE id = $1', [req.params.id]);
        if (currentRequest.rows.length === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }

        const oldRequest = currentRequest.rows[0];
        const newStage = stage || oldRequest.stage;

        // Check if equipment is scrapped (prevent new requests on scrapped equipment)
        if (equipment_id && equipment_id !== oldRequest.equipment_id) {
            const equipCheck = await pool.query('SELECT status FROM equipment WHERE id = $1', [equipment_id]);
            if (equipCheck.rows.length > 0 && equipCheck.rows[0].status === 'scrapped') {
                return res.status(400).json({ error: 'Cannot assign request to scrapped equipment' });
            }
        }

        // Build update query dynamically based on provided fields
        let updateFields = [];
        let params = [];
        let paramCount = 0;

        if (subject !== undefined) { paramCount++; updateFields.push(`subject = $${paramCount}`); params.push(subject); }
        if (description !== undefined) { paramCount++; updateFields.push(`description = $${paramCount}`); params.push(description); }
        if (type !== undefined) { paramCount++; updateFields.push(`type = $${paramCount}`); params.push(type); }
        if (equipment_id !== undefined) { paramCount++; updateFields.push(`equipment_id = $${paramCount}`); params.push(equipment_id); }
        if (team_id !== undefined) { paramCount++; updateFields.push(`team_id = $${paramCount}`); params.push(team_id); }
        if (assigned_to !== undefined) { paramCount++; updateFields.push(`assigned_to = $${paramCount}`); params.push(assigned_to); }
        if (scheduled_date !== undefined) { paramCount++; updateFields.push(`scheduled_date = $${paramCount}`); params.push(scheduled_date); }
        if (duration !== undefined) { paramCount++; updateFields.push(`duration = $${paramCount}`); params.push(duration); }
        if (priority !== undefined) { paramCount++; updateFields.push(`priority = $${paramCount}`); params.push(priority); }
        if (stage !== undefined) { paramCount++; updateFields.push(`stage = $${paramCount}`); params.push(stage); }

        // Handle stage-specific logic
        if (stage === 'repaired' && oldRequest.stage !== 'repaired') {
            paramCount++;
            updateFields.push(`completed_date = CURRENT_DATE`);
        }

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        paramCount++;
        params.push(req.params.id);

        const query = `UPDATE requests SET ${updateFields.join(', ')} WHERE id = $${paramCount}`;
        await pool.query(query, params);

        // SCRAP LOGIC: If moving to scrap, update equipment status
        if (stage === 'scrap' && oldRequest.stage !== 'scrap') {
            await pool.query('UPDATE equipment SET status = $1 WHERE id = $2', ['scrapped', oldRequest.equipment_id]);
            await pool.query(
                'INSERT INTO request_notes (request_id, user_id, note) VALUES ($1, $2, $3)',
                [req.params.id, req.user.id, 'Equipment marked as scrapped - no longer usable']
            );
        }

        res.json({ message: 'Request updated successfully' });
    } catch (error) {
        console.error('Update request error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update request stage (for Kanban drag-drop)
router.patch('/:id/stage', auth, async (req, res) => {
    try {
        const { stage } = req.body;
        const validStages = ['new', 'in_progress', 'repaired', 'scrap'];

        if (!validStages.includes(stage)) {
            return res.status(400).json({ error: 'Invalid stage' });
        }

        // Get current request
        const requestResult = await pool.query('SELECT * FROM requests WHERE id = $1', [req.params.id]);
        if (requestResult.rows.length === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }

        const request = requestResult.rows[0];

        // Update stage
        await pool.query('UPDATE requests SET stage = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [stage, req.params.id]);

        // If moving to repaired, set completed_date
        if (stage === 'repaired') {
            await pool.query('UPDATE requests SET completed_date = CURRENT_DATE WHERE id = $1', [req.params.id]);
        }

        // SCRAP LOGIC: If moving to scrap, update equipment status
        if (stage === 'scrap') {
            await pool.query('UPDATE equipment SET status = $1 WHERE id = $2', ['scrapped', request.equipment_id]);

            // Add note about scrapping
            await pool.query(
                'INSERT INTO request_notes (request_id, user_id, note) VALUES ($1, $2, $3)',
                [req.params.id, req.user.id, 'Equipment marked as scrapped - no longer usable']
            );
        }

        res.json({ message: 'Stage updated successfully' });
    } catch (error) {
        console.error('Update stage error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Add note to request
router.post('/:id/notes', auth, async (req, res) => {
    try {
        const { note } = req.body;

        if (!note) {
            return res.status(400).json({ error: 'Note content is required' });
        }

        await pool.query(
            'INSERT INTO request_notes (request_id, user_id, note) VALUES ($1, $2, $3)',
            [req.params.id, req.user.id, note]
        );

        res.status(201).json({ message: 'Note added successfully' });
    } catch (error) {
        console.error('Add note error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete request
router.delete('/:id', auth, async (req, res) => {
    try {
        await pool.query('DELETE FROM requests WHERE id = $1', [req.params.id]);
        res.json({ message: 'Request deleted successfully' });
    } catch (error) {
        console.error('Delete request error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
