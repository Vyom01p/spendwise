require('dotenv').config();
const app = require('./app');
const pool = require('./config/db');

const PORT = process.env.PORT || 5000;

(async () => {
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is missing. Copy .env.example to .env and fill it in.');
    process.exit(1);
  }
  try {
    await pool.query('SELECT 1');
    console.log('MySQL connected');
    app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
  } catch (err) {
    console.error('Database connection failed:', err.message);
    console.error('Check DB_* values in backend/.env and that MySQL is running.');
    process.exit(1);
  }
})();
