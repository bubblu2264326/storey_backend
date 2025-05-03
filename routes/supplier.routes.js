const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middlewares/auth');
const { validateSupplier, validate } = require('../utils/validators');
const {
    createSupplier,
    getSuppliers,
    getSupplierById,
    updateSupplier,
    deleteSupplier,
    getSupplierPurchases
} = require('../controllers/supplier.controller');

// Apply auth middleware to all routes
router.use(auth);

// Create supplier (admin/manager only)
router.post('/stores/:store_id/suppliers', requireRole(['admin', 'manager']), validateSupplier, validate, createSupplier);

// Get all suppliers for a store
router.get('/stores/:store_id/suppliers', getSuppliers);

// Get supplier by ID
router.get('/stores/:store_id/suppliers/:id', getSupplierById);

// Update supplier (admin/manager only)
router.put('/stores/:store_id/suppliers/:id', requireRole(['admin', 'manager']), validateSupplier, validate, updateSupplier);

// Delete supplier (admin/manager only)
router.delete('/stores/:store_id/suppliers/:id', requireRole(['admin', 'manager']), deleteSupplier);

// Get supplier purchases
router.get('/stores/:store_id/suppliers/:id/purchases', getSupplierPurchases);

module.exports = router; 