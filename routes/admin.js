// routes/admin.js
// Admin-only API endpoints

const express = require('express');
const PDFDocument = require('pdfkit');
const router  = express.Router();
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

// ── Require admin role on all routes ──────────────────────────────────────
router.use(requireAuth);
router.use((req, res, next) => {
  if (req.session.user?.role !== 'admin')
    return res.status(403).json({ error: 'Admin access required.' });
  next();
});

// sqlcmd returns every column value as a string.
function toInt(v)   { const n = parseInt(v);   return isNaN(n) ? 0 : n; }
function toFloat(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }
function toStr(v)   { return (v === null || v === undefined || v === 'NULL') ? null : String(v); }

function writePdfRows(doc, rows, columns) {
  doc.fontSize(11);
  const heading = columns.map(c => c.label).join(' | ');
  doc.text(heading);
  doc.moveDown(0.25);
  rows.forEach((row, index) => {
    const line = columns.map(c => String(row[c.key] ?? '')).join(' | ');
    doc.text(line);
    if (index < rows.length - 1) doc.moveDown(0.1);
  });
}

function drawTable(doc, columns, rows, opts = {}) {
  const startX = doc.x;
  const startY = doc.y;
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const colCount = columns.length;
  const colWidths = columns.map(c => c.width || Math.floor(pageWidth / colCount));

  function renderHeader() {
    doc.font('Helvetica-Bold').fontSize(11);
    let x = startX;
    for (let i = 0; i < columns.length; i++) {
      doc.text(columns[i].label, x, doc.y, { width: colWidths[i], continued: false });
      x += colWidths[i];
    }
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(10);
  }

  renderHeader();

  rows.forEach((row) => {
    // calculate row height
    const heights = columns.map((c, i) => {
      const text = String(row[c.key] ?? '');
      return doc.heightOfString(text, { width: colWidths[i] });
    });
    const rowHeight = Math.max(...heights, doc.currentLineHeight());

    if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom - 20) {
      doc.addPage();
      renderHeader();
    }

    let x = startX;
    for (let i = 0; i < columns.length; i++) {
      const text = String(row[columns[i].key] ?? '');
      doc.text(text, x, doc.y, { width: colWidths[i] });
      x += colWidths[i];
    }
    doc.moveDown(0.2);
  });
}

// ── GET /api/admin/stats ───────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const userRows      = await pool.query('SELECT COUNT(*) AS totalUsers FROM [user]');
    const sessionRows   = await pool.query('SELECT COUNT(*) AS totalSessions FROM session');
    const todayRows     = await pool.query("SELECT COUNT(DISTINCT user_id) AS activeToday FROM session WHERE CAST(played_at AS DATE) = CAST(GETDATE() AS DATE)");
    const todaySessRows = await pool.query("SELECT COUNT(*) AS sessionsToday FROM session WHERE CAST(played_at AS DATE) = CAST(GETDATE() AS DATE)");
    const accRows       = await pool.query("SELECT AVG(CASE WHEN total_questions > 0 THEN CAST(correct_answers AS FLOAT)/total_questions*100 ELSE NULL END) AS avgAcc FROM session");
    const modeCounts    = await pool.query("SELECT mode, COUNT(*) AS cnt FROM session GROUP BY mode");

    // sqlcmd returns arrays — grab first row of each result set
    const userRow      = userRows[0]      || {};
    const sessionRow   = sessionRows[0]   || {};
    const todayRow     = todayRows[0]     || {};
    const todaySessRow = todaySessRows[0] || {};
    const accRow       = accRows[0]       || {};

    const modeStats = {};
    modeCounts.forEach(r => { modeStats[toStr(r.mode)] = toInt(r.cnt); });

    res.json({
      totalUsers:    toInt(userRow.totalUsers),
      totalSessions: toInt(sessionRow.totalSessions),
      activeToday:   toInt(todayRow.activeToday),
      sessionsToday: toInt(todaySessRow.sessionsToday),
      avgAccuracy:   accRow.avgAcc != null ? Math.round(toFloat(accRow.avgAcc)) : 0,
      modeStats,
    });
  } catch (err) {
    console.error('[admin] stats error:', err.message);
    res.status(500).json({ error: 'Could not load stats.' });
  }
});

