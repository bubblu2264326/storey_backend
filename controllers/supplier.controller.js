const db = require('../config/db');

// Create a new supplier
const createSupplier = async (req, res) => {
    const { store_id } = req.params;
    const { name, contact_info, email, phone, address } = req.body;
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

        // Check for duplicate supplier name
        const duplicateCheck = await db.query(
            'SELECT id FROM suppliers WHERE store_id = $1 AND LOWER(name) = LOWER($2)',
            [store_id, name]
        );

        if (duplicateCheck.rows.length > 0) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'A supplier with this name already exists'
            });
        }

        // Start transaction
        await db.query('BEGIN');

        // Create supplier
        const result = await db.query(
            'INSERT INTO suppliers (store_id, name, contact_info, email, phone, address, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *',
            [store_id, name, contact_info, email, phone, address]
        );

        // Record the transaction
        await db.query(
            'INSERT INTO inventory_transactions (store_id, type, created_by, notes) VALUES ($1, $2, $3, $4)',
            [store_id, 'supplier_created', user_id, `Supplier ${name} created`]
        );

        await db.query('COMMIT');
        res.status(201).json(result.rows[0]);
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error creating supplier:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to create supplier'
        });
    }
};

// Get all suppliers for a store
const getSuppliers = async (req, res) => {
    const { store_id } = req.params;
    const user_id = req.user.id;
    const { search, page = 1, limit = 10 } = req.query;

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
        let query = 'SELECT * FROM suppliers WHERE store_id = $1';
        const params = [store_id];

        if (search) {
            query += ' AND (name ILIKE $2 OR contact_info ILIKE $2 OR email ILIKE $2)';
            params.push(`%${search}%`);
        }

        // Add pagination
        const offset = (page - 1) * limit;
        query += ' ORDER BY name LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
        params.push(limit, offset);

        // Get suppliers
        const result = await db.query(query, params);

        // Get total count for pagination
        const countQuery = 'SELECT COUNT(*) FROM suppliers WHERE store_id = $1';
        const countResult = await db.query(countQuery, [store_id]);
        const total = parseInt(countResult.rows[0].count);

        res.json({
            data: result.rows,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching suppliers:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch suppliers'
        });
    }
};

// Get supplier by ID
const getSupplierById = async (req, res) => {
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

        // Get supplier
        const result = await db.query(
            'SELECT * FROM suppliers WHERE id = $1 AND store_id = $2',
            [id, store_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Supplier not found'
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching supplier:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch supplier'
        });
    }
};

// Update supplier
const updateSupplier = async (req, res) => {
    const { store_id, id } = req.params;
    const { name, contact_info, email, phone, address } = req.body;
    const user_id = req.user.id;

    try {
        // Start transaction
        await db.query('BEGIN');

        // Check if user has access to the store
        const accessCheck = await db.query(
            'SELECT role FROM user_store WHERE user_id = $1 AND store_id = $2',
            [user_id, store_id]
        );

        if (accessCheck.rows.length === 0) {
            await db.query('ROLLBACK');
            return res.status(403).json({
                error: 'Access Denied',
                message: 'You do not have access to this store'
            });
        }

        // Get current supplier details for logging
        const currentSupplier = await db.query(
            'SELECT name FROM suppliers WHERE id = $1 AND store_id = $2',
            [id, store_id]
        );

        if (currentSupplier.rows.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({
                error: 'Not Found',
                message: 'Supplier not found'
            });
        }

        // Check for duplicate supplier name
        if (name) {
            const duplicateCheck = await db.query(
                'SELECT id FROM suppliers WHERE store_id = $1 AND LOWER(name) = LOWER($2) AND id != $3',
                [store_id, name, id]
            );

            if (duplicateCheck.rows.length > 0) {
                await db.query('ROLLBACK');
                return res.status(400).json({
                    error: 'Bad Request',
                    message: 'A supplier with this name already exists'
                });
            }
        }

        // Update supplier
        const result = await db.query(
            'UPDATE suppliers SET name = COALESCE($1, name), contact_info = COALESCE($2, contact_info), email = COALESCE($3, email), phone = COALESCE($4, phone), address = COALESCE($5, address), updated_at = NOW() WHERE id = $6 AND store_id = $7 RETURNING *',
            [name, contact_info, email, phone, address, id, store_id]
        );

        // Record the transaction
        await db.query(
            'INSERT INTO inventory_transactions (store_id, type, created_by, notes) VALUES ($1, $2, $3, $4)',
            [store_id, 'supplier_updated', user_id, `Supplier ${currentSupplier.rows[0].name} updated`]
        );

        await db.query('COMMIT');
        res.json(result.rows[0]);
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error updating supplier:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to update supplier'
        });
    }
};

