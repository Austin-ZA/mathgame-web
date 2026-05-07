// db/index.js
// Dynamic database connection router based on DB_TYPE environment variable

require('dotenv').config();

const dbType = (process.env.DB_TYPE || '').trim().toLowerCase();

if (!dbType) {
  throw new Error('DB_TYPE is not set. Please set DB_TYPE to "azuresql", "mysql", or "sqlserver".');
}

let db;

switch (dbType) {
  case 'azuresql':
    db = require('./azuresql-connection');
    break;
  case 'mysql':
    db = require('./mysql-connection');
    break;
  case 'sqlserver':
    db = require('./sqlserver-connection');
    break;
  default:
    throw new Error(`Unsupported DB_TYPE "${process.env.DB_TYPE}". Use "azuresql", "mysql", or "sqlserver".`);
}

module.exports = db;