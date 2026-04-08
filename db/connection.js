// db/connection.js
// SQL Server connection using sqlcmd (works even with TCP/IP disabled)

const { execSync } = require('child_process');
const crypto = require('crypto');

// SHA-256 hash — exactly matches UserDAO.hashPassword()
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/** Execute SQL query using sqlcmd */
async function executeQuery(sqlQuery, params = []) {
  return new Promise((resolve, reject) => {
    try {
      // Replace ? placeholders with actual values (basic parameterization)
      let finalSql = sqlQuery;
      let paramIndex = 0;
      finalSql = finalSql.replace(/\?/g, () => {
        if (paramIndex >= params.length) {
          throw new Error('Not enough parameters provided for query');
        }
        const param = params[paramIndex++];
        // Simple string replacement - escape single quotes
        const escapedValue = String(param).replace(/'/g, "''");
        return `'${escapedValue}'`;
      });

      // Replace multi-line with single line for sqlcmd
      finalSql = finalSql.replace(/\n/g, ' ').trim();

      const cmd = `sqlcmd -S "localhost\\SQLEXPRESS" -E -d mathgameapp -Q "${finalSql}" -W -s ","`;

      const result = execSync(cmd, {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // Parse CSV-like output into recordset
      // Filter out header separators (lines with only dashes and commas)
      const lines = result.split('\n').filter(l => {
        const trimmed = l.trim();
        return trimmed && !trimmed.startsWith('(') && !/^[\s\-,]+$/.test(trimmed);
      });
      const recordset = [];

      if (lines.length > 1) {
        const headers = lines[0].split(',').map(h => h.trim());
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          const row = {};
          headers.forEach((header, idx) => {
            row[header] = values[idx] || null;
          });
          recordset.push(row);
        }
      }

      resolve(recordset);
    } catch (err) {
      reject(new Error(`Query failed: ${err.message}`));
    }
  });
}

/** Quick connectivity check — call on server start */
async function testConnection() {
  try {
    await executeQuery('SELECT @@SERVERNAME as Server');
    console.log('[DB] Connected to SQL Server successfully.');
    return true;
  } catch (err) {
    console.error('[DB] Connection failed:', err.message);
    return false;
  }
}

// Mock pool object for compatibility
const pool = {
  query: executeQuery
};

module.exports = { pool, testConnection, hashPassword };
