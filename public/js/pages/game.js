// public/js/pages/game.js
// Mirrors GameScreen.java — 10 questions, timer, skip, TTS, correct-answer reveal

Pages.game = function(el, { mode, level }) {
  const TOTAL_QUESTIONS = 10;

  // Timer per level (mirrors GameScreen.java timerSeconds())
  function timerSeconds() {
    const lvl = parseInt(level) || 1;
    return lvl === 1 ? 40 : lvl === 2 ? 35 : lvl === 3 ? 30 : lvl === 4 ? 25 : 20;
  }

  let sessionId     = null;
  let currentQ      = null;
  let questionNum   = 0;
  let score         = 0;
  let correctCount  = 0;
  let answered      = false;
  let timerInterval = null;
  let timeLeft      = timerSeconds();
  let questionStart = null;
  let totalTime     = 0;

  // ── TTS (mirrors TTSEngine.java / SolutionPanel.java "Read Aloud") ────────
  let ttsUtterance = null;
  function ttsSpeak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    ttsUtterance = new SpeechSynthesisUtterance(text);
    ttsUtterance.rate  = 0.92;
    ttsUtterance.pitch = 1;
    ttsUtterance.onend = () => updateTtsBtn(false);
    window.speechSynthesis.speak(ttsUtterance);
    updateTtsBtn(true);
  }
  function ttsStop() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    updateTtsBtn(false);
  }
  function updateTtsBtn(speaking) {
    const btn = el.querySelector('#tts-btn');
    if (!btn) return;
    if (speaking) {
      btn.textContent = '⏹ Stop Reading';
      btn.style.background = 'rgba(239,83,80,0.18)';
      btn.style.borderColor = 'rgba(239,83,80,0.45)';
      btn.style.color = 'var(--error)';
    } else {
      btn.textContent = '🔊 Read Aloud';
      btn.style.background = 'rgba(91,106,245,0.12)';
      btn.style.borderColor = 'rgba(91,106,245,0.35)';
      btn.style.color = 'var(--primary-light)';
    }
  }

  const modeLabel = { computational: 'Computational', algebra: 'Algebra', binary: 'Binary' }[mode] || mode;

  // ── Shell HTML ─────────────────────────────────────────────────────────────
  el.innerHTML = `
    <div style="min-height:100vh;background:linear-gradient(145deg,var(--bg-dark),var(--bg-card))">
      <div class="game-header">
        <span style="font-weight:700;font-size:.9rem;min-width:90px">
          <span id="q-counter">1 / ${TOTAL_QUESTIONS}</span>
        </span>
        <div class="progress-bar-track">
          <div class="progress-bar-fill" id="progress-bar" style="width:0%"></div>
        </div>
        <div class="timer-badge" id="timer-badge">⏱ ${timerSeconds()}s</div>
      </div>

      <div class="game-body">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <span class="muted" style="font-size:.85rem;text-transform:capitalize">${modeLabel} — Level ${level}</span>
          <span style="font-weight:700;color:var(--primary-light)">Score: <span id="score-display">0</span></span>
        </div>

        <div class="question-card" id="question-card">
          <div class="loading-center"><div class="spinner"></div></div>
        </div>

        <div id="answer-area"></div>

        <!-- Skip button — visible before answering, hidden after -->
        <div id="skip-area" style="margin-top:14px;display:none">
          <button class="btn btn-secondary btn-sm" id="skip-btn"
            style="width:auto;padding:9px 22px;border-color:rgba(255,183,77,0.4);color:var(--warning)">
            ⏭ Skip Question
          </button>
        </div>

        <div id="solution-area" style="margin-top:12px"></div>

        <div id="next-area" style="margin-top:16px;display:none">
          <button class="btn btn-primary" id="next-btn">
            <span id="next-btn-text">Next Question →</span>
          </button>
        </div>
      </div>
    </div>`;

  // ── Boot ───────────────────────────────────────────────────────────────────
  (async () => {
    try {
      const res = await API.startSession({ mode, level });
      sessionId = res.sessionId;
      loadQuestion();
    } catch (e) {
      el.querySelector('#question-card').innerHTML =
        `<p class="error-msg">Could not start session: ${e.message}</p>`;
    }
  })();

  // ── Load next question ─────────────────────────────────────────────────────
  async function loadQuestion() {
    if (questionNum >= TOTAL_QUESTIONS) { finishGame(); return; }

    ttsStop();
    answered      = false;
    timeLeft      = timerSeconds();
    questionStart = Date.now();
    questionNum++;

    updateProgress();
    el.querySelector('#answer-area').innerHTML    = '';
    el.querySelector('#solution-area').innerHTML  = '';
    el.querySelector('#next-area').style.display  = 'none';
    el.querySelector('#skip-area').style.display  = 'none';
    el.querySelector('#timer-badge').className    = 'timer-badge';
    el.querySelector('#timer-badge').textContent  = `⏱ ${timerSeconds()}s`;
    el.querySelector('#question-card').innerHTML  =
      `<div class="loading-center"><div class="spinner"></div></div>`;

    try {
      currentQ = await API.getQuestion(mode, level);
      renderQuestion();
      startTimer();
      el.querySelector('#skip-area').style.display = 'block';
    } catch (e) {
      el.querySelector('#question-card').innerHTML =
        `<p class="error-msg">Could not load question.</p>`;
    }
  }

  // ── Render question + answers ──────────────────────────────────────────────
  function renderQuestion() {
    el.querySelector('#question-card').innerHTML =
      `<p class="question-text">${currentQ.questionText}</p>`;

    const answerEl = el.querySelector('#answer-area');
    if (currentQ.isMultipleChoice) {
      answerEl.innerHTML = `
        <div class="options-grid" id="options-grid">
          ${currentQ.options.map((opt, i) =>
            `<button class="option-btn" data-opt="${i}">${opt}</button>`
          ).join('')}
        </div>`;
      answerEl.querySelectorAll('.option-btn').forEach(btn => {
        btn.addEventListener('click', () => handleMultiChoice(btn));
      });
    } else {
      answerEl.innerHTML = `
        <div class="typein-area">
          <input type="text" id="typein-input" placeholder="Type your answer here…" autocomplete="off" />
          <button class="btn btn-primary btn-sm" id="submit-typein" style="white-space:nowrap">Submit</button>
        </div>`;
      const inp = answerEl.querySelector('#typein-input');
      inp.focus();
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') handleTypeIn(); });
      answerEl.querySelector('#submit-typein').addEventListener('click', handleTypeIn);
    }

    // Wire skip button
    el.querySelector('#skip-btn').onclick = handleSkip;
  }

  // ── Multiple choice ────────────────────────────────────────────────────────
  function handleMultiChoice(btn) {
    if (answered) return;
    stopTimer();
    answered = true;
    hideSkip();
    const chosen    = currentQ.options[btn.dataset.opt];
    const isCorrect = chosen.trim().toLowerCase() === currentQ.correctAnswer.trim().toLowerCase();

    el.querySelectorAll('.option-btn').forEach(b => {
      b.disabled = true;
      const val = currentQ.options[b.dataset.opt];
      if (val.trim().toLowerCase() === currentQ.correctAnswer.trim().toLowerCase())
        b.classList.add('correct');
      else if (b === btn && !isCorrect)
        b.classList.add('wrong');
    });

    processAnswer(chosen, isCorrect);
  }

  // ── Type-in ────────────────────────────────────────────────────────────────
  function handleTypeIn() {
    if (answered) return;
    const inp = el.querySelector('#typein-input');
    if (!inp) return;
    const val = inp.value.trim();
    if (!val) { inp.focus(); return; }
    stopTimer();
    answered = true;
    hideSkip();
    inp.disabled = true;
    el.querySelector('#submit-typein').disabled = true;

    const isCorrect = val.toLowerCase() === currentQ.correctAnswer.trim().toLowerCase();
    inp.style.borderColor = isCorrect ? 'var(--success)' : 'var(--error)';
    processAnswer(val, isCorrect);
  }

  // ── Skip (mirrors GameScreen.java skipQuestion()) ──────────────────────────
  function handleSkip() {
    if (answered) return;
    stopTimer();
    answered = true;
    hideSkip();

    // Disable any inputs
    el.querySelectorAll('.option-btn, #typein-input, #submit-typein')
      .forEach(b => b.disabled = true);

    const timeTaken = Math.round((Date.now() - questionStart) / 1000);
    totalTime += timeTaken;

    // Show correct answer in solution panel
    showSolution('skipped');

    // Save to DB — isCorrect = false for skipped
    API.saveAnswer({
      sessionId,
      questionText:  currentQ.questionText,
      correctAnswer: currentQ.correctAnswer,
      studentAnswer: 'SKIPPED',
      isCorrect:     false,
      timeTaken
    }).catch(() => {});

    showNextButton();
  }

  // ── Process a submitted answer ─────────────────────────────────────────────
  async function processAnswer(studentAnswer, isCorrect) {
    const timeTaken = Math.round((Date.now() - questionStart) / 1000);
    totalTime += timeTaken;

    if (isCorrect) {
      const timeBonus = Math.max(0, Math.floor(timeLeft / 3));
      score += 10 + timeBonus;
      correctCount++;
    }
    el.querySelector('#score-display').textContent = score;

    showSolution(isCorrect ? 'correct' : 'wrong');

    API.saveAnswer({
      sessionId,
      questionText:  currentQ.questionText,
      correctAnswer: currentQ.correctAnswer,
      studentAnswer,
      isCorrect,
      timeTaken
    }).catch(() => {});

    showNextButton();
  }

  // ── Solution panel with TTS (mirrors SolutionPanel.java) ──────────────────
  // result: 'correct' | 'wrong' | 'skipped' | 'timeout'
  function showSolution(result) {
    const solEl    = el.querySelector('#solution-area');
    const correct  = result === 'correct';
    const skipped  = result === 'skipped';
    const timeout  = result === 'timeout';

    const icon  = correct ? '✅' : skipped ? '⏭' : timeout ? '⏰' : '❌';
    const label = correct
      ? 'Correct!'
      : `${skipped ? 'Skipped' : timeout ? "Time's up" : 'Incorrect'} — Correct answer: ${currentQ.correctAnswer}`;

    const panelClass = correct ? 'solution-panel' : 'solution-panel wrong-panel';
    const steps = currentQ.solutionSteps || '';

    // Build step rows (mirrors SolutionPanel.java buildStepsPanel)
    const stepsHtml = steps.split('\n').filter(l => l.trim()).map(line => {
      let coloured = line;
      if (line.startsWith('Step')) {
        const colon = line.indexOf(':');
        if (colon > 0)
          coloured = `<span style="color:var(--primary-light);font-weight:700">${line.slice(0, colon + 1)}</span>${line.slice(colon + 1)}`;
      }
      return `<div style="margin-bottom:4px">${coloured}</div>`;
    }).join('');

    solEl.innerHTML = `
      <div class="${panelClass}">
        <div style="display:flex;align-items:center;gap:8px;font-weight:700;margin-bottom:6px">
          <span>${icon}</span><span>${label}</span>
        </div>
        <div class="solution-steps">${stepsHtml || '—'}</div>

        <!-- TTS row (mirrors SolutionPanel.java buildTTSPanel) -->
        <div style="margin-top:12px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <button id="tts-btn" class="btn btn-secondary btn-sm"
            style="width:auto;padding:7px 18px;font-size:.8rem;border-color:rgba(91,106,245,0.35);color:var(--primary-light);background:rgba(91,106,245,0.12)">
            🔊 Read Aloud
          </button>
          <span id="tts-status" style="font-size:.78rem;color:var(--text-muted)"></span>
        </div>
      </div>`;

    // Wire TTS button
    el.querySelector('#tts-btn').addEventListener('click', () => {
      const speaking = window.speechSynthesis?.speaking;
      if (speaking) {
        ttsStop();
        el.querySelector('#tts-status').textContent = 'Stopped.';
      } else {
        const readText = `${label}. ${steps.replace(/\n/g, '. ')}`;
        el.querySelector('#tts-status').textContent = 'Reading aloud…';
        ttsSpeak(readText);
        if (ttsUtterance) {
          ttsUtterance.onend = () => {
            updateTtsBtn(false);
            const st = el.querySelector('#tts-status');
            if (st) st.textContent = 'Done.';
          };
        }
      }
    });
  }

  // ── Show Next / Finish button ──────────────────────────────────────────────
  function showNextButton() {
    const nextArea    = el.querySelector('#next-area');
    const nextBtnText = el.querySelector('#next-btn-text');
    const nextBtn     = el.querySelector('#next-btn');

    nextArea.style.display = 'block';
    // Remove any old listener by replacing element
    const fresh = nextBtn.cloneNode(true);
    nextBtn.parentNode.replaceChild(fresh, nextBtn);

    if (questionNum >= TOTAL_QUESTIONS) {
      fresh.querySelector('#next-btn-text').textContent = '🏁 See Results';
      fresh.addEventListener('click', finishGame);
    } else {
      fresh.querySelector('#next-btn-text').textContent = 'Next Question →';
      fresh.addEventListener('click', loadQuestion);
    }
  }

  // ── Timer ──────────────────────────────────────────────────────────────────
  function startTimer() {
    stopTimer();
    const badge = el.querySelector('#timer-badge');
    timerInterval = setInterval(() => {
      timeLeft--;
      badge.textContent = `⏱ ${timeLeft}s`;
      badge.classList.toggle('warning', timeLeft <= 8);
      if (timeLeft <= 0) {
        stopTimer();
        if (!answered) {
          answered = true;
          hideSkip();
          el.querySelectorAll('.option-btn, #typein-input, #submit-typein')
            .forEach(b => b.disabled = true);
          totalTime += timerSeconds();
          showSolution('timeout');
          API.saveAnswer({
            sessionId,
            questionText:  currentQ.questionText,
            correctAnswer: currentQ.correctAnswer,
            studentAnswer: 'TIME_UP',
            isCorrect:     false,
            timeTaken:     timerSeconds()
          }).catch(() => {});
          showNextButton();
        }
      }
    }, 1000);
  }

  function stopTimer() { clearInterval(timerInterval); }
  function hideSkip()  { const a = el.querySelector('#skip-area'); if (a) a.style.display = 'none'; }

  // ── Progress bar ───────────────────────────────────────────────────────────
  function updateProgress() {
    el.querySelector('#progress-bar').style.width =
      `${((questionNum - 1) / TOTAL_QUESTIONS) * 100}%`;
    el.querySelector('#q-counter').textContent = `${questionNum} / ${TOTAL_QUESTIONS}`;
  }

  // ── Finish game ────────────────────────────────────────────────────────────
  async function finishGame() {
    stopTimer();
    ttsStop();
    el.querySelector('#progress-bar').style.width = '100%';
    try {
      await API.finishSession({
        sessionId,
        score,
        totalQuestions: TOTAL_QUESTIONS,
        correctAnswers: correctCount,
        timeTaken:      totalTime,
      });
    } catch { /* non-critical */ }

    App.showPage('summary', {
      mode, level, score, correctCount,
      totalQuestions: TOTAL_QUESTIONS,
      timeTaken: totalTime,
      sessionId
    });
  }
};
