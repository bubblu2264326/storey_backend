const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middlewares/auth');
const { validatePurchase, validate } = require('../utils/validators');
const {
    createPurchase,
    getPurchases,
    getPurchaseById,
    updatePurchase,
    deletePurchase,
    getPurchaseItems
} = require('../controllers/purchase.controller');

// Apply auth middleware to all routes
router.use(auth);

// Create purchase (admin/manager only)
router.post('/stores/:store_id/purchases', requireRole(['admin', 'manager']), validatePurchase, validate, createPurchase);

// Get all purchases for a store
router.get('/stores/:store_id/purchases', getPurchases);

// Get purchase by ID
router.get('/stores/:store_id/purchases/:id', getPurchaseById);

// Update purchase (admin/manager only)
router.put('/stores/:store_id/purchases/:id', requireRole(['admin', 'manager']), validatePurchase, validate, updatePurchase);

// Delete purchase (admin/manager only)
router.delete('/stores/:store_id/purchases/:id', requireRole(['admin', 'manager']), deletePurchase);

// Get purchase items
router.get('/stores/:store_id/purchases/:id/items', getPurchaseItems);

module.exports = router; 