// server.js — MathGameApp Web Server
// Run: node server.js
// Testers on the same network access it at: http://<YOUR_IP>:3000

const express        = require('express');
const session        = require('express-session');
const path           = require('path');
const { testConnection } = require('./db/connection');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'mathgame-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 8,  // 8 hours
    httpOnly: true,
  }
}));

// ── API Routes ───────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/game', require('./routes/game'));

// ── SPA Fallback — serve index.html for all non-API routes ───────────────
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api'))
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start ─────────────────────────────────────────────────────────────────
async function start() {
  const dbOk = await testConnection();
  if (!dbOk) {
    console.error('\n❌  Cannot connect to MySQL.');
    console.error('   Please check:');
    console.error('   1. MySQL Community Server is running');
    console.error('   2. Credentials in db/connection.js are correct');
    console.error('   3. Database "mathgameapp" exists (run database/mathgameapp_schema.sql)');
    process.exit(1);
  }

  app.listen(PORT, '0.0.0.0', () => {
    const os   = require('os');
    const nets = os.networkInterfaces();
    let   lan  = 'YOUR_IP';
    for (const iface of Object.values(nets)) {
      for (const info of iface) {
        if (info.family === 'IPv4' && !info.internal) { lan = info.address; break; }
      }
    }
    console.log(`\n✅  MathGameApp running!`);
    console.log(`   Local:    http://localhost:${PORT}`);
    console.log(`   Network:  http://${lan}:${PORT}  ← share with testers\n`);
  });
}

start();
