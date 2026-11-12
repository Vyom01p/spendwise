const pool = require('../config/db');
const { fmt } = require('../services/recurringService');

const round2 = (n) => Math.round(n * 100) / 100;

// Adds progress numbers to a goal row.
function decorate(g) {
  const target = Number(g.target_amount);
  const saved = Number(g.saved_amount);
  const remaining = Math.max(round2(target - saved), 0);
  const completed = saved >= target;
  let months_left = null, monthly_needed = null, overdue = false;
  if (g.target_date) {
    const t = new Date(`${g.target_date}T00:00:00`);
    const n = new Date();
    overdue = g.target_date < fmt(n) && !completed;
    months_left = (t.getFullYear() - n.getFullYear()) * 12 + (t.getMonth() - n.getMonth());
    if (!completed && !overdue) monthly_needed = round2(remaining / Math.max(months_left, 1));
  }
  return {
    goal_id: g.goal_id, name: g.name, target_amount: target, saved_amount: saved,
    target_date: g.target_date, remaining, completed, overdue, months_left, monthly_needed,
    percent: Math.min(round2((saved / target) * 100), 100),
  };
}

async function getGoal(userId, id) {
  const [rows] = await pool.query('SELECT * FROM goals WHERE goal_id = ? AND user_id = ?', [id, userId]);
  return rows[0] ? decorate(rows[0]) : null;
}

exports.list = async (req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM goals WHERE user_id = ? ORDER BY (saved_amount >= target_amount), created_at DESC', [req.user.id]);
  res.json({ goals: rows.map(decorate) });
};

exports.create = async (req, res) => {
  const { name, target_amount, saved_amount, target_date } = req.body;
  const [r] = await pool.query(
    'INSERT INTO goals (user_id, name, target_amount, saved_amount, target_date) VALUES (?, ?, ?, ?, ?)',
    [req.user.id, name, target_amount, saved_amount || 0, target_date || null]);
  res.status(201).json({ goal: await getGoal(req.user.id, r.insertId) });
};

exports.update = async (req, res) => {
  const { name, target_amount, target_date } = req.body;
  const [r] = await pool.query(
    'UPDATE goals SET name = ?, target_amount = ?, target_date = ? WHERE goal_id = ? AND user_id = ?',
    [name, target_amount, target_date || null, Number(req.params.id), req.user.id]);
  if (r.affectedRows === 0) return res.status(404).json({ message: 'Goal not found' });
  res.json({ goal: await getGoal(req.user.id, Number(req.params.id)) });
};

// POST /api/goals/:id/contribute  { amount }  (negative amount = take money out)
exports.contribute = async (req, res) => {
  const id = Number(req.params.id);
  const goal = await getGoal(req.user.id, id);
  if (!goal) return res.status(404).json({ message: 'Goal not found' });
  if (goal.saved_amount + req.body.amount < 0) {
    return res.status(400).json({ message: `You only have ${goal.saved_amount} saved in this goal` });
  }
  await pool.query('UPDATE goals SET saved_amount = saved_amount + ? WHERE goal_id = ? AND user_id = ?',
    [req.body.amount, id, req.user.id]);
  res.json({ goal: await getGoal(req.user.id, id) });
};

exports.remove = async (req, res) => {
  const [r] = await pool.query('DELETE FROM goals WHERE goal_id = ? AND user_id = ?', [Number(req.params.id), req.user.id]);
  if (r.affectedRows === 0) return res.status(404).json({ message: 'Goal not found' });
  res.json({ message: 'Goal deleted' });
};
