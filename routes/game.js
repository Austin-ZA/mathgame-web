// routes/game.js
// Mirrors GameScreen.java + SessionDAO.java logic — REST API for game sessions

const express = require('express');
const router  = express.Router();
const { pool } = require('../db');
const { generateComputational, generateAlgebra, generateBinary } = require('./questionGenerator');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// ── POST /api/game/start ───────────────────────────────────────────────────
// FIX: Use OUTPUT INSERTED.session_id to get the new ID atomically.
// The old two-step (INSERT then SCOPE_IDENTITY() in separate sqlcmd calls)
// returned NULL because each execSync call runs in its own connection context.
router.post('/start', async (req, res) => {
  const { mode, level } = req.body;
  const validModes = ['computational', 'algebra', 'binary'];
  if (!validModes.includes(mode))
    return res.status(400).json({ error: 'Invalid mode.' });

  const difficulty = mode === 'binary' ? 'level1' : `level${level || 1}`;
  try {
      const result = await pool.query(
        'INSERT INTO session (user_id, mode, difficulty) OUTPUT INSERTED.session_id VALUES (?, ?, ?)',
      [req.session.user.user_id, mode, difficulty]
    );
    const sessionId = result[0]?.session_id;
    if (!sessionId) throw new Error('No session_id returned from INSERT');
    res.json({ sessionId });
  } catch (err) {
    console.error('[game] Start session error:', err.message);
    res.status(500).json({ error: 'Could not start session.' });
  }
});

// ── GET /api/game/question ─────────────────────────────────────────────────
// Returns a freshly generated question (stateless, no DB write here)
router.get('/question', (req, res) => {
  const { mode, level } = req.query;
  let q;
  if (mode === 'computational')  q = generateComputational(parseInt(level) || 1);
  else if (mode === 'algebra')   q = generateAlgebra(parseInt(level) || 1);
  else if (mode === 'binary')    q = generateBinary();
  else return res.status(400).json({ error: 'Invalid mode.' });
  res.json(q);
});

// ── POST /api/game/answer ──────────────────────────────────────────────────
// FIX: isCorrect is now passed as boolean from the frontend (already evaluated).
// The connection.js toSqlLiteral() converts true→1, false→0 for the BIT column.
// Old version wrapped everything in quotes so 'true' failed the BIT insert.
router.post('/answer', async (req, res) => {
  const { sessionId, questionNumber, questionText, correctAnswer, studentAnswer, isCorrect, timeTaken } = req.body;
  const correct = typeof isCorrect === 'boolean'
    ? isCorrect
    : correctAnswer?.trim().toLowerCase() === studentAnswer?.trim().toLowerCase();
  try {
      await pool.query(
        'INSERT INTO answer (session_id, question_number, question_text, correct_answer, student_answer, is_correct, time_taken_seconds) VALUES (?,?,?,?,?,?,?)',
      [sessionId, questionNumber || 0, questionText, correctAnswer, studentAnswer, correct, timeTaken || 0]
    );
    res.json({ isCorrect: correct, correctAnswer });
  } catch (err) {
    console.error('[game] Save answer error:', err.message);
    res.status(500).json({ error: 'Could not save answer.' });
  }
});

// ── POST /api/game/finish ──────────────────────────────────────────────────
// Finalises the session — updates score, total_questions, correct_answers, time.
// All values are integers so toSqlLiteral() keeps them unquoted → SQL Server accepts them.
router.post('/finish', async (req, res) => {
  const { sessionId, score, totalQuestions, correctAnswers, timeTaken } = req.body;
  try {
    await pool.query(
      'UPDATE session SET score=?, total_questions=?, correct_answers=?, time_taken_seconds=? WHERE session_id=? AND user_id=?',
      [
        parseInt(score)          || 0,
        parseInt(totalQuestions) || 0,
        parseInt(correctAnswers) || 0,
        parseInt(timeTaken)      || 0,
        sessionId,
        req.session.user.user_id
      ]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[game] Finish session error:', err.message);
    res.status(500).json({ error: 'Could not finalise session.' });
  }
});

// ── GET /api/game/history ──────────────────────────────────────────────────
// Returns last 20 sessions for the logged-in user
router.get('/history', async (req, res) => {
  const days = parseInt(req.query.days) || 7;
  try {
    const rows = await pool.query(
        'SELECT TOP 100 * FROM session WHERE user_id = ? AND played_at >= DATEADD(day, -?, GETDATE()) ORDER BY played_at DESC',
      [req.session.user.user_id, days]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch history.' });
  }
});

// ── GET /api/game/session/:id ───────────────────────────────────────────────
// Returns session info and answers for a given session
router.get('/session/:id', async (req, res) => {
  const sessionId = req.params.id;
  try {
    const sessions = await pool.query('SELECT * FROM session WHERE session_id = ? AND user_id = ?', [sessionId, req.session.user.user_id]);
    if (!sessions || sessions.length === 0) return res.status(404).json({ error: 'Session not found.' });
    const session = sessions[0];
    const answers = await pool.query('SELECT * FROM answer WHERE session_id = ? ORDER BY question_number, answer_id', [sessionId]);
    res.json({ session, answers });
  } catch (err) {
    console.error('[game] Get session error:', err.message);
    res.status(500).json({ error: `Failed to fetch session: ${err.message}` });
  }
});

module.exports = router;
