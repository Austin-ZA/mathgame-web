// routes/admin.js
const express = require('express');
const PDFDocument = require('pdfkit');
const router  = express.Router();
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);
router.use((req, res, next) => {
  if (req.session.user?.role !== 'admin')
    return res.status(403).json({ error: 'Admin access required.' });
  next();
});

function toInt(v)   { const n = parseInt(v);   return isNaN(n) ? 0 : n; }
function toFloat(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }
function toStr(v)   { return (v === null || v === undefined || v === 'NULL') ? null : String(v); }

async function logActivity(actorId, actionType, description, targetUserId) {
  try {
    await pool.query(
      'INSERT INTO admin_activity_log (actor_id, action_type, description, target_user_id) VALUES (?,?,?,?)',
      [actorId, actionType, description, targetUserId || null]
    );
  } catch { }
}

// ── GET /api/admin/stats ───────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
<<<<<<< HEAD
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
=======
    const userRows      = await pool.query('SELECT COUNT(*) AS totalUsers FROM users');
    const sessionRows   = await pool.query('SELECT COUNT(*) AS totalSessions FROM sessions WHERE completed=1');
    const todayRows     = await pool.query("SELECT COUNT(DISTINCT user_id) AS activeToday FROM sessions WHERE completed=1 AND CAST(played_at AS DATE)=CAST(GETDATE() AS DATE)");
    const todaySessRows = await pool.query("SELECT COUNT(*) AS sessionsToday FROM sessions WHERE completed=1 AND CAST(played_at AS DATE)=CAST(GETDATE() AS DATE)");
    const accRows       = await pool.query("SELECT AVG(CASE WHEN total_questions>0 THEN CAST(correct_answers AS FLOAT)/total_questions*100 ELSE NULL END) AS avgAcc FROM sessions WHERE completed=1");
    const modeCounts    = await pool.query("SELECT mode, COUNT(*) AS cnt FROM sessions WHERE completed=1 GROUP BY mode");
    const hintRows      = await pool.query("SELECT SUM(hints_used) AS totalHints FROM sessions WHERE completed=1");
    const qRows         = await pool.query("SELECT COUNT(*) AS totalQ FROM questions");
>>>>>>> eb0f918ab16e285c80b4089056cda86dc27cd092

    const modeStats = {};
    modeCounts.forEach(r => { modeStats[toStr(r.mode)] = toInt(r.cnt); });

    res.json({
      totalUsers:    toInt(userRows[0]?.totalUsers),
      totalSessions: toInt(sessionRows[0]?.totalSessions),
      activeToday:   toInt(todayRows[0]?.activeToday),
      sessionsToday: toInt(todaySessRows[0]?.sessionsToday),
      avgAccuracy:   accRows[0]?.avgAcc != null ? Math.round(toFloat(accRows[0].avgAcc)) : 0,
      totalHints:    toInt(hintRows[0]?.totalHints),
      totalQuestions:toInt(qRows[0]?.totalQ),
      modeStats,
    });
  } catch (err) {
    console.error('[admin] stats error:', err.message);
    res.status(500).json({ error: 'Could not load stats.' });
  }
});

