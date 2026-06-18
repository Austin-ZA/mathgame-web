// routes/game.js
//
// FLOW:
//   GET  /api/game/question  → generates question → saves to questions table
//                              → returns question + question_id to frontend
//   POST /api/game/answer    → receives question_id from frontend
//                              → saves to user_answers (FK to questions)
//   POST /api/game/finish    → marks session complete, updates summaries
//   GET  /api/game/history   → returns sessions list (last N days)
//   GET  /api/game/session/:id → returns session + answers JOINed to questions
//
// The questions table is the single source of truth for question text.
// History always reads from questions JOIN user_answers — never stores
// question text a second time anywhere else.

const express = require('express');
const router  = express.Router();
const { pool } = require('../db');
const { generateComputational, generateAlgebra, generateBinary } = require('./questionGenerator');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

function toInt(v)   { const n = parseInt(v);   return isNaN(n) ? 0 : n; }
function toFloat(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }
function toStr(v)   { return (v === null || v === undefined || v === 'NULL') ? null : String(v); }

// Write a row to admin_activity_log — never throws, never blocks
async function logActivity(actorId, actionType, description) {
  try {
    await pool.query(
      'INSERT INTO admin_activity_log (actor_id, action_type, description) VALUES (?,?,?)',
      [actorId, actionType, description]
    );
  } catch { /* non-fatal */ }
}

// ── POST /api/game/start ───────────────────────────────────────────────────
router.post('/start', async (req, res) => {
  const { mode, level } = req.body;
  if (!['computational','algebra','binary'].includes(mode))
    return res.status(400).json({ error: 'Invalid mode.' });

  const difficulty = mode === 'binary' ? 'level1' : `level${level || 1}`;
  const userId     = req.session.user.user_id;

  try {
    // OUTPUT INSERTED gives us the new session_id in the same statement
    const result = await pool.query(
      'INSERT INTO sessions (user_id, mode, difficulty, completed) OUTPUT INSERTED.session_id VALUES (?,?,?,0)',
      [userId, mode, difficulty]
    );

    const sessionId = toStr(result[0]?.session_id);
    if (!sessionId) throw new Error('No session_id returned from INSERT.');

    await logActivity(userId, 'SESSION_START', `Started ${mode} ${difficulty}`);
    res.json({ sessionId });
  } catch (err) {
    console.error('[game/start]', err.message);
    res.status(500).json({ error: 'Could not start session.' });
  }
});

// ── GET /api/game/question ─────────────────────────────────────────────────
// 1. Generate question in memory (questionGenerator.js)
// 2. Try to find it in questions table by (mode, difficulty, question_text)
// 3. If not found → INSERT it
// 4. Return question data + question_id to the frontend
//
// The frontend stores question_id and sends it back with every answer,
// so user_answers always has a FK link into questions.
router.get('/question', async (req, res) => {
  const { mode, level } = req.query;
  const difficulty = mode === 'binary' ? 'level1' : `level${level || 1}`;

  // Step 1 — generate
  let q;
  try {
    if      (mode === 'computational') q = generateComputational(parseInt(level) || 1);
    else if (mode === 'algebra')       q = generateAlgebra(parseInt(level) || 1);
    else if (mode === 'binary')        q = generateBinary();
    else return res.status(400).json({ error: 'Invalid mode.' });
  } catch (genErr) {
    console.error('[game/question] Generator error:', genErr.message);
    return res.status(500).json({ error: 'Could not generate question.' });
  }

  // Step 2 — look up existing row
  let questionId = null;
  try {
    const existing = await pool.query(
      'SELECT question_id FROM questions WHERE mode=? AND difficulty=? AND question_text=?',
      [mode, difficulty, q.questionText]
    );

    if (existing.length > 0) {
      // Already stored — reuse the id
      questionId = toStr(existing[0].question_id);
    } else {
      // Step 3 — insert new question
      const optionsJson = q.isMultipleChoice ? JSON.stringify(q.options) : null;
      const inserted = await pool.query(
        `INSERT INTO questions
           (mode, difficulty, question_text, correct_answer,
            hint_text, solution_steps, is_multiple_choice, options_json)
         OUTPUT INSERTED.question_id
         VALUES (?,?,?,?,?,?,?,?)`,
        [
          mode,
          difficulty,
          q.questionText,
          q.correctAnswer,
          q.hint          || '',
          q.solutionSteps || '',
          q.isMultipleChoice ? 1 : 0,
          optionsJson
        ]
      );
      questionId = toStr(inserted[0]?.question_id);
    }
  } catch (dbErr) {
    // DB failure must NOT stop the game — log it and continue without an id.
    // The answer will still save; it just won't have a question FK.
    console.error('[game/question] DB upsert error:', dbErr.message);
  }

  // Step 4 — return to frontend (always succeeds even if DB step failed)
  res.json({ ...q, questionId });
});

