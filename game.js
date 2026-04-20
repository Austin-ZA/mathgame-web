// public/js/pages/game.js
// ─────────────────────────────────────────────────────────────────────────────
//  MathGameApp Web — Game Page
//  FIX 1 : Skip Question button (mirrors GameScreen.java skipQuestion())
//  FIX 2 : Read Aloud button on solution panel (mirrors SolutionPanel.java TTS)
//  FIX 3 : score / accuracy now properly sent to finishGame via API.finishSession
// ─────────────────────────────────────────────────────────────────────────────

Pages.game = function(el, { mode, level }) {
  const TOTAL_QUESTIONS = 10;
  const TIME_LIMIT      = timerSeconds(level);  // level-aware, mirrors Java

  let sessionId      = null;
  let currentQ       = null;
  let questionNum    = 0;
  let score          = 0;
  let correctCount   = 0;
  let answered       = false;
  let timerInterval  = null;
  let timeLeft       = TIME_LIMIT;
  let questionStart  = null;
  let totalTime      = 0;

  // ── Timer helpers (mirrors GameScreen.java timerSeconds()) ──────────────────
  function timerSeconds(lvl) {
    switch (parseInt(lvl)) {
      case 1: return 40; case 2: return 35; case 3: return 30;
      case 4: return 25; default: return 20;
    }
  }

  // ── TTS (mirrors TTSEngine.java / SolutionPanel.java "Read Aloud") ──────────
  let ttsSpeaking = false;
  function ttsSpeak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.95;
    utt.onstart = () => { ttsSpeaking = true; };
    utt.onend   = () => { ttsSpeaking = false; updateTTSBtn(); };
    window.speechSynthesis.speak(utt);
    ttsSpeaking = true;
    updateTTSBtn();
  }
  function ttsStop() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    ttsSpeaking = false;
    updateTTSBtn();
  }
  function updateTTSBtn() {
    const btn = el.querySelector('#tts-btn');
    if (!btn) return;
    btn.textContent = ttsSpeaking ? '⏹ Stop Reading' : '🔊 Read Aloud';
    btn.style.background = ttsSpeaking ? 'rgba(239,68,68,0.25)' : 'rgba(56,132,210,0.25)';
  }

  // ── Render shell ─────────────────────────────────────────────────────────────
  const modeLabel = { computational: 'Computational Maths', algebra: 'Algebra', binary: 'Binary Conversion' }[mode] || mode;
  el.innerHTML = `
    <div class="page">
      <div class="card card-wide" style="padding:28px 32px">

        <!-- Top bar -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <span id="q-counter" style="color:var(--text-muted);font-size:.85rem">Question 1 / ${TOTAL_QUESTIONS}</span>
          <span style="font-weight:700;color:var(--primary-light)">Score: <span id="score-display">0</span></span>
          <span id="timer-badge" class="timer-badge">${TIME_LIMIT}s</span>
        </div>

        <!-- Progress bar -->
        <div class="progress-track" style="margin-bottom:20px">
          <div class="progress-bar" id="progress-bar" style="width:0%"></div>
        </div>

        <!-- Mode label -->
        <p class="muted" style="text-align:center;font-size:.8rem;margin-bottom:8px">${modeLabel}${mode !== 'binary' ? ' · Level ' + level : ''}</p>

        <!-- Question -->
        <div class="question-card" id="question-card">
          <div class="loading-center"><div class="spinner"></div></div>
        </div>

        <!-- Answer area -->
        <div id="answer-area" style="margin-top:16px"></div>

        <!-- Feedback -->
        <div id="feedback-area" style="margin-top:10px;text-align:center;min-height:24px;font-weight:600"></div>

        <!-- Solution panel (hidden until answered) -->
        <div id="solution-area" style="margin-top:12px"></div>

        <!-- Buttons row (Skip / Show Solution / Next) -->
        <div id="btn-row" style="display:flex;gap:10px;justify-content:center;margin-top:16px;flex-wrap:wrap">
          <button class="btn btn-secondary" id="skip-btn">⏭ Skip Question</button>
          <button class="btn btn-secondary" id="solution-btn" style="display:none">📖 Show Solution</button>
          <div id="next-area" style="display:none">
            <button class="btn btn-primary" id="next-btn">Next Question →</button>
          </div>
        </div>

      </div>
    </div>`;

  // ── Wire up skip ──────────────────────────────────────────────────────────────
  el.querySelector('#skip-btn').addEventListener('click', skipQuestion);

  // ── Wire up show-solution ────────────────────────────────────────────────────
  el.querySelector('#solution-btn').addEventListener('click', () => {
    const solArea = el.querySelector('#solution-area');
    if (solArea.innerHTML.trim() === '') {
      renderSolution(false);   // force-show even if already shown
    }
    el.querySelector('#solution-btn').style.display = 'none';
  });

  // ── Start session then load first question ───────────────────────────────────
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

  // ── Load next question ───────────────────────────────────────────────────────
  async function loadQuestion() {
    if (questionNum >= TOTAL_QUESTIONS) { finishGame(); return; }

    ttsStop();
    answered    = false;
    timeLeft    = timerSeconds(level);
    questionStart = Date.now();

    questionNum++;
    el.querySelector('#q-counter').textContent   = `Question ${questionNum} / ${TOTAL_QUESTIONS}`;
    el.querySelector('#score-display').textContent = score;
    el.querySelector('#progress-bar').style.width  = `${((questionNum - 1) / TOTAL_QUESTIONS) * 100}%`;
    el.querySelector('#feedback-area').textContent = '';
    el.querySelector('#solution-area').innerHTML   = '';
    el.querySelector('#next-area').style.display   = 'none';
    el.querySelector('#skip-btn').style.display    = 'inline-flex';
    el.querySelector('#solution-btn').style.display = 'none';
    el.querySelector('#timer-badge').className     = 'timer-badge';
    el.querySelector('#timer-badge').textContent   = `${timeLeft}s`;
    el.querySelector('#answer-area').innerHTML     = '<div class="loading-center"><div class="spinner"></div></div>';
    el.querySelector('#question-card').innerHTML   = '<div class="loading-center"><div class="spinner"></div></div>';

    try {
      currentQ = await API.getQuestion({ mode, level });
      el.querySelector('#question-card').innerHTML =
        `<p style="font-size:1.25rem;font-weight:700;text-align:center;margin:0">${currentQ.questionText}</p>`;
      renderAnswerArea();
      startTimer();
    } catch(e) {
      el.querySelector('#question-card').innerHTML =
        `<p class="error-msg">Could not load question: ${e.message}</p>`;
    }
  }

  // ── Render MCQ or type-in ─────────────────────────────────────────────────
  function renderAnswerArea() {
    const area = el.querySelector('#answer-area');
    if (currentQ.options && currentQ.options.length) {
      const labels = ['A', 'B', 'C', 'D'];
      area.innerHTML = `<div class="options-grid">
        ${currentQ.options.map((opt, i) => `
          <button class="option-btn" data-val="${opt}">
            <span class="opt-label">${labels[i]}</span>${opt}
          </button>`).join('')}
      </div>`;
      area.querySelectorAll('.option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          if (!answered) submitMCQ(btn.dataset.val);
        });
      });
    } else {
      area.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:12px">
          <p class="muted" style="margin:0;font-size:.85rem">Type your answer and press Enter or Submit</p>
          <input id="typein-input" class="text-input" placeholder="Your answer…" autocomplete="off"
                 style="max-width:320px;text-align:center" />
          <button class="btn btn-primary" id="submit-typein">Submit Answer</button>
        </div>`;
      const input = area.querySelector('#typein-input');
      const sub   = area.querySelector('#submit-typein');
      const doSub = () => {
        if (!answered && input.value.trim())
          submitTypeIn(input.value.trim());
      };
      sub.addEventListener('click', doSub);
      input.addEventListener('keydown', e => { if (e.key === 'Enter') doSub(); });
      setTimeout(() => input.focus(), 50);
    }
  }

  // ── Submit MCQ ───────────────────────────────────────────────────────────────
  function submitMCQ(chosen) {
    stopTimer();
    answered = true;
    const isCorrect = chosen.trim().toLowerCase() === currentQ.correctAnswer.trim().toLowerCase();
    el.querySelectorAll('.option-btn').forEach(btn => {
      btn.disabled = true;
      if (btn.dataset.val.trim().toLowerCase() === currentQ.correctAnswer.trim().toLowerCase())
        btn.classList.add('correct');
      else if (btn.dataset.val === chosen && !isCorrect)
        btn.classList.add('wrong');
    });
    processAnswer(chosen, isCorrect);
  }

  // ── Submit type-in ────────────────────────────────────────────────────────────
  function submitTypeIn(answer) {
    stopTimer();
    answered = true;
    const isCorrect = answer.trim().toLowerCase() === currentQ.correctAnswer.trim().toLowerCase();
    const input = el.querySelector('#typein-input');
    const sub   = el.querySelector('#submit-typein');
    if (input) { input.disabled = true; input.style.color = isCorrect ? 'var(--success)' : 'var(--error)'; }
    if (sub)   sub.disabled = true;
    processAnswer(answer, isCorrect);
  }

  // ── Skip question (mirrors GameScreen.java skipQuestion()) ───────────────────
  function skipQuestion() {
    if (answered) return;
    stopTimer();
    answered = true;
    el.querySelectorAll('.option-btn, #typein-input, #submit-typein').forEach(b => b.disabled = true);

    const feedEl = el.querySelector('#feedback-area');
    feedEl.textContent = `⏭  Skipped — correct answer: ${currentQ.correctAnswer}`;
    feedEl.style.color = 'var(--text-muted)';

    el.querySelector('#skip-btn').style.display = 'none';
    el.querySelector('#solution-btn').style.display = 'inline-flex';

    const timeTaken = Math.round((Date.now() - questionStart) / 1000);
    totalTime += timeTaken;

    // Don't show solution automatically for skip — show solution-btn instead
    API.saveAnswer({
      sessionId,
      questionText:  currentQ.questionText,
      correctAnswer: currentQ.correctAnswer,
      studentAnswer: 'SKIPPED',
      timeTaken
    }).catch(() => {});

    showNextButton();
  }

  // ── Process answer (correct / wrong) ─────────────────────────────────────────
  function processAnswer(studentAnswer, isCorrect) {
    const timeTaken = Math.round((Date.now() - questionStart) / 1000);
    totalTime += timeTaken;

    const feedEl = el.querySelector('#feedback-area');
    if (isCorrect) {
      const timeBonus = Math.max(0, Math.floor(timeLeft / 3));
      const pts = (level * 10) + (timeLeft * 2) + timeBonus;   // mirrors Java basePoints() + timeLeft*2
      score += pts;
      correctCount++;
      feedEl.textContent = `✓  Correct!  +${pts} points`;
      feedEl.style.color = 'var(--success)';
    } else {
      feedEl.textContent = `✗  Incorrect — correct answer: ${currentQ.correctAnswer}`;
      feedEl.style.color = 'var(--error)';
    }

    el.querySelector('#score-display').textContent = score;
    el.querySelector('#skip-btn').style.display    = 'none';

    // Show solution inline + solution-btn for explicit show
    renderSolution(isCorrect);
    el.querySelector('#solution-btn').style.display = 'none'; // already shown inline

    API.saveAnswer({
      sessionId,
      questionText:  currentQ.questionText,
      correctAnswer: currentQ.correctAnswer,
      studentAnswer,
      timeTaken
    }).catch(() => {});

    showNextButton();
  }

  // ── Render solution panel (mirrors SolutionPanel.java) ────────────────────────
  function renderSolution(isCorrect) {
    const solEl = el.querySelector('#solution-area');
    const steps  = currentQ.solutionSteps || 'No solution steps available.';

    // Build step rows
    const stepLines = steps.split('\n').filter(l => l.trim());
    const stepsHTML = stepLines.map(line => {
      let cls  = 'solution-step';
      let color = 'var(--primary-light)';
      if (line.toLowerCase().includes('answer') || line.toLowerCase().includes('result'))
        color = 'var(--success)';
      else if (line.toLowerCase().includes('verify'))
        color = 'var(--accent)';

      let labelledLine = line;
      if (line.startsWith('Step')) {
        const colon = line.indexOf(':');
        if (colon > 0)
          labelledLine = `<span style="color:var(--primary-light);font-weight:700">${line.slice(0, colon + 1)}</span>${line.slice(colon + 1)}`;
      }
      return `<div class="${cls}" style="margin-bottom:6px;padding:10px 14px;background:var(--bg-card2);border-radius:8px;font-size:.88rem">${labelledLine}</div>`;
    }).join('');

    solEl.innerHTML = `
      <div class="solution-panel ${isCorrect ? '' : 'wrong-panel'}" style="padding:16px;border-radius:10px;background:var(--bg-card2)">
        <div style="display:flex;align-items:center;gap:8px;font-weight:700;margin-bottom:12px">
          <span>${isCorrect ? '✅' : '❌'}</span>
          <span style="color:${isCorrect ? 'var(--success)' : 'var(--error)'}">
            ${isCorrect ? 'Correct!' : 'Incorrect'} — Answer: <strong>${currentQ.correctAnswer}</strong>
          </span>
        </div>
        <p style="margin:0 0 10px;font-size:.8rem;font-style:italic;color:var(--text-muted)">${currentQ.questionText}</p>
        <div class="solution-steps">${stepsHTML}</div>

        <!-- TTS Read Aloud (mirrors SolutionPanel.java buildTTSPanel) -->
        <div style="margin-top:12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <button id="tts-btn" class="btn" style="padding:8px 16px;font-size:.8rem;border-radius:8px;background:rgba(56,132,210,0.25);color:var(--text-white);border:1px solid rgba(86,164,232,0.3)">
            🔊 Read Aloud
          </button>
          <span id="tts-status" style="font-size:.78rem;color:var(--text-muted)"></span>
        </div>
      </div>`;

    // Wire TTS
    el.querySelector('#tts-btn').addEventListener('click', () => {
      if (ttsSpeaking) {
        ttsStop();
        el.querySelector('#tts-status').textContent = 'Stopped.';
      } else {
        el.querySelector('#tts-status').textContent = 'Reading solution aloud…';
        ttsSpeak(steps);
      }
    });
  }

  // ── Show Next / Finish button ─────────────────────────────────────────────────
  function showNextButton() {
    const nextArea = el.querySelector('#next-area');
    const nextBtn  = el.querySelector('#next-btn');
    nextArea.style.display = 'inline-flex';

    if (questionNum >= TOTAL_QUESTIONS) {
      nextBtn.textContent = '🏁 See Results';
      nextBtn.onclick = finishGame;
    } else {
      nextBtn.textContent = 'Next Question →';
      nextBtn.onclick = loadQuestion;
    }
  }

  // ── Timer ─────────────────────────────────────────────────────────────────────
  function startTimer() {
    stopTimer();
    const badge = el.querySelector('#timer-badge');
    timerInterval = setInterval(() => {
      timeLeft--;
      badge.textContent = `${timeLeft}s`;
      badge.classList.toggle('warning', timeLeft <= 8);
      if (timeLeft <= 0) {
        stopTimer();
        if (!answered) {
          answered = true;
          el.querySelectorAll('.option-btn, #typein-input, #submit-typein').forEach(b => b.disabled = true);
          const feedEl = el.querySelector('#feedback-area');
          feedEl.textContent = `⏰  Time's up! — answer was: ${currentQ.correctAnswer}`;
          feedEl.style.color  = 'var(--warning, #f59e0b)';
          el.querySelector('#skip-btn').style.display = 'none';
          renderSolution(false);
          const timeTaken = Math.round((Date.now() - questionStart) / 1000);
          totalTime += timeTaken;
          API.saveAnswer({
            sessionId,
            questionText:  currentQ.questionText,
            correctAnswer: currentQ.correctAnswer,
            studentAnswer: 'TIME_UP',
            timeTaken
          }).catch(() => {});
          showNextButton();
        }
      }
    }, 1000);
  }
  function stopTimer() { clearInterval(timerInterval); timerInterval = null; }

  // ── Finish game — FIX: properly sends score, correctAnswers, timeTaken to DB ─
  async function finishGame() {
    stopTimer();
    ttsStop();
    el.querySelector('#progress-bar').style.width = '100%';
    try {
      await API.finishSession({
        sessionId,
        score,
        totalQuestions: TOTAL_QUESTIONS,
        correctAnswers: correctCount,     // ← was missing in original
        timeTaken: totalTime,             // ← was 0 in original
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
