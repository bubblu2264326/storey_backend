const {pool} = require('../models/database.js');
const dotenv = require('dotenv');
dotenv.config();

async function login(req, res) {
    try {
        const { username, password } = req.body;
        const result = await pool.query(
            "SELECT * FROM users WHERE username = $1 AND password = $2",
            [username, password]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        
        const user = result.rows[0];
        res.json({
            message: "Login successful",
            user: {
                user_id: user.user_id,
                username: user.username,
                role: user.role
            }
        });
    } catch(err) {
        console.error("Login failed:", err);
        res.status(500).json({error: err});
    }
}

async function register(req, res) {
    try {
        const { username, password, email, role } = req.body;
        
        // Check if username already exists
        const userCheck = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ message: "Username already exists" });
        }
        
        const result = await pool.query(
            "INSERT INTO users (username, password, email, role) VALUES ($1, $2, $3, $4) RETURNING user_id, username, email, role",
            [username, password, email, role]
        );
        
        res.status(201).json({
            message: "User registered successfully",
            user: result.rows[0]
        });
    } catch(err) {
        console.error("Registration failed:", err);
        res.status(500).json({error: err});
    }
}

module.exports = {
    login,
    register
}