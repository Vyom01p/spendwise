const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const signToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });

// POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { full_name, email, password } = req.body;

    // Parameterized query (?) -> safe from SQL injection
    const [existing] = await pool.query('SELECT user_id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Email is already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)',
      [full_name, email, passwordHash]
    );

    res.status(201).json({
      token: signToken(result.insertId),
      user: { user_id: result.insertId, full_name, email },
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Email is already registered' });
    }
    next(err);
  }
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const [rows] = await pool.query(
      'SELECT user_id, full_name, email, password_hash, status FROM users WHERE email = ?',
      [email]
    );
    const user = rows[0];

    // Same message for unknown email and wrong password (no account enumeration)
    const invalid = () => res.status(401).json({ message: 'Invalid email or password' });
    if (!user || user.status !== 'Active') return invalid();
    if (!(await bcrypt.compare(password, user.password_hash))) return invalid();

    res.json({
      token: signToken(user.user_id),
      user: { user_id: user.user_id, full_name: user.full_name, email: user.email },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
exports.me = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT user_id, full_name, email, created_at, status FROM users WHERE user_id = ?',
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json({ user: rows[0] });
  } catch (err) {
    next(err);
  }
};

// PUT /api/auth/me  -> update name and/or password
exports.updateProfile = async (req, res, next) => {
  try {
    const { full_name, current_password, new_password } = req.body;

    if (new_password) {
      const [rows] = await pool.query('SELECT password_hash FROM users WHERE user_id = ?', [req.user.id]);
      if (!rows[0] || !(await bcrypt.compare(current_password || '', rows[0].password_hash))) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
      const hash = await bcrypt.hash(new_password, 10);
      await pool.query('UPDATE users SET password_hash = ? WHERE user_id = ?', [hash, req.user.id]);
    }
    if (full_name) {
      await pool.query('UPDATE users SET full_name = ? WHERE user_id = ?', [full_name, req.user.id]);
    }

    const [rows] = await pool.query(
      'SELECT user_id, full_name, email, created_at, status FROM users WHERE user_id = ?',
      [req.user.id]
    );
    res.json({ user: rows[0], message: 'Profile updated' });
  } catch (err) {
    next(err);
  }
};
