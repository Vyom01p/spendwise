const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { sendMail } = require('../services/mailer');

const AVATAR_DIR = path.join(__dirname, '../../uploads/avatars');

const signToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });

// Never send password_hash to the client.
const publicUser = (r) => ({
  user_id: r.user_id,
  full_name: r.full_name,
  email: r.email,
  created_at: r.created_at,
  status: r.status,
  role: r.role,
  avatar_url: r.avatar_path ? `/uploads/avatars/${r.avatar_path}` : null,
});

async function fetchUser(userId) {
  const [rows] = await pool.query(
    'SELECT user_id, full_name, email, created_at, status, role, avatar_path FROM users WHERE user_id = ?',
    [userId]
  );
  return rows[0] ? publicUser(rows[0]) : null;
}

// POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { full_name, email, password } = req.body;
    const [existing] = await pool.query('SELECT user_id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Email is already registered' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)',
      [full_name, email, passwordHash]
    );
    res.status(201).json({ token: signToken(result.insertId), user: await fetchUser(result.insertId) });
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
      'SELECT user_id, full_name, email, created_at, status, role, avatar_path, password_hash FROM users WHERE email = ?',
      [email]
    );
    const user = rows[0];
    const invalid = () => res.status(401).json({ message: 'Invalid email or password' });
    if (!user || user.status !== 'Active') return invalid();
    if (!(await bcrypt.compare(password, user.password_hash))) return invalid();
    await pool.query('UPDATE users SET last_login = NOW() WHERE user_id = ?', [user.user_id]);
    res.json({ token: signToken(user.user_id), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
exports.me = async (req, res, next) => {
  try {
    const user = await fetchUser(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
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
    res.json({ user: await fetchUser(req.user.id), message: 'Profile updated' });
  } catch (err) {
    next(err);
  }
};

// ---------- Profile picture ----------

// Don't trust the file name or the browser's MIME type: check the real file signature.
function detectImageType(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
  return null;
}

async function deleteAvatarFile(fileName) {
  if (!fileName) return;
  try {
    await fs.promises.unlink(path.join(AVATAR_DIR, path.basename(fileName)));
  } catch (e) {
    if (e.code !== 'ENOENT') console.error('Could not delete old avatar:', e.message);
  }
}

// POST /api/auth/avatar  (multipart/form-data, field name "avatar")
exports.uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Choose an image file' });
    const ext = detectImageType(req.file.buffer);
    if (!ext) return res.status(400).json({ message: 'Only JPG, PNG or WebP images are allowed' });

    await fs.promises.mkdir(AVATAR_DIR, { recursive: true });
    const fileName = `${req.user.id}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
    await fs.promises.writeFile(path.join(AVATAR_DIR, fileName), req.file.buffer);

    const [rows] = await pool.query('SELECT avatar_path FROM users WHERE user_id = ?', [req.user.id]);
    await pool.query('UPDATE users SET avatar_path = ? WHERE user_id = ?', [fileName, req.user.id]);
    await deleteAvatarFile(rows[0]?.avatar_path);

    res.json({ user: await fetchUser(req.user.id), message: 'Profile photo updated' });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/auth/avatar
exports.removeAvatar = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT avatar_path FROM users WHERE user_id = ?', [req.user.id]);
    await pool.query('UPDATE users SET avatar_path = NULL WHERE user_id = ?', [req.user.id]);
    await deleteAvatarFile(rows[0]?.avatar_path);
    res.json({ user: await fetchUser(req.user.id), message: 'Profile photo removed' });
  } catch (err) {
    next(err);
  }
};

// ---------- Forgot / reset password ----------
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

// POST /api/auth/forgot  { email }
// Always answers the same way, so nobody can find out which emails are registered.
exports.forgotPassword = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      "SELECT user_id, full_name FROM users WHERE email = ? AND status = 'Active'",
      [req.body.email]
    );
    if (rows[0]) {
      const token = crypto.randomBytes(32).toString('hex');
      await pool.query('UPDATE password_resets SET used = TRUE WHERE user_id = ? AND used = FALSE', [rows[0].user_id]);
      await pool.query(
        'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE))',
        [rows[0].user_id, sha256(token)]
      );
      const link = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
      try {
        await sendMail({
          to: req.body.email,
          subject: 'Reset your Spend-Wise password',
          text: `Hi ${rows[0].full_name},\n\nUse this link to choose a new password (valid for 30 minutes):\n${link}\n\nIf you didn't ask for this, you can ignore this email.`,
        });
      } catch (e) {
        console.error('Could not send reset email:', e.message);
      }
    }
    res.json({ message: 'If that email is registered, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/reset  { token, password }
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const [rows] = await pool.query(
      'SELECT reset_id, user_id FROM password_resets WHERE token_hash = ? AND used = FALSE AND expires_at > NOW()',
      [sha256(token)]
    );
    if (!rows[0]) return res.status(400).json({ message: 'This reset link is invalid or has expired' });

    const hash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE user_id = ?', [hash, rows[0].user_id]);
    await pool.query('UPDATE password_resets SET used = TRUE WHERE user_id = ?', [rows[0].user_id]);
    res.json({ message: 'Password changed. You can log in now.' });
  } catch (err) {
    next(err);
  }
};
