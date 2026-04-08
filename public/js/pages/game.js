// public/js/pages/game.js
// Mirrors GameScreen.java — 10 questions per session, 30-second timer per question

Pages.game = function(el, { mode, level }) {
  const TOTAL_QUESTIONS = 10;
  const TIME_LIMIT      = 30;

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

  // ── Render shell ─────────────────────────────────────────────────────
  el.innerHTML = `
    <div style="min-height:100vh;background:linear-gradient(145deg,var(--bg-dark),var(--bg-card))">
      <div class="game-header">
        <span style="font-weight:700;font-size:.9rem;min-width:90px">
          <span id="q-counter">1 / ${TOTAL_QUESTIONS}</span>
        </span>
        <div class="progress-bar-track">
          <div class="progress-bar-fill" id="progress-bar" style="width:0%"></div>
        </div>
        <div class="timer-badge" id="timer-badge">⏱ ${TIME_LIMIT}s</div>
      </div>

      <div class="game-body">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <span class="muted" style="font-size:.85rem;text-transform:capitalize">${mode} — Level ${level}</span>
          <span style="font-weight:700;color:var(--primary-light)">Score: <span id="score-display">0</span></span>
        </div>

        <div class="question-card" id="question-card">
          <div class="loading-center"><div class="spinner"></div></div>
        </div>

        <div id="answer-area"></div>
        <div id="solution-area" style="margin-top:12px"></div>
        <div id="next-area" style="margin-top:16px;display:none">
          <button class="btn btn-primary" id="next-btn">
            <span id="next-btn-text">Next Question →</span>
          </button>
        </div>
      </div>
    </div>`;

  // ── Start session then load first question ─────────────────────────
  (async () => {
    try {
      const res = await API.startSession({ mode, level });
      sessionId = res.sessionId;
      loadQuestion();
    } catch (e) {
      el.querySelector('#question-card').innerHTML = `<p class="error-msg">Could not start session: ${e.message}</p>`;
    }
  })();

  // ── Load a question ───────────────────────────────────────────────
  async function loadQuestion() {
    answered    = false;
    timeLeft    = TIME_LIMIT;
    questionStart = Date.now();
    questionNum++;

    updateProgress();
    el.querySelector('#answer-area').innerHTML   = '';
    el.querySelector('#solution-area').innerHTML = '';
    el.querySelector('#next-area').style.display = 'none';
    el.querySelector('#question-card').innerHTML = `<div class="loading-center"><div class="spinner"></div></div>`;

    try {
      currentQ = await API.getQuestion(mode, level);
      renderQuestion();
      startTimer();
    } catch (e) {
      el.querySelector('#question-card').innerHTML = `<p class="error-msg">Could not load question.</p>`;
    }
  }

  // ── Render question + answer UI ───────────────────────────────────
  function renderQuestion() {
    el.querySelector('#question-card').innerHTML = `
      <p class="question-text">${currentQ.questionText}</p>`;

    const answerEl = el.querySelector('#answer-area');
    if (currentQ.isMultipleChoice) {
      answerEl.innerHTML = `
        <div class="options-grid" id="options-grid">
          ${currentQ.options.map((opt, i) => `
            <button class="option-btn" data-opt="${i}">${opt}</button>`).join('')}
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
  }

  // ── Multiple choice handler ───────────────────────────────────────
  function handleMultiChoice(btn) {
    if (answered) return;
    stopTimer();
    answered = true;
    const chosen = currentQ.options[btn.dataset.opt];
    const isCorrect = chosen.trim().toLowerCase() === currentQ.correctAnswer.trim().toLowerCase();

    // Highlight all buttons
    el.querySelectorAll('.option-btn').forEach(b => {
      b.disabled = true;
      const val = currentQ.options[b.dataset.opt];
      if (val.trim().toLowerCase() === currentQ.correctAnswer.trim().toLowerCase()) b.classList.add('correct');
      else if (b === btn && !isCorrect) b.classList.add('wrong');
    });

    processAnswer(chosen, isCorrect);
  }

  // ── Type-in handler ───────────────────────────────────────────────
  function handleTypeIn() {
    if (answered) return;
    const inp = el.querySelector('#typein-input');
    if (!inp) return;
    const val = inp.value.trim();
    if (!val) { inp.focus(); return; }
    stopTimer();
    answered = true;
    inp.disabled = true;
    el.querySelector('#submit-typein').disabled = true;

    const isCorrect = val.toLowerCase() === currentQ.correctAnswer.trim().toLowerCase();
    inp.style.borderColor = isCorrect ? 'var(--success)' : 'var(--error)';
    processAnswer(val, isCorrect);
  }

  // ── Shared answer processing ──────────────────────────────────────
  async function processAnswer(studentAnswer, isCorrect) {
    const timeTaken = Math.round((Date.now() - questionStart) / 1000);
    totalTime += timeTaken;

    if (isCorrect) {
      const timeBonus = Math.max(0, Math.floor(timeLeft / 3));
      score += 10 + timeBonus;
      correctCount++;
    }

    el.querySelector('#score-display').textContent = score;
    showSolution(isCorrect);

    // Save to DB (fire-and-forget, don't block UI)
    API.saveAnswer({
      sessionId,
      questionText:  currentQ.questionText,
      correctAnswer: currentQ.correctAnswer,
      studentAnswer,
      timeTaken
    }).catch(() => {});

    // Show next / finish button
    const nextArea    = el.querySelector('#next-area');
    const nextBtnText = el.querySelector('#next-btn-text');
    nextArea.style.display = 'block';
    if (questionNum >= TOTAL_QUESTIONS) {
      nextBtnText.textContent = '🏁 See Results';
      el.querySelector('#next-btn').addEventListener('click', finishGame);
    } else {
      nextBtnText.textContent = 'Next Question →';
      el.querySelector('#next-btn').addEventListener('click', loadQuestion);
    }
  }

  // ── Show solution steps (mirrors SolutionPanel.java) ──────────────
  function showSolution(isCorrect) {
    const solEl = el.querySelector('#solution-area');
    const bgClass = isCorrect ? 'solution-panel' : 'solution-panel wrong-panel';
    const icon    = isCorrect ? '✅' : '❌';
    const label   = isCorrect ? 'Correct!' : `Incorrect — Answer: ${currentQ.correctAnswer}`;
    solEl.innerHTML = `
      <div class="${bgClass}">
        <div style="display:flex;align-items:center;gap:8px;font-weight:700">
          <span>${icon}</span><span>${label}</span>
        </div>
        <div class="solution-steps">${currentQ.solutionSteps}</div>
      </div>`;
  }

  // ── Timer ──────────────────────────────────────────────────────────
  function startTimer() {
    const badge = el.querySelector('#timer-badge');
    timerInterval = setInterval(() => {
      timeLeft--;
      badge.textContent = `⏱ ${timeLeft}s`;
      badge.classList.toggle('warning', timeLeft <= 8);
      if (timeLeft <= 0) {
        stopTimer();
        if (!answered) {
          answered = true;
          // Disable all answer inputs
          el.querySelectorAll('.option-btn, #typein-input, #submit-typein').forEach(b => b.disabled = true);
          showSolution(false);
          API.saveAnswer({
            sessionId,
            questionText:  currentQ.questionText,
            correctAnswer: currentQ.correctAnswer,
            studentAnswer: '⏰ Time Up',
            timeTaken:     TIME_LIMIT
          }).catch(() => {});
          totalTime += TIME_LIMIT;
          const nextArea = el.querySelector('#next-area');
          nextArea.style.display = 'block';
          const nextBtnText = el.querySelector('#next-btn-text');
          if (questionNum >= TOTAL_QUESTIONS) {
            nextBtnText.textContent = '🏁 See Results';
            el.querySelector('#next-btn').addEventListener('click', finishGame);
          } else {
            nextBtnText.textContent = 'Next Question →';
            el.querySelector('#next-btn').addEventListener('click', loadQuestion);
          }
        }
      }
    }, 1000);
  }

  function stopTimer() {
    clearInterval(timerInterval);
  }

  // ── Progress bar ──────────────────────────────────────────────────
  function updateProgress() {
    const pct = ((questionNum - 1) / TOTAL_QUESTIONS) * 100;
    el.querySelector('#progress-bar').style.width = pct + '%';
    el.querySelector('#q-counter').textContent = `${questionNum} / ${TOTAL_QUESTIONS}`;
  }

  // ── Finish & go to summary ─────────────────────────────────────────
  async function finishGame() {
    stopTimer();
    el.querySelector('#progress-bar').style.width = '100%';
    try {
      await API.finishSession({
        sessionId,
        score,
        totalQuestions: TOTAL_QUESTIONS,
        correctAnswers: correctCount,
        timeTaken: totalTime,
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