// ── GET /api/admin/users/recent ────────────────────────────────────────────
router.get('/users/recent', async (req, res) => {
  const limit = toInt(req.query.limit) || 5;
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
router.get('/users', async (req, res) => {
  try {
    const rows = await pool.query(
<<<<<<< HEAD
      'SELECT user_id, username, full_name, email, role, last_login, created_at FROM [user] ORDER BY created_at DESC'
=======
      `SELECT u.user_id, u.username, u.full_name, u.email, u.role, u.is_active,
              u.last_login, u.created_at,
              ISNULL(ps.total_sessions,0) AS total_sessions,
              ISNULL(ps.average_accuracy,0) AS avg_accuracy,
              ISNULL(ps.best_score,0) AS best_score
       FROM users u
       LEFT JOIN performance_summary ps ON ps.user_id = u.user_id
       ORDER BY u.created_at DESC`
>>>>>>> eb0f918ab16e285c80b4089056cda86dc27cd092
    );
    res.json(rows.map(r => ({
      user_id:       toStr(r.user_id),
      username:      toStr(r.username)  || '',
      full_name:     toStr(r.full_name) || '',
      email:         toStr(r.email),
      role:          toStr(r.role)      || 'student',
      is_active:     r.is_active === '1' || r.is_active === 1,
      last_login:    toStr(r.last_login),
      created_at:    toStr(r.created_at),
      total_sessions:toInt(r.total_sessions),
      avg_accuracy:  Math.round(toFloat(r.avg_accuracy)),
      best_score:    toInt(r.best_score),
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
<<<<<<< HEAD
    await pool.query('UPDATE [user] SET role = ? WHERE user_id = ?', [role, userId]);
=======
    await pool.query('UPDATE users SET role=? WHERE user_id=?', [role, userId]);
    await logActivity(req.session.user.user_id, 'ROLE_CHANGE',
      `Changed user ${userId} role to ${role}`, userId);
>>>>>>> eb0f918ab16e285c80b4089056cda86dc27cd092
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Could not update role.' });
  }
});

// ── POST /api/admin/users/delete ───────────────────────────────────────────
router.post('/users/delete', async (req, res) => {
  const { userId } = req.body;
  if (toInt(userId) === toInt(req.session.user.user_id))
    return res.status(400).json({ error: 'You cannot delete your own account.' });
  try {
<<<<<<< HEAD
    await pool.query('DELETE FROM answer WHERE session_id IN (SELECT session_id FROM session WHERE user_id = ?)', [userId]);
    await pool.query('DELETE FROM session WHERE user_id = ?', [userId]);
    await pool.query('DELETE FROM [user] WHERE user_id = ?', [userId]);
=======
    await logActivity(req.session.user.user_id, 'USER_DELETE',
      `Deleted user_id ${userId}`, userId);
    // Cascade deletes handle sessions, user_answers, performance_summary, notifications
    await pool.query('DELETE FROM users WHERE user_id=?', [userId]);
>>>>>>> eb0f918ab16e285c80b4089056cda86dc27cd092
    res.json({ success: true });
  } catch (err) {
    console.error('[admin] delete user error:', err.message);
    res.status(500).json({ error: 'Could not delete user.' });
  }
});

// ── GET /api/admin/activity ─────────────────────────────────────────────────
router.get('/activity', async (req, res) => {
  try {
    const rows = await pool.query(`
<<<<<<< HEAD
      SELECT TOP 10
        s.session_id, u.full_name, u.username, s.mode, s.played_at AS created_at
      FROM session s
      JOIN [user] u ON u.user_id = s.user_id
      ORDER BY s.played_at DESC
=======
      SELECT TOP 30
        al.log_id, al.action_type, al.description, al.logged_at,
        u.full_name, u.username
      FROM admin_activity_log al
      JOIN users u ON u.user_id = al.actor_id
      ORDER BY al.logged_at DESC
>>>>>>> eb0f918ab16e285c80b4089056cda86dc27cd092
    `);
    res.json(rows.map(r => ({
      log_id:      toStr(r.log_id),
      action_type: toStr(r.action_type),
      description: toStr(r.description),
      logged_at:   toStr(r.logged_at),
      full_name:   toStr(r.full_name) || toStr(r.username) || 'Unknown',
      username:    toStr(r.username),
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
<<<<<<< HEAD
        AVG(CASE WHEN total_questions > 0 THEN CAST(correct_answers AS FLOAT)/total_questions*100 ELSE NULL END) AS avg_acc
      FROM session
=======
        AVG(CASE WHEN total_questions>0 THEN CAST(correct_answers AS FLOAT)/total_questions*100 ELSE NULL END) AS avg_acc
      FROM sessions WHERE completed=1
>>>>>>> eb0f918ab16e285c80b4089056cda86dc27cd092
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
  const limit = toInt(req.query.limit) || 20;
  try {
    const rows = await pool.query(`
      SELECT TOP ${limit}
        s.session_id, s.user_id, s.mode, s.difficulty,
        s.score, s.total_questions, s.correct_answers, s.skipped_answers,
        s.hints_used, s.time_taken_seconds, s.played_at,
        u.username, u.full_name
<<<<<<< HEAD
      FROM session s
      JOIN [user] u ON u.user_id = s.user_id
=======
      FROM sessions s
      JOIN users u ON u.user_id = s.user_id
      WHERE s.completed=1
>>>>>>> eb0f918ab16e285c80b4089056cda86dc27cd092
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
      skipped_answers:    toInt(r.skipped_answers),
      hints_used:         toInt(r.hints_used),
      time_taken_seconds: toInt(r.time_taken_seconds),
      played_at:          toStr(r.played_at),
      username:           toStr(r.username) || '',
      full_name:          toStr(r.full_name) || '',
    })));
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch sessions.' });
  }
});

// ── GET /api/admin/leaderboard ──────────────────────────────────────────────
router.get('/leaderboard', async (req, res) => {
  try {
    const rows = await pool.query(`
<<<<<<< HEAD
      SELECT s.session_id, u.username, u.full_name, s.mode, s.difficulty,
             s.score, s.total_questions, s.correct_answers, s.time_taken_seconds, s.played_at
      FROM session s JOIN [user] u ON u.user_id = s.user_id
      ORDER BY s.played_at DESC
=======
      SELECT TOP 20
        ls.rank_position, ls.total_score, ls.total_sessions, ls.avg_accuracy, ls.snapshot_date,
        u.username, u.full_name
      FROM leaderboard_snapshots ls
      JOIN users u ON u.user_id = ls.user_id
      WHERE ls.snapshot_date = CAST(GETDATE() AS DATE)
      ORDER BY ls.rank_position ASC
>>>>>>> eb0f918ab16e285c80b4089056cda86dc27cd092
    `);
    res.json(rows.map(r => ({
      rank:           toInt(r.rank_position),
      total_score:    toInt(r.total_score),
      total_sessions: toInt(r.total_sessions),
      avg_accuracy:   Math.round(toFloat(r.avg_accuracy)),
      snapshot_date:  toStr(r.snapshot_date),
      username:       toStr(r.username) || '',
      full_name:      toStr(r.full_name) || '',
    })));
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch leaderboard.' });
  }
});

// ── GET /api/admin/performance ──────────────────────────────────────────────
router.get('/performance', async (req, res) => {
  try {
<<<<<<< HEAD
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
=======
    const rows = await pool.query(`
      SELECT u.user_id, u.username, u.full_name,
             ps.total_sessions, ps.total_score, ps.average_score,
             ps.average_accuracy, ps.best_score, ps.last_played
      FROM performance_summary ps
      JOIN users u ON u.user_id = ps.user_id
      ORDER BY ps.average_accuracy DESC
    `);
    res.json(rows.map(r => ({
      user_id:          toStr(r.user_id),
      username:         toStr(r.username) || '',
      full_name:        toStr(r.full_name) || '',
      total_sessions:   toInt(r.total_sessions),
      total_score:      toInt(r.total_score),
      average_score:    Math.round(toFloat(r.average_score)),
      average_accuracy: Math.round(toFloat(r.average_accuracy)),
      best_score:       toInt(r.best_score),
      last_played:      toStr(r.last_played),
    })));
>>>>>>> eb0f918ab16e285c80b4089056cda86dc27cd092
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch performance.' });
  }
});

// ── GET /api/admin/questions (custom_questions) ─────────────────────────────
router.get('/questions', async (req, res) => {
  const { mode, level } = req.query;
  if (!mode || !level) return res.status(400).json({ error: 'mode and level required.' });
  try {
    const rows = await pool.query(
<<<<<<< HEAD
      'SELECT * FROM custom_question WHERE mode = ? AND level = ? ORDER BY created_at DESC',
      [mode, parseInt(level)]
=======
      'SELECT * FROM custom_questions WHERE mode=? AND level=? ORDER BY created_at DESC',
      [mode, toInt(level)]
>>>>>>> eb0f918ab16e285c80b4089056cda86dc27cd092
    );
    res.json(rows);
  } catch (err) {
    res.json([]);
  }
});

// ── POST /api/admin/questions ───────────────────────────────────────────────
router.post('/questions', async (req, res) => {
  const { mode, level, question, answer, wrong, solution, hint } = req.body;
  if (!mode || !level || !question || !answer)
    return res.status(400).json({ error: 'mode, level, question and answer are required.' });
  try {
    await pool.query(
<<<<<<< HEAD
      'INSERT INTO custom_question (mode, level, question_text, correct_answer, wrong_options, solution_steps, created_by) VALUES (?,?,?,?,?,?,?)',
      [mode, parseInt(level), question, answer, wrong || '', solution || '', req.session.user.user_id]
=======
      'INSERT INTO custom_questions (mode, level, question_text, correct_answer, wrong_options, solution_steps, hint_text, created_by) VALUES (?,?,?,?,?,?,?,?)',
      [mode, toInt(level), question, answer, wrong || '', solution || '', hint || '', req.session.user.user_id]
>>>>>>> eb0f918ab16e285c80b4089056cda86dc27cd092
    );
    await logActivity(req.session.user.user_id, 'ADD_QUESTION',
      `Added custom question for ${mode} L${level}`, null);
    res.json({ success: true });
  } catch (err) {
    console.error('[admin] add question error:', err.message);
    res.status(500).json({ error: 'Could not save question.' });
  }
});

// ── POST /api/admin/questions/delete ────────────────────────────────────────
router.post('/questions/delete', async (req, res) => {
  const { questionId } = req.body;
  try {
<<<<<<< HEAD
    await pool.query('DELETE FROM custom_question WHERE question_id = ?', [questionId]);
=======
    await pool.query('DELETE FROM custom_questions WHERE question_id=?', [questionId]);
    await logActivity(req.session.user.user_id, 'DELETE_QUESTION',
      `Deleted custom question ${questionId}`, null);
>>>>>>> eb0f918ab16e285c80b4089056cda86dc27cd092
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Could not delete question.' });
  }
});

// ── PDF export helpers ───────────────────────────────────────────────────────
function drawTable(doc, columns, rows) {
  const startX   = doc.x;
  const pageW    = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const colWidths = columns.map(c => c.width || Math.floor(pageW / columns.length));

  function header() {
    doc.font('Helvetica-Bold').fontSize(10);
    let x = startX;
    columns.forEach((c, i) => { doc.text(c.label, x, doc.y, { width: colWidths[i] }); x += colWidths[i]; });
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(9);
  }
  header();

  rows.forEach(row => {
    const heights = columns.map((c, i) => doc.heightOfString(String(row[c.key] ?? ''), { width: colWidths[i] }));
    const rowH    = Math.max(...heights, doc.currentLineHeight());
    if (doc.y + rowH > doc.page.height - doc.page.margins.bottom - 20) { doc.addPage(); header(); }
    let x = startX;
    columns.forEach((c, i) => { doc.text(String(row[c.key] ?? ''), x, doc.y, { width: colWidths[i] }); x += colWidths[i]; });
    doc.moveDown(0.2);
  });
}

router.get('/export/sessions', async (req, res) => {
  try {
    const rows = await pool.query(`SELECT s.session_id, u.username, u.full_name, s.mode, s.difficulty, s.score, s.total_questions, s.correct_answers, s.skipped_answers, s.hints_used, s.time_taken_seconds, s.played_at FROM sessions s JOIN users u ON u.user_id=s.user_id WHERE s.completed=1 ORDER BY s.played_at DESC`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="sessions.pdf"');
    const doc = new PDFDocument({ margin: 36, size: 'A4' });
    doc.pipe(res);
    doc.fontSize(16).text('All Sessions Report', { underline: true });
    doc.moveDown(0.4).fontSize(11).text(`Generated: ${new Date().toLocaleString()}`).moveDown(0.6);
    drawTable(doc, [
      { key: 'session_id',      label: 'ID',      width: 40 },
      { key: 'username',        label: 'User',     width: 80 },
      { key: 'mode',            label: 'Mode',     width: 80 },
      { key: 'difficulty',      label: 'Level',    width: 45 },
      { key: 'score',           label: 'Score',    width: 45 },
      { key: 'correct_answers', label: 'Correct',  width: 50 },
      { key: 'skipped_answers', label: 'Skipped',  width: 50 },
      { key: 'hints_used',      label: 'Hints',    width: 40 },
      { key: 'played_at',       label: 'Played At',width: 110 },
    ], rows);
    doc.end();
  } catch (err) { res.status(500).json({ error: 'Export failed.' }); }
});

router.get('/export/users', async (req, res) => {
  try {
    const rows = await pool.query(`SELECT u.user_id, u.username, u.full_name, u.email, u.role, ISNULL(ps.total_sessions,0) AS sessions, ISNULL(ps.average_accuracy,0) AS accuracy, u.created_at FROM users u LEFT JOIN performance_summary ps ON ps.user_id=u.user_id ORDER BY u.created_at DESC`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="users.pdf"');
    const doc = new PDFDocument({ margin: 36, size: 'A4' });
    doc.pipe(res);
    doc.fontSize(16).text('User List Report', { underline: true });
    doc.moveDown(0.4).fontSize(11).text(`Generated: ${new Date().toLocaleString()}`).moveDown(0.6);
    drawTable(doc, [
      { key: 'user_id',   label: 'ID',       width: 40 },
      { key: 'username',  label: 'Username', width: 90 },
      { key: 'full_name', label: 'Name',     width: 120 },
      { key: 'email',     label: 'Email',    width: 140 },
      { key: 'role',      label: 'Role',     width: 55 },
      { key: 'sessions',  label: 'Sessions', width: 55 },
      { key: 'accuracy',  label: 'Avg Acc',  width: 55 },
    ], rows);
    doc.end();
  } catch (err) { res.status(500).json({ error: 'Export failed.' }); }
});

module.exports = router;
