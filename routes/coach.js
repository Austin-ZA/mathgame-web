// routes/coach.js — AI Performance Coach
// Pulls real session + answer data for the logged-in student,
// then calls the Anthropic API to generate personalised feedback.

const express = require('express');
const router  = express.Router();
const https   = require('https');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// ── helpers ────────────────────────────────────────────────────────────────
function toInt(v)   { const n = parseInt(v);   return isNaN(n) ? 0 : n; }
function toFloat(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }
function toStr(v)   { return (v === null || v === undefined || v === 'NULL') ? null : String(v); }

// ── GET /api/coach/data — fetch raw performance data for this student ──────
// Used by the frontend to show stats BEFORE the AI runs.
router.get('/data', async (req, res) => {
  const userId = req.session.user.user_id;
  try {
    const data = await gatherStudentData(userId);
    res.json(data);
  } catch (err) {
    console.error('[coach] data error:', err.message);
    res.status(500).json({ error: `Failed to load performance data: ${err.message}` });
  }
});

// ── POST /api/coach/analyse — run AI analysis ─────────────────────────────
router.post('/analyse', async (req, res) => {
  const userId = req.session.user.user_id;
  const { question } = req.body;          // optional custom question from student

  try {
    const data = await gatherStudentData(userId);

    if (data.totalSessions === 0) {
      return res.json({ feedback: "You haven't played any sessions yet. Start a game and come back for personalised coaching! 🎮" });
    }

    const prompt = buildPrompt(data, question || 'Give me a full performance review and tell me what I should improve.');
    const feedback = await callClaude(prompt);
    res.json({ feedback, data });
  } catch (err) {
    console.error('[coach] analyse error:', err.message, err.stack);
    res.status(500).json({ error: `AI coach unavailable: ${err.message}` });
  }
});

