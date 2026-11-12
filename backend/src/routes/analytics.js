const express = require('express');
const { query } = require('express-validator');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const autoRecurring = require('../middleware/autoRecurring');
const { summary } = require('../controllers/analyticsController');

const router = express.Router();
router.use(auth, autoRecurring);

router.get('/summary',
  query('month').optional().matches(/^\d{4}-(0[1-9]|1[0-2])$/).withMessage('Month must look like 2026-11'),
  validate, summary);

module.exports = router;
