// db/connection.js
// Database connection router - auto-selects MySQL, Azure SQL, or SQL Server based on DB_TYPE env variable

require('dotenv').config();

const dbType = (process.env.DB_TYPE || 'azuresql').toLowerCase();

let dbModule;

if (dbType === 'mysql') {
  console.log('[DB] Using MySQL connection module');
  dbModule = require('./mysql-connection');
} else if (dbType === 'azuresql') {
  console.log('[DB] Using Azure SQL connection module');
  dbModule = require('./azuresql-connection');
} else if (dbType === 'sqlserver') {
  console.log('[DB] Using SQL Server connection module');
  dbModule = require('./sqlserver-connection');
} else {
  throw new Error(`Invalid DB_TYPE: ${process.env.DB_TYPE}. Must be 'mysql', 'azuresql', or 'sqlserver'`);
}

// Export the selected database module
module.exports = dbModule;
