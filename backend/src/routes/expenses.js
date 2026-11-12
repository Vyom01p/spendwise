const express = require('express');
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const autoRecurring = require('../middleware/autoRecurring');
const e = require('../controllers/expenseController');

const router = express.Router();
router.use(auth, autoRecurring);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const expenseRules = [
  body('category_id').isInt({ min: 1 }).withMessage('Choose a category').toInt(),
  body('amount').isFloat({ gt: 0, max: 99999999.99 }).withMessage('Amount must be greater than 0').toFloat(),
  body('expense_date').matches(DATE_RE).isISO8601({ strict: true }).withMessage('Enter a valid date'),
  body('description').optional({ values: 'null' }).isString().isLength({ max: 1000 })
    .withMessage('Description is too long'),
];
const listRules = [
  query('from').optional({ values: 'falsy' }).matches(DATE_RE).isISO8601({ strict: true }).withMessage('Invalid "from" date'),
  query('to').optional({ values: 'falsy' }).matches(DATE_RE).isISO8601({ strict: true }).withMessage('Invalid "to" date'),
  query('category_id').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('Invalid category'),
];
const idRule = param('id').isInt({ min: 1 }).withMessage('Invalid expense id');

router.get('/', listRules, validate, e.list);
router.get('/export', listRules, validate, e.exportCsv);
router.post('/', expenseRules, validate, e.create);
router.put('/:id', idRule, expenseRules, validate, e.update);
router.delete('/:id', idRule, validate, e.remove);

module.exports = router;
