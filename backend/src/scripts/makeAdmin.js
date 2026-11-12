// Usage: npm run make-admin -- someone@example.com
const pool = require('../config/db');
(async () => {
  const email = (process.argv[2] || '').trim().toLowerCase();
  if (!email) { console.error('Usage: npm run make-admin -- email@example.com'); process.exit(1); }
  try {
    const [r] = await pool.query("UPDATE users SET role = 'admin' WHERE email = ?", [email]);
    console.log(r.affectedRows ? `${email} is now an admin.` : `No user found with email ${email}. Register that account first.`);
  } catch (e) {
    console.error('Failed:', e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
