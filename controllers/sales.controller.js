const db = require('../config/db');

// Create a new sale
const createSale = async (req, res) => {
    const { store_id } = req.params;
    const { customer_id, items, payment_method, notes } = req.body;
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

        // Check if customer exists and belongs to the store
        if (customer_id) {
            const customerCheck = await db.query(
                'SELECT id FROM customers WHERE id = $1 AND store_id = $2',
                [customer_id, store_id]
            );

            if (customerCheck.rows.length === 0) {
                return res.status(400).json({
                    error: 'Invalid Customer',
                    message: 'The specified customer does not exist in this store'
                });
            }
        }

        // Start transaction
        await db.query('BEGIN');

        try {
            // Create sale
            const saleResult = await db.query(
                'INSERT INTO sales (store_id, customer_id, user_id, payment_method, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                [store_id, customer_id, user_id, payment_method, notes]
            );

            const sale = saleResult.rows[0];

            // Add sale items and update product quantities
            for (const item of items) {
                // Check if product exists and belongs to the store
                const productCheck = await db.query(
                    'SELECT id, quantity, price FROM products WHERE id = $1 AND store_id = $2',
                    [item.product_id, store_id]
                );

                if (productCheck.rows.length === 0) {
                    throw new Error(`Product with ID ${item.product_id} not found in store`);
                }

                const product = productCheck.rows[0];

                // Check if there's enough stock
                if (product.quantity < item.quantity) {
                    throw new Error(`Not enough stock for product ${product.name}`);
                }

                // Add sale item
                await db.query(
                    'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4)',
                    [sale.id, item.product_id, item.quantity, product.price]
                );

                // Update product quantity
                await db.query(
                    'UPDATE products SET quantity = quantity - $1, updated_at = NOW() WHERE id = $2',
                    [item.quantity, item.product_id]
                );
            }

            // Commit transaction
            await db.query('COMMIT');

            // Get sale with items
            const result = await db.query(
                `SELECT s.*, c.name as customer_name, c.email as customer_email,
                u.name as user_name, u.email as user_email,
                json_agg(json_build_object(
                    'id', si.id,
                    'product_id', si.product_id,
                    'product_name', p.name,
                    'quantity', si.quantity,
                    'unit_price', si.unit_price,
                    'total', si.quantity * si.unit_price
                )) as items
                FROM sales s
                LEFT JOIN customers c ON s.customer_id = c.id
                JOIN users u ON s.user_id = u.id
                JOIN sale_items si ON s.id = si.sale_id
                JOIN products p ON si.product_id = p.id
                WHERE s.id = $1
                GROUP BY s.id, c.name, c.email, u.name, u.email`,
                [sale.id]
            );

            res.status(201).json(result.rows[0]);
        } catch (error) {
            // Rollback transaction on error
            await db.query('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Error creating sale:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to create sale'
        });
    }
};

