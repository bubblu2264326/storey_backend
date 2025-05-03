const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middlewares/auth');
const { validateSale, validate } = require('../utils/validators');
const {
    createSale,
    getSales,
    getSaleById,
    updateSale,
    deleteSale,
    getSaleItems,
    getSalesReport
} = require('../controllers/sales.controller');

// Apply auth middleware to all routes
router.use(auth);

// Create sale (admin/manager/cashier only)
router.post('/stores/:store_id/sales', requireRole(['admin', 'manager', 'cashier']), validateSale, validate, createSale);

// Get all sales for a store
router.get('/stores/:store_id/sales', getSales);

// Get sale by ID
router.get('/stores/:store_id/sales/:id', getSaleById);

// Update sale (admin/manager only)
router.put('/stores/:store_id/sales/:id', requireRole(['admin', 'manager']), validateSale, validate, updateSale);

// Delete sale (admin/manager only)
router.delete('/stores/:store_id/sales/:id', requireRole(['admin', 'manager']), deleteSale);

// Get sale items
router.get('/stores/:store_id/sales/:id/items', getSaleItems);

// Get sales report
router.get('/stores/:store_id/sales/report', getSalesReport);

module.exports = router; 