const express = require('express');
const pool = require('../config/db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get all teams with member count
router.get('/', auth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT t.*, COUNT(tm.id) as member_count
            FROM teams t
            LEFT JOIN team_members tm ON t.id = tm.team_id
            GROUP BY t.id
            ORDER BY t.name
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Get teams error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single team with members
router.get('/:id', auth, async (req, res) => {
    try {
        const teamResult = await pool.query('SELECT * FROM teams WHERE id = $1', [req.params.id]);

        if (teamResult.rows.length === 0) {
            return res.status(404).json({ error: 'Team not found' });
        }

        // Get team members
        const membersResult = await pool.query(`
            SELECT u.id, u.name, u.email, u.avatar, u.role
            FROM users u
            INNER JOIN team_members tm ON u.id = tm.user_id
            WHERE tm.team_id = $1
            ORDER BY u.name
        `, [req.params.id]);

        res.json({ ...teamResult.rows[0], members: membersResult.rows });
    } catch (error) {
        console.error('Get team error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create team
router.post('/', auth, async (req, res) => {
    try {
        const { name, description, memberIds = [] } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Team name is required' });
        }

        const result = await pool.query(
            'INSERT INTO teams (name, description) VALUES ($1, $2) RETURNING id',
            [name, description]
        );

        const teamId = result.rows[0].id;

        // Add members if provided
        if (memberIds.length > 0) {
            for (const userId of memberIds) {
                await pool.query(
                    'INSERT INTO team_members (team_id, user_id) VALUES ($1, $2)',
                    [teamId, userId]
                );
            }
        }

        res.status(201).json({
            message: 'Team created successfully',
            team: { id: teamId, name, description }
        });
    } catch (error) {
        console.error('Create team error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update team
router.put('/:id', auth, async (req, res) => {
    try {
        const { name, description } = req.body;

        await pool.query(
            'UPDATE teams SET name = $1, description = $2 WHERE id = $3',
            [name, description, req.params.id]
        );

        res.json({ message: 'Team updated successfully' });
    } catch (error) {
        console.error('Update team error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete team
router.delete('/:id', auth, async (req, res) => {
    try {
        await pool.query('DELETE FROM teams WHERE id = $1', [req.params.id]);
        res.json({ message: 'Team deleted successfully' });
    } catch (error) {
        console.error('Delete team error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Add member to team
router.post('/:id/members', auth, async (req, res) => {
    try {
        const { userId } = req.body;

        await pool.query(
            'INSERT INTO team_members (team_id, user_id) VALUES ($1, $2)',
            [req.params.id, userId]
        );

        res.status(201).json({ message: 'Member added successfully' });
    } catch (error) {
        if (error.code === '23505') { // PostgreSQL unique violation
            return res.status(400).json({ error: 'User is already a team member' });
        }
        console.error('Add member error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Remove member from team
router.delete('/:id/members/:userId', auth, async (req, res) => {
    try {
        await pool.query(
            'DELETE FROM team_members WHERE team_id = $1 AND user_id = $2',
            [req.params.id, req.params.userId]
        );

        res.json({ message: 'Member removed successfully' });
    } catch (error) {
        console.error('Remove member error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
