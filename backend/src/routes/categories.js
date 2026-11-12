const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const c = require('../controllers/categoryController');

const router = express.Router();
router.use(auth);

const nameRule = body('category_name').trim().notEmpty().withMessage('Category name is required')
  .isLength({ max: 50 }).withMessage('Category name must be at most 50 characters');
const idRule = param('id').isInt({ min: 1 }).withMessage('Invalid category id');

router.get('/', c.list);
router.post('/', nameRule, validate, c.create);
router.put('/:id', idRule, nameRule, validate, c.update);
router.delete('/:id', idRule, validate, c.remove);

module.exports = router;
