const mysql = require('mysql2/promise');
require('dotenv').config();

// A pool keeps connections open and reuses them (faster than one per request).
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,       // DATE/DATETIME come back as plain strings
  decimalNumbers: true,    // DECIMAL columns come back as JS numbers
});

module.exports = pool;
