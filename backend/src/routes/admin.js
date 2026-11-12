const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const c = require('../controllers/adminController');

const router = express.Router();
router.use(auth, requireAdmin);

const idRule = param('id').isInt({ min: 1 }).withMessage('Invalid id');
const nameRule = body('category_name').trim().notEmpty().withMessage('Category name is required')
  .isLength({ max: 50 }).withMessage('Category name must be at most 50 characters');

router.get('/stats', c.stats);
router.get('/users', c.listUsers);
router.patch('/users/:id', idRule, body('status').isIn(['Active', 'Inactive']).withMessage('Invalid status'), validate, c.setStatus);
router.delete('/users/:id', idRule, validate, c.removeUser);
router.post('/cleanup', body('days').isInt({ min: 30, max: 3650 }).withMessage('Choose between 30 and 3650 days').toInt(), validate, c.cleanup);
router.get('/categories', c.listCategories);
router.post('/categories', nameRule, validate, c.createCategory);
router.put('/categories/:id', idRule, nameRule, validate, c.updateCategory);
router.delete('/categories/:id', idRule, validate, c.removeCategory);
module.exports = router;
