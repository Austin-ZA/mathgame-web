// routes/game.js
// ─────────────────────────────────────────────────────────────────────────────
//  MathGameApp Web — Game API Routes
//  FIX 1: createSession now uses LAST_INSERT_ID() (MySQL) not SCOPE_IDENTITY()
//  FIX 2: history now uses LIMIT 20 (MySQL) not TOP 20 (SQL Server)
//  FIX 3: finaliseSession correctly saves score, correct_answers, time_taken
//  Mirrors: SessionDAO.java exactly
// ─────────────────────────────────────────────────────────────────────────────

const express   = require('express');
const router    = express.Router();
const { pool }  = require('../db/connection');
const { generateComputational, generateAlgebra, generateBinary } = require('./questionGenerator');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// ── POST /api/game/start ─────────────────────────────────────────────────────
// Creates a new game session (mirrors SessionDAO.createSession)
router.post('/start', async (req, res) => {
  const { mode, level } = req.body;
  const validModes = ['computational', 'algebra', 'binary'];
  if (!validModes.includes(mode))
    return res.status(400).json({ error: 'Invalid mode.' });

  const difficulty = mode === 'binary' ? 'level1' : `level${level || 1}`;
  try {
    // FIX: Use single INSERT + LAST_INSERT_ID() for MySQL (was SCOPE_IDENTITY() for SQL Server)
    await pool.query(
      'INSERT INTO sessions (user_id, mode, difficulty) VALUES (?, ?, ?)',
      [req.session.user.user_id, mode, difficulty]
    );
    const idResult = await pool.query('SELECT LAST_INSERT_ID() as sessionId');
    const sessionId = idResult[0].sessionId;

    res.json({ sessionId });
  } catch (err) {
    console.error('[game] Start session error:', err.message);
    res.status(500).json({ error: 'Could not start session.' });
  }
});

// ── GET /api/game/question ───────────────────────────────────────────────────
// Returns a freshly generated question (stateless, no DB write)
router.get('/question', (req, res) => {
  const { mode, level } = req.query;
  let q;
  if (mode === 'computational')  q = generateComputational(parseInt(level) || 1);
  else if (mode === 'algebra')   q = generateAlgebra(parseInt(level) || 1);
  else if (mode === 'binary')    q = generateBinary();
  else return res.status(400).json({ error: 'Invalid mode.' });
  res.json(q);
});

// ── POST /api/game/answer ────────────────────────────────────────────────────
// Saves one answer (mirrors SessionDAO.saveAnswer)
router.post('/answer', async (req, res) => {
  const { sessionId, questionText, correctAnswer, studentAnswer, timeTaken } = req.body;
  const isCorrect = correctAnswer?.trim().toLowerCase() === studentAnswer?.trim().toLowerCase();
  try {
    await pool.query(
      'INSERT INTO answers (session_id, question_text, correct_answer, student_answer, is_correct, time_taken_seconds) VALUES (?,?,?,?,?,?)',
      [sessionId, questionText, correctAnswer, studentAnswer, isCorrect ? 1 : 0, timeTaken || 0]
    );
    res.json({ isCorrect, correctAnswer });
  } catch (err) {
    console.error('[game] Save answer error:', err.message);
    res.status(500).json({ error: 'Could not save answer.' });
  }
});

// ── POST /api/game/finish ────────────────────────────────────────────────────
// FIX: Finalises session with ALL fields (mirrors SessionDAO.finaliseSession)
// Original bug: correctAnswers was being sent as undefined from the frontend
router.post('/finish', async (req, res) => {
  const { sessionId, score, totalQuestions, correctAnswers, timeTaken } = req.body;

  // Validate
  if (!sessionId) return res.status(400).json({ error: 'sessionId required.' });

  try {
    const result = await pool.query(
      `UPDATE sessions
       SET score = ?,
           total_questions = ?,
           correct_answers = ?,
           time_taken_seconds = ?
       WHERE session_id = ? AND user_id = ?`,
      [
        score         || 0,
        totalQuestions || 0,
        correctAnswers || 0,   // FIX: was never set correctly in original
        timeTaken      || 0,   // FIX: was 0 always in original
        sessionId,
        req.session.user.user_id
      ]
    );
    res.json({ success: true, rowsAffected: result.affectedRows });
  } catch (err) {
    console.error('[game] Finish session error:', err.message);
    res.status(500).json({ error: 'Could not finalise session.' });
  }
});

// ── GET /api/game/history ────────────────────────────────────────────────────
// FIX: Use LIMIT (MySQL) not TOP (SQL Server)
// Mirrors SessionDAO.getSessionsByUser
router.get('/history', async (req, res) => {
  try {
    const rows = await pool.query(
      'SELECT * FROM sessions WHERE user_id = ? ORDER BY played_at DESC LIMIT 20',
      [req.session.user.user_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('[game] History error:', err.message);
    res.status(500).json({ error: 'Could not fetch history.' });
  }
});

module.exports = router;
