# MathGameApp Web — Full-Stack Math Learning Platform

A web-based math practice application with adaptive difficulty, converted from Java Swing. Features multiple game modes, real-time feedback, and comprehensive progress tracking.

---

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/Austin/mathgame-web.git
cd mathgame-web
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Database
```bash
cp .env.example .env
```

Edit `.env` with your database credentials:
```env
DB_TYPE=azuresql
AZURE_SQL_SERVER=your-server.database.windows.net
AZURE_SQL_DATABASE=mathgameapp
AZURE_SQL_USER=your-username
AZURE_SQL_PASSWORD=your-password
```

**Supported databases:**
- `azuresql` - Azure SQL Database (recommended for production)
- `mysql` - MySQL (compatible with Render/Railway)
- `sqlserver` - SQL Server Express (local development)

See `DATABASE_SETUP.md` for detailed setup instructions.

### 4. Create Database Schema
Run `database/mathgameapp_schema.sql` in your database.

### 5. Start the Server
```bash
npm start
```

Visit: http://localhost:3000

---

## 📁 Project Structure

```
mathgame-web/
├── public/                 # Frontend (Vanilla JS SPA)
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── app.js          # SPA router
│       ├── api.js          # API wrapper
│       ├── questions.js    # Question generator
│       └── pages/          # Page components
├── routes/                 # API routes
│   ├── auth.js
│   └── game.js
├── db/                     # Database modules
│   ├── connection.js       # Router
│   ├── azuresql-connection.js
│   ├── mysql-connection.js
│   └── sqlserver-connection.js
├── database/               # SQL schemas
├── server.js              # Express server
├── .env                   # Environment config (not in Git)
└── package.json
```

---

## 🎮 Features

- **3 Game Modes:**
  - Computational (arithmetic)
  - Algebra (equations)
  - Binary (number systems)

- **5 Difficulty Levels:**
  - Adaptive difficulty progression
  - Time limits per level
  - Score multipliers

- **Interactive Learning:**
  - Skip questions
  - Text-to-Speech solution reading
  - Step-by-step explanations
  - Real-time feedback

- **Progress Tracking:**
  - Session history
  - Score and accuracy metrics
  - Time tracking per question

---

## 🗄️ Database Support

This app supports **three database types** with automatic routing:

| Database | Use Case | Setup Guide |
|----------|----------|-------------|
| **Azure SQL** | Production (cloud) | See `DATABASE_SETUP.md` |
| **MySQL** | Render/Railway | See `DATABASE_SETUP.md` |
| **SQL Server Express** | Local development | See `DATABASE_SETUP.md` |

Simply set `DB_TYPE` in `.env` and the app automatically uses the correct connection module.

---

## 🌐 Deploy to Render

1. Push to GitHub:
   ```bash
   git push origin main
   ```

2. Create Web Service on [Render](https://render.com)
   - Build Command: `npm install`
   - Start Command: `npm start`

3. Add environment variables from your `.env` file

4. Deploy! 🚀

See `DATABASE_SETUP.md` for full deployment instructions.

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
