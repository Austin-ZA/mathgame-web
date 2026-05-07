# MathGameApp Web — Bug Fixes & ERD
## Summary of changes

---

## FILES IN THIS PACKAGE

| File | Replace / Add | Description |
|------|--------------|-------------|
| `game.js` | **REPLACE** `public/js/pages/game.js` | Full rewrite of game page with all fixes |
| `game_routes.js` | **REPLACE** `routes/game.js` | Fixed backend API routes |
| `game_styles.css` | **ADD** to end of `public/style.css` | New CSS for skip btn, TTS btn, timer, options |
| `MathGameApp_ERD.html` | Open in browser | Complete ERD with roles, modes, glossary |

---

## BUG FIXES

### 1. Score & Accuracy Always 0 — ROOT CAUSES FIXED

#### Backend (routes/game.js)
**Problem A — Wrong SQL function:**
```js
// WRONG (SQL Server):
const result = await pool.query('SELECT SCOPE_IDENTITY() as sessionId');

// FIXED (MySQL):
const result = await pool.query('SELECT LAST_INSERT_ID() as sessionId');
```
Without this, `sessionId` came back as `undefined`, so `saveAnswer()` and `finaliseSession()` were writing to session_id = NULL/0 — nothing was saved correctly.

**Problem B — Wrong syntax for pagination:**
```js
// WRONG (SQL Server):
'SELECT TOP 20 * FROM sessions ...'

// FIXED (MySQL):  
'SELECT * FROM sessions ... LIMIT 20'
```

#### Frontend (public/js/pages/game.js)
**Problem C — finishSession never sent correctAnswers:**
The original `finishGame()` called `API.finishSession()` but `correctAnswers` was `undefined` (variable not wired up). It always sent 0.

**Fixed:** `correctCount` is now properly tracked and passed to `finishSession`.

**Problem D — timeTaken was always 0:**
`totalTime` accumulates per-question time now. Was never accumulated in original.

---

### 2. Skip Question — Added

The Java app (`GameScreen.java`) has a **Skip Question** button. The web version was missing it completely.

**Added in game.js:**
- Yellow "⏭ Skip Question" button visible before answering
- Saves `student_answer = 'SKIPPED'`, `is_correct = 0` to DB
- Shows "Skipped — correct answer: X" feedback
- Hides skip button, shows "📖 Show Solution" button
- Does NOT auto-show solution (gives student chance to think first)

---

### 3. Read Aloud (TTS) — Added to Web

The Java app (`SolutionPanel.java + TTSEngine.java`) has a **"Read Aloud"** button that reads solution steps aloud. The web version had no TTS at all.

**Added in game.js using Web Speech API:**
```js
function ttsSpeak(text) {
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 0.95;
  window.speechSynthesis.speak(utt);
}
```
- **"🔊 Read Aloud"** button appears in every solution panel
- Toggles to **"⏹ Stop Reading"** while speaking
- Stops automatically when done
- Stops when moving to next question

---

## ERD — What's New

The original ERD only showed Users → Sessions → Answers.

**The new `MathGameApp_ERD.html` adds:**
- ✅ `role` field detail: student / educator / admin permissions per role
- ✅ `is_active` flag (soft-delete for users)
- ✅ `is_completed` flag on sessions (distinguish abandoned vs finished)
- ✅ `answered_at` timestamp on answers
- ✅ Full mode documentation (computational / algebra / binary)
- ✅ Full difficulty/level table (L1–L5, timer seconds, base points)
- ✅ Score formula documented
- ✅ Session lifecycle (7-step API call sequence)
- ✅ Relationship cardinality with ON DELETE CASCADE rules
- ✅ Full glossary (12 terms)
- ✅ Symbol/notation key for crow's foot notation
- ✅ Special answer values (SKIPPED, TIME_UP) explained
- ✅ LAST_INSERT_ID vs SCOPE_IDENTITY bug documented
