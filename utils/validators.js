const { body, validationResult } = require('express-validator');

const validateSignup = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
];

const validateLogin = [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
];

const validateStore = [
    body('name').trim().notEmpty().withMessage('Store name is required'),
    body('location').trim().notEmpty().withMessage('Location is required')
];

const validateProduct = [
    body('name').trim().notEmpty().withMessage('Product name is required'),
    body('barcode').trim().notEmpty().withMessage('Barcode is required'),
    body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
    body('unit_price').isFloat({ min: 0 }).withMessage('Unit price must be a non-negative number')
];

const validateReview = [
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('review_text').trim().notEmpty().withMessage('Review text is required')
];

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

module.exports = {
    validateSignup,
    validateLogin,
    validateStore,
    validateProduct,
    validateReview,
    validate
}; 