// ── POST /api/game/answer ──────────────────────────────────────────────────
// Frontend sends: sessionId, questionId, questionNumber,
//                 studentAnswer, isCorrect, hintUsed, timeTaken, status
//
// We insert into user_answers.  question_id is the FK into questions table —
// this is what makes history work (JOIN questions ON question_id).
router.post('/answer', async (req, res) => {
  const {
    sessionId, questionId, questionNumber,
    studentAnswer, isCorrect, hintUsed, timeTaken, status
  } = req.body;

  if (!sessionId)
    return res.status(400).json({ error: 'sessionId is required.' });

  // If questionId is missing (DB failure during question fetch), we still
  // need to save the answer — skip the FK insert gracefully.
  if (!questionId) {
    console.warn('[game/answer] No questionId — answer not saved to user_answers.');
    return res.json({ success: true, warning: 'Answer recorded in session only.' });
  }

  const correct      = isCorrect === true || isCorrect === 'true';
  const hint         = hintUsed  === true || hintUsed  === 'true' ? 1 : 0;
  const answerStatus = ['answered','skipped','timeout'].includes(status) ? status : 'answered';

  try {
    await pool.query(
      `INSERT INTO user_answers
         (session_id, question_id, question_number,
          student_answer, hint_used, is_correct, status, time_taken_seconds)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        sessionId,
        questionId,
        toInt(questionNumber) || 1,
        studentAnswer || null,
        hint,
        correct ? 1 : 0,
        answerStatus,
        toInt(timeTaken)
      ]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[game/answer]', err.message);
    res.status(500).json({ error: 'Could not save answer.' });
  }
});

// ── POST /api/game/finish ──────────────────────────────────────────────────
// Marks session completed=1, then updates:
//   performance_summary (one row per user, upserted)
//   leaderboard_snapshots (one row per user per day, upserted)
//   notifications (one row per session)
router.post('/finish', async (req, res) => {
  const {
    sessionId, score, totalQuestions, correctAnswers,
    skippedAnswers, hintsUsed, timeTaken
  } = req.body;

  const userId     = req.session.user.user_id;
  const safeScore  = toInt(score);
  const safeTotalQ = toInt(totalQuestions);
  const safeCorr   = toInt(correctAnswers);
  const safeSkip   = toInt(skippedAnswers);
  const safeHints  = toInt(hintsUsed);
  const safeTime   = toInt(timeTaken);
  const accuracy   = safeTotalQ > 0 ? Math.round((safeCorr / safeTotalQ) * 100) : 0;

  try {
    // 1. Mark session complete with final stats
    await pool.query(
      `UPDATE sessions
       SET score=?, total_questions=?, correct_answers=?,
           skipped_answers=?, hints_used=?, time_taken_seconds=?, completed=1
       WHERE session_id=? AND user_id=?`,
      [safeScore, safeTotalQ, safeCorr, safeSkip, safeHints, safeTime, sessionId, userId]
    );

    // 2. Upsert performance_summary
    const ps = await pool.query(
      'SELECT summary_id, total_sessions, total_score, best_score FROM performance_summary WHERE user_id=?',
      [userId]
    );

    if (ps.length === 0) {
      // First session ever for this user
      await pool.query(
        `INSERT INTO performance_summary
           (user_id, total_sessions, total_score, average_score, average_accuracy, best_score, last_played)
         VALUES (?,1,?,?,?,?,GETDATE())`,
        [userId, safeScore, safeScore, accuracy, safeScore]
      );
    } else {
      const prev        = ps[0];
      const newSessions = toInt(prev.total_sessions) + 1;
      const newTotal    = toInt(prev.total_score)    + safeScore;
      const newAvgScore = Math.round(newTotal / newSessions);
      const newBest     = Math.max(toInt(prev.best_score), safeScore);

      // Recalculate lifetime average accuracy from the sessions table itself
      const accRow = await pool.query(
        `SELECT AVG(CASE WHEN total_questions > 0
                   THEN CAST(correct_answers AS FLOAT) / total_questions * 100
                   ELSE NULL END) AS avg_acc
         FROM sessions
         WHERE user_id=? AND completed=1`,
        [userId]
      );
      const newAvgAcc = Math.round(toFloat(accRow[0]?.avg_acc));

      await pool.query(
        `UPDATE performance_summary
         SET total_sessions=?, total_score=?, average_score=?,
             average_accuracy=?, best_score=?, last_played=GETDATE(), updated_at=GETDATE()
         WHERE user_id=?`,
        [newSessions, newTotal, newAvgScore, newAvgAcc, newBest, userId]
      );
    }

    // 3. Upsert today's leaderboard snapshot
    const today = new Date().toISOString().slice(0, 10);  // 'YYYY-MM-DD'
    const lb = await pool.query(
      'SELECT snapshot_id, total_score, total_sessions FROM leaderboard_snapshots WHERE user_id=? AND snapshot_date=?',
      [userId, today]
    );

    if (lb.length === 0) {
      await pool.query(
        `INSERT INTO leaderboard_snapshots
           (user_id, snapshot_date, total_score, total_sessions, avg_accuracy)
         VALUES (?,?,?,1,?)`,
        [userId, today, safeScore, accuracy]
      );
    } else {
      const todayScore    = toInt(lb[0].total_score)    + safeScore;
      const todaySessions = toInt(lb[0].total_sessions) + 1;

      const todayAcc = await pool.query(
        `SELECT AVG(CASE WHEN total_questions > 0
                   THEN CAST(correct_answers AS FLOAT) / total_questions * 100
                   ELSE NULL END) AS avg_acc
         FROM sessions
         WHERE user_id=? AND completed=1 AND CAST(played_at AS DATE) = CAST(GETDATE() AS DATE)`,
        [userId]
      );

      await pool.query(
        `UPDATE leaderboard_snapshots
         SET total_score=?, total_sessions=?, avg_accuracy=?, updated_at=GETDATE()
         WHERE user_id=? AND snapshot_date=?`,
        [todayScore, todaySessions, Math.round(toFloat(todayAcc[0]?.avg_acc)), userId, today]
      );
    }

    // Recalculate today's rank positions for all users
    await pool.query(
      `UPDATE leaderboard_snapshots
       SET rank_position = r.rn
       FROM leaderboard_snapshots ls
       JOIN (
         SELECT snapshot_id,
                ROW_NUMBER() OVER (PARTITION BY snapshot_date ORDER BY total_score DESC) AS rn
         FROM leaderboard_snapshots
         WHERE snapshot_date = ?
       ) r ON ls.snapshot_id = r.snapshot_id
       WHERE ls.snapshot_date = ?`,
      [today, today]
    ).catch(() => {}); // non-fatal

    // 4. Insert notification
    const msg = accuracy >= 80 ? 'Great work!' : accuracy >= 50 ? 'Keep it up!' : 'Keep practising!';
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, body)
       VALUES (?, 'session_complete', 'Session Complete', ?)`,
      [userId, `You scored ${safeScore} pts with ${accuracy}% accuracy. ${msg}`]
    );

    // 5. Activity log
    await logActivity(userId, 'SESSION_FINISH',
      `Session ${sessionId} complete. Score ${safeScore}, accuracy ${accuracy}%`);

    res.json({ success: true });
  } catch (err) {
    console.error('[game/finish]', err.message);
    res.status(500).json({ error: 'Could not finalise session.' });
  }
});