// ── GET /api/admin/users/recent ────────────────────────────────────────────
router.get('/users/recent', async (req, res) => {
  const limit = parseInt(req.query.limit) || 5;
  try {
    const rows = await pool.query(
      `SELECT TOP ${limit} user_id, username, full_name, role, created_at FROM [user] ORDER BY created_at DESC`
    );
    res.json(rows.map(r => ({
      user_id:    toStr(r.user_id),
      username:   toStr(r.username)  || '',
      full_name:  toStr(r.full_name) || '',
      role:       toStr(r.role)      || 'student',
      created_at: toStr(r.created_at),
    })));
  } catch (err) {
    console.error('[admin] recent users error:', err.message);
    res.status(500).json({ error: 'Could not fetch recent users.' });
  }
});

// ── GET /api/admin/users ────────────────────────────────────────────────────
// Returns ALL users with normalised fields so search/filter always works
router.get('/users', async (req, res) => {
  try {
    const rows = await pool.query(
      'SELECT user_id, username, full_name, email, role, last_login, created_at FROM [user] ORDER BY created_at DESC'
    );
    res.json(rows.map(r => ({
      user_id:    toStr(r.user_id),
      username:   toStr(r.username)  || '',
      full_name:  toStr(r.full_name) || '',
      email:      toStr(r.email),
      role:       toStr(r.role)      || 'student',
      last_login: toStr(r.last_login),
      created_at: toStr(r.created_at),
    })));
  } catch (err) {
    console.error('[admin] users error:', err.message);
    res.status(500).json({ error: 'Could not fetch users.' });
  }
});

