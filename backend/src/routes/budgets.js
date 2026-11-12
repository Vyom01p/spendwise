const express = require('express');
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const autoRecurring = require('../middleware/autoRecurring');
const b = require('../controllers/budgetController');

const router = express.Router();
router.use(auth, autoRecurring);

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

router.get('/',
  query('month').optional().matches(MONTH_RE).withMessage('Month must look like 2026-11'),
  validate, b.get);

router.put('/', [
  body('month_year').matches(MONTH_RE).withMessage('Month must look like 2026-11'),
  body('category_id').optional({ values: 'null' }).isInt({ min: 1 }).withMessage('Invalid category').toInt(),
  body('budget_cap').isFloat({ gt: 0, max: 99999999.99 }).withMessage('Budget must be greater than 0').toFloat(),
], validate, b.upsert);

router.post('/copy', [
  body('from_month').matches(MONTH_RE).withMessage('Invalid source month'),
  body('to_month').matches(MONTH_RE).withMessage('Invalid target month'),
], validate, b.copy);

router.delete('/:id', param('id').isInt({ min: 1 }), validate, b.remove);

module.exports = router;
