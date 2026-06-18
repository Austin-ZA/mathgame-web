// server.js — MathGameApp Web Server

require('dotenv').config();

const express        = require('express');
const session        = require('express-session');
const path           = require('path');
const { testConnection } = require('./db');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'mathgame-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge:   parseInt(process.env.SESSION_MAX_AGE) || 1000 * 60 * 60 * 8,
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

// ── API Routes ────────────────────────────────────────────────────────────
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/game',     require('./routes/game'));
app.use('/api/admin',    require('./routes/admin'));
app.use('/api/educator', require('./routes/educator'));
app.use('/api/coach',    require('./routes/coach'));

// ── SPA Fallback ─────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api'))
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start ─────────────────────────────────────────────────────────────────
async function start() {
  // Always start the HTTP server first so Render health checks pass.
  // DB connection is tested separately and logged — a DB failure at startup
  // does NOT crash the process, because on cloud deployments the DB may
  // need a few seconds to accept connections after the server is up.
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MathGameApp running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`DB_TYPE: ${process.env.DB_TYPE || '(not set)'}`);
  });

  // Test DB connection after server is listening — retry up to 3 times
  let dbOk = false;
  for (let attempt = 1; attempt <= 3; attempt++) {
    console.log(`[DB] Connection attempt ${attempt}/3...`);
    dbOk = await testConnection();
    if (dbOk) break;
    if (attempt < 3) await new Promise(r => setTimeout(r, 5000)); // wait 5s between retries
  }

  if (!dbOk) {
    console.error('[DB] Could not connect to database after 3 attempts.');
    console.error('[DB] Check environment variables:');
    console.error(`     DB_TYPE            = ${process.env.DB_TYPE || '(missing)'}`);
    console.error(`     AZURE_SQL_SERVER   = ${process.env.AZURE_SQL_SERVER || '(missing)'}`);
    console.error(`     AZURE_SQL_DATABASE = ${process.env.AZURE_SQL_DATABASE || '(missing)'}`);
    console.error(`     AZURE_SQL_USER     = ${process.env.AZURE_SQL_USER ? '(set)' : '(missing)'}`);
    console.error(`     AZURE_SQL_PASSWORD = ${process.env.AZURE_SQL_PASSWORD ? '(set)' : '(missing)'}`);
    console.error('[DB] Server is still running but all DB operations will fail.');
    // Do NOT call process.exit(1) — keep server alive so Render deploy succeeds
    // and so you can fix env vars without redeploying code.
  } else {
    console.log('[DB] Database connection established successfully.');
  }
}

start();