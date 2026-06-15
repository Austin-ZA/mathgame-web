// public/js/pages/summary.js

Pages.summary = function(el, { mode, level, score, correctCount, skipCount = 0, unansweredCount = 0, totalQuestions, timeTaken, sessionId, questionLog = [], wasQuit = false }) {
  const answeredCount = questionLog.filter(q => q.status !== 'skipped' && q.status !== 'timeout').length + questionLog.filter(q => q.isCorrect).length;
  // Recalculate properly
  const actualAnswered = questionLog.filter(q => q.studentAnswer !== 'SKIPPED' && q.studentAnswer !== 'TIME_UP').length;
  const actualSkipped  = questionLog.filter(q => q.studentAnswer === 'SKIPPED').length;
  const timedOut       = questionLog.filter(q => q.studentAnswer === 'TIME_UP').length;
  const actualUnanswered = unansweredCount;

  const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const grade    = accuracy >= 90 ? 'A+' : accuracy >= 80 ? 'A' : accuracy >= 70 ? 'B' : accuracy >= 60 ? 'C' : 'D';
  const emoji    = accuracy >= 80 ? '🏆' : accuracy >= 60 ? '👍' : '💪';
  const pct      = `${accuracy}%`;
  const mins     = Math.floor(timeTaken / 60);
  const secs     = timeTaken % 60;
  const timeStr  = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  const modeLabel = { computational: 'Computational Maths', algebra: 'Algebra', binary: 'Binary Conversion' }[mode] || mode;

  // Build question review rows
  const reviewRows = questionLog.map((q, i) => {
    const statusIcon = q.isCorrect ? '✅' : q.studentAnswer === 'SKIPPED' ? '⏭' : q.studentAnswer === 'TIME_UP' ? '⏰' : '❌';
    const statusColor = q.isCorrect ? 'var(--success)' : q.studentAnswer === 'SKIPPED' ? 'var(--warning)' : 'var(--error)';
    return `<tr style="border-bottom:1px solid rgba(91,106,245,0.12)">
      <td style="padding:10px 8px;color:var(--text-muted);font-size:.8rem">${i+1}</td>
      <td style="padding:10px 8px;font-size:.85rem">${q.questionText}</td>
      <td style="padding:10px 8px;font-size:.85rem;color:var(--success)">${q.correctAnswer}</td>
      <td style="padding:10px 8px;font-size:.85rem;color:${statusColor}">${q.studentAnswer === 'SKIPPED' ? 'Skipped' : q.studentAnswer === 'TIME_UP' ? 'Timed out' : q.studentAnswer}</td>
      <td style="padding:10px 8px;text-align:center;font-size:1.1rem">${statusIcon}</td>
    </tr>`;
  }).join('');

  el.innerHTML = `
    <div class="page">
      <div class="card card-wide" style="max-width:780px">
        <div class="title-center" style="margin-bottom:24px">
          <span class="emoji-icon">${emoji}</span>
          <h1 style="font-size:1.6rem;margin-top:8px">${wasQuit ? 'Session Ended' : 'Session Complete!'}</h1>
          <p class="muted">${modeLabel}${mode !== 'binary' ? ` — Level ${level}` : ''}</p>
          ${wasQuit ? `<p style="font-size:.85rem;color:var(--warning);margin-top:4px">⚠️ You quit early — results saved up to this point</p>` : ''}
        </div>

        <!-- Score ring -->
        <div class="score-ring" style="--pct: ${accuracy * 3.6}deg">
          <div class="score-ring-inner">
            <span class="score-pct">${pct}</span>
            <span class="score-label">Accuracy</span>
          </div>
        </div>

        <!-- Grade badge -->
        <div style="text-align:center;margin-bottom:20px">
          <span style="font-size:2rem;font-weight:800;color:var(--primary-light)">${grade}</span>
          <span class="muted" style="font-size:.85rem;margin-left:8px">Grade</span>
        </div>

        <!-- Stats -->
        <div class="card" style="background:var(--bg-card2);padding:16px 20px;margin-bottom:20px">
          <div class="stat-row">
            <span class="muted">Total Score</span>
            <span class="stat-value" style="color:var(--primary-light)">${score} pts</span>
          </div>
          <div style="height:1px;background:rgba(91,106,245,0.15);margin:8px 0"></div>
          <div class="stat-row">
            <span class="muted">✅ Correct Answers</span>
            <span class="stat-value" style="color:var(--success)">${correctCount} / ${totalQuestions}</span>
          </div>
          <div class="stat-row">
            <span class="muted">❌ Wrong Answers</span>
            <span class="stat-value" style="color:var(--error)">${actualAnswered - correctCount} / ${totalQuestions}</span>
          </div>
          <div class="stat-row">
            <span class="muted">⏭ Skipped</span>
            <span class="stat-value" style="color:var(--warning)">${actualSkipped} / ${totalQuestions}</span>
          </div>
          ${timedOut > 0 ? `<div class="stat-row">
            <span class="muted">⏰ Timed Out</span>
            <span class="stat-value" style="color:var(--warning)">${timedOut} / ${totalQuestions}</span>
          </div>` : ''}
          ${actualUnanswered > 0 ? `<div class="stat-row">
            <span class="muted">⬜ Unanswered (quit early)</span>
            <span class="stat-value" style="color:var(--text-muted)">${actualUnanswered} / ${totalQuestions}</span>
          </div>` : ''}
          <div style="height:1px;background:rgba(91,106,245,0.15);margin:8px 0"></div>
          <div class="stat-row">
            <span class="muted">Time Taken</span>
            <span class="stat-value">${timeStr}</span>
          </div>
        </div>

        <!-- Question Review -->
        ${questionLog.length > 0 ? `
        <div style="margin-bottom:20px">
          <button id="review-toggle-btn" class="btn btn-secondary" style="margin-bottom:12px">
            📋 Review Questions & Answers
          </button>
          <div id="review-area" style="display:none;overflow-x:auto">
            <table style="width:100%;border-collapse:collapse;font-size:.85rem">
              <thead>
                <tr style="border-bottom:2px solid rgba(91,106,245,0.3)">
                  <th style="padding:8px;text-align:left;color:var(--text-muted)">#</th>
                  <th style="padding:8px;text-align:left;color:var(--text-muted)">Question</th>
                  <th style="padding:8px;text-align:left;color:var(--text-muted)">Correct Answer</th>
                  <th style="padding:8px;text-align:left;color:var(--text-muted)">Your Answer</th>
                  <th style="padding:8px;text-align:center;color:var(--text-muted)">Result</th>
                </tr>
              </thead>
              <tbody>${reviewRows}</tbody>
            </table>
          </div>
        </div>
        ` : ''}

        <!-- History button -->
        <div style="margin-bottom:16px">
          <button class="btn btn-secondary" id="history-btn" style="margin-bottom:8px">
            📅 View 7-Day History
          </button>
        </div>

        <!-- Actions -->
        <div class="stack">
          <button class="btn btn-primary" id="play-again-btn">🔄 Play Again</button>
          <button class="btn btn-secondary" id="change-mode-btn">🎮 Change Mode</button>
          <button class="btn btn-secondary" id="dashboard-btn">🏠 Dashboard</button>
        </div>
      </div>
    </div>`;

  // Wire review toggle
  const reviewBtn = el.querySelector('#review-toggle-btn');
  if (reviewBtn) {
    reviewBtn.addEventListener('click', () => {
      const area = el.querySelector('#review-area');
      if (area.style.display === 'none') {
        area.style.display = 'block';
        reviewBtn.textContent = '🙈 Hide Questions';
      } else {
        area.style.display = 'none';
        reviewBtn.textContent = '📋 Review Questions & Answers';
      }
    });
  }

  el.querySelector('#play-again-btn').addEventListener('click',  () => App.showPage('game', { mode, level }));
  el.querySelector('#change-mode-btn').addEventListener('click', () => App.showPage('modeSelect'));
  el.querySelector('#dashboard-btn').addEventListener('click',   () => App.showPage('landing'));
  el.querySelector('#history-btn').addEventListener('click',     () => App.showPage('history'));
};
