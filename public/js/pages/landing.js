// public/js/pages/landing.js

Pages.landing = function(el, user) {
  el.innerHTML = `
    <div class="page-wide">
      <nav class="navbar">
        <span class="navbar-brand">MathGameApp</span>
        <span class="navbar-user">${user.full_name || user.username}</span>
        <div class="navbar-actions">
          <button class="btn btn-secondary btn-sm" id="logout-btn">Logout</button>
        </div>
      </nav>

      <div style="max-width:720px;margin:40px auto;padding:0 20px">

        <!-- Welcome banner -->
        <div class="card" style="margin-bottom:24px;background:linear-gradient(135deg,#1a1f5e,#2d2080)">
          <h2 style="margin-bottom:6px">Welcome back, ${user.full_name?.split(' ')[0] || user.username}</h2>
          <p class="muted" style="margin-bottom:16px">Ready to sharpen your math skills? Pick a mode and start playing.</p>
          <button class="btn btn-primary" id="coach-btn" style="width:auto;padding:10px 22px;background:linear-gradient(135deg,#7b2ff7,#4a1fa8)">
            Ask AI Coach
          </button>
        </div>

        <!-- Quick start -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
          <h2>Quick Start</h2>
        </div>
        <div class="mode-grid" style="margin-top:0">
          <div class="mode-card" id="quick-comp" title="Quick start Level 1 Computational practise: PEMDAS, fractions, decimals and more.">
            <h3>Computational</h3>
            <p>PEMDAS, fractions, decimals and more</p>
          </div>
          <div class="mode-card" id="quick-alg" title="Quick start Level 1 Algebra practise: equations, substitution and quadratics.">
            <h3>Algebra</h3>
            <p>Equations, substitution and quadratics</p>
          </div>
          <div class="mode-card" id="quick-bin" title="Quick start Binary practise: decimal/binary/hexadecimal conversions.">
            <h3>Binary</h3>
            <p>Dec to Bin to Hex conversions</p>
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

  el.querySelector('#quick-comp').addEventListener('click', () => App.showPage('modeSelect', { mode: 'computational', level: 1 }));
  el.querySelector('#quick-alg').addEventListener('click',  () => App.showPage('modeSelect', { mode: 'algebra', level: 1 }));
  el.querySelector('#quick-bin').addEventListener('click',  () => App.showPage('modeSelect', { mode: 'binary', level: 1 }));
  el.querySelector('#logout-btn').addEventListener('click', () => App.logout());
  el.querySelector('#coach-btn').addEventListener('click',  () => App.showPage('coach'));

  loadHistory();

  async function loadHistory() {
    const histEl = el.querySelector('#history-area');
    try {
      const sessions = await API.getHistory(7);
      if (!sessions || sessions.length === 0) {
        histEl.innerHTML = `<div class="card" style="text-align:center;color:var(--text-muted)">No sessions yet. Play your first game to see results here.</div>`;
        return;
      }

      const grouped = sessions.reduce((acc, s) => {
        const day = new Date(s.played_at).toLocaleDateString();
        acc[day] = acc[day] || [];
        acc[day].push(s);
        return acc;
      }, {});

      const groupsHtml = Object.entries(grouped).map(([day, items]) => {
        const rows = items.map(s => {
          const acc = s.total_questions > 0 ? Math.round((s.correct_answers / s.total_questions) * 100) : 0;
          const time = new Date(s.played_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const modeBadge = `<span class="badge badge-mode-${s.mode}">${s.mode}</span>`;
          return `<tr>
            <td>${modeBadge}</td>
            <td>${s.difficulty.replace('level','L')}</td>
            <td>${s.score} pts</td>
            <td>${s.correct_answers}/${s.total_questions}</td>
            <td>${acc}%</td>
            <td style="color:var(--text-muted);font-size:.8rem">${time}</td>
          </tr>`;
        }).join('');

        return `
          <div style="margin-bottom:18px">
            <div class="section-title" style="margin-bottom:8px">${day}</div>
            <div class="card" style="overflow-x:auto;padding:16px">
              <table class="history-table">
                <thead><tr>
                  <th>Mode</th><th>Level</th><th>Score</th><th>Correct</th><th>Accuracy</th><th>Time</th>
                </tr></thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          </div>`;
      }).join('');

      histEl.innerHTML = `<div>${groupsHtml}</div>`;
    } catch {
      histEl.innerHTML = `<p class="error-msg">Could not load history.</p>`;
    }
  }
};