// ── Data gatherer ──────────────────────────────────────────────────────────
async function gatherStudentData(userId) {

  // 1. Overall session summary
  let summaryRows = [];
  try {
    summaryRows = await pool.query(`
      SELECT
        COUNT(*)                                                                          AS total_sessions,
        AVG(CAST(score AS FLOAT))                                                         AS avg_score,
        SUM(correct_answers)                                                              AS total_correct,
        SUM(total_questions)                                                              AS total_questions,
        AVG(CASE WHEN total_questions > 0
                 THEN CAST(correct_answers AS FLOAT) / total_questions * 100
                 ELSE NULL END)                                                           AS avg_accuracy,
        AVG(CAST(time_taken_seconds AS FLOAT))                                            AS avg_time_seconds,
        MAX(played_at)                                                                    AS last_played
      FROM session
      WHERE user_id = ?
    `, [userId]);
  } catch (e) { console.error('[coach] summaryRows error:', e.message); }

  // 2. Accuracy broken down by mode
  let modeRows = [];
  try {
    modeRows = await pool.query(`
      SELECT
        mode,
        COUNT(*)                                                                          AS sessions,
        AVG(CASE WHEN total_questions > 0
                 THEN CAST(correct_answers AS FLOAT) / total_questions * 100
                 ELSE NULL END)                                                           AS avg_accuracy,
        AVG(CAST(score AS FLOAT))                                                         AS avg_score,
        AVG(CAST(time_taken_seconds AS FLOAT))                                            AS avg_time
      FROM session
      WHERE user_id = ?
      GROUP BY mode
    `, [userId]);
  } catch (e) { console.error('[coach] modeRows error:', e.message); }

  // 3. Accuracy broken down by difficulty level
  let levelRows = [];
  try {
    levelRows = await pool.query(`
      SELECT
        difficulty,
        COUNT(*)                                                                          AS sessions,
        AVG(CASE WHEN total_questions > 0
                 THEN CAST(correct_answers AS FLOAT) / total_questions * 100
                 ELSE NULL END)                                                           AS avg_accuracy
      FROM session
      WHERE user_id = ?
      GROUP BY difficulty
    `, [userId]);
  } catch (e) { console.error('[coach] levelRows error:', e.message); }

  // 4. Wrong answers grouped by question_text pattern (last 50 sessions worth)
  //    Uses the answers table which stores question_text as free text.
  let wrongRows = [];
  try {
    wrongRows = await pool.query(`
      SELECT TOP 10
        q.question_text,
        q.correct_answer,
        a.student_answer,
        s.mode,
        s.difficulty,
        a.time_taken_seconds
<<<<<<< HEAD
      FROM answer a
      JOIN session s ON s.session_id = a.session_id
=======
      FROM user_answers a
      JOIN questions q ON q.question_id = a.question_id
      JOIN sessions s ON s.session_id = a.session_id
>>>>>>> eb0f918ab16e285c80b4089056cda86dc27cd092
      WHERE s.user_id = ?
        AND a.is_correct = 0
      ORDER BY a.answer_id DESC
    `, [userId]);
  } catch (e) { console.error('[coach] wrongRows error:', e.message); }

  // 5. Recent trend: last 10 sessions ordered chronologically
  let trendRows = [];
  try {
    trendRows = await pool.query(`
      SELECT TOP 10
        mode, difficulty, score, correct_answers, total_questions,
        time_taken_seconds, played_at
      FROM session
      WHERE user_id = ?
      ORDER BY played_at DESC
    `, [userId]);
  } catch (e) { console.error('[coach] trendRows error:', e.message); }

  // 6. Slowest-answered questions (high time_taken)
  let slowRows = [];
  try {
    slowRows = await pool.query(`
      SELECT TOP 5
        q.question_text,
        a.time_taken_seconds,
        a.is_correct,
        s.mode,
        s.difficulty
<<<<<<< HEAD
      FROM answer a
      JOIN session s ON s.session_id = a.session_id
=======
      FROM user_answers a
      JOIN questions q ON q.question_id = a.question_id
      JOIN sessions s ON s.session_id = a.session_id
>>>>>>> eb0f918ab16e285c80b4089056cda86dc27cd092
      WHERE s.user_id = ?
      ORDER BY a.time_taken_seconds DESC
    `, [userId]);
  } catch (e) { console.error('[coach] slowRows error:', e.message); }

  const summary = summaryRows[0] || {};

  return {
    totalSessions:  toInt(summary.total_sessions),
    avgScore:       Math.round(toFloat(summary.avg_score)),
    totalCorrect:   toInt(summary.total_correct),
    totalQuestions: toInt(summary.total_questions),
    avgAccuracy:    Math.round(toFloat(summary.avg_accuracy)),
    avgTimeSec:     Math.round(toFloat(summary.avg_time_seconds)),
    lastPlayed:     toStr(summary.last_played),
    byMode:   modeRows.map(r => ({
      mode:        toStr(r.mode),
      sessions:    toInt(r.sessions),
      avgAccuracy: Math.round(toFloat(r.avg_accuracy)),
      avgScore:    Math.round(toFloat(r.avg_score)),
      avgTime:     Math.round(toFloat(r.avg_time)),
    })),
    byLevel: levelRows.map(r => ({
      difficulty:  toStr(r.difficulty),
      sessions:    toInt(r.sessions),
      avgAccuracy: Math.round(toFloat(r.avg_accuracy)),
    })),
    recentWrong: wrongRows.map(r => ({
      question:      toStr(r.question_text),
      correctAnswer: toStr(r.correct_answer),
      studentAnswer: toStr(r.student_answer),
      mode:          toStr(r.mode),
      difficulty:    toStr(r.difficulty),
      timeTaken:     toInt(r.time_taken_seconds),
    })),
    recentSessions: trendRows.map(r => ({
      mode:           toStr(r.mode),
      difficulty:     toStr(r.difficulty),
      score:          toInt(r.score),
      correct:        toInt(r.correct_answers),
      total:          toInt(r.total_questions),
      timeSec:        toInt(r.time_taken_seconds),
      playedAt:       toStr(r.played_at),
    })),
    slowestQuestions: slowRows.map(r => ({
      question:  toStr(r.question_text),
      timeSec:   toInt(r.time_taken_seconds),
      isCorrect: r.is_correct === '1' || r.is_correct === 1 || r.is_correct === true,
      mode:      toStr(r.mode),
      difficulty: toStr(r.difficulty),
    })),
  };
}

