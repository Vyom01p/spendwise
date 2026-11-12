const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const multer = require('multer');
const { register, login, me, updateProfile, uploadAvatar, removeAvatar, forgotPassword, resetPassword } = require('../controllers/authController');

// Keep the upload in memory so we can check its real type before saving anything to disk.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1 } });

const router = express.Router();

const registerRules = [
  body('full_name').trim().notEmpty().withMessage('Full name is required')
    .isLength({ max: 100 }).withMessage('Name must be at most 100 characters'),
  body('email').trim().toLowerCase().isEmail().withMessage('Enter a valid email address')
    .isLength({ max: 150 }).withMessage('Email is too long'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];
const loginRules = [
  body('email').trim().toLowerCase().isEmail().withMessage('Enter a valid email address'),
  body('password').notEmpty().withMessage('Password is required'),
];
const profileRules = [
  body('full_name').optional().trim().notEmpty().withMessage('Full name cannot be empty')
    .isLength({ max: 100 }).withMessage('Name must be at most 100 characters'),
  body('new_password').optional({ values: 'falsy' })
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
];

router.post('/register', registerRules, validate, register);
router.post('/login', loginRules, validate, login);
router.post('/forgot', body('email').trim().toLowerCase().isEmail().withMessage('Enter a valid email address'), validate, forgotPassword);
router.post('/reset', [
  body('token').isString().isLength({ min: 20, max: 200 }).withMessage('Invalid reset link'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
], validate, resetPassword);
router.get('/me', auth, me);
router.put('/me', auth, profileRules, validate, updateProfile);
router.post('/avatar', auth, upload.single('avatar'), uploadAvatar);
router.delete('/avatar', auth, removeAvatar);

module.exports = router;
