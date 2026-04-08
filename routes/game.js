// routes/game.js
// Mirrors GameScreen.java + SessionDAO.java logic — REST API for game sessions

const express = require('express');
const router  = express.Router();
const { pool } = require('../db/connection');
const { generateComputational, generateAlgebra, generateBinary } = require('./questionGenerator');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// ── POST /api/game/start ───────────────────────────────────────────────────
// Creates a new game session in the DB (mirrors SessionDAO.createSession)
router.post('/start', async (req, res) => {
  const { mode, level } = req.body;
  const validModes = ['computational', 'algebra', 'binary'];
  if (!validModes.includes(mode))
    return res.status(400).json({ error: 'Invalid mode.' });

  const difficulty = mode === 'binary' ? 'level1' : `level${level || 1}`;
  try {
    const { pool } = require('../db/connection');

    // Insert session and get the new ID
    await pool.query(
      'INSERT INTO sessions (user_id, mode, difficulty) VALUES (?, ?, ?)',
      [req.session.user.user_id, mode, difficulty]
    );

    // Get the last inserted ID
    const result = await pool.query('SELECT SCOPE_IDENTITY() as sessionId');
    const sessionId = result[0].sessionId;

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
// Saves one answer and returns whether it was correct
router.post('/answer', async (req, res) => {
  const { sessionId, questionText, correctAnswer, studentAnswer, timeTaken } = req.body;
  const isCorrect = correctAnswer?.trim().toLowerCase() === studentAnswer?.trim().toLowerCase();
  try {
    await pool.query(
      'INSERT INTO answers (session_id, question_text, correct_answer, student_answer, is_correct, time_taken_seconds) VALUES (?,?,?,?,?,?)',
      [sessionId, questionText, correctAnswer, studentAnswer, isCorrect, timeTaken || 0]
    );
    res.json({ isCorrect, correctAnswer });
  } catch (err) {
    console.error('[game] Save answer error:', err.message);
    res.status(500).json({ error: 'Could not save answer.' });
  }
});

// ── POST /api/game/finish ──────────────────────────────────────────────────
// Finalises the session (mirrors SessionDAO.finaliseSession)
router.post('/finish', async (req, res) => {
  const { sessionId, score, totalQuestions, correctAnswers, timeTaken } = req.body;
  try {
    await pool.query(
      'UPDATE sessions SET score=?, total_questions=?, correct_answers=?, time_taken_seconds=? WHERE session_id=? AND user_id=?',
      [score, totalQuestions, correctAnswers, timeTaken, sessionId, req.session.user.user_id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[game] Finish session error:', err.message);
    res.status(500).json({ error: 'Could not finalise session.' });
  }
});

// ── GET /api/game/history ──────────────────────────────────────────────────
// Returns session history for the logged-in user (mirrors SessionDAO.getSessionsByUser)
router.get('/history', async (req, res) => {
  try {
    const { pool } = require('../db/connection');
    const rows = await pool.query(
      'SELECT TOP 20 * FROM sessions WHERE user_id = ? ORDER BY played_at DESC',
      [req.session.user.user_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch history.' });
  }
});

module.exports = router;
