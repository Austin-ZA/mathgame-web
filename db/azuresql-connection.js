// db/azuresql-connection.js
// Azure SQL Database connection using mssql package

require('dotenv').config();

const sql = require('mssql');
const crypto = require('crypto');

// SHA-256 hash � matches other database versions
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Azure SQL configuration
const config = {
  server: process.env.AZURE_SQL_SERVER || 'your-server-name.database.windows.net',
  database: process.env.AZURE_SQL_DATABASE || 'mathgameapp',
  user: process.env.AZURE_SQL_USER || '',
  password: process.env.AZURE_SQL_PASSWORD || '',
  port: parseInt(process.env.AZURE_SQL_PORT) || 1433,
  options: {
    encrypt: true,  // Azure SQL requires encryption
    trustServerCertificate: process.env.AZURE_SQL_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true,
    connectionTimeout: 30000,
    requestTimeout: 30000
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Connection pool
let pool = null;

// Get or create connection pool
async function getPool() {
  if (!pool) {
    pool = await sql.connect(config);
  }
  return pool;
}

/** Execute SQL query using Azure SQL */
async function executeQuery(sqlQuery, params = []) {
  try {
    const pool = await getPool();
    const request = pool.request();

    // Add parameters to the request
    params.forEach((param, index) => {
      request.input(`param${index}`, param);
    });

    // Replace ? placeholders with @param0, @param1, etc.
    let paramIndex = 0;
    const finalQuery = sqlQuery.replace(/\?/g, () => `@param${paramIndex++}`);

    const result = await request.query(finalQuery);
    return result.recordset || [];
  } catch (err) {
    console.error('[DB] Azure SQL Query Error:', err.message);
    throw new Error(`Azure SQL Query failed: ${err.message}`);
  }
}

/** Quick connectivity check � call on server start */
async function testConnection() {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT @@VERSION as version, DB_NAME() as db');
    console.log(`[DB] Connected to Azure SQL Database successfully.`);
    console.log(`[DB] Database: ${result.recordset[0].db}`);
    return true;
  } catch (err) {
    console.error('[DB] Azure SQL Connection failed:', err.message);
    console.error('[DB] Server:', config.server);
    console.error('[DB] Database:', config.database);
    console.error('[DB] User:', config.user);
    return false;
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  if (pool) {
    await pool.close();
    console.log('[DB] Azure SQL connection pool closed.');
  }
  process.exit(0);
});

module.exports = { 
  pool: { query: executeQuery }, 
  testConnection, 
  hashPassword 
};
