const express = require('express');
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const c = require('../controllers/incomeController');

const router = express.Router();
router.use(auth);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const rules = [
  body('amount').isFloat({ gt: 0, max: 99999999.99 }).withMessage('Amount must be greater than 0').toFloat(),
  body('income_date').matches(DATE_RE).isISO8601({ strict: true }).withMessage('Enter a valid date'),
  body('source').optional({ values: 'falsy' }).trim().isLength({ max: 100 }).withMessage('Source is too long'),
  body('notes').optional({ values: 'null' }).isString().isLength({ max: 1000 }).withMessage('Notes are too long'),
];
const listRules = [
  query('from').optional({ values: 'falsy' }).matches(DATE_RE).isISO8601({ strict: true }).withMessage('Invalid "from" date'),
  query('to').optional({ values: 'falsy' }).matches(DATE_RE).isISO8601({ strict: true }).withMessage('Invalid "to" date'),
];
const idRule = param('id').isInt({ min: 1 }).withMessage('Invalid id');

router.get('/', listRules, validate, c.list);
router.post('/', rules, validate, c.create);
router.put('/:id', idRule, rules, validate, c.update);
router.delete('/:id', idRule, validate, c.remove);
module.exports = router;
