// public/js/pages/coach.js — AI Performance Coach page

Pages.coach = function(el) {
  el.innerHTML = `
    <div class="page-wide">
      <nav class="navbar">
        <span class="navbar-brand"> MathGameApp</span>
        <span class="navbar-user"> AI Coach</span>
        <div class="navbar-actions">
          <button class="btn btn-secondary btn-sm" id="coach-back-btn">← Back</button>
          <button class="btn btn-secondary btn-sm" id="coach-logout-btn">Logout</button>
        </div>
      </nav>

      <div style="max-width:820px;margin:0 auto;padding:28px 20px">

        <!-- Header -->
        <div class="card" style="margin-bottom:24px;background:linear-gradient(135deg,#1a1f5e,#2d2080);padding:28px 32px">
          <div style="display:flex;align-items:center;gap:16px">
            <span style="font-size:3rem"></span>
            <div>
              <h2 style="margin-bottom:4px">AI Performance Coach</h2>
              <p class="muted">Ask me anything about your maths performance — I'll analyse your real game data and give you personalised advice.</p>
            </div>
          </div>
        </div>

        <!-- Stats snapshot (loads immediately) -->
        <div id="coach-stats-area">
          <div class="loading-center" style="min-height:120px"><div class="spinner"></div></div>
        </div>

        <!-- Chat interface -->
        <div class="coach-chat-wrap" style="margin-top:24px">

          <!-- Suggested questions -->
          <div id="coach-suggestions" style="margin-bottom:16px">
            <p class="muted" style="font-size:.8rem;margin-bottom:8px;text-transform:uppercase;letter-spacing:.06em;font-weight:700">Quick questions</p>
            <div style="display:flex;flex-wrap:wrap;gap:8px">
              <button class="coach-chip" data-q="What should I improve?">What should I improve?</button>
              <button class="coach-chip" data-q="Which mode am I worst at?">Which mode am I worst at?</button>
              <button class="coach-chip" data-q="Am I getting faster over time?">Am I getting faster over time?</button>
              <button class="coach-chip" data-q="What difficulty level should I try next?">What level should I try next?</button>
              <button class="coach-chip" data-q="Show me my weak topics">Show me my weak topics</button>
            </div>
          </div>

          <!-- Message thread -->
          <div id="coach-messages" class="coach-messages"></div>

          <!-- Input area -->
          <div class="coach-input-row" style="margin-top:16px;display:flex;gap:10px">
            <input type="text" id="coach-input" placeholder="Ask your coach anything about your performance…"
              style="flex:1;font-size:.95rem" />
            <button class="btn btn-primary btn-sm" id="coach-send-btn" style="width:auto;padding:12px 20px;white-space:nowrap">
              Ask AI 
            </button>
          </div>
          <p id="coach-error" class="error-msg" style="margin-top:8px"></p>
        </div>

      </div>
    </div>`;

  //  Navigation 
  el.querySelector('#coach-back-btn').addEventListener('click', () => App.showPage('landing'));
  el.querySelector('#coach-logout-btn').addEventListener('click', () => App.logout());

  //  Load stats snapshot 
  loadStats();

  async function loadStats() {
    const statsEl = el.querySelector('#coach-stats-area');
    try {
      const d = await API.coachGetData();
      if (d.totalSessions === 0) {
        statsEl.innerHTML = `<div class="dash-panel" style="text-align:center;padding:24px">
          <p style="font-size:1.5rem;margin-bottom:8px"></p>
          <p class="muted">No sessions yet! Play some games first, then come back for coaching.</p>
        </div>`;
        return;
      }

      const byMode = d.byMode.map(m => `
        <div class="bar-wrap">
          <div class="bar-label-row">
            <span>${m.mode.charAt(0).toUpperCase()+m.mode.slice(1)}</span>
            <span>${m.avgAccuracy}% &nbsp;·&nbsp; ${m.sessions} sessions</span>
          </div>
          <div class="bar-track"><div class="bar-fill" style="width:${m.avgAccuracy}%;background:${barColor(m.avgAccuracy)}"></div></div>
        </div>`).join('');

      const weakMode  = d.byMode.sort((a,b) => a.avgAccuracy - b.avgAccuracy)[0];
      const strongMode= [...d.byMode].sort((a,b) => b.avgAccuracy - a.avgAccuracy)[0];

      statsEl.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:16px">
          ${statCard('Total Sessions', d.totalSessions, '')}
          ${statCard('Avg Accuracy',   d.avgAccuracy + '%', accuracyColor(d.avgAccuracy))}
          ${statCard('Avg Score',      d.avgScore + ' pts', '')}
          ${statCard('Avg Time/Q',     d.avgTimeSec + 's', '')}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div class="dash-panel">
            <div class="panel-title">Accuracy by Mode</div>
            ${byMode}
          </div>
          <div class="dash-panel">
            <div class="panel-title">Quick Insights</div>
            ${weakMode   ? `<p style="margin-bottom:10px"> <strong>Weakest mode:</strong> ${weakMode.mode} (${weakMode.avgAccuracy}%)</p>` : ''}
            ${strongMode ? `<p style="margin-bottom:10px"> <strong>Strongest mode:</strong> ${strongMode.mode} (${strongMode.avgAccuracy}%)</p>` : ''}
            ${d.recentWrong.length ? `<p style="margin-bottom:10px"> <strong>${d.recentWrong.length} recent mistakes</strong> logged</p>` : ''}
            ${d.slowestQuestions[0] ? `<p> <strong>Slowest question:</strong> ${d.slowestQuestions[0].timeSec}s</p>` : ''}
          </div>
        </div>`;
    } catch (err) {
      const msg = err?.message || 'Could not load performance data.';
      statsEl.innerHTML = `<p class="error-msg">${msg}</p>`;
      console.error('[coach] loadStats error:', err);
    }
  }

  //  Chat logic 
  const messagesEl = el.querySelector('#coach-messages');
  const inputEl    = el.querySelector('#coach-input');
  const sendBtn    = el.querySelector('#coach-send-btn');
  const errorEl    = el.querySelector('#coach-error');

  // Chip buttons
  el.querySelectorAll('.coach-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      inputEl.value = chip.dataset.q;
      sendMessage();
    });
  });

  // Enter key
  inputEl.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });
  sendBtn.addEventListener('click', sendMessage);

  // Auto-welcome message
  setTimeout(() => {
    appendMessage('coach', `Hi ${App.user.full_name?.split(' ')[0] || App.user.username}!  I'm your AI performance coach. I've loaded your game data — ask me anything or pick a quick question above!`);
  }, 400);

  async function sendMessage() {
    const q = inputEl.value.trim();
    if (!q) return;
    errorEl.textContent = '';
    inputEl.value = '';

    appendMessage('student', q);
    const thinkingId = appendThinking();
    sendBtn.disabled = true;
    inputEl.disabled = true;

    try {
      const res = await API.coachAnalyse(q);
      removeThinking(thinkingId);
      appendMessage('coach', res.feedback);
    } catch (err) {
      removeThinking(thinkingId);
      errorEl.textContent = err.message || 'AI coach unavailable. Please try again.';
    } finally {
      sendBtn.disabled = false;
      inputEl.disabled = false;
      inputEl.focus();
    }
  }

  function appendMessage(role, text) {
    const isCoach = role === 'coach';
    const div = document.createElement('div');
    div.className = 'coach-msg ' + (isCoach ? 'coach-msg-ai' : 'coach-msg-user');
    div.innerHTML = `
      <div class="coach-msg-avatar">${isCoach ? '' : ''}</div>
      <div class="coach-msg-bubble">${escHtml(text)}</div>`;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  function appendThinking() {
    const id = 'thinking-' + Date.now();
    const div = document.createElement('div');
    div.className = 'coach-msg coach-msg-ai';
    div.id = id;
    div.innerHTML = `
      <div class="coach-msg-avatar"></div>
      <div class="coach-msg-bubble coach-thinking">
        <span class="thinking-dot"></span><span class="thinking-dot"></span><span class="thinking-dot"></span>
        <span style="margin-left:6px;font-size:.8rem;color:var(--text-muted)">Analysing your data…</span>
      </div>`;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return id;
  }

  function removeThinking(id) {
    const el2 = document.getElementById(id);
    if (el2) el2.remove();
  }

  function escHtml(t) {
    return String(t)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\n/g,'<br>');
  }

  function statCard(label, value, color) {
    return `<div class="metric-card">
      <div class="metric-label">${label}</div>
      <div class="metric-value" style="${color ? 'color:'+color : ''}">${value}</div>
    </div>`;
  }

  function barColor(pct) {
    if (pct >= 75) return 'var(--success)';
    if (pct >= 50) return 'var(--warning)';
    return 'var(--error)';
  }

  function accuracyColor(pct) {
    if (pct >= 75) return 'var(--success)';
    if (pct >= 50) return 'var(--warning)';
    return 'var(--error)';
  }
};
