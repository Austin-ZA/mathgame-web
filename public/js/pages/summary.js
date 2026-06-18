// public/js/pages/summary.js
// Mirrors ScoreSummaryScreen.java

Pages.summary = function(el, { mode, level, score, correctCount, totalQuestions, timeTaken, skippedCount = 0, unanswered = 0, answeredCount = 0, sessionId } = {}) {
  const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const pct      = `${accuracy}%`;
  const mins     = Math.floor(timeTaken / 60);
  const secs     = timeTaken % 60;
  const timeStr  = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  const modeLabel = { computational: 'Computational Maths', algebra: 'Algebra', binary: 'Binary Conversion' }[mode] || mode;

  el.innerHTML = `
    <div class="page">
      <div class="card card-wide">
        <div class="title-center" style="margin-bottom:24px">
          <h1 style="font-size:1.6rem;margin-top:8px">Session Complete</h1>
          <p class="muted">${modeLabel}${mode !== 'binary' ? ` — Level ${level}` : ''}</p>
        </div>

        <!-- Score ring -->
        <div class="score-ring" style="--pct: ${accuracy * 3.6}deg">
          <div class="score-ring-inner">
            <span class="score-pct">${pct}</span>
            <span class="score-label">Accuracy</span>
          </div>
        </div>

        <!-- Grade removed per user request -->

        <!-- Stats -->
        <div class="card" style="background:var(--bg-card2);padding:16px 20px;margin-top:8px;margin-bottom:20px">
          <div class="stat-row">
            <span class="muted">Total Score</span>
            <span class="stat-value" style="color:var(--primary-light)">${score} pts</span>
          </div>
                  <div class="stat-row">
            <span class="muted">Correct Answers</span>
            <span class="stat-value" style="color:var(--success)">${correctCount} / ${totalQuestions}</span>
          </div>
          <div class="stat-row">
            <span class="muted">Answered Questions</span>
            <span class="stat-value" style="color:var(--primary-light)">${answeredCount} / ${totalQuestions}</span>
          </div>
          <div class="stat-row">
            <span class="muted">Skipped Questions</span>
            <span class="stat-value" style="color:var(--warning)">${skippedCount} / ${totalQuestions}</span>
          </div>
          <div class="stat-row">
            <span class="muted">Unanswered Questions</span>
            <span class="stat-value" style="color:var(--text-muted)">${unanswered} / ${totalQuestions}</span>
          </div>
          <div class="stat-row">
            <span class="muted">Time Taken</span>
            <span class="stat-value">${timeStr}</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="stack">
          <button class="btn btn-primary" id="play-again-btn">Play Again</button>
          <button class="btn btn-secondary" id="change-mode-btn">Change Mode</button>
          <button class="btn btn-secondary" id="history-btn">History</button>
          <button class="btn btn-secondary" id="dashboard-btn">Dashboard</button>
        </div>
      </div>
    </div>`;

  el.querySelector('#play-again-btn').addEventListener('click',  () => App.showPage('game', { mode, level }));
  el.querySelector('#change-mode-btn').addEventListener('click', () => App.showPage('modeSelect'));
  const historyBtn = el.querySelector('#history-btn');
  if (sessionId) {
    historyBtn.addEventListener('click', () => App.showPage('sessionDetails', { sessionId }));
  } else {
    historyBtn.disabled = true;
    historyBtn.textContent = 'No session available';
  }
  el.querySelector('#dashboard-btn').addEventListener('click', () => App.showPage('landing'));
};

Pages.sessionDetails = async function(el, { sessionId } = {}) {
  el.innerHTML = `<div class="page"><div class="card"><div class="loading-center"><div class="spinner"></div></div></div></div>`;
  if (!sessionId) {
    el.innerHTML = `<div class="page"><div class="card"><p class="error-msg">No session selected.</p><button class="btn btn-secondary" id="sd-back">Back</button></div></div>`;
    el.querySelector('#sd-back').addEventListener('click', () => App.showPage('landing'));
    return;
  }

  try {
    const data = await API.getSession(sessionId);
    const session = data.session;
    const answers = data.answers || [];

    el.innerHTML = `
      <div class="page">
        <div class="card card-wide">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <h2>Session Details</h2>
              <p class="muted">Mode: ${session.mode} — ${session.difficulty}</p>
            </div>
            <div>
              <button class="btn btn-secondary" id="sd-back">Back</button>
            </div>
          </div>
          <div style="margin-top:12px">
            <table class="history-table" style="width:100%">
              <thead><tr>
                <th>#</th>
                <th>Question</th>
                <th>Your Answer</th>
                <th>Correct Answer</th>
                <th>Result</th>
                <th>Hint Used</th>
                <th>Time (s)</th>
              </tr></thead>
              <tbody>
                ${answers.map((a, i) => {
                  const statusLabel = a.is_correct ? 'Correct' : (a.status === 'skipped' ? 'Skipped' : (a.status === 'timeout' ? 'Timeout' : 'Wrong'));
                  const statusColor = a.is_correct ? 'var(--success)' : (a.status === 'skipped' || a.status === 'timeout' ? 'var(--warning)' : 'var(--error)');
                  const studentAns  = a.student_answer === 'SKIPPED' ? 'Skipped' : (a.student_answer === 'TIME_UP' ? 'Timed out' : (a.student_answer || 'None'));
                  return `<tr>
                    <td>${a.question_number || (i+1)}</td>
                    <td style="max-width:340px;white-space:normal">${a.question_text}</td>
                    <td>${studentAns}</td>
                    <td style="color:var(--success)">${a.correct_answer}</td>
                    <td style="color:${statusColor};font-weight:600">${statusLabel}</td>
                    <td>${a.hint_used ? 'Yes' : 'No'}</td>
                    <td>${a.time_taken_seconds || 0}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>`;

    el.querySelector('#sd-back').addEventListener('click', () => App.showPage('summary', { mode: session.mode, level: session.difficulty.includes('level') ? parseInt(session.difficulty.replace('level','')) : 1, score: session.score || 0, correctCount: session.correct_answers || 0, totalQuestions: session.total_questions || 0, timeTaken: session.time_taken_seconds || 0, skippedCount: 0, unanswered: 0, answeredCount: session.correct_answers || 0, sessionId }));
  } catch (e) {
    const message = e?.message || 'Could not load session details.';
    el.innerHTML = `<div class="page"><div class="card"><p class="error-msg">${message}</p><button class="btn btn-secondary" id="sd-back">Back</button></div></div>`;
    el.querySelector('#sd-back').addEventListener('click', () => App.showPage('landing'));
  }
};
