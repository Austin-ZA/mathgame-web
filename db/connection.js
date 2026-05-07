
const { execSync } = require('child_process');
const crypto = require('crypto');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function toSqlLiteral(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean')            return value ? '1' : '0';
  if (typeof value === 'number' && isFinite(value)) return String(value);
  const escaped = String(value).replace(/'/g, "''");
  return "N'" + escaped + "'";
}

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

     
      const cmd = 'sqlcmd -S "localhost\\SQLEXPRESS" -E -d mathgameapp -Q "' + finalSql + '" -W -s "|"';

      const result = execSync(cmd, {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // Skip blank lines, row-count lines "(N rows affected)", and separator lines (dashes/pipes)
      const lines = result.split('\n').filter(function(l) {
        const t = l.trim();
        return t && !t.startsWith('(') && !/^[-| ]+$/.test(t);
      });

      const recordset = [];
      if (lines.length > 1) {
        const headers = lines[0].split('|').map(function(h) { return h.trim(); });
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split('|').map(function(v) { return v.trim(); });
          const row = {};
          headers.forEach(function(header, idx) {
            const v = values[idx] !== undefined ? values[idx] : null;
            // sqlcmd prints the literal string NULL for null DB values — convert to JS null
            row[header] = (v === 'NULL' || v === '') ? null : v;
          });
          recordset.push(row);
        }
      }

      resolve(recordset);
    } catch (err) {
      reject(new Error('Query failed: ' + err.message));
    }
  });
}

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

const pool = { query: executeQuery };

module.exports = { pool, testConnection, hashPassword };
