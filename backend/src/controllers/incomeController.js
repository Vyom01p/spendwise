const pool = require('../config/db');

const COLS = 'income_id, amount, income_date, source, notes, created_at';

function buildFilter(req) {
  const { from, to, search } = req.query;
  const where = ['user_id = ?'];
  const params = [req.user.id];
  if (from) { where.push('income_date >= ?'); params.push(from); }
  if (to) { where.push('income_date <= ?'); params.push(to); }
  if (search) { where.push('(source LIKE ? OR notes LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
  return { whereSql: where.join(' AND '), params };
}

exports.list = async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const { whereSql, params } = buildFilter(req);
  const [[agg]] = await pool.query(
    `SELECT COUNT(*) AS total, COALESCE(SUM(amount), 0) AS total_amount FROM income WHERE ${whereSql}`, params);
  const [rows] = await pool.query(
    `SELECT ${COLS} FROM income WHERE ${whereSql} ORDER BY income_date DESC, income_id DESC LIMIT ? OFFSET ?`,
    [...params, limit, (page - 1) * limit]);
  res.json({
    income: rows,
    total_amount: Number(agg.total_amount),
    pagination: { page, limit, total: agg.total, pages: Math.max(Math.ceil(agg.total / limit), 1) },
  });
};

exports.create = async (req, res) => {
  const { amount, income_date, source, notes } = req.body;
  const [r] = await pool.query(
    'INSERT INTO income (user_id, amount, income_date, source, notes) VALUES (?, ?, ?, ?, ?)',
    [req.user.id, amount, income_date, source || 'Other', notes || null]);
  const [rows] = await pool.query(`SELECT ${COLS} FROM income WHERE income_id = ?`, [r.insertId]);
  res.status(201).json({ income: rows[0] });
};

exports.update = async (req, res) => {
  const { amount, income_date, source, notes } = req.body;
  const [r] = await pool.query(
    'UPDATE income SET amount = ?, income_date = ?, source = ?, notes = ? WHERE income_id = ? AND user_id = ?',
    [amount, income_date, source || 'Other', notes || null, Number(req.params.id), req.user.id]);
  if (r.affectedRows === 0) return res.status(404).json({ message: 'Income entry not found' });
  const [rows] = await pool.query(`SELECT ${COLS} FROM income WHERE income_id = ?`, [Number(req.params.id)]);
  res.json({ income: rows[0] });
};

exports.remove = async (req, res) => {
  const [r] = await pool.query('DELETE FROM income WHERE income_id = ? AND user_id = ?', [Number(req.params.id), req.user.id]);
  if (r.affectedRows === 0) return res.status(404).json({ message: 'Income entry not found' });
  res.json({ message: 'Income entry deleted' });
};
