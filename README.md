# MathGameApp — Web Server

Converted from Java Swing desktop app to a Node.js web server.
Testers on the same network can access it in their browser — no install needed on their side.

---

## Prerequisites (on your PC)

| Tool | Download |
|------|----------|
| Node.js (LTS) | https://nodejs.org |
| MySQL Community Server | Already installed |
| VS Code | Already installed |

---

## Setup Steps

### 1. Set up the database
Open MySQL Workbench / MySQL Shell and run:
```sql
-- Run this file:
database/mathgameapp_schema.sql
```
This creates the `mathgameapp` database with tables: `users`, `sessions`, `answers`.
It also creates a default admin account: **admin / admin123**

### 2. Check your DB credentials
Open `db/connection.js` and confirm the settings match your MySQL setup:
```js
host:     'localhost',
port:     3306,
database: 'mathgameapp',
user:     'root',
password: 'Rea@dc#39',   // ← change if yours is different
```

### 3. Install dependencies
In VS Code, open the terminal (`Ctrl + backtick`) and run:
```bash
npm install
```

### 4. Start the server
```bash
node server.js
```

You'll see output like:
```
[DB] Connected to MySQL successfully.

✅  MathGameApp running!
   Local:    http://localhost:3000
   Network:  http://192.168.1.45:3000  ← share this with testers
```

### 5. Share with testers
Give testers the **Network** URL shown in the terminal.
They open it in any browser — Chrome, Edge, Firefox — no install needed.

---

## Project Structure

```
mathgame-web/
├── server.js                  ← Main entry point (run this)
├── package.json
├── db/
│   └── connection.js          ← MySQL config (mirrors DBConnection.java)
├── routes/
│   ├── auth.js                ← Login / Register / Logout API
│   ├── game.js                ← Session + Question + Answer API
│   └── questionGenerator.js  ← Ported from QuestionGenerator.java
├── middleware/
│   └── auth.js                ← Session authentication check
├── public/                    ← Frontend (browser files)
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── api.js             ← Fetch wrapper
│       ├── app.js             ← SPA router
│       └── pages/
│           ├── login.js
│           ├── register.js
│           ├── landing.js
│           ├── modeSelect.js
│           ├── game.js        ← Full game loop + timer + solution display
│           └── summary.js
└── database/
    └── mathgameapp_schema.sql ← Same schema as original app
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register` | Register new student |
| POST | `/api/auth/logout` | Logout |
| GET  | `/api/auth/me` | Get current user |
| POST | `/api/game/start` | Create session in DB |
| GET  | `/api/game/question?mode=&level=` | Generate a question |
| POST | `/api/game/answer` | Save answer to DB |
| POST | `/api/game/finish` | Finalise session score |
| GET  | `/api/game/history` | Get user's session history |

---

## Default Accounts

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Admin |

Students self-register via the app.

---

## Firewall note (Windows)
If testers can't connect, Windows Firewall may be blocking port 3000.
Allow it: **Windows Defender Firewall → Allow an app → Add port 3000**
Or run in PowerShell (as Admin):
```powershell
netsh advfirewall firewall add rule name="MathGameApp" dir=in action=allow protocol=TCP localport=3000
```
