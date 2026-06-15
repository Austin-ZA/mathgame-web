// public/js/pages/game.js
// MathGameApp Web - Game Page

Pages.game = function(el, { mode, level }) {
  const TOTAL_QUESTIONS = 10;

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
  let hintUsed      = false;
  let skippedCount  = 0;
  let answeredCount = 0;
  let responses     = 0;

  // TTS
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
      btn.textContent = 'Stop Reading';
      btn.style.background = 'rgba(239,83,80,0.18)';
      btn.style.borderColor = 'rgba(239,83,80,0.45)';
      btn.style.color = 'var(--error)';
    } else {
      btn.textContent = 'Read Aloud';
      btn.style.background = 'rgba(91,106,245,0.12)';
      btn.style.borderColor = 'rgba(91,106,245,0.35)';
      btn.style.color = 'var(--primary-light)';
    }
  }

  const modeLabel = { computational: 'Computational', algebra: 'Algebra', binary: 'Binary' }[mode] || mode;

  el.innerHTML = `
    <div style="min-height:100vh;background:linear-gradient(145deg,var(--bg-dark),var(--bg-card))">
      <div class="game-header">
        <span style="font-weight:700;font-size:.9rem;min-width:90px">
          <span id="q-counter">1 / ${TOTAL_QUESTIONS}</span>
        </span>
        <div class="progress-bar-track">
          <div class="progress-bar-fill" id="progress-bar" style="width:0%"></div>
        </div>
        <div class="timer-badge" id="timer-badge">${timerSeconds()}s</div>
      </div>

      <div class="game-body">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:12px;flex-wrap:wrap">
          <span class="muted" style="font-size:.85rem;text-transform:capitalize">${modeLabel} — Level ${level}</span>
          <div style="display:flex;gap:10px;align-items:center">
            <button class="btn btn-secondary btn-sm" id="quit-btn" style="padding:7px 16px;min-width:90px">Quit</button>
            <span style="font-weight:700;color:var(--primary-light)">Score: <span id="score-display">0</span></span>
          </div>
        </div>

        <div class="question-card" id="question-card">
          <div class="loading-center"><div class="spinner"></div></div>
        </div>

        <div id="answer-area"></div>

        <div id="hint-area" style="margin-top:12px;display:none">
          <div id="hint-box" style="padding:12px 16px;background:var(--bg-card2);border:1px solid rgba(255,183,77,0.35);border-radius:8px;font-size:.88rem;color:var(--warning);display:none"></div>
        </div>

        <div id="action-row" style="margin-top:14px;display:none;gap:10px;flex-wrap:wrap;justify-content:center">
          <button class="btn btn-secondary btn-sm" id="hint-btn"
            style="width:auto;padding:9px 22px;border-color:rgba(255,183,77,0.4);color:var(--warning)">
            Get Hint
          </button>
          <button class="btn btn-secondary btn-sm" id="skip-btn"
            style="width:auto;padding:9px 22px">
            Skip Question
          </button>
        </div>

        <div id="solution-area" style="margin-top:12px"></div>

        <div id="next-area" style="margin-top:16px;display:none">
          <button class="btn btn-primary" id="next-btn">
            <span id="next-btn-text">Next Question</span>
          </button>
        </div>
      </div>
    </div>`;

  // Boot
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

  async function loadQuestion() {
    if (questionNum >= TOTAL_QUESTIONS) { finishGame(); return; }

    ttsStop();
    answered      = false;
    hintUsed      = false;
    timeLeft      = timerSeconds();
    questionStart = Date.now();
    questionNum++;

    updateProgress();
    el.querySelector('#answer-area').innerHTML    = '';
    el.querySelector('#solution-area').innerHTML  = '';
    el.querySelector('#hint-area').style.display  = 'none';
    el.querySelector('#hint-box').style.display   = 'none';
    el.querySelector('#hint-box').textContent     = '';
    el.querySelector('#next-area').style.display  = 'none';
    el.querySelector('#action-row').style.display = 'none';
    el.querySelector('#timer-badge').className    = 'timer-badge';
    el.querySelector('#timer-badge').textContent  = `${timerSeconds()}s`;
    el.querySelector('#question-card').innerHTML  =
      `<div class="loading-center"><div class="spinner"></div></div>`;

    try {
      currentQ = await API.getQuestion(mode, level);
      renderQuestion();
      startTimer();
      el.querySelector('#action-row').style.display = 'flex';
      el.querySelector('#hint-area').style.display  = 'block';
    } catch (e) {
      el.querySelector('#question-card').innerHTML =
        `<p class="error-msg">Could not load question.</p>`;
    }
  }

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
          <input type="text" id="typein-input" placeholder="Type your answer here..." autocomplete="off" />
          <button class="btn btn-primary btn-sm" id="submit-typein" style="white-space:nowrap">Submit</button>
        </div>`;
      const inp = answerEl.querySelector('#typein-input');
      inp.focus();
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') handleTypeIn(); });
      answerEl.querySelector('#submit-typein').addEventListener('click', handleTypeIn);
    }

    el.querySelector('#hint-btn').onclick = handleHint;
    el.querySelector('#skip-btn').onclick = handleSkip;
    el.querySelector('#quit-btn').onclick = handleQuit;
  }

  // Hint handler — shows the final answer, mode-appropriate label
  function handleHint() {
    if (answered || hintUsed) return;
    hintUsed = true;

    const hintBox = el.querySelector('#hint-box');
    const raw     = currentQ.hint || currentQ.correctAnswer;

    let label;
    if (mode === 'algebra') {
      label = `Hint: ${raw}`;
    } else if (mode === 'binary') {
      label = `Hint: ${raw}`;
    } else {
      // computational — raw may be plain number or "The answer is X"
      label = `Hint: ${raw}`;
    }

    hintBox.textContent     = label;
    hintBox.style.display   = 'block';

    // Disable hint button after use
    const hintBtn = el.querySelector('#hint-btn');
    if (hintBtn) {
      hintBtn.disabled = true;
      hintBtn.style.opacity = '0.5';
    }
  }

  // Multiple choice
  function handleMultiChoice(btn) {
    if (answered) return;
    stopTimer();
    answered = true;
    hideActionRow();
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

  // Type-in
  function handleTypeIn() {
    if (answered) return;
    const inp = el.querySelector('#typein-input');
    if (!inp) return;
    const val = inp.value.trim();
    if (!val) { inp.focus(); return; }
    stopTimer();
    answered = true;
    hideActionRow();
    inp.disabled = true;
    el.querySelector('#submit-typein').disabled = true;

    const isCorrect = val.toLowerCase() === currentQ.correctAnswer.trim().toLowerCase();
    inp.style.borderColor = isCorrect ? 'var(--success)' : 'var(--error)';
    processAnswer(val, isCorrect);
  }

  // Skip
  function handleSkip() {
    if (answered) return;
    stopTimer();
    answered = true;
    hideActionRow();
    skippedCount++;
    responses++;

    el.querySelectorAll('.option-btn, #typein-input, #submit-typein')
      .forEach(b => b.disabled = true);

    const timeTaken = Math.round((Date.now() - questionStart) / 1000);
    totalTime += timeTaken;

    renderOutcome('skipped');

    API.saveAnswer({
      sessionId,
      questionNumber: questionNum,
      questionText:   currentQ.questionText,
      correctAnswer:  currentQ.correctAnswer,
      studentAnswer:  'SKIPPED',
      isCorrect:      false,
      timeTaken
    }).catch(() => {});

    showNextButton();
  }

  async function processAnswer(studentAnswer, isCorrect) {
    const timeTaken = Math.round((Date.now() - questionStart) / 1000);
    totalTime += timeTaken;

    if (isCorrect) {
      score += 10;
      correctCount++;
    }
    answeredCount++;
    responses++;
    el.querySelector('#score-display').textContent = score;

    renderOutcome(isCorrect ? 'correct' : 'wrong');

    API.saveAnswer({
      sessionId,
      questionNumber: questionNum,
      questionText:   currentQ.questionText,
      correctAnswer:  currentQ.correctAnswer,
      studentAnswer,
      isCorrect,
      timeTaken
    }).catch(() => {});

    showNextButton();
  }

  // Shows the result panel with a button to reveal the full solution
  function renderOutcome(result) {
    const solEl   = el.querySelector('#solution-area');
    const correct = result === 'correct';
    const skipped = result === 'skipped';
    const timeout = result === 'timeout';

    const label = correct
      ? 'Correct!'
      : `${skipped ? 'Skipped' : timeout ? "Time's up" : 'Incorrect'} — Correct answer: ${currentQ.correctAnswer}`;

    const panelClass = correct ? 'solution-panel' : 'solution-panel wrong-panel';

    solEl.innerHTML = `
      <div class="${panelClass}">
        <div style="display:flex;align-items:center;gap:8px;font-weight:700;margin-bottom:10px">
          <span>${label}</span>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button id="show-solution-btn" class="btn btn-secondary btn-sm" style="padding:7px 18px">Show Solution</button>
          <button id="tts-btn" class="btn btn-secondary btn-sm" style="padding:7px 18px">Read Aloud</button>
        </div>
        <div id="tts-status" style="font-size:.78rem;color:var(--text-muted);margin-top:10px"></div>
        <div id="solution-detail" style="margin-top:16px;display:none"></div>
      </div>`;

    el.querySelector('#show-solution-btn').addEventListener('click', () => renderSolutionPanel(result));
    el.querySelector('#tts-btn').addEventListener('click', () => {
      const speaking = window.speechSynthesis?.speaking;
      if (speaking) {
        ttsStop();
        el.querySelector('#tts-status').textContent = 'Stopped.';
      } else {
        const readText = `${label}. ${currentQ.solutionSteps.replace(/\n/g, '. ')}`;
        el.querySelector('#tts-status').textContent = 'Reading aloud...';
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

  function renderSolutionPanel(result) {
    const solEl   = el.querySelector('#solution-detail');
    const steps   = currentQ.solutionSteps || 'No solution steps available.';
    const lines   = steps.split('\n').filter(l => l.trim());
    const stepsHtml = lines.map(line => {
      if (line.startsWith('Step')) {
        const colon = line.indexOf(':');
        if (colon > 0) {
          return `<div style="margin-bottom:6px"><strong>${line.slice(0, colon + 1)}</strong>${line.slice(colon + 1)}</div>`;
        }
      }
      return `<div style="margin-bottom:6px">${line}</div>`;
    }).join('');

    solEl.innerHTML = `<div style="padding:16px;border-radius:10px;background:var(--bg-card2);border:1px solid var(--border)">${stepsHtml}</div>`;
    solEl.style.display = 'block';
    const btn = el.querySelector('#show-solution-btn');
    if (btn) btn.style.display = 'none';
  }

  function handleQuit() {
    if (!sessionId) return;
    stopTimer();
    ttsStop();
    hideActionRow();
    el.querySelectorAll('.option-btn, #typein-input, #submit-typein').forEach(b => b.disabled = true);
    el.querySelector('#quit-btn').disabled = true;
    el.querySelector('#quit-btn').textContent = 'Quitting…';
    awaitFinishAndNavigate();
  }

  async function awaitFinishAndNavigate() {
    try {
      await API.finishSession({
        sessionId,
        score,
        totalQuestions: TOTAL_QUESTIONS,
        correctAnswers: correctCount,
        timeTaken:      totalTime,
      });
    } catch { }
    const unanswered = Math.max(0, TOTAL_QUESTIONS - responses);
    const answered   = Math.max(0, responses - skippedCount);
    App.showPage('summary', {
      mode, level, score, correctCount,
      totalQuestions: TOTAL_QUESTIONS,
      timeTaken: totalTime,
      skippedCount,
      unanswered,
      answeredCount: answered,
      sessionId
    });
  }

  function showNextButton() {
    const nextArea    = el.querySelector('#next-area');
    const nextBtn     = el.querySelector('#next-btn');

    nextArea.style.display = 'block';
    const fresh = nextBtn.cloneNode(true);
    nextBtn.parentNode.replaceChild(fresh, nextBtn);

    if (questionNum >= TOTAL_QUESTIONS) {
      fresh.querySelector('#next-btn-text').textContent = 'See Results';
      fresh.addEventListener('click', finishGame);
    } else {
      fresh.querySelector('#next-btn-text').textContent = 'Next Question';
      fresh.addEventListener('click', loadQuestion);
    }
  }

  // Timer
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
          hideActionRow();
          skippedCount++;
          responses++;
          el.querySelectorAll('.option-btn, #typein-input, #submit-typein')
            .forEach(b => b.disabled = true);
          totalTime += timerSeconds();
          renderOutcome('timeout');
          API.saveAnswer({
            sessionId,
            questionNumber: questionNum,
            questionText:   currentQ.questionText,
            correctAnswer:  currentQ.correctAnswer,
            studentAnswer:  'TIME_UP',
            isCorrect:      false,
            timeTaken:      timerSeconds()
          }).catch(() => {});
          showNextButton();
        }
      }
    }, 1000);
  }

  function stopTimer()     { clearInterval(timerInterval); }
  function hideActionRow() {
    const r = el.querySelector('#action-row');
    if (r) r.style.display = 'none';
  }

  function updateProgress() {
    el.querySelector('#progress-bar').style.width =
      `${((questionNum - 1) / TOTAL_QUESTIONS) * 100}%`;
    el.querySelector('#q-counter').textContent = `${questionNum} / ${TOTAL_QUESTIONS}`;
  }

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

    const unanswered = Math.max(0, TOTAL_QUESTIONS - responses);
    const answered   = Math.max(0, responses - skippedCount);

    App.showPage('summary', {
      mode, level, score, correctCount,
      totalQuestions: TOTAL_QUESTIONS,
      timeTaken: totalTime,
      skippedCount,
      unanswered,
      answeredCount: answered,
      sessionId
    });
  }
};
