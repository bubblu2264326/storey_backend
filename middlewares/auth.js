const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user from database
        const userResult = await pool.query(
            'SELECT * FROM users WHERE user_id = $1',
            [decoded.user_id]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }

        req.user = userResult.rows[0];
        req.token = token;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Please authenticate' });
    }
};

const requireRole = (roles) => {
    return async (req, res, next) => {
        try {
            const { store_id } = req.params;
            
            // Get user's role in the store
            const roleResult = await pool.query(
                'SELECT role FROM user_store WHERE user_id = $1 AND store_id = $2',
                [req.user.user_id, store_id]
            );

            if (roleResult.rows.length === 0) {
                return res.status(403).json({ error: 'Access denied' });
            }

            const userRole = roleResult.rows[0].role;

            if (!roles.includes(userRole)) {
                return res.status(403).json({ error: 'Insufficient permissions' });
            }

            req.userRole = userRole;
            next();
        } catch (error) {
            res.status(500).json({ error: 'Server error' });
        }
    };
};

module.exports = {
    auth,
    requireRole
}; 