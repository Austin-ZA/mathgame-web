// public/js/pages/educatorDashboard.js

Pages.educatorDashboard = function(el) {
  el.innerHTML = `
    <div class="page-wide">
      <nav class="navbar">
        <span class="navbar-brand">📐 MathGameApp</span>
        <span class="navbar-user" id="edu-name-nav"></span>
        <div class="navbar-actions">
          <button class="btn btn-secondary btn-sm" id="edu-logout-btn">Logout</button>
        </div>
      </nav>

      <div class="dashboard-container">

        <!-- Sidebar -->
        <aside class="dash-sidebar">
          <div class="sidebar-section-label">Navigation</div>
          <button class="sidebar-item active" data-tab="overview">📊 Overview</button>
          <button class="sidebar-item" data-tab="students">🎓 My Students</button>
          <button class="sidebar-item" data-tab="reports">📈 Reports</button>
          <div class="sidebar-section-label" style="margin-top:24px">Role</div>
          <div style="padding:8px 12px">
            <span class="role-badge role-educator">Educator</span>
          </div>
        </aside>

        <!-- Main content -->
        <main class="dash-main" id="edu-tab-content">
          <!-- Loaded dynamically -->
        </main>

      </div>
    </div>`;

  el.querySelector('#edu-name-nav').textContent = '👋 ' + (App.user.full_name || App.user.username);
  el.querySelector('#edu-logout-btn').addEventListener('click', () => App.logout());

  const sidebar = el.querySelectorAll('.sidebar-item');
  sidebar.forEach(btn => {
    btn.addEventListener('click', () => {
      sidebar.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadTab(btn.dataset.tab);
    });
  });

  loadTab('overview');

  function loadTab(tab) {
    const main = el.querySelector('#edu-tab-content');
    main.innerHTML = `<div class="loading-center"><div class="spinner"></div></div>`;
    switch (tab) {
      case 'overview':  renderOverview(main);  break;
      case 'students':  renderStudents(main);  break;
      case 'reports':   renderReports(main);   break;
    }
  }

  // ── Overview tab ────────────────────────────────────────────────────────
  async function renderOverview(main) {
    try {
      const [stats, students] = await Promise.all([
        API.eduGetStats(),
        API.eduGetStudents()
      ]);

      const struggling = students.filter(s => {
        const acc = typeof s.avg_accuracy === 'number' ? s.avg_accuracy : null;
        if (acc === null) return false;
        // Hard threshold: below 50% overall, or below 60% on lower levels (expected to be easier)
        if (acc < 50) return true;
        if (s.preferred_level && parseInt(s.preferred_level) <= 2 && acc < 60) return true;
        return false;
      });
      const inactive   = students.filter(s => typeof s.days_inactive === 'number' && s.days_inactive >= 7);

      main.innerHTML = `
        <div class="tab-header">
          <h2>Class Overview</h2>
          <p class="muted">Your students' progress at a glance</p>
        </div>

        <!-- Metric cards -->
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-label">My students</div>
            <div class="metric-value">${students.length}</div>
            <div class="metric-sub">total enrolled</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Active this week</div>
            <div class="metric-value">${stats.activeThisWeek ?? '—'}</div>
            <div class="metric-sub">${students.length > 0 ? Math.round(((stats.activeThisWeek??0)/students.length)*100) : 0}% engagement</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Class avg score</div>
            <div class="metric-value">${stats.avgScore ?? '—'}</div>
            <div class="metric-sub">pts per session</div>
          </div>
          <div class="metric-card" style="${struggling.length > 0 ? 'border-left:3px solid var(--error)' : ''}">
            <div class="metric-label">Struggling</div>
            <div class="metric-value" style="${struggling.length > 0 ? 'color:var(--error)' : ''}">${struggling.length}</div>
            <div class="metric-sub">below 50% accuracy</div>
          </div>
        </div>

        <div class="dash-two-col">

          <!-- Student progress -->
          <div class="dash-panel">
            <div class="panel-title">Student progress</div>
            ${students.length === 0
              ? `<p class="muted" style="padding:12px 0">No students enrolled yet.</p>`
              : students.slice(0, 6).map(s => {
                  const acc = s.avg_accuracy;
                  const hasData = typeof acc === 'number';
                  const displayAcc = hasData ? acc : 0;
                  const status = !hasData ? { cls:'pill-warn', label:'No data' }
                               : acc >= 70 ? { cls:'pill-active',  label:'On track'  }
                               : acc >= 50 ? { cls:'pill-warn',    label:'At risk'   }
                                           : { cls:'pill-danger',  label:'Struggling'};
                  const barColor = !hasData ? 'var(--text-muted)' : acc >= 70 ? 'var(--success)' : acc >= 50 ? 'var(--warning)' : 'var(--error)';
                  return `
                    <div class="std-progress-row">
                      <div class="avatar-circle avatar-sm">${initials(s.full_name || s.username)}</div>
                      <div class="std-progress-info">
                        <span class="std-name">${s.full_name || s.username}</span>
                        <div class="std-acc-bar-wrap">
                          <div class="std-acc-bar"><div class="std-acc-fill" style="width:${displayAcc}%;background:${barColor}"></div></div>
                          <span class="std-acc-num">${hasData ? `${acc}%` : '—'}</span>
                        </div>
                      </div>
                      <span class="dash-pill ${status.cls}">${status.label}</span>
                    </div>`;
                }).join('')}
            ${students.length > 6 ? `<p class="muted" style="font-size:.82rem;margin-top:8px">+${students.length-6} more — see Students tab</p>` : ''}
          </div>

          <!-- Alerts panel -->
          <div class="dash-panel">
            <div class="panel-title">Alerts</div>
            ${struggling.length === 0 && inactive.length === 0
              ? `<p style="color:var(--success);padding:8px 0">✅ All students are on track!</p>`
              : [
                  ...inactive.map(s => `
                    <div class="log-item">
                      <span class="log-dot log-danger"></span>
                      <div>
                        <div class="log-text">${s.full_name || s.username} — inactive for ${s.days_inactive} days</div>
                        <div class="log-time">Flagged today</div>
                      </div>
                    </div>`),
                  ...struggling.map(s => `
                    <div class="log-item">
                      <span class="log-dot log-warn"></span>
                      <div>
                        <div class="log-text">${s.full_name || s.username} — accuracy ${s.avg_accuracy ?? 0}%</div>
                        <div class="log-time">Needs attention</div>
                      </div>
                    </div>`)
                ].join('')}

        <div class="panel-title" style="margin-top:16px">Mode accuracy this week</div>
            ${renderModeBar('Computational', stats.modeAccuracy?.computational ?? 0)}
            ${renderModeBar('Algebra',        stats.modeAccuracy?.algebra       ?? 0)}
            ${renderModeBar('Binary',         stats.modeAccuracy?.binary        ?? 0)}
          </div>
        </div>`;

    } catch (e) {
      main.innerHTML = `<p class="error-msg">Could not load overview: ${e.message}</p>`;
    }
  }

  function renderModeBar(label, pct) {
    const color = { Computational: 'var(--primary)', Algebra: 'var(--accent)', Binary: 'var(--warning)' }[label];
    return `
      <div class="bar-wrap">
        <div class="bar-label-row"><span>${label}</span><span>${pct}%</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
      </div>`;
  }

  // ── Students tab ────────────────────────────────────────────────────────
  async function renderStudents(main) {
    try {
      const students = await API.eduGetStudents();
      main.innerHTML = `
        <div class="tab-header">
          <h2>My Students</h2>
          <p class="muted">Detailed view of each student's performance</p>
        </div>

        <div class="dash-panel">
          <input type="text" id="stu-search" placeholder="Search students…" style="max-width:260px;padding:9px 12px;font-size:.85rem;margin-bottom:14px" />
          <table class="dash-table" id="stu-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Sessions</th>
                <th>Avg accuracy</th>
                <th>Best mode</th>
                <th>Last active</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="stu-tbody">${renderStudentRows(students)}</tbody>
          </table>
        </div>`;

      const tbody = main.querySelector('#stu-tbody');
      main.querySelector('#stu-search').addEventListener('input', e => {
        const q = e.target.value.toLowerCase().trim();
        const f = students.filter(s =>
          !q ||
          (s.full_name || '').toLowerCase().includes(q) ||
          (s.username  || '').toLowerCase().includes(q) ||
          (s.email     || '').toLowerCase().includes(q)
        );
        tbody.innerHTML = renderStudentRows(f);
      });
    } catch (e) {
      main.innerHTML = `<p class="error-msg">Could not load students: ${e.message}</p>`;
    }
  }

  function renderStudentRows(students) {
    if (students.length === 0)
      return `<tr><td colspan="6" style="color:var(--text-muted);text-align:center;padding:20px">No students found.</td></tr>`;
    return students.map(s => {
      const acc    = s.avg_accuracy;
      const hasData = typeof acc === 'number';
      const status = !hasData ? { cls:'pill-warn',    label:'No data' }
                   : acc >= 70 ? { cls:'pill-active',  label:'On track'  }
                   : acc >= 50 ? { cls:'pill-warn',    label:'At risk'   }
                               : { cls:'pill-danger',  label:'Struggling'};
      return `<tr>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div class="avatar-circle avatar-sm">${initials(s.full_name || s.username)}</div>
            <div>
              <div>${s.full_name || s.username}</div>
              <div style="font-size:.78rem;color:var(--text-muted)">${s.username}</div>
            </div>
          </div>
        </td>
        <td>${s.total_sessions ?? 0}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div class="std-acc-bar" style="width:60px"><div class="std-acc-fill" style="width:${hasData ? acc : 0}%;background:${!hasData ? 'var(--text-muted)' : acc>=70?'var(--success)':acc>=50?'var(--warning)':'var(--error)'}"></div></div>
            <span>${hasData ? `${acc}%` : '—'}</span>
          </div>
        </td>
        <td><span class="badge badge-mode-${s.best_mode || 'none'}">${s.best_mode || '—'}</span></td>
        <td style="color:var(--text-muted);font-size:.82rem">${s.last_active ? formatDate(s.last_active) : 'Never'}</td>
        <td><span class="dash-pill ${status.cls}">${status.label}</span></td>
      </tr>`;
    }).join('');  }

  // ── Reports tab ─────────────────────────────────────────────────────────
  async function renderReports(main) {
    main.innerHTML = `
      <div class="tab-header">
        <h2>Class Reports</h2>
        <p class="muted">Export and review performance data</p>
      </div>
      <div class="dash-two-col">
        <div class="dash-panel">
          <div class="panel-title">Exports</div>
          <div class="stack" style="gap:10px">
            <button class="btn btn-secondary" id="exp-class">📥 Class performance report (CSV)</button>
            <button class="btn btn-secondary" id="exp-students">📥 Individual student data (CSV)</button>
          </div>
        </div>
        <div class="dash-panel">
          <div class="panel-title">Top performers this week</div>
          <div id="top-performers"><div class="spinner"></div></div>
        </div>
      </div>
      <div class="dash-panel" style="margin-top:16px">
        <div class="panel-title">Recent sessions — your students</div>
        <div id="recent-sessions"><div class="loading-center" style="min-height:60px"><div class="spinner"></div></div></div>
      </div>`;

    main.querySelector('#exp-class').addEventListener('click',    () => window.open('/api/educator/export/class', '_blank'));
    main.querySelector('#exp-students').addEventListener('click', () => window.open('/api/educator/export/students', '_blank'));

    try {
      const [students, sessions] = await Promise.all([
        API.eduGetStudents(),
        API.eduGetRecentSessions(20)
      ]);

      // Top performers
      const sorted = [...students].sort((a,b) => (b.avg_accuracy??0) - (a.avg_accuracy??0)).slice(0,4);
      const topEl = main.querySelector('#top-performers');
      topEl.innerHTML = sorted.map((s,i) => `
        <div class="user-row-item">
          <div class="avatar-circle" style="background:${['rgba(91,106,245,.3)','rgba(76,175,130,.3)','rgba(255,183,77,.3)','rgba(255,107,157,.3)'][i]}">
            ${['🥇','🥈','🥉','4️⃣'][i]}
          </div>
          <div class="user-row-info">
            <span class="user-row-name">${s.full_name || s.username}</span>
            <span class="user-row-meta">${s.avg_accuracy ?? 0}% accuracy</span>
          </div>
        </div>`).join('') || `<p class="muted">No data yet.</p>`;

      // Recent sessions
      const sessEl = main.querySelector('#recent-sessions');
      if (!sessions || sessions.length === 0) {
        sessEl.innerHTML = `<p class="muted" style="padding:12px 0">No sessions yet.</p>`;
      } else {
        sessEl.innerHTML = `
          <table class="dash-table">
            <thead><tr><th>Student</th><th>Mode</th><th>Level</th><th>Score</th><th>Accuracy</th><th>Date</th></tr></thead>
            <tbody>${sessions.map(s => {
              const acc = s.total_questions > 0 ? Math.round((s.correct_answers / s.total_questions) * 100) : 0;
              return `<tr>
                <td>${s.full_name || s.username || s.user_id}</td>
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
      main.querySelector('#top-performers').innerHTML = `<p class="error-msg">Failed to load.</p>`;
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────
  function initials(name) {
    if (!name) return "?";
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }
  function formatDate(d) {
    return d ? new Date(d).toLocaleString() : '—';
  }
};
