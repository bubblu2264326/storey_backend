const db = require('../config/db');
const { validateProduct, validateReview, validate } = require('../utils/validators');

// Create a new product
const createProduct = async (req, res) => {
    const { store_id } = req.params;
    const {
        name,
        description,
        price,
        quantity,
        category_id,
        sku,
        barcode,
        unit,
        min_stock_level,
        max_stock_level
    } = req.body;
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

        // Check if category exists and belongs to the store
        if (category_id) {
            const categoryCheck = await db.query(
                'SELECT id FROM categories WHERE id = $1 AND store_id = $2',
                [category_id, store_id]
            );

            if (categoryCheck.rows.length === 0) {
                return res.status(400).json({
                    error: 'Invalid Category',
                    message: 'The specified category does not exist in this store'
                });
            }
        }

        // Create product
        const result = await db.query(
            `INSERT INTO products (
                store_id, name, description, price, quantity, category_id,
                sku, barcode, unit, min_stock_level, max_stock_level
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
            [
                store_id, name, description, price, quantity, category_id,
                sku, barcode, unit, min_stock_level, max_stock_level
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to create product'
        });
    }
};

// Get all products for a store
const getProducts = async (req, res) => {
    const { store_id } = req.params;
    const user_id = req.user.id;
    const { category_id, search, min_price, max_price, in_stock } = req.query;

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

        // Build query
        let query = 'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.store_id = $1';
        const params = [store_id];
        let paramIndex = 2;

        if (category_id) {
            query += ` AND p.category_id = $${paramIndex}`;
            params.push(category_id);
            paramIndex++;
        }

        if (search) {
            query += ` AND (p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        if (min_price) {
            query += ` AND p.price >= $${paramIndex}`;
            params.push(min_price);
            paramIndex++;
        }

        if (max_price) {
            query += ` AND p.price <= $${paramIndex}`;
            params.push(max_price);
            paramIndex++;
        }

        if (in_stock === 'true') {
            query += ' AND p.quantity > 0';
        } else if (in_stock === 'false') {
            query += ' AND p.quantity = 0';
        }

        query += ' ORDER BY p.name';

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error getting products:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get products'
        });
    }
};

// Get a single product by ID
const getProductById = async (req, res) => {
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

        const result = await db.query(
            'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = $1 AND p.store_id = $2',
            [id, store_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Product not found'
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error getting product:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get product'
        });
    }
};

// Update a product
const updateProduct = async (req, res) => {
    const { store_id, id } = req.params;
    const {
        name,
        description,
        price,
        quantity,
        category_id,
        sku,
        barcode,
        unit,
        min_stock_level,
        max_stock_level
    } = req.body;
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

        // Check if product exists
        const productCheck = await db.query(
            'SELECT id FROM products WHERE id = $1 AND store_id = $2',
            [id, store_id]
        );

        if (productCheck.rows.length === 0) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Product not found'
            });
        }

        // Check if category exists and belongs to the store
        if (category_id) {
            const categoryCheck = await db.query(
                'SELECT id FROM categories WHERE id = $1 AND store_id = $2',
                [category_id, store_id]
            );

            if (categoryCheck.rows.length === 0) {
                return res.status(400).json({
                    error: 'Invalid Category',
                    message: 'The specified category does not exist in this store'
                });
            }
        }

        // Update product
        const result = await db.query(
            `UPDATE products SET
                name = COALESCE($1, name),
                description = COALESCE($2, description),
                price = COALESCE($3, price),
                quantity = COALESCE($4, quantity),
                category_id = COALESCE($5, category_id),
                sku = COALESCE($6, sku),
                barcode = COALESCE($7, barcode),
                unit = COALESCE($8, unit),
                min_stock_level = COALESCE($9, min_stock_level),
                max_stock_level = COALESCE($10, max_stock_level),
                updated_at = NOW()
            WHERE id = $11 AND store_id = $12
            RETURNING *`,
            [
                name, description, price, quantity, category_id,
                sku, barcode, unit, min_stock_level, max_stock_level,
                id, store_id
            ]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to update product'
        });
    }
};

// Delete a product
const deleteProduct = async (req, res) => {
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

        // Check if product exists
        const productCheck = await db.query(
            'SELECT id FROM products WHERE id = $1 AND store_id = $2',
            [id, store_id]
        );

        if (productCheck.rows.length === 0) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Product not found'
            });
        }

        // Delete product
        await db.query(
            'DELETE FROM products WHERE id = $1 AND store_id = $2',
            [id, store_id]
        );

        res.json({
            message: 'Product deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to delete product'
        });
    }
};

// Add a review to a product
const addReview = async (req, res) => {
    const { store_id, id } = req.params;
    const { rating, comment } = req.body;
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

        // Check if product exists
        const productCheck = await db.query(
            'SELECT id FROM products WHERE id = $1 AND store_id = $2',
            [id, store_id]
        );

        if (productCheck.rows.length === 0) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Product not found'
            });
        }

        // Add review
        const result = await db.query(
            'INSERT INTO product_reviews (product_id, user_id, rating, comment) VALUES ($1, $2, $3, $4) RETURNING *',
            [id, user_id, rating, comment]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error adding review:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to add review'
        });
    }
};

// Get reviews for a product
const getReviews = async (req, res) => {
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

        // Check if product exists
        const productCheck = await db.query(
            'SELECT id FROM products WHERE id = $1 AND store_id = $2',
            [id, store_id]
        );

        if (productCheck.rows.length === 0) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Product not found'
            });
        }

        // Get reviews
        const result = await db.query(
            'SELECT pr.*, u.name as user_name FROM product_reviews pr JOIN users u ON pr.user_id = u.user_id WHERE pr.product_id = $1 ORDER BY pr.created_at DESC',
            [id]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Error getting reviews:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get reviews'
        });
    }
};

module.exports = {
    createProduct,
    getProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    addReview,
    getReviews
};


