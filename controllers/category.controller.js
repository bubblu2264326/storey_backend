const db = require('../config/db');

// Create a new category
const createCategory = async (req, res) => {
    const { store_id } = req.params;
    const { name, description } = req.body;
    const user_id = req.user.id;

    try {
        // Check if user has access to the store
        const accessCheck = await db.query(
            'SELECT role FROM user_store WHERE user_id = $1 AND store_id = $2',
            [user_id, store_id]
        );

        if (accessCheck.rows.length === 0) {
            return res.status(403).json({
                error: 'Access Denied',
                message: 'You do not have access to this store'
            });
        }

        // Create category
        const result = await db.query(
            'INSERT INTO categories (store_id, name, description) VALUES ($1, $2, $3) RETURNING *',
            [store_id, name, description]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to create category'
        });
    }
};

// Get all categories for a store
const getCategories = async (req, res) => {
    const { store_id } = req.params;
    const user_id = req.user.id;

    try {
        // Check if user has access to the store
        const accessCheck = await db.query(
            'SELECT role FROM user_store WHERE user_id = $1 AND store_id = $2',
            [user_id, store_id]
        );

        if (accessCheck.rows.length === 0) {
            return res.status(403).json({
                error: 'Access Denied',
                message: 'You do not have access to this store'
            });
        }

        // Get categories
        const result = await db.query(
            'SELECT * FROM categories WHERE store_id = $1',
            [store_id]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch categories'
        });
    }
};

// Get category by ID
const getCategoryById = async (req, res) => {
    const { store_id, id } = req.params;
    const user_id = req.user.id;

    try {
        // Check if user has access to the store
        const accessCheck = await db.query(
            'SELECT role FROM user_store WHERE user_id = $1 AND store_id = $2',
            [user_id, store_id]
        );

        if (accessCheck.rows.length === 0) {
            return res.status(403).json({
                error: 'Access Denied',
                message: 'You do not have access to this store'
            });
        }

        // Get category
        const result = await db.query(
            'SELECT * FROM categories WHERE id = $1 AND store_id = $2',
            [id, store_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Category not found'
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching category:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch category'
        });
    }
};

// Update category
const updateCategory = async (req, res) => {
    const { store_id, id } = req.params;
    const { name, description } = req.body;
    const user_id = req.user.id;

    try {
        // Check if user has access to the store
        const accessCheck = await db.query(
            'SELECT role FROM user_store WHERE user_id = $1 AND store_id = $2',
            [user_id, store_id]
        );

        if (accessCheck.rows.length === 0) {
            return res.status(403).json({
                error: 'Access Denied',
                message: 'You do not have access to this store'
            });
        }

        // Update category
        const result = await db.query(
            'UPDATE categories SET name = $1, description = $2, updated_at = NOW() WHERE id = $3 AND store_id = $4 RETURNING *',
            [name, description, id, store_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Category not found'
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to update category'
        });
    }
};

// Delete category
const deleteCategory = async (req, res) => {
    const { store_id, id } = req.params;
    const user_id = req.user.id;

    try {
        // Check if user has access to the store
        const accessCheck = await db.query(
            'SELECT role FROM user_store WHERE user_id = $1 AND store_id = $2',
            [user_id, store_id]
        );

        if (accessCheck.rows.length === 0) {
            return res.status(403).json({
                error: 'Access Denied',
                message: 'You do not have access to this store'
            });
        }

        // Delete category
        const result = await db.query(
            'DELETE FROM categories WHERE id = $1 AND store_id = $2 RETURNING *',
            [id, store_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Category not found'
            });
        }

        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to delete category'
        });
    }
};

module.exports = {
    createCategory,
    getCategories,
    getCategoryById,
    updateCategory,
    deleteCategory
}; 