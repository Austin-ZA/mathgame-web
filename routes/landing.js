// public/js/pages/landing.js

Pages.landing = function(el, user) {
  el.innerHTML = `
    <div class="page-wide">
      <nav class="navbar">
        <span class="navbar-brand">📐 MathGameApp</span>
        <span class="navbar-user">👋 ${user.full_name || user.username}</span>
        <div class="navbar-actions">
          <button class="btn btn-secondary btn-sm" id="history-nav-btn" style="margin-right:8px">📅 History</button>
          <button class="btn btn-secondary btn-sm" id="logout-btn">Logout</button>
        </div>
      </nav>

      <div style="max-width:720px;margin:40px auto;padding:0 20px">

        <!-- Welcome banner -->
        <div class="card" style="margin-bottom:24px;background:linear-gradient(135deg,#1a1f5e,#2d2080)">
          <h2 style="margin-bottom:6px">Welcome back, ${user.full_name?.split(' ')[0] || user.username}! 🎉</h2>
          <p class="muted" style="margin-bottom:16px">Ready to sharpen your math skills? Pick a mode and start playing.</p>
          <button class="btn btn-primary" id="coach-btn" style="width:auto;padding:10px 22px;background:linear-gradient(135deg,#7b2ff7,#4a1fa8)">
            🤖 Ask AI Coach
          </button>
        </div>

        <!-- Quick start -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
          <h2>Quick Start</h2>
        </div>
        <div class="mode-grid" style="margin-top:0">
          <div class="mode-card" id="quick-comp" data-tooltip="Tackle PEMDAS, fractions, decimals and arithmetic across 5 difficulty levels">
            <span class="mode-icon">🔢</span>
            <h3>Computational</h3>
            <p>PEMDAS, fractions, decimals &amp; more</p>
          </div>
          <div class="mode-card" id="quick-alg" data-tooltip="Solve linear equations, substitution problems and quadratics across 5 levels">
            <span class="mode-icon">🔡</span>
            <h3>Algebra</h3>
            <p>Equations, substitution &amp; quadratics</p>
          </div>
          <div class="mode-card" id="quick-bin" data-tooltip="Convert between decimal, binary and hexadecimal number systems">
            <span class="mode-icon">💾</span>
            <h3>Binary</h3>
            <p>Dec ↔ Bin ↔ Hex conversions</p>
          </div>
        </div>

        <!-- Session history -->
        <h2 style="margin-top:36px;margin-bottom:4px">Recent Sessions</h2>
        <p class="muted" style="font-size:.85rem;margin-bottom:12px">Your last 20 game sessions</p>
        <div id="history-area">
          <div class="loading-center"><div class="spinner"></div></div>
        </div>

      </div>
    </div>`;

  // Tooltip on hover for mode cards
  el.querySelectorAll('.mode-card[data-tooltip]').forEach(card => {
    const tip = document.createElement('div');
    tip.className = 'mode-tooltip';
    tip.textContent = card.dataset.tooltip;
    card.appendChild(tip);
  });

  // Quick start buttons → go to mode select first (fix: don't skip to game)
  el.querySelector('#quick-comp').addEventListener('click', () => App.showPage('modeSelect', { preselect: 'computational' }));
  el.querySelector('#quick-alg').addEventListener('click',  () => App.showPage('modeSelect', { preselect: 'algebra' }));
  el.querySelector('#quick-bin').addEventListener('click',  () => App.showPage('modeSelect', { preselect: 'binary' }));
  el.querySelector('#logout-btn').addEventListener('click', () => App.logout());
  el.querySelector('#coach-btn').addEventListener('click',  () => App.showPage('coach'));
  el.querySelector('#history-nav-btn').addEventListener('click', () => App.showPage('history'));

  loadHistory();

  async function loadHistory() {
    const histEl = el.querySelector('#history-area');
    try {
      const sessions = await API.getHistory();
      if (sessions.length === 0) {
        histEl.innerHTML = `<div class="card" style="text-align:center;color:var(--text-muted)">No sessions yet — play your first game! 🚀</div>`;
        return;
      }
      const rows = sessions.map(s => {
        const acc = s.total_questions > 0 ? Math.round((s.correct_answers / s.total_questions) * 100) : 0;
        const date = new Date(s.played_at).toLocaleString();
        const modeBadge = `<span class="badge badge-mode-${s.mode}">${s.mode}</span>`;
        return `<tr>
          <td>${modeBadge}</td>
          <td>${s.difficulty.replace('level','L')}</td>
          <td>${s.score} pts</td>
          <td>${s.correct_answers}/${s.total_questions}</td>
          <td>${acc}%</td>
          <td style="color:var(--text-muted);font-size:.8rem">${date}</td>
        </tr>`;
      }).join('');
      histEl.innerHTML = `
        <div class="card" style="overflow-x:auto;padding:16px">
          <table class="history-table">
            <thead><tr>
              <th>Mode</th><th>Level</th><th>Score</th><th>Correct</th><th>Accuracy</th><th>Date</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
    } catch {
      histEl.innerHTML = `<p class="error-msg">Could not load history.</p>`;
    }
  }
};
