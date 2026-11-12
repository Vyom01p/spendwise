const pool = require('../config/db');
const { currentMonth, getBudgetStatus } = require('../services/budgetService');

// GET /api/budgets?month=YYYY-MM -> overall + per-category caps with usage %
exports.get = async (req, res, next) => {
  try {
    const month = req.query.month || currentMonth();
    res.json(await getBudgetStatus(req.user.id, month));
  } catch (err) {
    next(err);
  }
};

// PUT /api/budgets  { month_year, category_id (null = overall), budget_cap }
// Creates the budget, or updates it if one already exists for that month/category.
exports.upsert = async (req, res, next) => {
  try {
    const { month_year, budget_cap } = req.body;
    const category_id = req.body.category_id ?? null;

    if (category_id !== null) {
      const [cat] = await pool.query(
        'SELECT category_id FROM categories WHERE category_id = ? AND (user_id IS NULL OR user_id = ?)',
        [category_id, req.user.id]
      );
      if (cat.length === 0) return res.status(400).json({ message: 'Invalid category' });
    }

    // "<=>" is MySQL's NULL-safe equals, so it also matches the overall cap (NULL).
    // MySQL unique keys allow duplicate NULLs, so we enforce one-per-month here.
    const [existing] = await pool.query(
      'SELECT budget_id FROM budgets WHERE user_id = ? AND month_year = ? AND category_id <=> ?',
      [req.user.id, month_year, category_id]
    );

    if (existing.length > 0) {
      await pool.query('UPDATE budgets SET budget_cap = ? WHERE budget_id = ?', [
        budget_cap,
        existing[0].budget_id,
      ]);
    } else {
      await pool.query(
        'INSERT INTO budgets (user_id, category_id, month_year, budget_cap) VALUES (?, ?, ?, ?)',
        [req.user.id, category_id, month_year, budget_cap]
      );
    }
    res.json({ message: 'Budget saved', ...(await getBudgetStatus(req.user.id, month_year)) });
  } catch (err) {
    next(err);
  }
};

// POST /api/budgets/copy  { from_month, to_month }
// Copies every budget of from_month into to_month. Budgets already set in to_month are kept.
exports.copy = async (req, res, next) => {
  try {
    const { from_month, to_month } = req.body;
    if (from_month === to_month) {
      return res.status(400).json({ message: 'Choose two different months' });
    }
    const [result] = await pool.query(
      `INSERT INTO budgets (user_id, category_id, month_year, budget_cap)
       SELECT b.user_id, b.category_id, ?, b.budget_cap FROM budgets b
       WHERE b.user_id = ? AND b.month_year = ?
         AND NOT EXISTS (SELECT 1 FROM budgets x
                         WHERE x.user_id = b.user_id AND x.month_year = ? AND x.category_id <=> b.category_id)`,
      [to_month, req.user.id, from_month, to_month]
    );
    res.json({ copied: result.affectedRows, ...(await getBudgetStatus(req.user.id, to_month)) });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/budgets/:id
exports.remove = async (req, res, next) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM budgets WHERE budget_id = ? AND user_id = ?',
      [Number(req.params.id), req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Budget not found' });
    res.json({ message: 'Budget removed' });
  } catch (err) {
    next(err);
  }
};