// ── Prompt builder ─────────────────────────────────────────────────────────
function buildPrompt(data, studentQuestion) {
  const modeLines = data.byMode.map(m =>
    `  • ${m.mode}: ${m.sessions} sessions, ${m.avgAccuracy}% accuracy, avg score ${m.avgScore}, avg time ${m.avgTime}s`
  ).join('\n');

  const levelLines = data.byLevel.map(l =>
    `  • ${l.difficulty}: ${l.sessions} sessions, ${l.avgAccuracy}% accuracy`
  ).join('\n');

  const wrongLines = data.recentWrong.slice(0, 6).map((w, i) =>
    `  ${i+1}. [${w.mode} / ${w.difficulty}] "${w.question}" → student said "${w.studentAnswer}", correct was "${w.correctAnswer}" (took ${w.timeTaken}s)`
  ).join('\n');

  const slowLines = data.slowestQuestions.map((q, i) =>
    `  ${i+1}. "${q.question}" — ${q.timeSec}s, ${q.isCorrect ? 'correct' : 'wrong'} [${q.mode}]`
  ).join('\n');

  const recentLines = data.recentSessions.slice(0, 5).map(s =>
    `  ${s.correct}/${s.total} correct, ${s.mode} level ${s.difficulty}, score ${s.score}`
  ).join('\n');

  return `You are an AI performance coach for a student using MathGameApp, a maths practice game with three modes: Computational (arithmetic), Algebra, and Binary (number conversions). Difficulty levels range from level1 (easiest) to level5 (hardest).

Here is this student's full performance data:

OVERALL SUMMARY
  Total sessions:    ${data.totalSessions}
  Average accuracy:  ${data.avgAccuracy}%
  Average score:     ${data.avgScore} pts
  Average time/Q:    ${data.avgTimeSec}s
  Total correct:     ${data.totalCorrect} / ${data.totalQuestions}

PERFORMANCE BY MODE
${modeLines || '  (no data)'}

PERFORMANCE BY DIFFICULTY
${levelLines || '  (no data)'}

RECENT WRONG ANSWERS (most recent first)
${wrongLines || '  (none on record)'}

SLOWEST QUESTIONS
${slowLines || '  (none on record)'}

LAST 5 SESSIONS (newest first)
${recentLines || '  (none on record)'}

---
The student is asking: "${studentQuestion}"

Respond as a warm, encouraging but direct maths tutor. Use specific numbers from the data. Be concrete — name the exact modes and levels they struggle with. Give 3–5 actionable recommendations. Keep your response under 350 words. Use simple formatting (no markdown headers, just short paragraphs or a brief numbered list where helpful). End with one motivational sentence.`;
}

// ── Anthropic Claude API caller ────────────────────────────────────────────
function callClaude(prompt) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.ANTHROPIC_API_KEY || '';
    if (!apiKey) return reject(new Error('ANTHROPIC_API_KEY is not set in environment variables.'));

    const body = JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    });

    const options = {
      hostname: 'api.anthropic.com',
      path:     '/v1/messages',
      method:   'POST',
      headers:  {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
    };

    const req = https.request(options, (apiRes) => {
      let raw = '';
      apiRes.on('data', chunk => raw += chunk);
      apiRes.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          if (parsed.error) return reject(new Error(parsed.error.message || 'Anthropic API error'));
          const text = parseClaudeResponse(parsed);
          if (!text) return reject(new Error('Empty response from Anthropic API'));
          resolve(text.trim());
        } catch (e) {
          reject(new Error('Bad JSON response from Anthropic API: ' + e.message));
        }
      });
    });

    req.on('error', (e) => reject(new Error('Network error calling Anthropic API: ' + e.message)));
    req.write(body);
    req.end();
  });
}

function parseClaudeResponse(parsed) {
  return parsed.completion || parsed.output?.text || parsed.response?.output_text || parsed.content?.[0]?.text || parsed.message?.content?.text || '';
}

module.exports = router;
