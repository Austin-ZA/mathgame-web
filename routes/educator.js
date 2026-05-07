// routes/educator.js
const express = require('express');
const router  = express.Router();
const { pool } = require('../db/connection');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);
router.use((req, res, next) => {
  const role = req.session.user?.role;
  if (role !== 'educator' && role !== 'admin')
    return res.status(403).json({ error: 'Educator access required.' });
  next();
});

// sqlcmd returns every column value as a string.
function toInt(v)   { const n = parseInt(v);   return isNaN(n) ? 0 : n; }
function toFloat(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }
function toStr(v)   { return (v === null || v === undefined || v === 'NULL') ? null : String(v); }

// GET /api/educator/stats
router.get('/stats', async (req, res) => {
  const eduId = req.session.user.user_id;
  try {
    const students = await getMyStudents(eduId);
    const ids = students.map(s => s.user_id);

    if (ids.length === 0)
      return res.json({ activeThisWeek: 0, avgScore: 0, modeAccuracy: {} });

    const placeholders = ids.map(() => '?').join(',');

    const activeRows = await pool.query(
      'SELECT COUNT(DISTINCT user_id) AS active FROM sessions' +
      ' WHERE user_id IN (' + placeholders + ')' +
      ' AND played_at >= DATEADD(day, -7, GETDATE())',
      ids
    );
    const scoreRows = await pool.query(
      'SELECT AVG(CAST(score AS FLOAT)) AS avgScore FROM sessions' +
      ' WHERE user_id IN (' + placeholders + ')',
      ids
    );
    // Join game_mode to get mode_name for display; sessions.mode stores the mode_name text
    const modeRows = await pool.query(
      'SELECT s.mode AS mode_name,' +
      ' AVG(CASE WHEN s.total_questions > 0 THEN CAST(s.correct_answers AS FLOAT)/s.total_questions*100 ELSE NULL END) AS avg_acc' +
      ' FROM sessions s' +
      ' INNER JOIN game_mode gm ON gm.mode_name = s.mode' +
      ' WHERE s.user_id IN (' + placeholders + ')' +
      ' AND s.played_at >= DATEADD(day, -7, GETDATE())' +
      ' GROUP BY s.mode',
      ids
    );

    const modeAccuracy = {};
    modeRows.forEach(function(r) {
      modeAccuracy[toStr(r.mode_name)] = Math.round(toFloat(r.avg_acc));
    });

    const activeRow = activeRows[0] || {};
    const scoreRow  = scoreRows[0]  || {};

    res.json({
      activeThisWeek: toInt(activeRow.active),
      avgScore:       Math.round(toFloat(scoreRow.avgScore)),
      modeAccuracy,
    });
  } catch (err) {
    console.error('[educator] stats error:', err.message);
    res.status(500).json({ error: 'Could not load stats.' });
  }
});

// GET /api/educator/students
router.get('/students', async (req, res) => {
  const eduId = req.session.user.user_id;
  try {
    const students = await getMyStudents(eduId);
    const ids = students.map(s => s.user_id);

    if (ids.length === 0) return res.json([]);

    const placeholders = ids.map(() => '?').join(',');

    const stats = await pool.query(
      'SELECT user_id, COUNT(*) AS total_sessions,' +
      ' AVG(CASE WHEN total_questions > 0 THEN CAST(correct_answers AS FLOAT)/total_questions*100 ELSE NULL END) AS avg_accuracy,' +
      ' MAX(played_at) AS last_active' +
      ' FROM sessions WHERE user_id IN (' + placeholders + ') GROUP BY user_id',
      ids
    );

    const statMap = {};
    stats.forEach(function(s) { statMap[String(s.user_id)] = s; });

    const bestModes = await pool.query(
      'SELECT user_id, mode, COUNT(*) AS cnt FROM sessions' +
      ' WHERE user_id IN (' + placeholders + ') GROUP BY user_id, mode',
      ids
    );
    const bestModeMap = {};
    bestModes.forEach(function(r) {
      const key = String(r.user_id);
      if (!bestModeMap[key] || toInt(r.cnt) > toInt(bestModeMap[key].cnt))
        bestModeMap[key] = r;
    });

    const result = students.map(function(s) {
      const key = String(s.user_id);
      const st  = statMap[key] || {};
      const lastActive   = st.last_active ? new Date(toStr(st.last_active)) : null;
      const daysInactive = lastActive && !isNaN(lastActive)
        ? Math.floor((Date.now() - lastActive.getTime()) / 86400000)
        : null;
      return {
        user_id:        toStr(s.user_id),
        username:       toStr(s.username)  || '',
        full_name:      toStr(s.full_name) || '',
        email:          toStr(s.email),
        total_sessions: toInt(st.total_sessions),
        avg_accuracy:   st.avg_accuracy !== null && st.avg_accuracy !== undefined ? Math.round(toFloat(st.avg_accuracy)) : null,
        last_active:    st.last_active ? toStr(st.last_active) : null,
        days_inactive:  daysInactive,
        best_mode:      bestModeMap[key] ? toStr(bestModeMap[key].mode) : null,
      };
    });

    res.json(result);
  } catch (err) {
    console.error('[educator] students error:', err.message);
    res.status(500).json({ error: 'Could not load students.' });
  }
});

