// public/js/pages/modeSelect.js

Pages.modeSelect = function(el) {
  let selectedMode  = null;
  let selectedLevel = 1;

  el.innerHTML = `
    <div class="page-wide">
      <nav class="navbar">
        <button class="btn btn-secondary btn-sm" id="back-btn">← Back</button>
        <span class="navbar-brand">📐 MathGameApp</span>
        <span></span>
      </nav>

      <div style="max-width:680px;margin:40px auto;padding:0 20px">
        <h2 style="margin-bottom:4px">Choose a Mode</h2>
        <p class="muted" style="margin-bottom:4px">Select your game mode and difficulty level</p>

        <div class="mode-grid" style="margin-top:20px" id="mode-grid">
          <div class="mode-card" data-mode="computational">
            <span class="mode-icon">🔢</span>
            <h3>Computational Maths</h3>
            <p>PEMDAS, fractions, decimals and more across 5 levels</p>
          </div>
          <div class="mode-card" data-mode="algebra">
            <span class="mode-icon">🔡</span>
            <h3>Algebra</h3>
            <p>Linear equations, substitution and quadratics</p>
          </div>
          <div class="mode-card" data-mode="binary">
            <span class="mode-icon">💾</span>
            <h3>Binary Conversion</h3>
            <p>Decimal ↔ Binary ↔ Hexadecimal</p>
          </div>
        </div>

        <!-- Level selector (hidden for binary) -->
        <div id="level-section" style="display:none;margin-top:28px">
          <h3 style="margin-bottom:4px">Select Difficulty Level</h3>
          <p class="muted" style="font-size:.83rem;margin-bottom:0">Levels increase in complexity</p>
          <div class="level-grid" id="level-grid">
            ${[1,2,3,4,5].map(n => `
              <div class="level-btn ${n===1?'selected':''}" data-level="${n}">
                <div style="font-size:1.1rem">L${n}</div>
                <div style="font-size:.72rem;color:var(--text-muted);margin-top:3px">${levelLabel(n)}</div>
              </div>`).join('')}
          </div>
        </div>

        <!-- Start button -->
        <div id="start-section" style="display:none;margin-top:28px">
          <div class="sep"></div>
          <button class="btn btn-primary" id="start-btn" style="max-width:300px;margin:0 auto">
            ▶ Start Game
          </button>
        </div>

      </div>
    </div>`;

  function levelLabel(n) {
    return ['Beginner','Elementary','Intermediate','Advanced','Expert'][n-1];
  }

  el.querySelector('#back-btn').addEventListener('click', () => App.showPage('landing'));

  // Mode selection
  el.querySelectorAll('.mode-card').forEach(card => {
    card.addEventListener('click', () => {
      el.querySelectorAll('.mode-card').forEach(c => c.style.borderColor = '');
      card.style.borderColor = 'var(--primary-light)';
      selectedMode = card.dataset.mode;

      const levelSection = el.querySelector('#level-section');
      const startSection = el.querySelector('#start-section');

      if (selectedMode === 'binary') {
        levelSection.style.display = 'none';
      } else {
        levelSection.style.display = 'block';
      }
      startSection.style.display = 'block';
    });
  });

  // Level selection
  el.querySelectorAll('.level-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      el.querySelectorAll('.level-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedLevel = parseInt(btn.dataset.level);
    });
  });

  // Start game
  el.querySelector('#start-btn').addEventListener('click', () => {
    if (!selectedMode) return;
    App.showPage('game', { mode: selectedMode, level: selectedLevel });
  });
};
