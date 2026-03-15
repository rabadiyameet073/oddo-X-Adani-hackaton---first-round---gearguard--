const express = require('express');
const pool = require('../config/db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get all users
router.get('/', auth, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, email, role, avatar, created_at FROM users ORDER BY name'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get technicians (for assignment dropdowns)
router.get('/technicians', auth, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, name, email, avatar FROM users 
             WHERE role IN ('technician', 'manager', 'admin') 
             ORDER BY name`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get technicians error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single user
router.get('/:id', auth, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, email, role, avatar, created_at FROM users WHERE id = $1',
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update user
router.put('/:id', auth, async (req, res) => {
    try {
        const { name, email, role, avatar } = req.body;

        await pool.query(
            'UPDATE users SET name = $1, email = $2, role = $3, avatar = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5',
            [name, email, role, avatar, req.params.id]
        );

        res.json({ message: 'User updated successfully' });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete user
router.delete('/:id', auth, async (req, res) => {
    try {
        await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
