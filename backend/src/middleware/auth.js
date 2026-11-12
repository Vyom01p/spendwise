const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// Protects routes: requires "Authorization: Bearer <token>".
// Also re-checks the account in the database, so a deactivated or deleted user
// is locked out immediately instead of when their token expires.
module.exports = async (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
  try {
    const [rows] = await pool.query('SELECT status, role FROM users WHERE user_id = ?', [payload.userId]);
    if (!rows[0] || rows[0].status !== 'Active') {
      return res.status(401).json({ message: 'This account is not active' });
    }
    req.user = { id: payload.userId, role: rows[0].role };
    next();
  } catch (err) {
    next(err);
  }
};
