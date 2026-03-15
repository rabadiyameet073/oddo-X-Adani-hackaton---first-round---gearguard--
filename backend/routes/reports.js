const express = require('express');
const pool = require('../config/db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get requests count by team
router.get('/by-team', auth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT t.name as team_name, t.id as team_id,
                   COUNT(r.id) as total_requests,
                   SUM(CASE WHEN r.stage = 'new' THEN 1 ELSE 0 END) as new_count,
                   SUM(CASE WHEN r.stage = 'in_progress' THEN 1 ELSE 0 END) as in_progress_count,
                   SUM(CASE WHEN r.stage = 'repaired' THEN 1 ELSE 0 END) as repaired_count,
                   SUM(CASE WHEN r.stage = 'scrap' THEN 1 ELSE 0 END) as scrap_count
            FROM teams t
            LEFT JOIN requests r ON t.id = r.team_id
            GROUP BY t.id, t.name
            ORDER BY total_requests DESC
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Get report by team error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get requests count by equipment category
router.get('/by-category', auth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT e.category,
                   COUNT(r.id) as total_requests,
                   SUM(CASE WHEN r.stage = 'new' THEN 1 ELSE 0 END) as new_count,
                   SUM(CASE WHEN r.stage = 'in_progress' THEN 1 ELSE 0 END) as in_progress_count,
                   SUM(CASE WHEN r.stage = 'repaired' THEN 1 ELSE 0 END) as repaired_count,
                   SUM(CASE WHEN r.stage = 'scrap' THEN 1 ELSE 0 END) as scrap_count
            FROM equipment e
            LEFT JOIN requests r ON e.id = r.equipment_id
            GROUP BY e.category
            ORDER BY total_requests DESC
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Get report by category error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get dashboard statistics
router.get('/dashboard', auth, async (req, res) => {
    try {
        // Total equipment
        const equipmentCount = await pool.query('SELECT COUNT(*) as count FROM equipment WHERE status != $1', ['scrapped']);

        // Total active requests
        const activeRequests = await pool.query(
            `SELECT COUNT(*) as count FROM requests WHERE stage NOT IN ('repaired', 'scrap')`
        );

        // Overdue requests
        const overdueRequests = await pool.query(
            `SELECT COUNT(*) as count FROM requests WHERE scheduled_date < CURRENT_DATE AND stage NOT IN ('repaired', 'scrap')`
        );

        // Completed this month
        const completedThisMonth = await pool.query(
            `SELECT COUNT(*) as count FROM requests 
             WHERE stage = 'repaired' 
             AND EXTRACT(MONTH FROM completed_date) = EXTRACT(MONTH FROM CURRENT_DATE)
             AND EXTRACT(YEAR FROM completed_date) = EXTRACT(YEAR FROM CURRENT_DATE)`
        );

        // Requests by stage
        const byStage = await pool.query(`
            SELECT stage, COUNT(*) as count 
            FROM requests 
            GROUP BY stage
        `);

        // Recent requests
        const recentRequests = await pool.query(`
            SELECT r.id, r.subject, r.stage, r.type, r.created_at,
                   e.name as equipment_name
            FROM requests r
            LEFT JOIN equipment e ON r.equipment_id = e.id
            ORDER BY r.created_at DESC
            LIMIT 5
        `);

        res.json({
            totalEquipment: parseInt(equipmentCount.rows[0].count),
            activeRequests: parseInt(activeRequests.rows[0].count),
            overdueRequests: parseInt(overdueRequests.rows[0].count),
            completedThisMonth: parseInt(completedThisMonth.rows[0].count),
            byStage: byStage.rows,
            recentRequests: recentRequests.rows
        });
    } catch (error) {
        console.error('Get dashboard error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
