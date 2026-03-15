const express = require('express');
const pool = require('../config/db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get all equipment with related data
router.get('/', auth, async (req, res) => {
    try {
        const { department, category, team, status, search } = req.query;

        let query = `
            SELECT e.*, 
                   d.name as department_name,
                   t.name as team_name,
                   u.name as assigned_to_name,
                   tech.name as technician_name,
                   (SELECT COUNT(*) FROM requests r WHERE r.equipment_id = e.id AND r.stage NOT IN ('repaired', 'scrap')) as open_requests
            FROM equipment e
            LEFT JOIN departments d ON e.department_id = d.id
            LEFT JOIN teams t ON e.team_id = t.id
            LEFT JOIN users u ON e.assigned_to = u.id
            LEFT JOIN users tech ON e.default_technician_id = tech.id
            WHERE 1=1
        `;

        const params = [];
        let paramCount = 0;

        if (department) {
            paramCount++;
            query += ` AND e.department_id = $${paramCount}`;
            params.push(department);
        }

        if (category) {
            paramCount++;
            query += ` AND e.category = $${paramCount}`;
            params.push(category);
        }

        if (team) {
            paramCount++;
            query += ` AND e.team_id = $${paramCount}`;
            params.push(team);
        }

        if (status) {
            paramCount++;
            query += ` AND e.status = $${paramCount}`;
            params.push(status);
        }

        if (search) {
            paramCount++;
            query += ` AND (e.name ILIKE $${paramCount} OR e.serial_number ILIKE $${paramCount})`;
            params.push(`%${search}%`);
        }

        query += ' ORDER BY e.name';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Get equipment error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single equipment
router.get('/:id', auth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT e.*, 
                   d.name as department_name,
                   t.name as team_name,
                   u.name as assigned_to_name,
                   tech.name as technician_name
            FROM equipment e
            LEFT JOIN departments d ON e.department_id = d.id
            LEFT JOIN teams t ON e.team_id = t.id
            LEFT JOIN users u ON e.assigned_to = u.id
            LEFT JOIN users tech ON e.default_technician_id = tech.id
            WHERE e.id = $1
        `, [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Equipment not found' });
        }

        // Get open request count
        const countResult = await pool.query(
            `SELECT COUNT(*) as count FROM requests WHERE equipment_id = $1 AND stage NOT IN ('repaired', 'scrap')`,
            [req.params.id]
        );

        res.json({
            ...result.rows[0],
            open_requests: parseInt(countResult.rows[0].count)
        });
    } catch (error) {
        console.error('Get equipment error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create equipment
router.post('/', auth, async (req, res) => {
    try {
        const {
            name, serial_number, category, department_id, assigned_to,
            team_id, default_technician_id, purchase_date, warranty_expiry,
            location, notes
        } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Equipment name is required' });
        }

        const result = await pool.query(
            `INSERT INTO equipment 
             (name, serial_number, category, department_id, assigned_to, team_id, 
              default_technician_id, purchase_date, warranty_expiry, location, notes) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
            [name, serial_number, category || 'other', department_id, assigned_to, team_id,
                default_technician_id, purchase_date, warranty_expiry, location, notes]
        );

        res.status(201).json({
            message: 'Equipment created successfully',
            equipment: { id: result.rows[0].id, name }
        });
    } catch (error) {
        console.error('Create equipment error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update equipment
router.put('/:id', auth, async (req, res) => {
    try {
        const {
            name, serial_number, category, department_id, assigned_to,
            team_id, default_technician_id, purchase_date, warranty_expiry,
            location, status, notes
        } = req.body;

        await pool.query(
            `UPDATE equipment SET
             name = $1, serial_number = $2, category = $3, department_id = $4, assigned_to = $5,
             team_id = $6, default_technician_id = $7, purchase_date = $8, warranty_expiry = $9,
             location = $10, status = $11, notes = $12, updated_at = CURRENT_TIMESTAMP
             WHERE id = $13`,
            [name, serial_number, category, department_id, assigned_to, team_id,
                default_technician_id, purchase_date, warranty_expiry, location, status, notes,
                req.params.id]
        );

        res.json({ message: 'Equipment updated successfully' });
    } catch (error) {
        console.error('Update equipment error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete equipment
router.delete('/:id', auth, async (req, res) => {
    try {
        await pool.query('DELETE FROM equipment WHERE id = $1', [req.params.id]);
        res.json({ message: 'Equipment deleted successfully' });
    } catch (error) {
        console.error('Delete equipment error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get equipment requests (for Smart Button)
router.get('/:id/requests', auth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT r.*, 
                   t.name as team_name,
                   u.name as assigned_to_name
            FROM requests r
            LEFT JOIN teams t ON r.team_id = t.id
            LEFT JOIN users u ON r.assigned_to = u.id
            WHERE r.equipment_id = $1
            ORDER BY r.created_at DESC
        `, [req.params.id]);

        res.json(result.rows);
    } catch (error) {
        console.error('Get equipment requests error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