// Delete supplier
const deleteSupplier = async (req, res) => {
    const { store_id, id } = req.params;
    const user_id = req.user.id;

    try {
        // Start transaction
        await db.query('BEGIN');

        // Check if user has access to the store
        const accessCheck = await db.query(
            'SELECT role FROM user_store WHERE user_id = $1 AND store_id = $2',
            [user_id, store_id]
        );

        if (accessCheck.rows.length === 0) {
            await db.query('ROLLBACK');
            return res.status(403).json({
                error: 'Access Denied',
                message: 'You do not have access to this store'
            });
        }

        // Get supplier details for logging
        const supplier = await db.query(
            'SELECT name FROM suppliers WHERE id = $1 AND store_id = $2',
            [id, store_id]
        );

        if (supplier.rows.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({
                error: 'Not Found',
                message: 'Supplier not found'
            });
        }

        // Check if supplier has any purchases
        const purchaseCheck = await db.query(
            'SELECT id FROM purchases WHERE supplier_id = $1 AND store_id = $2',
            [id, store_id]
        );

        if (purchaseCheck.rows.length > 0) {
            await db.query('ROLLBACK');
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Cannot delete supplier with existing purchases'
            });
        }

        // Delete supplier
        const result = await db.query(
            'DELETE FROM suppliers WHERE id = $1 AND store_id = $2 RETURNING *',
            [id, store_id]
        );

        // Record the transaction
        await db.query(
            'INSERT INTO inventory_transactions (store_id, type, created_by, notes) VALUES ($1, $2, $3, $4)',
            [store_id, 'supplier_deleted', user_id, `Supplier ${supplier.rows[0].name} deleted`]
        );

        await db.query('COMMIT');
        res.json({ message: 'Supplier deleted successfully' });
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error deleting supplier:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to delete supplier'
        });
    }
};

// Get supplier purchases
const getSupplierPurchases = async (req, res) => {
    const { store_id, id } = req.params;
    const user_id = req.user.id;
    const { start_date, end_date, page = 1, limit = 10 } = req.query;

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
        let query = `
            SELECT p.*, 
            COALESCE(SUM(pi.quantity * pi.unit_price), 0) as total_amount,
            COUNT(pi.id) as total_items
            FROM purchases p
            LEFT JOIN purchase_items pi ON p.id = pi.purchase_id
            WHERE p.supplier_id = $1 AND p.store_id = $2
        `;
        const params = [id, store_id];
        let paramIndex = 3;

        if (start_date) {
            query += ` AND p.created_at >= $${paramIndex}`;
            params.push(start_date);
            paramIndex++;
        }

        if (end_date) {
            query += ` AND p.created_at <= $${paramIndex}`;
            params.push(end_date);
            paramIndex++;
        }

        // Add pagination
        const offset = (page - 1) * limit;
        query += ' GROUP BY p.id ORDER BY p.created_at DESC LIMIT $' + paramIndex + ' OFFSET $' + (paramIndex + 1);
        params.push(limit, offset);

        // Get purchases
        const result = await db.query(query, params);

        // Get total count for pagination
        const countQuery = `
            SELECT COUNT(DISTINCT p.id)
            FROM purchases p
            WHERE p.supplier_id = $1 AND p.store_id = $2
        `;
        const countParams = [id, store_id];
        if (start_date) {
            countQuery += ' AND p.created_at >= $3';
            countParams.push(start_date);
        }
        if (end_date) {
            countQuery += ' AND p.created_at <= $' + (countParams.length + 1);
            countParams.push(end_date);
        }
        const countResult = await db.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);

        res.json({
            data: result.rows,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching supplier purchases:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch supplier purchases'
        });
    }
};

module.exports = {
    createSupplier,
    getSuppliers,
    getSupplierById,
    updateSupplier,
    deleteSupplier,
    getSupplierPurchases
}; 