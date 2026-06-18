// public/js/pages/game.js
//
// QUESTION SAVE FLOW:
//   1. API.getQuestion()  → server generates question, saves it to questions
//                           table, returns { ...question, questionId }
//   2. frontend stores    currentQ.questionId
//   3. API.saveAnswer()   → sends { sessionId, questionId, ... } to server
//                           → server inserts into user_answers with question_id FK
//   4. API.finishSession()→ marks session complete, updates summaries
//
// HISTORY FLOW:
//   History button → App.showPage('sessionDetails', { sessionId })
//   → API.getSession(sessionId) → server does:
//       SELECT ... FROM user_answers ua
//       JOIN questions q ON q.question_id = ua.question_id
//       WHERE ua.session_id = ?
//   → returns every question + student answer from the DB

Pages.game = function(el, { mode, level }) {
  const TOTAL_QUESTIONS = 10;
  const MAX_HINTS       = 3;

  function timerSeconds() {
    const lvl = parseInt(level) || 1;
    return lvl === 1 ? 40 : lvl === 2 ? 60 : lvl === 3 ? 80 : lvl === 4 ? 100 : 150;
  }

  let sessionId    = null;
  let currentQ     = null;   // holds { questionText, correctAnswer, questionId, ... }
  let questionNum  = 0;
  let score        = 0;
  let correctCount = 0;
  let answered     = false;
  let timerInterval= null;
  let timeLeft     = timerSeconds();
  let questionStart= null;
  let totalTime    = 0;
  let hintUsed     = false;  // per-question flag
  let hintsUsed    = 0;      // session total
  let skippedCount = 0;
  let responses    = 0;

  // TTS
  let ttsUtterance = null;
  function ttsSpeak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    ttsUtterance = new SpeechSynthesisUtterance(text);
    ttsUtterance.rate = 0.92;
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
    btn.textContent = speaking ? 'Stop Reading' : 'Read Aloud';
  }

  const modeLabel = { computational:'Computational', algebra:'Algebra', binary:'Binary' }[mode] || mode;

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
            <button class="btn btn-secondary btn-sm" id="quit-btn" style="padding:7px 16px;min-width:80px">Quit</button>
            <span style="font-weight:700;color:var(--primary-light)">Score: <span id="score-display">0</span></span>
          </div>
        </div>

        <div class="question-card" id="question-card">
          <div class="loading-center"><div class="spinner"></div></div>
        </div>

        <div id="answer-area"></div>

        <div id="hint-area" style="margin-top:12px;display:none">
          <div id="hint-box"
            style="padding:12px 16px;background:var(--bg-card2);border:1px solid rgba(255,183,77,0.35);
                   border-radius:8px;font-size:.88rem;color:var(--warning);display:none">
          </div>
        </div>

        <div id="action-row" style="margin-top:14px;display:none;gap:10px;flex-wrap:wrap;justify-content:center">
          <button class="btn btn-secondary btn-sm" id="hint-btn"
            style="width:auto;padding:9px 22px;border-color:rgba(255,183,77,0.4);color:var(--warning)">
            Get Hint (${MAX_HINTS})
          </button>
          <button class="btn btn-secondary btn-sm" id="skip-btn" style="width:auto;padding:9px 22px">
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

  // ── Boot ────────────────────────────────────────────────────────────────
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

  // ── Load next question ───────────────────────────────────────────────────
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
      // API.getQuestion → server saves question to DB → returns question + questionId
      currentQ = await API.getQuestion(mode, level);

      if (!currentQ.questionId) {
        // DB save failed on server side but question was still returned
        console.warn('[game] Question loaded without DB id — answer will not be linked to questions table.');
      }

      renderQuestion();
      startTimer();
      el.querySelector('#action-row').style.display = 'flex';
      el.querySelector('#hint-area').style.display  = 'block';
    } catch (e) {
      el.querySelector('#question-card').innerHTML =
        `<p class="error-msg">Could not load question: ${e.message}</p>`;
    }
  }

  // ── Render question ───────────────────────────────────────────────────────
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
      answerEl.querySelectorAll('.option-btn').forEach(btn =>
        btn.addEventListener('click', () => handleMultiChoice(btn))
      );
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
    updateHintButton();
  }

  function updateHintButton() {
    const btn = el.querySelector('#hint-btn');
    if (!btn) return;
    const remaining = Math.max(0, MAX_HINTS - hintsUsed);
    btn.textContent = remaining > 0 ? `Get Hint (${remaining})` : 'No Hints Left';
    btn.disabled    = remaining === 0 || answered;
    btn.style.opacity = (remaining === 0 || answered) ? '0.5' : '1';
  }

  // ── Hint ──────────────────────────────────────────────────────────────────
  function handleHint() {
    if (answered || hintUsed || hintsUsed >= MAX_HINTS) return;
    hintUsed  = true;
    hintsUsed += 1;
    const hintBox = el.querySelector('#hint-box');
    hintBox.textContent   = `Hint: ${currentQ.hint || 'Try breaking the problem into smaller steps.'}`;
    hintBox.style.display = 'block';
    updateHintButton();
  }

  // ── Multiple choice ───────────────────────────────────────────────────────
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

    processAnswer(chosen, isCorrect, 'answered');
  }

  // ── Type-in ───────────────────────────────────────────────────────────────
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
    processAnswer(val, isCorrect, 'answered');
  }

  // ── Skip ──────────────────────────────────────────────────────────────────
  function handleSkip() {
    if (answered) return;
    stopTimer();
    answered = true;
    hideActionRow();
    skippedCount++;
    responses++;

    el.querySelectorAll('.option-btn, #typein-input, #submit-typein').forEach(b => b.disabled = true);

    const timeTaken = Math.round((Date.now() - questionStart) / 1000);
    totalTime += timeTaken;

    renderOutcome('skipped');

    // Save to user_answers via API — questionId links back to questions table
    API.saveAnswer({
      sessionId,
      questionId:     currentQ.questionId,
      questionNumber: questionNum,
      studentAnswer:  'SKIPPED',
      isCorrect:      false,
      hintUsed,
      timeTaken,
      status:         'skipped'
    }).catch(err => console.error('[saveAnswer/skip]', err.message));

    showNextButton();
  }

  // ── Process a submitted answer ─────────────────────────────────────────────
  async function processAnswer(studentAnswer, isCorrect, status) {
    const timeTaken = Math.round((Date.now() - questionStart) / 1000);
    totalTime += timeTaken;

    if (isCorrect) { score += 10; correctCount++; }
    responses++;
    el.querySelector('#score-display').textContent = score;

    renderOutcome(isCorrect ? 'correct' : 'wrong');

    // Save to user_answers — questionId is the FK into questions table
    API.saveAnswer({
      sessionId,
      questionId:     currentQ.questionId,
      questionNumber: questionNum,
      studentAnswer,
      isCorrect,
      hintUsed,
      timeTaken,
      status
    }).catch(err => console.error('[saveAnswer]', err.message));

    showNextButton();
  }

  // ── Outcome panel ─────────────────────────────────────────────────────────
  function renderOutcome(result) {
    const solEl   = el.querySelector('#solution-area');
    const correct = result === 'correct';
    const skipped = result === 'skipped';
    const timeout = result === 'timeout';

    const label = correct
      ? 'Correct!'
      : `${skipped ? 'Skipped' : timeout ? "Time's up" : 'Incorrect'} — Correct answer: ${currentQ.correctAnswer}`;

    solEl.innerHTML = `
      <div class="${correct ? 'solution-panel' : 'solution-panel wrong-panel'}">
        <div style="font-weight:700;margin-bottom:10px">${label}</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button id="show-solution-btn" class="btn btn-secondary btn-sm" style="padding:7px 18px">
            Show Solution
          </button>
          <button id="tts-btn" class="btn btn-secondary btn-sm" style="padding:7px 18px">
            Read Aloud
          </button>
        </div>
        <div id="tts-status" style="font-size:.78rem;color:var(--text-muted);margin-top:8px"></div>
        <div id="solution-detail" style="margin-top:14px;display:none"></div>
      </div>`;

    el.querySelector('#show-solution-btn').addEventListener('click', () => {
      const detail = el.querySelector('#solution-detail');
      const steps  = currentQ.solutionSteps || 'No solution steps available.';
      detail.innerHTML = `
        <div style="padding:14px;border-radius:8px;background:var(--bg-card2);border:1px solid var(--border)">
          ${steps.split('\n').filter(l => l.trim()).map(line => {
            if (line.startsWith('Step')) {
              const c = line.indexOf(':');
              if (c > 0)
                return `<div style="margin-bottom:6px"><strong>${line.slice(0,c+1)}</strong>${line.slice(c+1)}</div>`;
            }
            return `<div style="margin-bottom:6px">${line}</div>`;
          }).join('')}
        </div>`;
      detail.style.display = 'block';
      el.querySelector('#show-solution-btn').style.display = 'none';
    });

    el.querySelector('#tts-btn').addEventListener('click', () => {
      if (window.speechSynthesis?.speaking) {
        ttsStop();
        el.querySelector('#tts-status').textContent = 'Stopped.';
      } else {
        const text = `${label}. ${(currentQ.solutionSteps || '').replace(/\n/g, '. ')}`;
        el.querySelector('#tts-status').textContent = 'Reading aloud...';
        ttsSpeak(text);
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

  // ── Quit ──────────────────────────────────────────────────────────────────
  function handleQuit() {
    if (!sessionId) return;
    if (!window.confirm('Are you sure you want to quit? Your progress will be saved.')) return;
    stopTimer();
    ttsStop();
    hideActionRow();
    el.querySelectorAll('.option-btn, #typein-input, #submit-typein').forEach(b => b.disabled = true);
    const qBtn = el.querySelector('#quit-btn');
    if (qBtn) { qBtn.disabled = true; qBtn.textContent = 'Quitting...'; }
    doFinish();
  }

  // ── Next / Finish button ──────────────────────────────────────────────────
  function showNextButton() {
    const area = el.querySelector('#next-area');
    const btn  = el.querySelector('#next-btn');
    area.style.display = 'block';
    const fresh = btn.cloneNode(true);
    btn.parentNode.replaceChild(fresh, btn);
    if (questionNum >= TOTAL_QUESTIONS) {
      fresh.querySelector('#next-btn-text').textContent = 'See Results';
      fresh.addEventListener('click', finishGame);
    } else {
      fresh.querySelector('#next-btn-text').textContent = 'Next Question';
      fresh.addEventListener('click', loadQuestion);
    }
  }

  // ── Timer ─────────────────────────────────────────────────────────────────
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
          el.querySelectorAll('.option-btn, #typein-input, #submit-typein').forEach(b => b.disabled = true);
          totalTime += timerSeconds();
          renderOutcome('timeout');
          API.saveAnswer({
            sessionId,
            questionId:     currentQ.questionId,
            questionNumber: questionNum,
            studentAnswer:  'TIME_UP',
            isCorrect:      false,
            hintUsed,
            timeTaken:      timerSeconds(),
            status:         'timeout'
          }).catch(err => console.error('[saveAnswer/timeout]', err.message));
          showNextButton();
        }
      }
    }, 1000);
  }

  function stopTimer()    { clearInterval(timerInterval); }
  function hideActionRow(){ const r = el.querySelector('#action-row'); if (r) r.style.display = 'none'; }

  function updateProgress() {
    el.querySelector('#progress-bar').style.width = `${((questionNum-1)/TOTAL_QUESTIONS)*100}%`;
    el.querySelector('#q-counter').textContent    = `${questionNum} / ${TOTAL_QUESTIONS}`;
  }

  async function finishGame() {
    stopTimer();
    ttsStop();
    el.querySelector('#progress-bar').style.width = '100%';
    await doFinish();
  }

  async function doFinish() {
    try {
      await API.finishSession({
        sessionId,
        score,
        totalQuestions: TOTAL_QUESTIONS,
        correctAnswers: correctCount,
        skippedAnswers: skippedCount,
        hintsUsed,
        timeTaken:      totalTime
      });
    } catch (err) {
      console.error('[finishSession]', err.message);
    }
    App.showPage('summary', {
      mode, level, score, correctCount,
      totalQuestions: TOTAL_QUESTIONS,
      timeTaken:      totalTime,
      skippedCount,
      unanswered:     Math.max(0, TOTAL_QUESTIONS - responses),
      answeredCount:  Math.max(0, responses - skippedCount),
      sessionId
    });
  }
};