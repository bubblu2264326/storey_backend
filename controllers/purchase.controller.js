const db = require('../config/db');

// Create a new purchase
const createPurchase = async (req, res) => {
    const { store_id } = req.params;
    const { supplier_id, items, notes } = req.body;
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

        // Check if supplier exists and belongs to the store
        const supplierCheck = await db.query(
            'SELECT id FROM suppliers WHERE id = $1 AND store_id = $2',
            [supplier_id, store_id]
        );

        if (supplierCheck.rows.length === 0) {
            return res.status(400).json({
                error: 'Invalid Supplier',
                message: 'The specified supplier does not exist in this store'
            });
        }

        // Start transaction
        await db.query('BEGIN');

        try {
            // Create purchase
            const purchaseResult = await db.query(
                'INSERT INTO purchases (store_id, supplier_id, user_id, notes) VALUES ($1, $2, $3, $4) RETURNING *',
                [store_id, supplier_id, user_id, notes]
            );

            const purchase = purchaseResult.rows[0];

            // Add purchase items and update product quantities
            for (const item of items) {
                // Check if product exists and belongs to the store
                const productCheck = await db.query(
                    'SELECT id, quantity FROM products WHERE id = $1 AND store_id = $2',
                    [item.product_id, store_id]
                );

                if (productCheck.rows.length === 0) {
                    throw new Error(`Product with ID ${item.product_id} not found in store`);
                }

                // Add purchase item
                await db.query(
                    'INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4)',
                    [purchase.id, item.product_id, item.quantity, item.unit_price]
                );

                // Update product quantity
                await db.query(
                    'UPDATE products SET quantity = quantity + $1, updated_at = NOW() WHERE id = $2',
                    [item.quantity, item.product_id]
                );
            }

            // Commit transaction
            await db.query('COMMIT');

            // Get purchase with items
            const result = await db.query(
                `SELECT p.*, s.name as supplier_name, s.email as supplier_email,
                json_agg(json_build_object(
                    'id', pi.id,
                    'product_id', pi.product_id,
                    'product_name', pr.name,
                    'quantity', pi.quantity,
                    'unit_price', pi.unit_price,
                    'total', pi.quantity * pi.unit_price
                )) as items
                FROM purchases p
                JOIN suppliers s ON p.supplier_id = s.id
                JOIN purchase_items pi ON p.id = pi.purchase_id
                JOIN products pr ON pi.product_id = pr.id
                WHERE p.id = $1
                GROUP BY p.id, s.name, s.email`,
                [purchase.id]
            );

            res.status(201).json(result.rows[0]);
        } catch (error) {
            // Rollback transaction on error
            await db.query('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Error creating purchase:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to create purchase'
        });
    }
};