// Get all sales for a store
const getSales = async (req, res) => {
    const { store_id } = req.params;
    const user_id = req.user.id;
    const { customer_id, start_date, end_date, payment_method } = req.query;

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
            SELECT s.*, c.name as customer_name, c.email as customer_email,
            u.name as user_name, u.email as user_email,
            COALESCE(SUM(si.quantity * si.unit_price), 0) as total_amount
            FROM sales s
            LEFT JOIN customers c ON s.customer_id = c.id
            JOIN users u ON s.user_id = u.id
            LEFT JOIN sale_items si ON s.id = si.sale_id
            WHERE s.store_id = $1
        `;
        const params = [store_id];
        let paramIndex = 2;

        if (customer_id) {
            query += ` AND s.customer_id = $${paramIndex}`;
            params.push(customer_id);
            paramIndex++;
        }

        if (start_date) {
            query += ` AND s.created_at >= $${paramIndex}`;
            params.push(start_date);
            paramIndex++;
        }

        if (end_date) {
            query += ` AND s.created_at <= $${paramIndex}`;
            params.push(end_date);
            paramIndex++;
        }

        if (payment_method) {
            query += ` AND s.payment_method = $${paramIndex}`;
            params.push(payment_method);
            paramIndex++;
        }

        query += ' GROUP BY s.id, c.name, c.email, u.name, u.email ORDER BY s.created_at DESC';

        // Get sales
        const result = await db.query(query, params);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching sales:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch sales'
        });
    }
};

// Get sale by ID
const getSaleById = async (req, res) => {
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

        // Get sale with items
        const result = await db.query(
            `SELECT s.*, c.name as customer_name, c.email as customer_email,
            u.name as user_name, u.email as user_email,
            json_agg(json_build_object(
                'id', si.id,
                'product_id', si.product_id,
                'product_name', p.name,
                'quantity', si.quantity,
                'unit_price', si.unit_price,
                'total', si.quantity * si.unit_price
            )) as items
            FROM sales s
            LEFT JOIN customers c ON s.customer_id = c.id
            JOIN users u ON s.user_id = u.id
            JOIN sale_items si ON s.id = si.sale_id
            JOIN products p ON si.product_id = p.id
            WHERE s.id = $1 AND s.store_id = $2
            GROUP BY s.id, c.name, c.email, u.name, u.email`,
            [id, store_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Sale not found'
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching sale:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch sale'
        });
    }
};

// Update sale
const updateSale = async (req, res) => {
    const { store_id, id } = req.params;
    const { customer_id, items, payment_method, notes } = req.body;
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

        // Check if customer exists and belongs to the store
        if (customer_id) {
            const customerCheck = await db.query(
                'SELECT id FROM customers WHERE id = $1 AND store_id = $2',
                [customer_id, store_id]
            );

            if (customerCheck.rows.length === 0) {
                return res.status(400).json({
                    error: 'Invalid Customer',
                    message: 'The specified customer does not exist in this store'
                });
            }
        }

        // Start transaction
        await db.query('BEGIN');

        try {
            // Update sale
            const updateQuery = `
                UPDATE sales 
                SET customer_id = COALESCE($1, customer_id),
                    payment_method = COALESCE($2, payment_method),
                    notes = COALESCE($3, notes),
                    updated_at = NOW()
                WHERE id = $4 AND store_id = $5
                RETURNING *
            `;
            const saleResult = await db.query(updateQuery, [customer_id, payment_method, notes, id, store_id]);

            if (saleResult.rows.length === 0) {
                throw new Error('Sale not found');
            }

            // If items are provided, update them
            if (items) {
                // Get current items
                const currentItems = await db.query(
                    'SELECT * FROM sale_items WHERE sale_id = $1',
                    [id]
                );

                // Update or add new items
                for (const item of items) {
                    const existingItem = currentItems.rows.find(i => i.product_id === item.product_id);

                    if (existingItem) {
                        // Update existing item
                        const quantityDiff = item.quantity - existingItem.quantity;
                        await db.query(
                            'UPDATE sale_items SET quantity = $1 WHERE id = $2',
                            [item.quantity, existingItem.id]
                        );

                        // Update product quantity
                        await db.query(
                            'UPDATE products SET quantity = quantity - $1, updated_at = NOW() WHERE id = $2',
                            [quantityDiff, item.product_id]
                        );
                    } else {
                        // Add new item
                        await db.query(
                            'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4)',
                            [id, item.product_id, item.quantity, item.unit_price]
                        );

                        // Update product quantity
                        await db.query(
                            'UPDATE products SET quantity = quantity - $1, updated_at = NOW() WHERE id = $2',
                            [item.quantity, item.product_id]
                        );
                    }
                }

                // Remove items not in the new list
                const newProductIds = items.map(item => item.product_id);
                const itemsToRemove = currentItems.rows.filter(item => !newProductIds.includes(item.product_id));

                for (const item of itemsToRemove) {
                    await db.query(
                        'UPDATE products SET quantity = quantity + $1, updated_at = NOW() WHERE id = $2',
                        [item.quantity, item.product_id]
                    );
                    await db.query('DELETE FROM sale_items WHERE id = $1', [item.id]);
                }
            }

            // Commit transaction
            await db.query('COMMIT');

            // Get updated sale with items
            const result = await db.query(
                `SELECT s.*, c.name as customer_name, c.email as customer_email,
                json_agg(json_build_object(
                    'id', si.id,
                    'product_id', si.product_id,
                    'product_name', p.name,
                    'quantity', si.quantity,
                    'unit_price', si.unit_price,
                    'total', si.quantity * si.unit_price
                )) as items
                FROM sales s
                LEFT JOIN customers c ON s.customer_id = c.id
                JOIN sale_items si ON s.id = si.sale_id
                JOIN products p ON si.product_id = p.id
                WHERE s.id = $1
                GROUP BY s.id, c.name, c.email`,
                [id]
            );

            res.json(result.rows[0]);
        } catch (error) {
            // Rollback transaction on error
            await db.query('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Error updating sale:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to update sale'
        });
    }
};

// Delete sale
const deleteSale = async (req, res) => {
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
            // Get sale items
            const items = await db.query(
                'SELECT * FROM sale_items WHERE sale_id = $1',
                [id]
            );

            // Update product quantities
            for (const item of items.rows) {
                await db.query(
                    'UPDATE products SET quantity = quantity + $1, updated_at = NOW() WHERE id = $2',
                    [item.quantity, item.product_id]
                );
            }

            // Delete sale items
            await db.query('DELETE FROM sale_items WHERE sale_id = $1', [id]);

            // Delete sale
            const result = await db.query(
                'DELETE FROM sales WHERE id = $1 AND store_id = $2 RETURNING *',
                [id, store_id]
            );

            if (result.rows.length === 0) {
                throw new Error('Sale not found');
            }

            // Commit transaction
            await db.query('COMMIT');

            res.json({ message: 'Sale deleted successfully' });
        } catch (error) {
            // Rollback transaction on error
            await db.query('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Error deleting sale:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to delete sale'
        });
    }
};

// Get sale items
const getSaleItems = async (req, res) => {
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

        // Get sale items
        const result = await db.query(
            `SELECT si.*, p.name as product_name, p.sku, p.barcode
            FROM sale_items si
            JOIN products p ON si.product_id = p.id
            WHERE si.sale_id = $1 AND p.store_id = $2`,
            [id, store_id]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching sale items:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch sale items'
        });
    }
};

// Get sales report
const getSalesReport = async (req, res) => {
    const { store_id } = req.params;
    const user_id = req.user.id;
    const { start_date, end_date, group_by } = req.query;

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

        // Build query based on grouping
        let query;
        const params = [store_id];
        let paramIndex = 2;

        if (group_by === 'day') {
            query = `
                SELECT DATE(s.created_at) as date,
                COUNT(*) as total_sales,
                SUM(si.quantity * si.unit_price) as total_revenue,
                SUM(si.quantity) as total_items_sold
                FROM sales s
                JOIN sale_items si ON s.id = si.sale_id
                WHERE s.store_id = $1
            `;
        } else if (group_by === 'product') {
            query = `
                SELECT p.id, p.name,
                COUNT(DISTINCT s.id) as total_sales,
                SUM(si.quantity) as total_quantity_sold,
                SUM(si.quantity * si.unit_price) as total_revenue
                FROM products p
                JOIN sale_items si ON p.id = si.product_id
                JOIN sales s ON si.sale_id = s.id
                WHERE p.store_id = $1
                GROUP BY p.id, p.name
            `;
        } else if (group_by === 'category') {
            query = `
                SELECT c.id, c.name,
                COUNT(DISTINCT s.id) as total_sales,
                SUM(si.quantity) as total_quantity_sold,
                SUM(si.quantity * si.unit_price) as total_revenue
                FROM categories c
                JOIN products p ON c.id = p.category_id
                JOIN sale_items si ON p.id = si.product_id
                JOIN sales s ON si.sale_id = s.id
                WHERE c.store_id = $1
                GROUP BY c.id, c.name
            `;
        } else {
            query = `
                SELECT COUNT(*) as total_sales,
                SUM(si.quantity * si.unit_price) as total_revenue,
                SUM(si.quantity) as total_items_sold,
                AVG(si.quantity * si.unit_price) as average_sale_amount
                FROM sales s
                JOIN sale_items si ON s.id = si.sale_id
                WHERE s.store_id = $1
            `;
        }

        if (start_date) {
            query += ` AND s.created_at >= $${paramIndex}`;
            params.push(start_date);
            paramIndex++;
        }

        if (end_date) {
            query += ` AND s.created_at <= $${paramIndex}`;
            params.push(end_date);
            paramIndex++;
        }

        if (group_by === 'day') {
            query += ' GROUP BY DATE(s.created_at) ORDER BY date DESC';
        }

        // Get report
        const result = await db.query(query, params);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching sales report:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch sales report'
        });
    }
};

module.exports = {
    createSale,
    getSales,
    getSaleById,
    updateSale,
    deleteSale,
    getSaleItems,
    getSalesReport
}; 