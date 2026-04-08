// public/js/pages/summary.js
// Mirrors ScoreSummaryScreen.java

Pages.summary = function(el, { mode, level, score, correctCount, totalQuestions, timeTaken }) {
  const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const grade    = accuracy >= 90 ? 'A+' : accuracy >= 80 ? 'A' : accuracy >= 70 ? 'B' : accuracy >= 60 ? 'C' : 'D';
  const emoji    = accuracy >= 80 ? '🏆' : accuracy >= 60 ? '👍' : '💪';
  const pct      = `${accuracy}%`;
  const mins     = Math.floor(timeTaken / 60);
  const secs     = timeTaken % 60;
  const timeStr  = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  const modeLabel = { computational: 'Computational Maths', algebra: 'Algebra', binary: 'Binary Conversion' }[mode] || mode;

  el.innerHTML = `
    <div class="page">
      <div class="card card-wide">
        <div class="title-center" style="margin-bottom:24px">
          <span class="emoji-icon">${emoji}</span>
          <h1 style="font-size:1.6rem;margin-top:8px">Session Complete!</h1>
          <p class="muted">${modeLabel}${mode !== 'binary' ? ` — Level ${level}` : ''}</p>
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
          <div class="stat-row">
            <span class="muted">Correct Answers</span>
            <span class="stat-value" style="color:var(--success)">${correctCount} / ${totalQuestions}</span>
          </div>
          <div class="stat-row">
            <span class="muted">Incorrect Answers</span>
            <span class="stat-value" style="color:var(--error)">${totalQuestions - correctCount} / ${totalQuestions}</span>
          </div>
          <div class="stat-row">
            <span class="muted">Time Taken</span>
            <span class="stat-value">${timeStr}</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="stack">
          <button class="btn btn-primary" id="play-again-btn">🔄 Play Again</button>
          <button class="btn btn-secondary" id="change-mode-btn">🎮 Change Mode</button>
          <button class="btn btn-secondary" id="dashboard-btn">🏠 Dashboard</button>
        </div>
      </div>
    </div>`;

  el.querySelector('#play-again-btn').addEventListener('click',  () => App.showPage('game', { mode, level }));
  el.querySelector('#change-mode-btn').addEventListener('click', () => App.showPage('modeSelect'));
  el.querySelector('#dashboard-btn').addEventListener('click',   () => App.showPage('landing'));
};
