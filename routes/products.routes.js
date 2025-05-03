const express = require('express');
const router = express.Router();
const productsController = require('../controllers/products.controller');
const { auth, requireRole } = require('../middlewares/auth');

// Apply authentication middleware to all routes
router.use(auth);

// Get all products for a store
router.get('/stores/:store_id', requireRole(['admin', 'manager', 'staff']), productsController.getProducts);

// Get a single product
router.get('/stores/:store_id/:id', requireRole(['admin', 'manager', 'staff']), productsController.getProductById);

// Create a new product
router.post('/stores/:store_id', requireRole(['admin', 'manager']), productsController.createProduct);

// Update a product
router.put('/stores/:store_id/:id', requireRole(['admin', 'manager']), productsController.updateProduct);

// Delete a product
router.delete('/stores/:store_id/:id', requireRole(['admin']), productsController.deleteProduct);

// Add a review to a product
router.post('/stores/:store_id/:id/reviews', requireRole(['admin', 'manager', 'staff']), productsController.addReview);

// Get reviews for a product
router.get('/stores/:store_id/:id/reviews', requireRole(['admin', 'manager', 'staff']), productsController.getReviews);

module.exports = router;

