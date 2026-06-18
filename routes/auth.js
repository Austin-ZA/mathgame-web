// routes/auth.js
const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const { pool } = require('../db');

function hashPassword(p) {
  return crypto.createHash('sha256').update(p).digest('hex');
}

async function logActivity(actorId, actionType, description, targetUserId) {
  try {
    await pool.query(
      'INSERT INTO admin_activity_log (actor_id, action_type, description, target_user_id) VALUES (?,?,?,?)',
      [actorId, actionType, description, targetUserId || null]
    );
  } catch { }
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required.' });

  try {
    const rows = await pool.query(
      'SELECT user_id, username, full_name, email, role, password_hash FROM [user] WHERE username = ?',
      [username]
    );
    if (rows.length === 0)
      return res.status(401).json({ error: 'Incorrect username or password.' });

    const user = rows[0];
    if (user.password_hash !== hashPassword(password))
      return res.status(401).json({ error: 'Incorrect username or password.' });

<<<<<<< HEAD
    // Update last_login
    await pool.query('UPDATE [user] SET last_login = GETDATE() WHERE user_id = ?', [user.user_id]);
=======
    await pool.query('UPDATE users SET last_login = GETDATE() WHERE user_id = ?', [user.user_id]);
>>>>>>> eb0f918ab16e285c80b4089056cda86dc27cd092

    await logActivity(user.user_id, 'LOGIN', `User ${username} logged in`, null);

    const { password_hash, ...safe } = user;
    req.session.user = safe;
    res.json({ success: true, user: safe });
  } catch (err) {
    console.error('[auth] Login error:', err.message);
    res.status(500).json({ error: 'Database error. Please try again.' });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, password, fullName, email } = req.body;
  if (!username || !password || !fullName)
    return res.status(400).json({ error: 'Username, password and full name are required.' });

  try {
<<<<<<< HEAD
    // Check username taken
    const existing = await pool.query('SELECT user_id FROM [user] WHERE username = ?', [username]);
    if (existing.length > 0)
      return res.status(409).json({ error: 'Username already taken. Please choose another.' });

    const hashedPassword = hashPassword(password);

    await pool.query(
      "INSERT INTO [user] (username, password_hash, full_name, email, role) VALUES (?, ?, ?, ?, 'student')",
      [username, hashedPassword, fullName, email || null]
=======
    const existing = await pool.query('SELECT user_id FROM users WHERE username = ?', [username]);
    if (existing.length > 0)
      return res.status(409).json({ error: 'Username already taken. Please choose another.' });

    const result = await pool.query(
      "INSERT INTO users (username, password_hash, full_name, email, role) OUTPUT INSERTED.user_id VALUES (?, ?, ?, ?, 'student')",
      [username, hashPassword(password), fullName, email || null]
>>>>>>> eb0f918ab16e285c80b4089056cda86dc27cd092
    );
    const newUserId = result[0]?.user_id;

    // Seed performance_summary row
    if (newUserId) {
      await pool.query(
        'INSERT INTO performance_summary (user_id) VALUES (?)',
        [newUserId]
      ).catch(() => {});

      await logActivity(newUserId, 'REGISTER', `New account created: ${username}`, null);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[auth] Register error:', err.message);
    res.status(500).json({ error: 'Could not create account. Please try again.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ error: 'Not logged in.' });
  res.json(req.session.user);
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { username, email, newPassword } = req.body;
  if (!username || !newPassword)
    return res.status(400).json({ error: 'Username and new password are required.' });

  try {
    const rows = await pool.query('SELECT user_id, email FROM [user] WHERE username = ?', [username]);
    if (!rows || rows.length === 0)
      return res.status(404).json({ error: 'User not found.' });

    const user = rows[0];
    if (user.email && email && user.email.trim().toLowerCase() !== email.trim().toLowerCase())
      return res.status(400).json({ error: 'Email does not match our records.' });

<<<<<<< HEAD
    const hashedPassword = hashPassword(newPassword);
    await pool.query('UPDATE [user] SET password_hash = ? WHERE user_id = ?', [hashedPassword, user.user_id]);
=======
    await pool.query('UPDATE users SET password_hash = ? WHERE user_id = ?',
      [hashPassword(newPassword), user.user_id]);

    await logActivity(user.user_id, 'PASSWORD_RESET', `Password reset for ${username}`, null);

>>>>>>> eb0f918ab16e285c80b4089056cda86dc27cd092
    res.json({ success: true });
  } catch (err) {
    console.error('[auth] Forgot password error:', err.message);
    res.status(500).json({ error: 'Could not reset password.' });
  }
});

module.exports = router;
