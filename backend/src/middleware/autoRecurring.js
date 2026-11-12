const { runRecurring } = require('../services/recurringService');

// Before the user's data is read, add any recurring expenses that have come due.
module.exports = async (req, res, next) => {
  try {
    await runRecurring(req.user.id);
  } catch (e) {
    console.error('Recurring expenses failed:', e.message);
  }
  next();
};