// ── GET /api/game/history ──────────────────────────────────────────────────
// Returns a list of completed sessions for the last N days.
// The landing page and history page use this to show the sessions list.
// Clicking a session calls GET /api/game/session/:id which returns
// the actual questions from the questions table.
router.get('/history', async (req, res) => {
  const days   = toInt(req.query.days) || 7;
  const userId = req.session.user.user_id;

  try {
    const rows = await pool.query(
      `SELECT TOP 200
         session_id, mode, difficulty, score,
         total_questions, correct_answers, skipped_answers,
         hints_used, time_taken_seconds, completed, played_at
       FROM sessions
       WHERE user_id=?
         AND played_at >= DATEADD(day, -?, GETDATE())
       ORDER BY played_at DESC`,
      [userId, days]
    );

    res.json(rows.map(r => ({
      session_id:         toStr(r.session_id),
      mode:               toStr(r.mode),
      difficulty:         toStr(r.difficulty),
      score:              toInt(r.score),
      total_questions:    toInt(r.total_questions),
      correct_answers:    toInt(r.correct_answers),
      skipped_answers:    toInt(r.skipped_answers),
      hints_used:         toInt(r.hints_used),
      time_taken_seconds: toInt(r.time_taken_seconds),
      completed:          r.completed === '1' || r.completed === 1,
      played_at:          toStr(r.played_at),
    })));
  } catch (err) {
    console.error('[game/history]', err.message);
    res.status(500).json({ error: 'Could not fetch history.' });
  }
});

