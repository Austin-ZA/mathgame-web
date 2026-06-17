# MathGameApp Web Manual

## 1. Overview
MathGameApp Web is a browser-based math practice platform built as a vanilla JavaScript SPA with a Node.js/Express backend. It supports:
- student gameplay sessions
- educator/student assignment relationships
- admin user management
- manual custom question creation
- session history and summary stats
- password reset support

This manual covers installation, usage, app structure, and the simplified database schema.

## 2. Installation

### Requirements
- Node.js 18+ installed
- SQL Server or compatible database configured
- `npm` available

### Setup
1. Open the project folder: `c:\Users\Matsilele\source\repos\mathgame-web`
2. Install dependencies:

```powershell
npm install
```

3. Create or configure your database.
4. Use the SQL schema files in `database/` to provision the schema.

## 3. Running the App

### Start the server

```powershell
npm start
```

### Development mode

```powershell
npm run dev
```

### Default entry point
- `server.js`

## 4. Application Flow

### Public pages
- `public/index.html` — application shell
- `public/js/pages/landing.js` — landing page with recent history and quick start
- `public/js/pages/modeSelect.js` — choose game mode and difficulty level
- `public/js/pages/game.js` — core gameplay and question flow
- `public/js/pages/summary.js` — session summary after game completion
- `public/js/pages/login.js` — login page and forgot-password flow
- `public/js/pages/register.js` — new student registration

### Core SPA router
- `public/js/app.js` manages page navigation and state
- `public/js/api.js` centralizes API calls

## 5. User Roles

### Student
- register/login
- play math game sessions
- view recent session history
- see session summaries

### Educator
- assigned students through `educator_student_map`
- view student activity through educator dashboard routes
- add manual questions via admin page if role permits

### Admin
- manage all users
- change roles
- delete accounts
- review sessions and activity
- add or remove custom questions

## 6. Gameplay Details

### Game flow
1. Pick mode on `modeSelect`.
2. Choose level or have level preselected.
3. Start session: `POST /api/game/start` creates a session.
4. Ask a question from `GET /api/game/question`.
5. Answer or skip.
6. Save each response via `POST /api/game/answer`.
7. Finish session with `POST /api/game/finish`.
8. View summary and history.

### Important frontend behavior
- `public/js/pages/game.js` tracks correct/skipped/unanswered counts.
- `Show Solution` and hint guidance are available after answering.
- `Quit` can end a session mid-game and still save results.

## 7. Database Schema Files

Use these files for the ERD and schema reference:
- `database/mathgameapp_schema_sqlserver.sql`
- `database/mathgameapp_schema.sql`

### Simplified active tables
The app now uses the following schema tables:
- `users`
- `educator_student_map`
- `game_mode`
- `difficulty_level`
- `sessions`
- `answers`
- `custom_questions`
- `audit_log`

### Legacy migration helper
- `database/migrate_rename_tables.sql`

## 8. API Endpoints

### Authentication
- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/logout`
- `POST /api/auth/forgot-password`
- `GET /api/auth/me`

### Game
- `POST /api/game/start`
- `GET /api/game/question`
- `POST /api/game/answer`
- `POST /api/game/finish`
- `GET /api/game/history`
- `GET /api/game/session/:id`

### Admin
- `GET /api/admin/stats`
- `GET /api/admin/users`
- `POST /api/admin/users/role`
- `POST /api/admin/users/delete`
- `GET /api/admin/activity`
- `GET /api/admin/sessions`
- `GET /api/admin/export/sessions`
- `GET /api/admin/export/users`
- `GET /api/admin/questions`
- `POST /api/admin/questions`
- `POST /api/admin/questions/delete`

## 9. File Map

### Backend
- `server.js` — Express server bootstrap
- `routes/auth.js` — login, register, forgot password
- `routes/game.js` — session and answer APIs
- `routes/admin.js` — admin and question management
- `routes/educator.js` — educator dashboard data
- `routes/history.js` — session history view
- `db/` — database connection wrappers
- `middleware/auth.js` — authentication middleware

### Frontend
- `public/js/api.js` — API utility functions
- `public/js/app.js` — SPA routing and state
- `public/js/pages/` — page components
- `public/css/` — app styles

## 10. Troubleshooting

### Common issues
- If the app cannot connect to the DB, verify your DB credentials and connection file under `db/`.
- If session history is empty, make sure `sessions` and `answers` tables exist and are being updated.
- If custom questions are not saving, confirm `custom_questions` exists and is writable.

### Notes
- The simplified schema intentionally collapses legacy profile tables into a single `users` table with optional fields.
- The app expects `sessions.mode` to match a row in `game_mode` and `sessions.difficulty` to match a row in `difficulty_level`.

## 11. How to extend

### Add a new mode
1. Add mode metadata in `game_mode` table.
2. Add generation logic in `routes/questionGenerator.js`.
3. Add frontend support for the new mode in `public/js/pages/modeSelect.js` and `public/js/pages/game.js`.

### Add a new level
1. Add an entry in `difficulty_level`.
2. Ensure `public/js/pages/modeSelect.js` shows the new level option.
3. Adjust any timer or scoring logic if needed.

## 12. Summary
This manual covers the current app structure, how to start it, how users interact with it, and which files define the schema and behavior. For the ERD, refer to `database/mathgameapp_schema_sqlserver.sql` and `database/mathgameapp_schema.sql`.
