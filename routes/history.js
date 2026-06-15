// public/js/pages/history.js — 7-day question history by category

Pages.history = function(el) {
  const CATEGORIES = ['computational', 'algebra', 'binary'];
  const DAY_LABELS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  el.innerHTML = `
    <div class="page-wide">
      <nav class="navbar">
        <button class="btn btn-secondary btn-sm" id="back-btn">← Back</button>
        <span class="navbar-brand">📅 7-Day History</span>
        <span></span>
      </nav>

      <div style="max-width:900px;margin:32px auto;padding:0 20px">
        <h2 style="margin-bottom:4px">Your Last 7 Days</h2>
        <p class="muted" style="margin-bottom:24px;font-size:.88rem">Questions answered per category each day — up to 7 days back</p>

        <!-- Category tabs -->
        <div style="display:flex;gap:10px;margin-bottom:24px;flex-wrap:wrap">
          ${CATEGORIES.map((c, i) => `
            <button class="cat-tab ${i===0?'cat-tab-active':''}" data-cat="${c}">
              ${{computational:'🔢 Computational', algebra:'🔡 Algebra', binary:'💾 Binary'}[c]}
            </button>`).join('')}
        </div>

        <div id="history-content">
          <div class="loading-center"><div class="spinner"></div></div>
        </div>
      </div>
    </div>`;

  el.querySelector('#back-btn').addEventListener('click', () => history.length > 1 ? window.history.back() : App.showPage('landing'));
  // override back: just go to landing
  el.querySelector('#back-btn').addEventListener('click', () => App.showPage('landing'));

  let allSessions = [];
  let activeCategory = 'computational';

  (async () => {
    try {
      // getHistory returns all sessions — we filter by date & category
      allSessions = await API.getHistory();
      renderCategory(activeCategory);
    } catch(e) {
      el.querySelector('#history-content').innerHTML =
        `<p class="error-msg">Could not load history.</p>`;
    }
  })();

  el.querySelectorAll('.cat-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      el.querySelectorAll('.cat-tab').forEach(b => b.classList.remove('cat-tab-active'));
      btn.classList.add('cat-tab-active');
      activeCategory = btn.dataset.cat;
      renderCategory(activeCategory);
    });
  });

  function renderCategory(cat) {
    const content = el.querySelector('#history-content');
    const now = new Date();

    // Build 7-day buckets
    const days = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(now);
      date.setDate(now.getDate() - d);
      date.setHours(0, 0, 0, 0);
      const dateEnd = new Date(date);
      dateEnd.setHours(23, 59, 59, 999);
      days.push({ date, dateEnd, sessions: [] });
    }

    // Bucket sessions
    allSessions.forEach(s => {
      if (s.mode !== cat) return;
      const played = new Date(s.played_at);
      const bucket = days.find(d => played >= d.date && played <= d.dateEnd);
      if (bucket) bucket.sessions.push(s);
    });

    const hasAny = days.some(d => d.sessions.length > 0);

    if (!hasAny) {
      content.innerHTML = `
        <div class="card" style="text-align:center;padding:40px">
          <div style="font-size:2.5rem;margin-bottom:12px">📭</div>
          <h3 style="margin-bottom:8px">No ${cat} sessions in the last 7 days</h3>
          <p class="muted">Play some games to see your history here!</p>
          <button class="btn btn-primary" id="play-now-btn" style="max-width:200px;margin:20px auto 0">▶ Play Now</button>
        </div>`;
      content.querySelector('#play-now-btn')?.addEventListener('click', () => App.showPage('modeSelect', { preselect: cat }));
      return;
    }

    const dayCards = days.map((day, idx) => {
      const label = idx === 0 ? 'Today' : idx === 1 ? 'Yesterday' : DAY_LABELS[day.date.getDay()];
      const dateStr = day.date.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' });

      if (day.sessions.length === 0) {
        return `
          <div class="history-day-card history-day-empty">
            <div class="history-day-header">
              <span class="history-day-label">${label}</span>
              <span class="history-day-date">${dateStr}</span>
            </div>
            <div class="history-day-body muted" style="font-size:.85rem;padding:12px 0">No sessions</div>
          </div>`;
      }

      const totalCorrect = day.sessions.reduce((a,s) => a + (s.correct_answers || 0), 0);
      const totalQ = day.sessions.reduce((a,s) => a + (s.total_questions || 0), 0);
      const acc = totalQ > 0 ? Math.round(totalCorrect / totalQ * 100) : 0;
      const accColor = acc >= 70 ? 'var(--success)' : acc >= 50 ? 'var(--warning)' : 'var(--error)';

      const sessionRows = day.sessions.map(s => {
        const sAcc = s.total_questions > 0 ? Math.round(s.correct_answers / s.total_questions * 100) : 0;
        const time = new Date(s.played_at).toLocaleTimeString('en-ZA', { hour:'2-digit', minute:'2-digit' });
        return `<div class="history-session-row">
          <span class="muted" style="font-size:.78rem">${time}</span>
          <span style="font-size:.85rem">L${s.difficulty?.replace('level','') || '?'}</span>
          <span style="font-size:.85rem;color:var(--success)">${s.correct_answers}/${s.total_questions} correct</span>
          <span style="font-size:.85rem;color:${sAcc>=70?'var(--success)':sAcc>=50?'var(--warning)':'var(--error)'};">${sAcc}%</span>
          <span style="font-size:.85rem;font-weight:700;color:var(--primary-light)">${s.score} pts</span>
        </div>`;
      }).join('');

      return `
        <div class="history-day-card">
          <div class="history-day-header">
            <span class="history-day-label">${label}</span>
            <span class="history-day-date">${dateStr}</span>
            <span style="margin-left:auto;font-weight:700;color:${accColor}">${acc}% avg</span>
          </div>
          <div class="history-day-body">
            <div class="history-sessions-header">
              <span class="muted" style="font-size:.75rem">TIME</span>
              <span class="muted" style="font-size:.75rem">LEVEL</span>
              <span class="muted" style="font-size:.75rem">SCORE</span>
              <span class="muted" style="font-size:.75rem">ACC</span>
              <span class="muted" style="font-size:.75rem">PTS</span>
            </div>
            ${sessionRows}
            <div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(91,106,245,0.15);display:flex;gap:20px;font-size:.83rem">
              <span>📦 ${day.sessions.length} session${day.sessions.length>1?'s':''}</span>
              <span style="color:var(--success)">✅ ${totalCorrect}/${totalQ} correct</span>
              <span style="color:var(--primary-light);font-weight:700">${day.sessions.reduce((a,s)=>a+(s.score||0),0)} total pts</span>
            </div>
          </div>
        </div>`;
    }).join('');

    content.innerHTML = `<div class="history-days-list">${dayCards}</div>`;
  }
};
