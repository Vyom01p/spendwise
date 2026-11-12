// Creates the database, tables and default categories from database/schema.sql
// Safe to run more than once.
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  let conn;
  try {
    const sql = fs.readFileSync(path.join(__dirname, '../../../database/schema.sql'), 'utf8');
    conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      multipleStatements: true,
    });
    await conn.query(sql);
    console.log('Database initialised: tables and default categories are ready.');
  } catch (err) {
    console.error('Database setup failed:', err.message);
    console.error('Check DB_HOST / DB_USER / DB_PASSWORD in backend/.env and that MySQL is running.');
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end();
  }
})();
