// routes/game.js
// Game session API — stores every generated question in questions table
// and every answer in user_answers table, then updates performance_summary,
// leaderboard_snapshots and notifications after each session finishes.

const express = require('express');
const router  = express.Router();
const { pool } = require('../db');
const { generateComputational, generateAlgebra, generateBinary } = require('./questionGenerator');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

function toInt(v)   { const n = parseInt(v);   return isNaN(n) ? 0 : n; }
function toFloat(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }
function toStr(v)   { return (v === null || v === undefined || v === 'NULL') ? null : String(v); }

// ── POST /api/game/start ───────────────────────────────────────────────────
router.post('/start', async (req, res) => {
  const { mode, level } = req.body;
  const validModes = ['computational', 'algebra', 'binary'];
  if (!validModes.includes(mode))
    return res.status(400).json({ error: 'Invalid mode.' });

  const difficulty = mode === 'binary' ? 'level1' : `level${level || 1}`;
  try {
<<<<<<< HEAD
      const result = await pool.query(
        'INSERT INTO session (user_id, mode, difficulty) OUTPUT INSERTED.session_id VALUES (?, ?, ?)',
=======
    const result = await pool.query(
      'INSERT INTO sessions (user_id, mode, difficulty, completed) OUTPUT INSERTED.session_id VALUES (?, ?, ?, 0)',
>>>>>>> eb0f918ab16e285c80b4089056cda86dc27cd092
      [req.session.user.user_id, mode, difficulty]
    );
    const sessionId = result[0]?.session_id;
    if (!sessionId) throw new Error('No session_id returned from INSERT');

    // Log activity
    await logActivity(req.session.user.user_id, 'SESSION_START',
      `Started ${mode} session (${difficulty})`, null);

    res.json({ sessionId });
  } catch (err) {
    console.error('[game] Start session error:', err.message);
    res.status(500).json({ error: 'Could not start session.' });
  }
});

// ── GET /api/game/question ─────────────────────────────────────────────────
// Generates a question, upserts it into questions table, returns with question_id
router.get('/question', async (req, res) => {
  const { mode, level } = req.query;
  let q;
  if (mode === 'computational')  q = generateComputational(parseInt(level) || 1);
  else if (mode === 'algebra')   q = generateAlgebra(parseInt(level) || 1);
  else if (mode === 'binary')    q = generateBinary();
  else return res.status(400).json({ error: 'Invalid mode.' });

  const difficulty = mode === 'binary' ? 'level1' : `level${level || 1}`;

  try {
    // Try to find an existing row for this exact question text
    let rows = await pool.query(
      'SELECT question_id FROM questions WHERE mode=? AND difficulty=? AND question_text=?',
      [mode, difficulty, q.questionText]
    );

    let questionId;
    if (rows.length > 0) {
      questionId = toStr(rows[0].question_id);
    } else {
      // Insert new question
      const optionsJson = q.isMultipleChoice ? JSON.stringify(q.options) : null;
      const ins = await pool.query(
        'INSERT INTO questions (mode, difficulty, question_text, correct_answer, hint_text, solution_steps, is_multiple_choice, options_json) OUTPUT INSERTED.question_id VALUES (?,?,?,?,?,?,?,?)',
        [mode, difficulty, q.questionText, q.correctAnswer,
         q.hint || '', q.solutionSteps || '',
         q.isMultipleChoice ? 1 : 0,
         optionsJson]
      );
      questionId = toStr(ins[0]?.question_id);
    }

    res.json({ ...q, questionId });
  } catch (err) {
    // Even if DB insert fails, still return the question so game is not blocked
    console.error('[game] Question upsert error:', err.message);
    res.json({ ...q, questionId: null });
  }
});

// ── POST /api/game/answer ──────────────────────────────────────────────────
// Saves one answer to user_answers (linked to questions via question_id).
router.post('/answer', async (req, res) => {
  const {
    sessionId, questionId, questionNumber,
    studentAnswer, isCorrect, hintUsed, timeTaken, status
  } = req.body;

  if (!sessionId || !questionId)
    return res.status(400).json({ error: 'sessionId and questionId are required.' });

  const correct     = typeof isCorrect === 'boolean' ? isCorrect : false;
  const answerStatus = ['answered','skipped','timeout'].includes(status) ? status : 'answered';
  const hint        = hintUsed ? 1 : 0;

  try {
<<<<<<< HEAD
      await pool.query(
        'INSERT INTO answer (session_id, question_number, question_text, correct_answer, student_answer, is_correct, time_taken_seconds) VALUES (?,?,?,?,?,?,?)',
      [sessionId, questionNumber || 0, questionText, correctAnswer, studentAnswer, correct, timeTaken || 0]
=======
    await pool.query(
      'INSERT INTO user_answers (session_id, question_id, question_number, student_answer, hint_used, is_correct, status, time_taken_seconds) VALUES (?,?,?,?,?,?,?,?)',
      [sessionId, questionId, questionNumber || 1,
       studentAnswer || null, hint, correct ? 1 : 0,
       answerStatus, toInt(timeTaken)]
>>>>>>> eb0f918ab16e285c80b4089056cda86dc27cd092
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[game] Save answer error:', err.message);
    res.status(500).json({ error: 'Could not save answer.' });
  }
});

// ── POST /api/game/finish ──────────────────────────────────────────────────
// Finalises session, then updates performance_summary, leaderboard, notifications.
router.post('/finish', async (req, res) => {
  const { sessionId, score, totalQuestions, correctAnswers,
          skippedAnswers, hintsUsed, timeTaken } = req.body;
  const userId = req.session.user.user_id;

  const safeScore    = toInt(score);
  const safeTotalQ   = toInt(totalQuestions);
  const safeCorrect  = toInt(correctAnswers);
  const safeSkipped  = toInt(skippedAnswers);
  const safeHints    = toInt(hintsUsed);
  const safeTime     = toInt(timeTaken);

  try {
    // 1. Mark session complete
    await pool.query(
<<<<<<< HEAD
      'UPDATE session SET score=?, total_questions=?, correct_answers=?, time_taken_seconds=? WHERE session_id=? AND user_id=?',
      [
        parseInt(score)          || 0,
        parseInt(totalQuestions) || 0,
        parseInt(correctAnswers) || 0,
        parseInt(timeTaken)      || 0,
        sessionId,
        req.session.user.user_id
      ]
=======
      'UPDATE sessions SET score=?, total_questions=?, correct_answers=?, skipped_answers=?, hints_used=?, time_taken_seconds=?, completed=1 WHERE session_id=? AND user_id=?',
      [safeScore, safeTotalQ, safeCorrect, safeSkipped, safeHints, safeTime, sessionId, userId]
>>>>>>> eb0f918ab16e285c80b4089056cda86dc27cd092
    );

    // 2. Update performance_summary (upsert pattern via two queries)
    const accuracy = safeTotalQ > 0 ? (safeCorrect / safeTotalQ) * 100 : 0;

    const existing = await pool.query(
      'SELECT summary_id, total_sessions, total_score, best_score FROM performance_summary WHERE user_id=?',
      [userId]
    );

    if (existing.length === 0) {
      await pool.query(
        'INSERT INTO performance_summary (user_id, total_sessions, total_score, average_score, average_accuracy, best_score, last_played) VALUES (?,1,?,?,?,?,GETDATE())',
        [userId, safeScore, safeScore, Math.round(accuracy), safeScore]
      );
    } else {
      const prev     = existing[0];
      const newTotal = toInt(prev.total_sessions) + 1;
      const newTScore = toInt(prev.total_score) + safeScore;
      const newAvgScore = Math.round(newTScore / newTotal);
      const newBest  = Math.max(toInt(prev.best_score), safeScore);

      // Recalculate average accuracy from sessions table
      const accRows = await pool.query(
        'SELECT AVG(CASE WHEN total_questions>0 THEN CAST(correct_answers AS FLOAT)/total_questions*100 ELSE NULL END) AS avg_acc FROM sessions WHERE user_id=? AND completed=1',
        [userId]
      );
      const newAvgAcc = Math.round(toFloat(accRows[0]?.avg_acc));

      await pool.query(
        'UPDATE performance_summary SET total_sessions=?, total_score=?, average_score=?, average_accuracy=?, best_score=?, last_played=GETDATE(), updated_at=GETDATE() WHERE user_id=?',
        [newTotal, newTScore, newAvgScore, newAvgAcc, newBest, userId]
      );
    }

    // 3. Upsert today's leaderboard snapshot
    const today = new Date().toISOString().slice(0, 10);
    const lbExisting = await pool.query(
      'SELECT snapshot_id, total_score, total_sessions FROM leaderboard_snapshots WHERE user_id=? AND snapshot_date=?',
      [userId, today]
    );

    if (lbExisting.length === 0) {
      await pool.query(
        'INSERT INTO leaderboard_snapshots (user_id, snapshot_date, total_score, total_sessions, avg_accuracy) VALUES (?,?,?,1,?)',
        [userId, today, safeScore, Math.round(accuracy)]
      );
    } else {
      const lb = lbExisting[0];
      const newDayScore = toInt(lb.total_score) + safeScore;
      const newDaySess  = toInt(lb.total_sessions) + 1;

      // Recalculate today's accuracy
      const todayAccRows = await pool.query(
        "SELECT AVG(CASE WHEN total_questions>0 THEN CAST(correct_answers AS FLOAT)/total_questions*100 ELSE NULL END) AS avg_acc FROM sessions WHERE user_id=? AND completed=1 AND CAST(played_at AS DATE)=CAST(GETDATE() AS DATE)",
        [userId]
      );
      const todayAcc = Math.round(toFloat(todayAccRows[0]?.avg_acc));

      await pool.query(
        'UPDATE leaderboard_snapshots SET total_score=?, total_sessions=?, avg_accuracy=?, updated_at=GETDATE() WHERE user_id=? AND snapshot_date=?',
        [newDayScore, newDaySess, todayAcc, userId, today]
      );
    }

    // Rebuild rank positions for today
    await pool.query(
      "UPDATE leaderboard_snapshots SET rank_position = r.rn FROM leaderboard_snapshots ls JOIN (SELECT snapshot_id, ROW_NUMBER() OVER (PARTITION BY snapshot_date ORDER BY total_score DESC) AS rn FROM leaderboard_snapshots WHERE snapshot_date=?) r ON ls.snapshot_id=r.snapshot_id WHERE ls.snapshot_date=?",
      [today, today]
    ).catch(() => {}); // non-fatal if rank update fails

    // 4. Create notification
    const accLabel = accuracy >= 80 ? 'Great work!' : accuracy >= 50 ? 'Keep it up!' : 'Keep practising!';
    await pool.query(
      "INSERT INTO notifications (user_id, type, title, body) VALUES (?,'session_complete','Session Complete',?)",
      [userId, `You scored ${safeScore} pts with ${Math.round(accuracy)}% accuracy. ${accLabel}`]
    );

    // 5. Log activity
    await logActivity(userId, 'SESSION_FINISH',
      `Completed session ${sessionId} — score ${safeScore}, accuracy ${Math.round(accuracy)}%`, null);

    res.json({ success: true });
  } catch (err) {
    console.error('[game] Finish session error:', err.message);
    res.status(500).json({ error: 'Could not finalise session.' });
  }
});

// ── GET /api/game/history ──────────────────────────────────────────────────
// Returns sessions for the last N days grouped for the history page.
router.get('/history', async (req, res) => {
  const days = toInt(req.query.days) || 7;
  const userId = req.session.user.user_id;
  try {
    const rows = await pool.query(
<<<<<<< HEAD
        'SELECT TOP 100 * FROM session WHERE user_id = ? AND played_at >= DATEADD(day, -?, GETDATE()) ORDER BY played_at DESC',
      [req.session.user.user_id, days]
=======
      'SELECT TOP 200 session_id, mode, difficulty, score, total_questions, correct_answers, skipped_answers, hints_used, time_taken_seconds, completed, played_at FROM sessions WHERE user_id=? AND played_at >= DATEADD(day,-?,GETDATE()) ORDER BY played_at DESC',
      [userId, days]
>>>>>>> eb0f918ab16e285c80b4089056cda86dc27cd092
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
    console.error('[game] history error:', err.message);
    res.status(500).json({ error: 'Could not fetch history.' });
  }
});

// ── GET /api/game/session/:id ──────────────────────────────────────────────
// Returns session header + all answers joined to questions table.
router.get('/session/:id', async (req, res) => {
  const sessionId = req.params.id;
  const userId    = req.session.user.user_id;
  try {
<<<<<<< HEAD
    const sessions = await pool.query('SELECT * FROM session WHERE session_id = ? AND user_id = ?', [sessionId, req.session.user.user_id]);
    if (!sessions || sessions.length === 0) return res.status(404).json({ error: 'Session not found.' });
    const session = sessions[0];
    const answers = await pool.query('SELECT * FROM answer WHERE session_id = ? ORDER BY question_number, answer_id', [sessionId]);
    res.json({ session, answers });
=======
    const sessions = await pool.query(
      'SELECT * FROM sessions WHERE session_id=? AND user_id=?',
      [sessionId, userId]
    );
    if (!sessions || sessions.length === 0)
      return res.status(404).json({ error: 'Session not found.' });

    const session = sessions[0];

    // Join user_answers with questions to get full question text + correct answer
    const answers = await pool.query(
      `SELECT ua.answer_id, ua.question_number, ua.student_answer,
              ua.hint_used, ua.is_correct, ua.status, ua.time_taken_seconds, ua.answered_at,
              q.question_text, q.correct_answer, q.hint_text, q.solution_steps,
              q.is_multiple_choice, q.options_json
       FROM user_answers ua
       JOIN questions q ON q.question_id = ua.question_id
       WHERE ua.session_id = ?
       ORDER BY ua.question_number, ua.answer_id`,
      [sessionId]
    );

    res.json({
      session: {
        session_id:         toStr(session.session_id),
        mode:               toStr(session.mode),
        difficulty:         toStr(session.difficulty),
        score:              toInt(session.score),
        total_questions:    toInt(session.total_questions),
        correct_answers:    toInt(session.correct_answers),
        skipped_answers:    toInt(session.skipped_answers),
        hints_used:         toInt(session.hints_used),
        time_taken_seconds: toInt(session.time_taken_seconds),
        completed:          session.completed === '1' || session.completed === 1,
        played_at:          toStr(session.played_at),
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
>>>>>>> eb0f918ab16e285c80b4089056cda86dc27cd092
  } catch (err) {
    console.error('[game] Get session error:', err.message);
    res.status(500).json({ error: `Failed to fetch session: ${err.message}` });
  }
});

// ── Helper: write to admin_activity_log ───────────────────────────────────
async function logActivity(actorId, actionType, description, targetUserId) {
  try {
    await pool.query(
      'INSERT INTO admin_activity_log (actor_id, action_type, description, target_user_id) VALUES (?,?,?,?)',
      [actorId, actionType, description, targetUserId || null]
    );
  } catch { /* never crash the caller */ }
}

module.exports = router;