// Get all purchases for a store
const getPurchases = async (req, res) => {
    const { store_id } = req.params;
    const user_id = req.user.id;
    const { supplier_id, start_date, end_date } = req.query;

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
            SELECT p.*, s.name as supplier_name, s.email as supplier_email,
            u.name as user_name, u.email as user_email,
            COALESCE(SUM(pi.quantity * pi.unit_price), 0) as total_amount
            FROM purchases p
            JOIN suppliers s ON p.supplier_id = s.id
            JOIN users u ON p.user_id = u.id
            LEFT JOIN purchase_items pi ON p.id = pi.purchase_id
            WHERE p.store_id = $1
        `;
        const params = [store_id];
        let paramIndex = 2;

        if (supplier_id) {
            query += ` AND p.supplier_id = $${paramIndex}`;
            params.push(supplier_id);
            paramIndex++;
        }

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

        query += ' GROUP BY p.id, s.name, s.email, u.name, u.email ORDER BY p.created_at DESC';

        // Get purchases
        const result = await db.query(query, params);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching purchases:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch purchases'
        });
    }
};

// Get purchase by ID
const getPurchaseById = async (req, res) => {
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

        // Get purchase with items
        const result = await db.query(
            `SELECT p.*, s.name as supplier_name, s.email as supplier_email,
            u.name as user_name, u.email as user_email,
            json_agg(json_build_object(
                'id', pi.id,
                'product_id', pi.product_id,
                'product_name', pr.name,
                'quantity', pi.quantity,
                'unit_price', pi.unit_price,
                'total', pi.quantity * pi.unit_price
            )) as items
            FROM purchases p
            JOIN suppliers s ON p.supplier_id = s.id
            JOIN users u ON p.user_id = u.id
            JOIN purchase_items pi ON p.id = pi.purchase_id
            JOIN products pr ON pi.product_id = pr.id
            WHERE p.id = $1 AND p.store_id = $2
            GROUP BY p.id, s.name, s.email, u.name, u.email`,
            [id, store_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Purchase not found'
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching purchase:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch purchase'
        });
    }
};

// Update purchase
const updatePurchase = async (req, res) => {
    const { store_id, id } = req.params;
    const { supplier_id, items, notes } = req.body;
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

        // Check if supplier exists and belongs to the store
        if (supplier_id) {
            const supplierCheck = await db.query(
                'SELECT id FROM suppliers WHERE id = $1 AND store_id = $2',
                [supplier_id, store_id]
            );

            if (supplierCheck.rows.length === 0) {
                return res.status(400).json({
                    error: 'Invalid Supplier',
                    message: 'The specified supplier does not exist in this store'
                });
            }
        }

        // Start transaction
        await db.query('BEGIN');

        try {
            // Update purchase
            const updateQuery = `
                UPDATE purchases 
                SET supplier_id = COALESCE($1, supplier_id),
                    notes = COALESCE($2, notes),
                    updated_at = NOW()
                WHERE id = $3 AND store_id = $4
                RETURNING *
            `;
            const purchaseResult = await db.query(updateQuery, [supplier_id, notes, id, store_id]);

            if (purchaseResult.rows.length === 0) {
                throw new Error('Purchase not found');
            }

            // If items are provided, update them
            if (items) {
                // Get current items
                const currentItems = await db.query(
                    'SELECT * FROM purchase_items WHERE purchase_id = $1',
                    [id]
                );

                // Update or add new items
                for (const item of items) {
                    const existingItem = currentItems.rows.find(i => i.product_id === item.product_id);

                    if (existingItem) {
                        // Update existing item
                        const quantityDiff = item.quantity - existingItem.quantity;
                        await db.query(
                            'UPDATE purchase_items SET quantity = $1, unit_price = $2 WHERE id = $3',
                            [item.quantity, item.unit_price, existingItem.id]
                        );

                        // Update product quantity
                        await db.query(
                            'UPDATE products SET quantity = quantity + $1, updated_at = NOW() WHERE id = $2',
                            [quantityDiff, item.product_id]
                        );
                    } else {
                        // Add new item
                        await db.query(
                            'INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4)',
                            [id, item.product_id, item.quantity, item.unit_price]
                        );

                        // Update product quantity
                        await db.query(
                            'UPDATE products SET quantity = quantity + $1, updated_at = NOW() WHERE id = $2',
                            [item.quantity, item.product_id]
                        );
                    }
                }

                // Remove items not in the new list
                const newProductIds = items.map(item => item.product_id);
                const itemsToRemove = currentItems.rows.filter(item => !newProductIds.includes(item.product_id));

                for (const item of itemsToRemove) {
                    await db.query(
                        'UPDATE products SET quantity = quantity - $1, updated_at = NOW() WHERE id = $2',
                        [item.quantity, item.product_id]
                    );
                    await db.query('DELETE FROM purchase_items WHERE id = $1', [item.id]);
                }
            }

            // Commit transaction
            await db.query('COMMIT');

            // Get updated purchase with items
            const result = await db.query(
                `SELECT p.*, s.name as supplier_name, s.email as supplier_email,
                json_agg(json_build_object(
                    'id', pi.id,
                    'product_id', pi.product_id,
                    'product_name', pr.name,
                    'quantity', pi.quantity,
                    'unit_price', pi.unit_price,
                    'total', pi.quantity * pi.unit_price
                )) as items
                FROM purchases p
                JOIN suppliers s ON p.supplier_id = s.id
                JOIN purchase_items pi ON p.id = pi.purchase_id
                JOIN products pr ON pi.product_id = pr.id
                WHERE p.id = $1
                GROUP BY p.id, s.name, s.email`,
                [id]
            );

            res.json(result.rows[0]);
        } catch (error) {
            // Rollback transaction on error
            await db.query('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Error updating purchase:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to update purchase'
        });
    }
};

// Delete purchase
const deletePurchase = async (req, res) => {
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

        // Start transaction
        await db.query('BEGIN');

        try {
            // Get purchase items
            const items = await db.query(
                'SELECT * FROM purchase_items WHERE purchase_id = $1',
                [id]
            );

            // Update product quantities
            for (const item of items.rows) {
                await db.query(
                    'UPDATE products SET quantity = quantity - $1, updated_at = NOW() WHERE id = $2',
                    [item.quantity, item.product_id]
                );
            }

            // Delete purchase items
            await db.query('DELETE FROM purchase_items WHERE purchase_id = $1', [id]);

            // Delete purchase
            const result = await db.query(
                'DELETE FROM purchases WHERE id = $1 AND store_id = $2 RETURNING *',
                [id, store_id]
            );

            if (result.rows.length === 0) {
                throw new Error('Purchase not found');
            }

            // Commit transaction
            await db.query('COMMIT');

            res.json({ message: 'Purchase deleted successfully' });
        } catch (error) {
            // Rollback transaction on error
            await db.query('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Error deleting purchase:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to delete purchase'
        });
    }
};

// Get purchase items
const getPurchaseItems = async (req, res) => {
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

        // Get purchase items
        const result = await db.query(
            `SELECT pi.*, p.name as product_name, p.sku, p.barcode
            FROM purchase_items pi
            JOIN products p ON pi.product_id = p.id
            WHERE pi.purchase_id = $1 AND p.store_id = $2`,
            [id, store_id]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching purchase items:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch purchase items'
        });
    }
};

module.exports = {
    createPurchase,
    getPurchases,
    getPurchaseById,
    updatePurchase,
    deletePurchase,
    getPurchaseItems
}; 