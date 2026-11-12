const pool = require('../config/db');

exports.stats = async (req, res) => {
  const [[s]] = await pool.query(
    `SELECT (SELECT COUNT(*) FROM users) AS users,
            (SELECT COUNT(*) FROM users WHERE status = 'Active') AS active_users,
            (SELECT COUNT(*) FROM expenses) AS expenses,
            (SELECT COUNT(*) FROM users WHERE role <> 'admin'
               AND COALESCE(last_login, created_at) < DATE_SUB(NOW(), INTERVAL 90 DAY)) AS dormant_users`);
  res.json(s);
};

exports.listUsers = async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = 15;
  const like = `%${req.query.search || ''}%`;
  const [[{ total }]] = await pool.query(
    'SELECT COUNT(*) AS total FROM users WHERE full_name LIKE ? OR email LIKE ?', [like, like]);
  const [rows] = await pool.query(
    `SELECT u.user_id, u.full_name, u.email, u.role, u.status, u.created_at, u.last_login,
            (SELECT COUNT(*) FROM expenses e WHERE e.user_id = u.user_id) AS expense_count
     FROM users u WHERE u.full_name LIKE ? OR u.email LIKE ?
     ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
    [like, like, limit, (page - 1) * limit]);
  res.json({ users: rows, pagination: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) } });
};

exports.setStatus = async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) return res.status(400).json({ message: "You can't change your own status" });
  const [r] = await pool.query('UPDATE users SET status = ? WHERE user_id = ?', [req.body.status, id]);
  if (r.affectedRows === 0) return res.status(404).json({ message: 'User not found' });
  res.json({ message: `Account ${req.body.status === 'Active' ? 'activated' : 'deactivated'}` });
};

exports.removeUser = async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) return res.status(400).json({ message: "You can't delete your own account here" });
  const [r] = await pool.query('DELETE FROM users WHERE user_id = ?', [id]); // cascades to all their data
  if (r.affectedRows === 0) return res.status(404).json({ message: 'User not found' });
  res.json({ message: 'User and all their data deleted' });
};

// Deletes non-admin accounts that haven't logged in for N days (SRS: clean up inactive accounts).
exports.cleanup = async (req, res) => {
  const [r] = await pool.query(
    `DELETE FROM users WHERE role <> 'admin' AND COALESCE(last_login, created_at) < DATE_SUB(NOW(), INTERVAL ? DAY)`,
    [req.body.days]);
  res.json({ deleted: r.affectedRows });
};

// Default categories (shared by all students)
exports.listCategories = async (req, res) => {
  const [rows] = await pool.query(
    'SELECT category_id, category_name FROM categories WHERE user_id IS NULL ORDER BY category_name');
  res.json({ categories: rows });
};
async function defaultNameTaken(name, ignoreId = 0) {
  const [rows] = await pool.query(
    'SELECT category_id FROM categories WHERE user_id IS NULL AND LOWER(category_name) = LOWER(?) AND category_id <> ?',
    [name, ignoreId]);
  return rows.length > 0;
}
exports.createCategory = async (req, res) => {
  if (await defaultNameTaken(req.body.category_name)) return res.status(409).json({ message: 'A default category with this name already exists' });
  const [r] = await pool.query('INSERT INTO categories (user_id, category_name, is_default) VALUES (NULL, ?, TRUE)', [req.body.category_name]);
  res.status(201).json({ category: { category_id: r.insertId, category_name: req.body.category_name } });
};
exports.updateCategory = async (req, res) => {
  const id = Number(req.params.id);
  if (await defaultNameTaken(req.body.category_name, id)) return res.status(409).json({ message: 'A default category with this name already exists' });
  const [r] = await pool.query('UPDATE categories SET category_name = ? WHERE category_id = ? AND user_id IS NULL', [req.body.category_name, id]);
  if (r.affectedRows === 0) return res.status(404).json({ message: 'Default category not found' });
  res.json({ category: { category_id: id, category_name: req.body.category_name } });
};
exports.removeCategory = async (req, res) => {
  try {
    const [r] = await pool.query('DELETE FROM categories WHERE category_id = ? AND user_id IS NULL', [Number(req.params.id)]);
    if (r.affectedRows === 0) return res.status(404).json({ message: 'Default category not found' });
    res.json({ message: 'Category deleted' });
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2') return res.status(409).json({ message: 'Students are still using this category' });
    throw err;
  }
};