// ── GET /api/game/session/:id ──────────────────────────────────────────────
// Returns full session detail including every question and the student's answer.
//
// This is the key query that makes history work:
//   user_answers  (what the student answered)
//   JOIN questions (the actual question text, correct answer, hint, solution)
//
// The frontend sessionDetails page renders this as a review table.
router.get('/session/:id', async (req, res) => {
  const sessionId = req.params.id;
  const userId    = req.session.user.user_id;

  try {
    // Fetch session header
    const sessions = await pool.query(
      'SELECT * FROM sessions WHERE session_id=? AND user_id=?',
      [sessionId, userId]
    );
    if (!sessions || sessions.length === 0)
      return res.status(404).json({ error: 'Session not found.' });

    const s = sessions[0];

    // Fetch answers joined to questions
    // This is what populates the history review table
    const answers = await pool.query(
      `SELECT
         ua.answer_id,
         ua.question_number,
         ua.student_answer,
         ua.hint_used,
         ua.is_correct,
         ua.status,
         ua.time_taken_seconds,
         ua.answered_at,
         q.question_text,
         q.correct_answer,
         q.hint_text,
         q.solution_steps,
         q.is_multiple_choice,
         q.options_json
       FROM user_answers ua
       JOIN questions q ON q.question_id = ua.question_id
       WHERE ua.session_id = ?
       ORDER BY ua.question_number ASC, ua.answer_id ASC`,
      [sessionId]
    );

    res.json({
      session: {
        session_id:         toStr(s.session_id),
        mode:               toStr(s.mode),
        difficulty:         toStr(s.difficulty),
        score:              toInt(s.score),
        total_questions:    toInt(s.total_questions),
        correct_answers:    toInt(s.correct_answers),
        skipped_answers:    toInt(s.skipped_answers),
        hints_used:         toInt(s.hints_used),
        time_taken_seconds: toInt(s.time_taken_seconds),
        completed:          s.completed === '1' || s.completed === 1,
        played_at:          toStr(s.played_at),
      },
      answers: answers.map(a => ({
        answer_id:          toStr(a.answer_id),
        question_number:    toInt(a.question_number),
        question_text:      toStr(a.question_text),
        correct_answer:     toStr(a.correct_answer),
        student_answer:     toStr(a.student_answer),
        hint_text:          toStr(a.hint_text),
        solution_steps:     toStr(a.solution_steps),
        is_multiple_choice: a.is_multiple_choice === '1' || a.is_multiple_choice === 1,
        options_json:       toStr(a.options_json),
        hint_used:          a.hint_used === '1' || a.hint_used === 1,
        is_correct:         a.is_correct === '1' || a.is_correct === 1,
        status:             toStr(a.status),
        time_taken_seconds: toInt(a.time_taken_seconds),
        answered_at:        toStr(a.answered_at),
      }))
    });
  } catch (err) {
    console.error('[game/session]', err.message);
    res.status(500).json({ error: `Could not load session: ${err.message}` });
  }
});

module.exports = router;
