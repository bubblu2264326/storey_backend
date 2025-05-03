const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middlewares/auth');
const { validateCategory, validate } = require('../utils/validators');
const {
    createCategory,
    getCategories,
    getCategoryById,
    updateCategory,
    deleteCategory
} = require('../controllers/category.controller');

// Apply auth middleware to all routes
router.use(auth);

// Create category (admin/manager only)
router.post('/stores/:store_id/categories', requireRole(['admin', 'manager']), validateCategory, validate, createCategory);

// Get all categories for a store
router.get('/stores/:store_id/categories', getCategories);

// Get category by ID
router.get('/stores/:store_id/categories/:id', getCategoryById);

// Update category (admin/manager only)
router.put('/stores/:store_id/categories/:id', requireRole(['admin', 'manager']), validateCategory, validate, updateCategory);

// Delete category (admin/manager only)
router.delete('/stores/:store_id/categories/:id', requireRole(['admin', 'manager']), deleteCategory);

module.exports = router; 