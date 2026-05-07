// Workaround: Use stored SQL Server configuration
// Since SQL Browser can't start and Named Pipes isn't resolving,
// we'll bypass the mssql package and use direct SQL connections

const ConnectionPool = require('mssql/lib/connectionpool');
const { EventEmitter } = require('events');

// Configuration approach: Try different strategies
const strategies = [
  {
    server: '(local)',
    instanceName: 'SQLEXPRESS',
    database: 'mathgameapp',
    options: { encrypt: false, trustServerCertificate: true }
  },
  {
    server: '.',
    instanceName: 'SQLEXPRESS',
    database: 'mathgameapp',
    options: { encrypt: false, trustServerCertificate: true }
  },
  {
    server: 'localhost',
    port: 1433,
    database: 'mathgameapp',
    options: { encrypt: false, trustServerCertificate: true }
  }
];

module.exports = { strategies };
