const pool = require('../config/db');

// GET /api/categories -> system defaults + the user's own custom categories
exports.list = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT category_id, category_name, is_default
       FROM categories
       WHERE user_id IS NULL OR user_id = ?
       ORDER BY is_default DESC, category_name ASC`,
      [req.user.id]
    );
    res.json({ categories: rows.map((r) => ({ ...r, is_default: !!r.is_default })) });
  } catch (err) {
    next(err);
  }
};

// Does the user already see a category with this name (default or own)?
async function nameTaken(userId, name, ignoreId = null) {
  const [rows] = await pool.query(
    `SELECT category_id FROM categories
     WHERE LOWER(category_name) = LOWER(?) AND (user_id IS NULL OR user_id = ?)
       AND category_id <> ?`,
    [name, userId, ignoreId || 0]
  );
  return rows.length > 0;
}

// POST /api/categories
exports.create = async (req, res, next) => {
  try {
    const { category_name } = req.body;
    if (await nameTaken(req.user.id, category_name)) {
      return res.status(409).json({ message: 'A category with this name already exists' });
    }
    const [result] = await pool.query(
      'INSERT INTO categories (user_id, category_name, is_default) VALUES (?, ?, FALSE)',
      [req.user.id, category_name]
    );
    res.status(201).json({
      category: { category_id: result.insertId, category_name, is_default: false },
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/categories/:id  (custom categories only)
exports.update = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { category_name } = req.body;
    if (await nameTaken(req.user.id, category_name, id)) {
      return res.status(409).json({ message: 'A category with this name already exists' });
    }
    const [result] = await pool.query(
      'UPDATE categories SET category_name = ? WHERE category_id = ? AND user_id = ?',
      [category_name, id, req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Custom category not found' });
    }
    res.json({ category: { category_id: id, category_name, is_default: false } });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/categories/:id  (custom categories only, and only if unused)
exports.remove = async (req, res, next) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM categories WHERE category_id = ? AND user_id = ?',
      [Number(req.params.id), req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Custom category not found' });
    }
    res.json({ message: 'Category deleted' });
  } catch (err) {
    // FK RESTRICT: expenses still use this category
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({
        message: 'This category is still used by expenses or recurring expenses. Move or delete them first.',
      });
    }
    next(err);
  }
};
