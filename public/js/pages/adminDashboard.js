// public/js/pages/adminDashboard.js

Pages.adminDashboard = function(el) {
  el.innerHTML = `
    <div class="page-wide">
      <nav class="navbar">
        <span class="navbar-brand">📐 MathGameApp</span>
        <span class="navbar-user" id="admin-name-nav"></span>
        <div class="navbar-actions">
          <button class="btn btn-secondary btn-sm" id="admin-logout-btn">Logout</button>
        </div>
      </nav>

      <div class="dashboard-container">

        <!-- Sidebar -->
        <aside class="dash-sidebar">
          <div class="sidebar-section-label">Navigation</div>
          <button class="sidebar-item active" data-tab="overview">📊 Overview</button>
          <button class="sidebar-item" data-tab="users">👥 User Management</button>
          <button class="sidebar-item" data-tab="reports">📈 Reports</button>
          <button class="sidebar-item" data-tab="settings">⚙️ System Settings</button>
          <div class="sidebar-section-label" style="margin-top:24px">Role Badges</div>
          <div style="padding:8px 12px">
            <span class="role-badge role-admin">Admin</span>
          </div>
        </aside>

        <!-- Main content -->
        <main class="dash-main" id="admin-tab-content">
          <!-- Loaded dynamically -->
        </main>

      </div>
    </div>`;

  // Set name
  el.querySelector('#admin-name-nav').textContent = '👋 ' + (App.user.full_name || App.user.username);
  el.querySelector('#admin-logout-btn').addEventListener('click', () => App.logout());

  // Sidebar tab switching
  const sidebar = el.querySelectorAll('.sidebar-item');
  sidebar.forEach(btn => {
    btn.addEventListener('click', () => {
      sidebar.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadTab(btn.dataset.tab);
    });
  });

  loadTab('overview');

  // ── Tab loader ──────────────────────────────────────────────────────────
  function loadTab(tab) {
    const main = el.querySelector('#admin-tab-content');
    main.innerHTML = `<div class="loading-center"><div class="spinner"></div></div>`;
    switch (tab) {
      case 'overview':  renderOverview(main);  break;
      case 'users':     renderUsers(main);     break;
      case 'reports':   renderReports(main);   break;
      case 'settings':  renderSettings(main);  break;
    }
  }

  // ── Overview tab ────────────────────────────────────────────────────────
  async function renderOverview(main) {
    try {
      const stats  = await API.adminGetStats();
      const recent = await API.adminGetRecentUsers(5);

      main.innerHTML = `
        <div class="tab-header">
          <h2>Platform Overview</h2>
          <p class="muted">Live snapshot of MathGameApp activity</p>
        </div>

        <!-- Metric cards -->
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-label">Total users</div>
            <div class="metric-value">${stats.totalUsers ?? '—'}</div>
            <div class="metric-sub">all roles</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Active today</div>
            <div class="metric-value">${stats.activeToday ?? '—'}</div>
            <div class="metric-sub">unique logins</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Sessions today</div>
            <div class="metric-value">${stats.sessionsToday ?? '—'}</div>
            <div class="metric-sub">games played</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Avg accuracy</div>
            <div class="metric-value">${stats.avgAccuracy != null ? stats.avgAccuracy + '%' : '—'}</div>
            <div class="metric-sub">all modes</div>
          </div>
        </div>

        <div class="dash-two-col">

          <!-- Mode popularity -->
          <div class="dash-panel">
            <div class="panel-title">Mode popularity (all-time)</div>
            ${renderModeBar('Computational', stats.modeStats?.computational ?? 0, stats.totalSessions)}
            ${renderModeBar('Algebra',        stats.modeStats?.algebra       ?? 0, stats.totalSessions)}
            ${renderModeBar('Binary',         stats.modeStats?.binary        ?? 0, stats.totalSessions)}
          </div>

          <!-- Recent users -->
          <div class="dash-panel">
            <div class="panel-title">Recently registered users</div>
            ${recent.map(u => `
              <div class="user-row-item">
                <div class="avatar-circle">${initials(u.full_name || u.username)}</div>
                <div class="user-row-info">
                  <span class="user-row-name">${u.full_name || u.username}</span>
                  <span class="user-row-meta">${u.username}</span>
                </div>
                <span class="role-badge role-${u.role}">${u.role}</span>
              </div>`).join('')}
          </div>

        </div>

        <!-- Activity log -->
        <div class="dash-panel" style="margin-top:16px">
          <div class="panel-title">System activity log</div>
          <div id="activity-log">
            <div class="loading-center" style="min-height:60px"><div class="spinner"></div></div>
          </div>
        </div>`;

      // Load activity log
      const logs = await API.adminGetActivityLog();
      const logEl = main.querySelector('#activity-log');
      if (!logs || logs.length === 0) {
        logEl.innerHTML = `<p class="muted" style="padding:10px 0">No recent activity.</p>`;
      } else {
        logEl.innerHTML = logs.map(l => `
          <div class="log-item">
            <span class="log-dot log-${l.type}"></span>
            <div>
              <div class="log-text">${l.message}</div>
              <div class="log-time">${formatDate(l.created_at)}</div>
            </div>
          </div>`).join('');
      }

    } catch (e) {
      main.innerHTML = `<p class="error-msg">Could not load overview: ${e.message}</p>`;
    }
  }

  function renderModeBar(label, count, total) {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    const colorMap = { Computational: 'var(--primary)', Algebra: 'var(--accent)', Binary: 'var(--warning)' };
    return `
      <div class="bar-wrap">
        <div class="bar-label-row"><span>${label}</span><span>${pct}%</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${colorMap[label]}"></div></div>
      </div>`;
  }

  // ── Users tab ───────────────────────────────────────────────────────────
  async function renderUsers(main) {
    try {
      const users = await API.adminGetAllUsers();
      main.innerHTML = `
        <div class="tab-header">
          <h2>User Management</h2>
          <p class="muted">Manage accounts and roles</p>
        </div>

        <div class="dash-panel">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
            <input type="text" id="user-search" placeholder="Search users…" style="max-width:260px;padding:9px 12px;font-size:.85rem" />
            <div style="display:flex;gap:8px">
              <select id="role-filter" style="padding:9px 12px;background:var(--bg-card2);color:var(--text-white);border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:.85rem">
                <option value="">All roles</option>
                <option value="student">Student</option>
                <option value="educator">Educator</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <table class="dash-table" id="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Role</th>
                <th>Last login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="users-tbody">
              ${renderUsersRows(users)}
            </tbody>
          </table>
        </div>`;

      // Search / filter — guard against null/undefined fields from DB
      const tbody = main.querySelector('#users-tbody');
      function applyFilter() {
        const q    = main.querySelector('#user-search').value.toLowerCase().trim();
        const role = main.querySelector('#role-filter').value;
        const filtered = users.filter(u => {
          const name = (u.full_name  || '').toLowerCase();
          const uname = (u.username  || '').toLowerCase();
          const email = (u.email     || '').toLowerCase();
          const matchQ    = !q    || name.includes(q) || uname.includes(q) || email.includes(q);
          const matchRole = !role || (u.role || '') === role;
          return matchQ && matchRole;
        });
        tbody.innerHTML = renderUsersRows(filtered);
        attachRoleHandlers(filtered);
      }
      main.querySelector('#user-search').addEventListener('input', applyFilter);
      main.querySelector('#role-filter').addEventListener('change', applyFilter);
      attachRoleHandlers(users);

    } catch (e) {
      main.innerHTML = `<p class="error-msg">Could not load users: ${e.message}</p>`;
    }
  }

  function renderUsersRows(users) {
    if (users.length === 0) return `<tr><td colspan="5" style="color:var(--text-muted);text-align:center;padding:20px">No users found.</td></tr>`;
    return users.map(u => `
      <tr data-uid="${u.user_id}">
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div class="avatar-circle avatar-sm">${initials(u.full_name || u.username)}</div>
            ${u.full_name || '—'}
          </div>
        </td>
        <td style="color:var(--text-muted)">${u.username}</td>
        <td>
          <select class="role-select" data-uid="${u.user_id}" style="padding:4px 8px;background:var(--bg-card2);color:var(--text-white);border:1px solid var(--border);border-radius:6px;font-size:.8rem">
            <option value="student"  ${u.role==='student'  ? 'selected':''}>Student</option>
            <option value="educator" ${u.role==='educator' ? 'selected':''}>Educator</option>
            <option value="admin"    ${u.role==='admin'    ? 'selected':''}>Admin</option>
          </select>
        </td>
        <td style="color:var(--text-muted);font-size:.82rem">${u.last_login ? formatDate(u.last_login) : 'Never'}</td>
        <td>
          <button class="btn btn-danger btn-sm delete-btn" data-uid="${u.user_id}" style="width:auto;padding:5px 12px;font-size:.78rem">Delete</button>
        </td>
      </tr>`).join('');
  }

  function attachRoleHandlers(users) {
    el.querySelectorAll('.role-select').forEach(sel => {
      sel.addEventListener('change', async () => {
        const uid  = sel.dataset.uid;
        const role = sel.value;
        try {
          await API.adminUpdateRole(uid, role);
          showToast(`Role updated to ${role}`);
        } catch (e) {
          showToast('Failed to update role', true);
        }
      });
    });
    el.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this user? This cannot be undone.')) return;
        const uid = btn.dataset.uid;
        try {
          await API.adminDeleteUser(uid);
          btn.closest('tr').remove();
          showToast('User deleted');
        } catch (e) {
          showToast('Failed to delete user', true);
        }
      });
    });
  }

  // ── Reports tab ─────────────────────────────────────────────────────────
  async function renderReports(main) {
    main.innerHTML = `
      <div class="tab-header">
        <h2>Platform Reports</h2>
        <p class="muted">View and export session data</p>
      </div>
      <div class="dash-two-col">
        <div class="dash-panel">
          <div class="panel-title">Quick exports</div>
          <div class="stack" style="gap:10px">
            <button class="btn btn-secondary" id="export-sessions">📥 Export all sessions (CSV)</button>
            <button class="btn btn-secondary" id="export-users">📥 Export user list (CSV)</button>
          </div>
        </div>
        <div class="dash-panel">
          <div class="panel-title">Accuracy by mode</div>
          <div id="acc-by-mode"><div class="spinner"></div></div>
        </div>
      </div>
      <div class="dash-panel" style="margin-top:16px">
        <div class="panel-title">Recent sessions (all users)</div>
        <div id="all-sessions"><div class="loading-center" style="min-height:60px"><div class="spinner"></div></div></div>
      </div>`;

    main.querySelector('#export-sessions').addEventListener('click', () => exportCSV('sessions'));
    main.querySelector('#export-users').addEventListener('click',   () => exportCSV('users'));

    try {
      const [accData, sessions] = await Promise.all([
        API.adminGetAccuracyByMode(),
        API.adminGetAllSessions(20)
      ]);

      // Accuracy bars
      const accEl = main.querySelector('#acc-by-mode');
      accEl.innerHTML = ['computational','algebra','binary'].map(m => {
        const pct = accData[m] ?? 0;
        const label = { computational:'Computational', algebra:'Algebra', binary:'Binary' }[m];
        const color = { computational:'var(--primary)', algebra:'var(--accent)', binary:'var(--warning)' }[m];
        return `
          <div class="bar-wrap">
            <div class="bar-label-row"><span>${label}</span><span>${pct}%</span></div>
            <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
          </div>`;
      }).join('');

      // Sessions table
      const sessEl = main.querySelector('#all-sessions');
      if (!sessions || sessions.length === 0) {
        sessEl.innerHTML = `<p class="muted" style="padding:12px 0">No sessions yet.</p>`;
      } else {
        sessEl.innerHTML = `
          <table class="dash-table">
            <thead><tr><th>User</th><th>Mode</th><th>Level</th><th>Score</th><th>Accuracy</th><th>Date</th></tr></thead>
            <tbody>${sessions.map(s => {
              const acc = s.total_questions > 0 ? Math.round((s.correct_answers / s.total_questions) * 100) : 0;
              return `<tr>
                <td style="color:var(--text-muted)">${s.username || s.user_id}</td>
                <td><span class="badge badge-mode-${s.mode}">${s.mode}</span></td>
                <td>${s.difficulty?.replace('level','L') || '—'}</td>
                <td>${s.score} pts</td>
                <td>${acc}%</td>
                <td style="color:var(--text-muted);font-size:.8rem">${formatDate(s.played_at)}</td>
              </tr>`;
            }).join('')}</tbody>
          </table>`;
      }
    } catch (e) {
      main.querySelector('#acc-by-mode').innerHTML = `<p class="error-msg">Failed to load.</p>`;
    }
  }

  // ── Settings tab ────────────────────────────────────────────────────────
  function renderSettings(main) {
    main.innerHTML = `
      <div class="tab-header">
        <h2>System Settings</h2>
        <p class="muted">Platform-wide configuration and question bank</p>
      </div>

      <!-- Question Bank -->
      <div class="dash-panel" style="margin-bottom:16px">
        <div class="panel-title">📚 Question bank — add custom questions</div>
        <p class="muted" style="font-size:.82rem;margin-bottom:14px">
          Questions are auto-generated by the engine. Use this to add extra custom questions per mode and level.
          The engine will mix them into the pool.
        </p>

        <!-- Filters -->
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;align-items:center">
          <select id="qb-mode" style="padding:9px 12px;background:var(--bg-card2);color:var(--text-white);border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:.85rem">
            <option value="computational">🔢 Computational</option>
            <option value="algebra">🔡 Algebra</option>
            <option value="binary">💾 Binary</option>
          </select>
          <select id="qb-level" style="padding:9px 12px;background:var(--bg-card2);color:var(--text-white);border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:.85rem">
            <option value="1">Level 1 — Beginner</option>
            <option value="2">Level 2 — Easy</option>
            <option value="3">Level 3 — Medium</option>
            <option value="4">Level 4 — Hard</option>
            <option value="5">Level 5 — Expert</option>
          </select>
          <button class="btn btn-secondary btn-sm" id="qb-load" style="width:auto">Load questions</button>
        </div>

        <!-- Question list -->
        <div id="qb-list" style="margin-bottom:16px">
          <p class="muted" style="font-size:.85rem">Select a mode and level, then click "Load questions".</p>
        </div>

        <!-- Add new question form -->
        <div style="border-top:1px solid var(--border);padding-top:14px;margin-top:4px">
          <div class="panel-title">Add a new question</div>
          <div style="display:flex;flex-direction:column;gap:10px">
            <div>
              <label>Question text</label>
              <input type="text" id="qb-question" placeholder="e.g.  What is 12 × 8?" />
            </div>
            <div>
              <label>Correct answer</label>
              <input type="text" id="qb-answer" placeholder="e.g.  96" />
            </div>
            <div>
              <label>Wrong options (comma-separated, 3 needed for MCQ)</label>
              <input type="text" id="qb-wrong" placeholder="e.g.  84, 100, 72" />
            </div>
            <div>
              <label>Step-by-step solution <span style="font-weight:400;text-transform:none;letter-spacing:0">(optional — shown to student after answering)</span></label>
              <textarea id="qb-solution" rows="2" style="width:100%;padding:10px;background:rgba(255,255,255,0.07);border:1.5px solid var(--border);border-radius:var(--radius-sm);color:var(--text-white);font-size:.9rem;resize:vertical" placeholder="e.g.  12 × 8 = 12 × 4 × 2 = 48 × 2 = 96"></textarea>
            </div>
            <div>
              <button class="btn btn-primary" id="qb-save" style="width:auto">+ Add question</button>
            </div>
            <p class="error-msg" id="qb-error"></p>
          </div>
        </div>
      </div>

      <!-- Difficulty / Timer settings -->
      <div class="dash-panel" style="margin-bottom:16px">
        <div class="panel-title">⏱ Difficulty & timer settings</div>
        <p class="muted" style="font-size:.82rem;margin-bottom:14px">
          These mirror the values in <code style="color:var(--primary-light)">game.js timerSeconds()</code>.
          Edit the source file to change them permanently — this panel shows the current config.
        </p>
        <table class="dash-table">
          <thead><tr><th>Level</th><th>Label</th><th>Time limit</th><th>Questions per session</th></tr></thead>
          <tbody>
            <tr><td>Level 1</td><td>Beginner</td><td>40 seconds</td><td>10</td></tr>
            <tr><td>Level 2</td><td>Easy</td><td>35 seconds</td><td>10</td></tr>
            <tr><td>Level 3</td><td>Medium</td><td>30 seconds</td><td>10</td></tr>
            <tr><td>Level 4</td><td>Hard</td><td>25 seconds</td><td>10</td></tr>
            <tr><td>Level 5</td><td>Expert</td><td>20 seconds</td><td>10</td></tr>
          </tbody>
        </table>
        <p class="muted" style="font-size:.78rem;margin-top:10px">Binary mode is always Level 1 with a 40-second timer.</p>
      </div>

      <!-- General settings -->
      <div class="dash-two-col">
        <div class="dash-panel">
          <div class="panel-title">Announcement banner</div>
          <div class="stack" style="gap:10px">
            <textarea id="banner-text" rows="3" style="width:100%;padding:10px;background:rgba(255,255,255,0.07);border:1.5px solid var(--border);border-radius:var(--radius-sm);color:var(--text-white);font-size:.9rem;resize:vertical" placeholder="Enter announcement text for all users…"></textarea>
            <button class="btn btn-primary" id="save-banner" style="width:auto">Save banner</button>
          </div>
        </div>
        <div class="dash-panel">
          <div class="panel-title">Registration</div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
            <span>Allow new registrations</span>
            <label class="toggle-switch">
              <input type="checkbox" id="toggle-reg" checked />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0">
            <span>Require email on register</span>
            <label class="toggle-switch">
              <input type="checkbox" id="toggle-email" />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      <div class="dash-panel" style="margin-top:16px">
        <div class="panel-title" style="color:var(--error)">Danger zone</div>
        <p class="muted" style="font-size:.85rem;margin-bottom:12px">These actions are irreversible. Proceed with caution.</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-danger btn-sm" style="width:auto">Clear all sessions</button>
          <button class="btn btn-danger btn-sm" style="width:auto">Reset leaderboard</button>
        </div>
      </div>`;

    // ── Question bank interactions ──────────────────────────────────────
    main.querySelector('#qb-load').addEventListener('click', () => loadQuestions(main));
    main.querySelector('#qb-save').addEventListener('click', () => saveQuestion(main));
    main.querySelector('#save-banner').addEventListener('click', () => showToast('Banner saved (demo)'));
    main.querySelector('#toggle-reg').addEventListener('change',   () => showToast('Setting updated (demo)'));
    main.querySelector('#toggle-email').addEventListener('change', () => showToast('Setting updated (demo)'));
  }

  async function loadQuestions(main) {
    const mode  = main.querySelector('#qb-mode').value;
    const level = main.querySelector('#qb-level').value;
    const listEl = main.querySelector('#qb-list');
    listEl.innerHTML = `<div class="spinner"></div>`;
    try {
      const questions = await API.adminGetQuestions(mode, level);
      if (!questions || questions.length === 0) {
        listEl.innerHTML = `<p class="muted" style="font-size:.85rem;padding:8px 0">No custom questions yet for ${mode} Level ${level}. Add one below.</p>`;
        return;
      }
      listEl.innerHTML = `
        <table class="dash-table">
          <thead><tr><th>Question</th><th>Answer</th><th>Level</th><th></th></tr></thead>
          <tbody>
            ${questions.map(q => `
              <tr>
                <td>${q.question_text}</td>
                <td style="color:var(--success)">${q.correct_answer}</td>
                <td>L${q.level}</td>
                <td><button class="btn btn-danger btn-sm delete-q" data-qid="${q.question_id}" style="width:auto;padding:4px 10px;font-size:.75rem">Delete</button></td>
              </tr>`).join('')}
          </tbody>
        </table>`;
      listEl.querySelectorAll('.delete-q').forEach(btn => {
        btn.addEventListener('click', async () => {
          try {
            await API.adminDeleteQuestion(btn.dataset.qid);
            btn.closest('tr').remove();
            showToast('Question deleted');
          } catch { showToast('Delete failed', true); }
        });
      });
    } catch (e) {
      listEl.innerHTML = `<p class="error-msg">Could not load questions: ${e.message}</p>`;
    }
  }

  async function saveQuestion(main) {
    const mode     = main.querySelector('#qb-mode').value;
    const level    = main.querySelector('#qb-level').value;
    const question = main.querySelector('#qb-question').value.trim();
    const answer   = main.querySelector('#qb-answer').value.trim();
    const wrong    = main.querySelector('#qb-wrong').value.trim();
    const solution = main.querySelector('#qb-solution').value.trim();
    const errEl    = main.querySelector('#qb-error');
    errEl.textContent = '';

    if (!question || !answer) { errEl.textContent = 'Question text and correct answer are required.'; return; }

    try {
      await API.adminAddQuestion({ mode, level, question, answer, wrong, solution });
      main.querySelector('#qb-question').value = '';
      main.querySelector('#qb-answer').value   = '';
      main.querySelector('#qb-wrong').value    = '';
      main.querySelector('#qb-solution').value = '';
      showToast('Question added!');
      loadQuestions(main);
    } catch (e) {
      errEl.textContent = 'Failed to save: ' + e.message;
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────
  function initials(name) {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }
  function formatDate(d) {
    return d ? new Date(d).toLocaleString() : '—';
  }
  function exportCSV(type) {
    window.open(`/api/admin/export/${type}`, '_blank');
  }
  function showToast(msg, isError = false) {
    const t = document.createElement('div');
    t.className = 'toast' + (isError ? ' toast-error' : '');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }
};
