const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const c = require('../controllers/goalController');

const router = express.Router();
router.use(auth);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const idRule = param('id').isInt({ min: 1 }).withMessage('Invalid id');
const base = [
  body('name').trim().notEmpty().withMessage('Give your goal a name').isLength({ max: 100 }).withMessage('Name is too long'),
  body('target_amount').isFloat({ gt: 0, max: 99999999.99 }).withMessage('Target must be greater than 0').toFloat(),
  body('target_date').optional({ values: 'falsy' }).matches(DATE_RE).isISO8601({ strict: true }).withMessage('Enter a valid date'),
];

router.get('/', c.list);
router.post('/', base, body('saved_amount').optional({ values: 'falsy' }).isFloat({ min: 0, max: 99999999.99 })
  .withMessage('Saved amount cannot be negative').toFloat(), validate, c.create);
router.put('/:id', idRule, base, validate, c.update);
router.post('/:id/contribute', idRule,
  body('amount').isFloat({ max: 99999999.99 }).withMessage('Enter an amount').toFloat()
    .custom((v) => v !== 0).withMessage('Amount cannot be 0'),
  validate, c.contribute);
router.delete('/:id', idRule, validate, c.remove);
module.exports = router;