// ── POST /api/admin/users/role ──────────────────────────────────────────────
router.post('/users/role', async (req, res) => {
  const { userId, role } = req.body;
  if (!['student','educator','admin'].includes(role))
    return res.status(400).json({ error: 'Invalid role.' });
  try {
    await pool.query('UPDATE [user] SET role = ? WHERE user_id = ?', [role, userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Could not update role.' });
  }
});

// ── POST /api/admin/users/delete ───────────────────────────────────────────
router.post('/users/delete', async (req, res) => {
  const { userId } = req.body;
  if (parseInt(userId) === req.session.user.user_id)
    return res.status(400).json({ error: 'You cannot delete your own account.' });
  try {
    await pool.query('DELETE FROM answer WHERE session_id IN (SELECT session_id FROM session WHERE user_id = ?)', [userId]);
    await pool.query('DELETE FROM session WHERE user_id = ?', [userId]);
    await pool.query('DELETE FROM [user] WHERE user_id = ?', [userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Could not delete user.' });
  }
});

// ── GET /api/admin/activity ─────────────────────────────────────────────────
router.get('/activity', async (req, res) => {
  try {
    const rows = await pool.query(`
      SELECT TOP 10
        s.session_id, u.full_name, u.username, s.mode, s.played_at AS created_at
      FROM session s
      JOIN [user] u ON u.user_id = s.user_id
      ORDER BY s.played_at DESC
    `);
    res.json(rows.map(r => ({
      session_id: toStr(r.session_id),
      full_name:  toStr(r.full_name) || toStr(r.username) || 'Unknown',
      username:   toStr(r.username),
      mode:       toStr(r.mode),
      created_at: toStr(r.created_at),
      type:       'ok',
      message:    `${toStr(r.full_name) || toStr(r.username)} played a ${toStr(r.mode)} session`,
    })));
  } catch (err) {
    console.error('[admin] activity error:', err.message);
    res.status(500).json({ error: 'Could not fetch activity.' });
  }
});

// ── GET /api/admin/accuracy-by-mode ────────────────────────────────────────
router.get('/accuracy-by-mode', async (req, res) => {
  try {
    const rows = await pool.query(`
      SELECT mode,
        AVG(CASE WHEN total_questions > 0 THEN CAST(correct_answers AS FLOAT)/total_questions*100 ELSE NULL END) AS avg_acc
      FROM session
      GROUP BY mode
    `);
    const result = {};
    rows.forEach(r => { result[toStr(r.mode)] = Math.round(toFloat(r.avg_acc)); });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch accuracy.' });
  }
});

// ── GET /api/admin/sessions ─────────────────────────────────────────────────
router.get('/sessions', async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  try {
    const rows = await pool.query(`
      SELECT TOP ${limit}
        s.session_id, s.user_id, s.mode, s.difficulty,
        s.score, s.total_questions, s.correct_answers, s.time_taken_seconds, s.played_at,
        u.username, u.full_name
      FROM session s
      JOIN [user] u ON u.user_id = s.user_id
      ORDER BY s.played_at DESC
    `);
    res.json(rows.map(r => ({
      session_id:         toStr(r.session_id),
      user_id:            toStr(r.user_id),
      mode:               toStr(r.mode),
      difficulty:         toStr(r.difficulty),
      score:              toInt(r.score),
      total_questions:    toInt(r.total_questions),
      correct_answers:    toInt(r.correct_answers),
      time_taken_seconds: toInt(r.time_taken_seconds),
      played_at:          toStr(r.played_at),
      username:           toStr(r.username) || '',
      full_name:          toStr(r.full_name) || '',
    })));
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch sessions.' });
  }
});

// ── GET /api/admin/export/sessions ─────────────────────────────────────────
router.get('/export/sessions', async (req, res) => {
  try {
    const rows = await pool.query(`
      SELECT s.session_id, u.username, u.full_name, s.mode, s.difficulty,
             s.score, s.total_questions, s.correct_answers, s.time_taken_seconds, s.played_at
      FROM session s JOIN [user] u ON u.user_id = s.user_id
      ORDER BY s.played_at DESC
    `);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="sessions.pdf"');

    const doc = new PDFDocument({ margin: 36, size: 'A4' });
    doc.pipe(res);
    doc.fontSize(18).text('All Sessions Report', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`);
    doc.moveDown(0.75);
    drawTable(doc, [
      { key: 'session_id', label: 'Session', width: 60 },
      { key: 'username', label: 'User', width: 90 },
      { key: 'mode', label: 'Mode', width: 90 },
      { key: 'difficulty', label: 'Level', width: 50 },
      { key: 'score', label: 'Score', width: 50 },
      { key: 'correct_answers', label: 'Correct', width: 50 },
      { key: 'total_questions', label: 'Total', width: 50 },
      { key: 'played_at', label: 'Played At', width: 120 }
    ], rows);
    doc.end();
  } catch (err) {
    res.status(500).json({ error: 'Export failed.' });
  }
});

// ── GET /api/admin/export/users ─────────────────────────────────────────────
router.get('/export/users', async (req, res) => {
  try {
    const rows = await pool.query('SELECT user_id, username, full_name, email, role, last_login, created_at FROM [user] ORDER BY created_at DESC');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="users.pdf"');

    const doc = new PDFDocument({ margin: 36, size: 'A4' });
    doc.pipe(res);
    doc.fontSize(18).text('User List Report', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`);
    doc.moveDown(0.75);
    drawTable(doc, [
      { key: 'user_id', label: 'User ID', width: 60 },
      { key: 'username', label: 'Username', width: 90 },
      { key: 'full_name', label: 'Full Name', width: 140 },
      { key: 'email', label: 'Email', width: 140 },
      { key: 'role', label: 'Role', width: 60 },
      { key: 'last_login', label: 'Last Login', width: 120 }
    ], rows);
    doc.end();
  } catch (err) {
    res.status(500).json({ error: 'Export failed.' });
  }
});

// ── GET /api/admin/questions ────────────────────────────────────────────────
router.get('/questions', async (req, res) => {
  const { mode, level } = req.query;
  if (!mode || !level) return res.status(400).json({ error: 'mode and level required.' });
  try {
    const rows = await pool.query(
      'SELECT * FROM custom_question WHERE mode = ? AND level = ? ORDER BY created_at DESC',
      [mode, parseInt(level)]
    );
    res.json(rows);
  } catch (err) {
    res.json([]);
  }
});

// ── POST /api/admin/questions ───────────────────────────────────────────────
router.post('/questions', async (req, res) => {
  const { mode, level, question, answer, wrong, solution } = req.body;
  if (!mode || !level || !question || !answer)
    return res.status(400).json({ error: 'mode, level, question and answer are required.' });
  try {
    await pool.query(
      'INSERT INTO custom_question (mode, level, question_text, correct_answer, wrong_options, solution_steps, created_by) VALUES (?,?,?,?,?,?,?)',
      [mode, parseInt(level), question, answer, wrong || '', solution || '', req.session.user.user_id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[admin] add question error:', err.message);
    res.status(500).json({ error: 'Could not save question. Make sure the custom_questions table exists.' });
  }
});

// ── POST /api/admin/questions/delete ────────────────────────────────────────
router.post('/questions/delete', async (req, res) => {
  const { questionId } = req.body;
  try {
    await pool.query('DELETE FROM custom_question WHERE question_id = ?', [questionId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Could not delete question.' });
  }
});

module.exports = router;
