const pool = require('../config/db');
const { runRecurring, nextDue } = require('../services/recurringService');

async function categoryUsable(userId, categoryId) {
  const [rows] = await pool.query(
    'SELECT category_id FROM categories WHERE category_id = ? AND (user_id IS NULL OR user_id = ?)', [categoryId, userId]);
  return rows.length > 0;
}

async function getRule(userId, id) {
  const [rows] = await pool.query(
    `SELECT r.*, c.category_name FROM recurring_expenses r
     JOIN categories c ON c.category_id = r.category_id
     WHERE r.recurring_id = ? AND r.user_id = ?`, [id, userId]);
  if (!rows[0]) return null;
  const r = rows[0];
  return { ...r, is_active: !!r.is_active, next_due: r.is_active ? nextDue(r) : null };
}

exports.list = async (req, res) => {
  const [rows] = await pool.query(
    `SELECT r.*, c.category_name FROM recurring_expenses r
     JOIN categories c ON c.category_id = r.category_id
     WHERE r.user_id = ? ORDER BY r.is_active DESC, r.day_of_month, r.recurring_id`, [req.user.id]);
  res.json({
    rules: rows.map((r) => ({ ...r, is_active: !!r.is_active, next_due: r.is_active ? nextDue(r) : null })),
  });
};

exports.create = async (req, res) => {
  const { category_id, amount, description, day_of_month, start_date } = req.body;
  if (!(await categoryUsable(req.user.id, category_id))) return res.status(400).json({ message: 'Invalid category' });
  const [r] = await pool.query(
    `INSERT INTO recurring_expenses (user_id, category_id, amount, description, day_of_month, start_date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [req.user.id, category_id, amount, description || null, day_of_month, start_date]);
  const added = await runRecurring(req.user.id, { force: true }); // if it's already due, add it now
  res.status(201).json({ rule: await getRule(req.user.id, r.insertId), added });
};

exports.update = async (req, res) => {
  const { category_id, amount, description, day_of_month, start_date, is_active } = req.body;
  if (!(await categoryUsable(req.user.id, category_id))) return res.status(400).json({ message: 'Invalid category' });
  const [r] = await pool.query(
    `UPDATE recurring_expenses SET category_id = ?, amount = ?, description = ?, day_of_month = ?,
            start_date = ?, is_active = ? WHERE recurring_id = ? AND user_id = ?`,
    [category_id, amount, description || null, day_of_month, start_date, is_active !== false, Number(req.params.id), req.user.id]);
  if (r.affectedRows === 0) return res.status(404).json({ message: 'Recurring expense not found' });
  await runRecurring(req.user.id, { force: true });
  res.json({ rule: await getRule(req.user.id, Number(req.params.id)) });
};

exports.remove = async (req, res) => {
  const [r] = await pool.query('DELETE FROM recurring_expenses WHERE recurring_id = ? AND user_id = ?',
    [Number(req.params.id), req.user.id]);
  if (r.affectedRows === 0) return res.status(404).json({ message: 'Recurring expense not found' });
  res.json({ message: 'Recurring expense deleted. Expenses already added are kept.' });
};
