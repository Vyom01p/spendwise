const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const autoRecurring = require('../middleware/autoRecurring');
const c = require('../controllers/recurringController');

const router = express.Router();
router.use(auth);

const rules = [
  body('category_id').isInt({ min: 1 }).withMessage('Choose a category').toInt(),
  body('amount').isFloat({ gt: 0, max: 99999999.99 }).withMessage('Amount must be greater than 0').toFloat(),
  body('description').optional({ values: 'falsy' }).isString().isLength({ max: 255 }).withMessage('Description is too long'),
  body('day_of_month').isInt({ min: 1, max: 31 }).withMessage('Day must be between 1 and 31').toInt(),
  body('start_date').matches(/^\d{4}-\d{2}-\d{2}$/).isISO8601({ strict: true }).withMessage('Enter a valid start date'),
];
const idRule = param('id').isInt({ min: 1 }).withMessage('Invalid id');

router.get('/', autoRecurring, c.list);
router.post('/', rules, validate, c.create);
router.put('/:id', idRule, rules, validate, c.update);
router.delete('/:id', idRule, validate, c.remove);
module.exports = router;
