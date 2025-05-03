const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// Register a new user
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if user already exists
        const userExists = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (userExists.rows.length > 0) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'User already exists'
            });
        }

        // Create new user
        const result = await pool.query(
            'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *',
            [name, email, password]
        );

        const user = result.rows[0];
        const token = jwt.sign({ user_id: user.user_id }, process.env.JWT_SECRET);

        res.status(201).json({
            user,
            token
        });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to register user'
        });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1 AND password = $2',
            [email, password]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid credentials'
            });
        }

        const user = result.rows[0];
        const token = jwt.sign({ user_id: user.user_id }, process.env.JWT_SECRET);

        res.json({
            user,
            token
        });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to login'
        });
    }
});

// Get current user
router.get('/me', auth, async (req, res) => {
    try {
        res.json(req.user);
    } catch (error) {
        console.error('Error getting user:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get user'
        });
    }
});

module.exports = router;