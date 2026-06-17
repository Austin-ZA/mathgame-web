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
        <div style="margin-top:12px;text-align:center">
          <button class="btn btn-primary" id="start-game-btn" style="max-width:260px">Start Game</button>
        </div>

        <!-- Session history -->
        <h2 style="margin-top:36px;margin-bottom:4px">Recent Sessions</h2>
        <p class="muted" style="font-size:.85rem;margin-bottom:12px">Your last 20 game sessions</p>
        <div id="history-area">
          <div class="loading-center"><div class="spinner"></div></div>
        </div>

      </div>
    </div>`;

  el.querySelector('#start-game-btn').addEventListener('click', () => App.showPage('modeSelect'));
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
          return `<tr data-session-id="${s.session_id}">
            <td>${s.mode || '—'}</td>
            <td>${(s.difficulty || '').replace('level','L') || '—'}</td>
            <td>${s.score ?? 0}</td>
            <td>${s.correct_answers ?? 0} / ${s.total_questions ?? 0}</td>
            <td>${acc}%</td>
            <td>${time}</td>
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
      // make session rows clickable to view details
      histEl.querySelectorAll('tbody tr').forEach(r => {
        r.style.cursor = 'pointer';
        r.addEventListener('click', () => {
          const sessionId = r.dataset.sessionId;
          if (sessionId) {
            App.showPage('sessionDetails', { sessionId });
          } else {
            console.warn('No sessionId found on clicked history row');
          }
        });
      });
    } catch {
      histEl.innerHTML = `<p class="error-msg">Could not load history.</p>`;
    }
  }
};
