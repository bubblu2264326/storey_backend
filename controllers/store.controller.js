const { query } = require('../config/db');
const { validateStore, validate } = require('../utils/validators');

// Create store
const createStore = async (req, res) => {
    try {
        const { name, location } = req.body;
        const user_id = req.user.user_id;

        // Create store
        const store = await query(
            'INSERT INTO store (name, location, user_id) VALUES ($1, $2, $3) RETURNING *',
            [name, location, user_id]
        );

        // Add user as admin to the store
        await query(
            'INSERT INTO user_store (user_id, store_id, role) VALUES ($1, $2, $3)',
            [user_id, store.rows[0].id, 'admin']
        );

        res.status(201).json(store.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Get all stores for a user
const getStores = async (req, res) => {
    try {
        const user_id = req.user.user_id;

        const stores = await query(
            `SELECT s.*, us.role 
             FROM store s 
             JOIN user_store us ON s.id = us.store_id 
             WHERE us.user_id = $1`,
            [user_id]
        );

        res.json(stores.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Get store by ID
const getStoreById = async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.user.user_id;

        // Check if user has access to the store
        const access = await query(
            'SELECT role FROM user_store WHERE user_id = $1 AND store_id = $2',
            [user_id, id]
        );

        if (access.rows.length === 0) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const store = await query(
            'SELECT * FROM store WHERE id = $1',
            [id]
        );

        if (store.rows.length === 0) {
            return res.status(404).json({ error: 'Store not found' });
        }

        res.json({
            ...store.rows[0],
            role: access.rows[0].role
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Update store
const updateStore = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, location } = req.body;
        const user_id = req.user.user_id;

        // Check if user is admin of the store
        const access = await query(
            'SELECT role FROM user_store WHERE user_id = $1 AND store_id = $2',
            [user_id, id]
        );

        if (access.rows.length === 0 || access.rows[0].role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const store = await query(
            'UPDATE store SET name = $1, location = $2 WHERE id = $3 RETURNING *',
            [name, location, id]
        );

        if (store.rows.length === 0) {
            return res.status(404).json({ error: 'Store not found' });
        }

        res.json(store.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Delete store
const deleteStore = async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.user.user_id;

        // Check if user is admin of the store
        const access = await query(
            'SELECT role FROM user_store WHERE user_id = $1 AND store_id = $2',
            [user_id, id]
        );

        if (access.rows.length === 0 || access.rows[0].role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        await query('DELETE FROM store WHERE id = $1', [id]);

        res.json({ message: 'Store deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    createStore,
    getStores,
    getStoreById,
    updateStore,
    deleteStore
}; 