const express = require('express');
const pool = require('../config/db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get all departments
router.get('/', auth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM departments ORDER BY name');
        res.json(result.rows);
    } catch (error) {
        console.error('Get departments error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create department
router.post('/', auth, async (req, res) => {
    try {
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Department name is required' });
        }

        const result = await pool.query(
            'INSERT INTO departments (name) VALUES ($1) RETURNING id',
            [name]
        );

        res.status(201).json({
            message: 'Department created successfully',
            department: { id: result.rows[0].id, name }
        });
    } catch (error) {
        console.error('Create department error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update department
router.put('/:id', auth, async (req, res) => {
    try {
        const { name } = req.body;

        await pool.query('UPDATE departments SET name = $1 WHERE id = $2', [name, req.params.id]);
        res.json({ message: 'Department updated successfully' });
    } catch (error) {
        console.error('Update department error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete department
router.delete('/:id', auth, async (req, res) => {
    try {
        await pool.query('DELETE FROM departments WHERE id = $1', [req.params.id]);
        res.json({ message: 'Department deleted successfully' });
    } catch (error) {
        console.error('Delete department error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
