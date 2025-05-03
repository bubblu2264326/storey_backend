const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middlewares/auth');
const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// Apply authentication middleware to all routes
router.use(auth);

// Create a new store
router.post('/', async (req, res) => {
    try {
        const { name, location, owner_name } = req.body;
        const user_id = req.user.user_id;

        // Create store
        const result = await pool.query(
            'INSERT INTO store (name, location, owner_name, user_id) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, location, owner_name, user_id]
        );

        // Add user as admin of the store
        await pool.query(
            'INSERT INTO user_store (user_id, store_id, role) VALUES ($1, $2, $3)',
            [user_id, result.rows[0].id, 'admin']
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating store:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to create store'
        });
    }
});

// Get all stores for current user
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT s.*, us.role FROM store s JOIN user_store us ON s.id = us.store_id WHERE us.user_id = $1',
            [req.user.user_id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error getting stores:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get stores'
        });
    }
});

// Get a single store
router.get('/:id', requireRole(['admin', 'manager', 'staff']), async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT * FROM store WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Store not found'
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error getting store:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get store'
        });
    }
});

// Update a store
router.put('/:id', requireRole(['admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, location, owner_name } = req.body;

        const result = await pool.query(
            'UPDATE store SET name = $1, location = $2, owner_name = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
            [name, location, owner_name, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Store not found'
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating store:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to update store'
        });
    }
});

// Delete a store
router.delete('/:id', requireRole(['admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'DELETE FROM store WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Store not found'
            });
        }

        res.json({ message: 'Store deleted successfully' });
    } catch (error) {
        console.error('Error deleting store:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to delete store'
        });
    }
});

module.exports = router; 