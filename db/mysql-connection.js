// db/mysql-connection.js
// MySQL connection module for cloud deployment

require('dotenv').config();

const mysql = require('mysql2/promise');
const crypto = require('crypto');

// SHA-256 hash — matches SQL Server version
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Create MySQL connection pool
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'mathgameapp',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

/** Execute SQL query using MySQL */
async function executeQuery(sqlQuery, params = []) {
  try {
    const [rows] = await pool.execute(sqlQuery, params);
    return rows;
  } catch (err) {
    throw new Error(`MySQL Query failed: ${err.message}`);
  }
}

/** Quick connectivity check — call on server start */
async function testConnection() {
  try {
    const [rows] = await pool.query('SELECT VERSION() as version, DATABASE() as db');
    console.log(`[DB] Connected to MySQL successfully.`);
    console.log(`[DB] Version: ${rows[0].version}, Database: ${rows[0].db}`);
    return true;
  } catch (err) {
    console.error('[DB] MySQL Connection failed:', err.message);
    return false;
  }
}

module.exports = { pool: { query: executeQuery }, testConnection, hashPassword };
