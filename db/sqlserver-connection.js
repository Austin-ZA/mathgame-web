// db/sqlserver-connection.js
// SQL Server connection using sqlcmd (works even with TCP/IP disabled)

require('dotenv').config();

const { execSync } = require('child_process');
const crypto = require('crypto');

// SHA-256 hash — exactly matches UserDAO.hashPassword()
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Serialize a JS value into a safe SQL Server literal.
 *
 * CRITICAL FIXES vs old version:
 *   OLD: wrapped EVERYTHING in single quotes ? boolean true became 'true'
 *        which SQL Server cannot insert into a BIT column ? all is_correct
 *        writes silently failed / caused errors, so score stayed 0.
 *   NEW:
 *     null/undefined  ? NULL          (no quotes — avoids 'NULL' string)
 *     boolean         ? 1 / 0         (BIT-safe, no quotes)
 *     finite number   ? raw digits    (INT-safe, no quotes)
 *     everything else ? N'...'        (N prefix = Unicode, handles question text)
 */
function toSqlLiteral(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean')            return value ? '1' : '0';
  if (typeof value === 'number' && isFinite(value)) return String(value);
  const escaped = String(value).replace(/'/g, "''");
  return `N'${escaped}'`;
}

/** Execute SQL query using sqlcmd */
async function executeQuery(sqlQuery, params = []) {
  return new Promise((resolve, reject) => {
    try {
      let paramIndex = 0;
      const finalSql = sqlQuery
        .replace(/\?/g, () => {
          if (paramIndex >= params.length)
            throw new Error('Not enough parameters provided for query');
          return toSqlLiteral(params[paramIndex++]);
        })
        .replace(/\n/g, ' ')
        .trim();

      const server = process.env.SQLSERVER_SERVER || 'localhost\\SQLEXPRESS';
      const database = process.env.SQLSERVER_DATABASE || 'mathgameapp';
      const user = process.env.SQLSERVER_USER || '';
      const password = process.env.SQLSERVER_PASSWORD || '';

      // Build authentication flag
      const authFlag = user && password 
        ? `-U "${user}" -P "${password}"` 
        : '-E';  // Windows Authentication

      const cmd = `sqlcmd -S "${server}" ${authFlag} -d ${database} -Q "${finalSql}" -W -s ","`;

      const result = execSync(cmd, {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // Parse CSV-like output — skip header-separator lines and row-count lines
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
            row[header] = values[idx] !== undefined ? values[idx] : null;
          });
          recordset.push(row);
        }
      }

      resolve(recordset);
    } catch (err) {
      reject(new Error(`SQL Server Query failed: ${err.message}`));
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
    console.error('[DB] SQL Server Connection failed:', err.message);
    return false;
  }
}

// Pool-compatible wrapper
const pool = { query: executeQuery };

module.exports = { pool, testConnection, hashPassword };
