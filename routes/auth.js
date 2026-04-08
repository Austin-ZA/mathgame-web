// routes/auth.js
// Mirrors UserDAO.java — login, register, logout

const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const { pool } = require('../db/connection');

/** SHA-256 hash — exactly matches UserDAO.hashPassword() */
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// ── POST /api/auth/login ──────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required.' });

  try {
    const hashedPassword = hashPassword(password);

    const rows = await pool.query(
      'SELECT user_id, username, full_name, email, role, password_hash FROM users WHERE username = ?',
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Incorrect username or password.' });
    }

    const user = rows[0];

    if (user.password_hash !== hashedPassword) {
      return res.status(401).json({ error: 'Incorrect username or password.' });
    }

    // Update last_login
    await pool.query('UPDATE users SET last_login = GETDATE() WHERE user_id = ?', [user.user_id]);

    // Store in session (remove password_hash from response)
    const { password_hash, ...userWithoutPassword } = user;
    req.session.user = userWithoutPassword;
    res.json({ success: true, user: userWithoutPassword });

  } catch (err) {
    console.error('[auth] Login error:', err.message);
    res.status(500).json({ error: 'Database error. Please try again.' });
  }
});

// ── POST /api/auth/register ───────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { username, password, fullName, email } = req.body;
  if (!username || !password || !fullName)
    return res.status(400).json({ error: 'Username, password and full name are required.' });

  try {
    // Check username taken
    const existing = await pool.query('SELECT user_id FROM users WHERE username = ?', [username]);
    if (existing.length > 0)
      return res.status(409).json({ error: 'Username already taken. Please choose another.' });

    const hashedPassword = hashPassword(password);

    await pool.query(
      "INSERT INTO users (username, password_hash, full_name, email, role) VALUES (?, ?, ?, ?, 'student')",
      [username, hashedPassword, fullName, email || null]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('[auth] Register error:', err.message);
    res.status(500).json({ error: 'Could not create account. Please try again.' });
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────
router.get('/me', (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ error: 'Not logged in.' });
  res.json(req.session.user);
});

module.exports = router;