// GET /api/educator/sessions
router.get('/sessions', async (req, res) => {
  const eduId = req.session.user.user_id;
  const limit = parseInt(req.query.limit) || 20;
  try {
    const students = await getMyStudents(eduId);
    const ids = students.map(s => s.user_id);
    if (ids.length === 0) return res.json([]);

    const placeholders = ids.map(() => '?').join(',');
    const rows = await pool.query(
      'SELECT TOP ' + limit +
      ' s.session_id, s.user_id, s.mode, s.difficulty,' +
      ' s.score, s.total_questions, s.correct_answers, s.time_taken_seconds, s.played_at,' +
      ' u.username, u.full_name' +
      ' FROM sessions s JOIN users u ON u.user_id = s.user_id' +
      ' WHERE s.user_id IN (' + placeholders + ') ORDER BY s.played_at DESC',
      ids
    );
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
    console.error('[educator] sessions error:', err.message);
    res.status(500).json({ error: 'Could not fetch sessions.' });
  }
});

// GET /api/educator/export/class
router.get('/export/class', async (req, res) => {
  const eduId = req.session.user.user_id;
  try {
    const students = await getMyStudents(eduId);
    const ids = students.map(s => s.user_id);
    if (ids.length === 0) return res.send('No students.');

    const placeholders = ids.map(() => '?').join(',');
    const rows = await pool.query(
      'SELECT s.session_id, u.username, u.full_name, s.mode, s.difficulty,' +
      ' s.score, s.total_questions, s.correct_answers, s.time_taken_seconds, s.played_at' +
      ' FROM sessions s JOIN users u ON u.user_id = s.user_id' +
      ' WHERE s.user_id IN (' + placeholders + ') ORDER BY s.played_at DESC',
      ids
    );
    const header = 'session_id,username,full_name,mode,difficulty,score,total_questions,correct_answers,time_taken_seconds,played_at';
    const csv = [header, ...rows.map(r =>
      [r.session_id,r.username,r.full_name,r.mode,r.difficulty,r.score,
       r.total_questions,r.correct_answers,r.time_taken_seconds,r.played_at].join(',')
    )].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="class_report.csv"');
    res.send(csv);
  } catch (err) {
    console.error('[educator] export class error:', err.message);
    res.status(500).json({ error: 'Export failed.' });
  }
});

// GET /api/educator/export/students
router.get('/export/students', async (req, res) => {
  const eduId = req.session.user.user_id;
  try {
    const students = await getMyStudents(eduId);
    const ids = students.map(s => s.user_id);
    if (ids.length === 0) return res.send('No students.');

    const placeholders = ids.map(() => '?').join(',');
    const stats = await pool.query(
      'SELECT user_id, COUNT(*) AS total_sessions,' +
      ' AVG(CASE WHEN total_questions > 0 THEN CAST(correct_answers AS FLOAT)/total_questions*100 ELSE NULL END) AS avg_accuracy,' +
      ' MAX(played_at) AS last_active' +
      ' FROM sessions WHERE user_id IN (' + placeholders + ') GROUP BY user_id',
      ids
    );
    const statMap = {};
    stats.forEach(s => { statMap[String(s.user_id)] = s; });

    const header = 'user_id,username,full_name,email,total_sessions,avg_accuracy,last_active';
    const csv = [header, ...students.map(s => {
      const st = statMap[String(s.user_id)] || {};
      return [
        s.user_id, s.username, s.full_name, s.email || '',
        toInt(st.total_sessions),
        Math.round(toFloat(st.avg_accuracy)),
        toStr(st.last_active) || ''
      ].join(',');
    })].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="students_report.csv"');
    res.send(csv);
  } catch (err) {
    console.error('[educator] export students error:', err.message);
    res.status(500).json({ error: 'Export failed.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper: get students assigned to this educator.
// Queries educator_student_map (ERD-aligned table name).
// Falls back to all students if no assignments exist yet.
// ─────────────────────────────────────────────────────────────────────────────
async function getMyStudents(eduId) {
  try {
    const rows = await pool.query(
      'SELECT u.user_id, u.username, u.full_name, u.email' +
      ' FROM educator_student_map esm JOIN users u ON u.user_id = esm.student_id' +
      ' WHERE esm.educator_id = ?',
      [eduId]
    );
    // If this educator has assigned students, return them.
    if (rows && rows.length > 0) return rows;
    throw new Error('no assigned students');
  } catch (_err) {
    // Fall back: return all students so the dashboard is never empty.
    try {
      return await pool.query(
        "SELECT user_id, username, full_name, email FROM users WHERE role = 'student' ORDER BY full_name"
      );
    } catch (_err2) {
      return [];
    }
  }
}

module.exports = router;
