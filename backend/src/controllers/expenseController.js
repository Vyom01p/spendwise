const pool = require('../config/db');
const { getAlerts } = require('../services/budgetService');

// A category is usable if it is a system default or owned by the user.
async function categoryUsable(userId, categoryId) {
  const [rows] = await pool.query(
    'SELECT category_id FROM categories WHERE category_id = ? AND (user_id IS NULL OR user_id = ?)',
    [categoryId, userId]
  );
  return rows.length > 0;
}

const SELECT_EXPENSE = `
  SELECT e.expense_id, e.category_id, c.category_name, e.amount,
         e.expense_date, e.description, e.created_at
  FROM expenses e JOIN categories c ON c.category_id = e.category_id`;

// GET /api/expenses?from=&to=&category_id=&search=&page=&limit=
exports.list = async (req, res, next) => {
  try {
    const { from, to, category_id, search } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

    const where = ['e.user_id = ?'];
    const params = [req.user.id];
    if (from) { where.push('e.expense_date >= ?'); params.push(from); }
    if (to) { where.push('e.expense_date <= ?'); params.push(to); }
    if (category_id) { where.push('e.category_id = ?'); params.push(Number(category_id)); }
    if (search) {
      where.push('(e.description LIKE ? OR c.category_name LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    const whereSql = where.join(' AND ');

    const [[agg]] = await pool.query(
      `SELECT COUNT(*) AS total, COALESCE(SUM(e.amount), 0) AS total_amount
       FROM expenses e JOIN categories c ON c.category_id = e.category_id
       WHERE ${whereSql}`,
      params
    );

    const [rows] = await pool.query(
      `${SELECT_EXPENSE} WHERE ${whereSql}
       ORDER BY e.expense_date DESC, e.expense_id DESC LIMIT ? OFFSET ?`,
      [...params, limit, (page - 1) * limit]
    );

    res.json({
      expenses: rows,
      total_amount: Number(agg.total_amount),
      pagination: { page, limit, total: agg.total, pages: Math.max(Math.ceil(agg.total / limit), 1) },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/expenses
exports.create = async (req, res, next) => {
  try {
    const { category_id, amount, expense_date, description } = req.body;
    if (!(await categoryUsable(req.user.id, category_id))) {
      return res.status(400).json({ message: 'Invalid category' });
    }
    const [result] = await pool.query(
      `INSERT INTO expenses (user_id, category_id, amount, expense_date, description)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, category_id, amount, expense_date, description || null]
    );
    const [rows] = await pool.query(`${SELECT_EXPENSE} WHERE e.expense_id = ?`, [result.insertId]);
    const alerts = await getAlerts(req.user.id, expense_date.slice(0, 7));
    res.status(201).json({ expense: rows[0], alerts });
  } catch (err) {
    next(err);
  }
};

// PUT /api/expenses/:id
exports.update = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { category_id, amount, expense_date, description } = req.body;
    if (!(await categoryUsable(req.user.id, category_id))) {
      return res.status(400).json({ message: 'Invalid category' });
    }
    const [result] = await pool.query(
      `UPDATE expenses SET category_id = ?, amount = ?, expense_date = ?, description = ?
       WHERE expense_id = ? AND user_id = ?`,
      [category_id, amount, expense_date, description || null, id, req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    const [rows] = await pool.query(`${SELECT_EXPENSE} WHERE e.expense_id = ?`, [id]);
    const alerts = await getAlerts(req.user.id, expense_date.slice(0, 7));
    res.json({ expense: rows[0], alerts });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/expenses/:id
exports.remove = async (req, res, next) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM expenses WHERE expense_id = ? AND user_id = ?',
      [Number(req.params.id), req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    next(err);
  }
};
