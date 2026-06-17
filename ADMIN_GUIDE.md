# MathGameApp Web — Admin Guide

## 1. Purpose
This guide is for administrators who manage accounts, monitor activity, and maintain the MathGameApp platform.

## 2. Admin Access
Admins must log in with an admin account.
- Default admin username: `admin`
- Admin privileges are controlled by `users.role = 'admin'`.

## 3. Key Admin Tasks

### Manage users
Admins can:
- view all users
- change roles
- delete users

### Review sessions
Admins can:
- view recent sessions
- export session reports
- inspect score and accuracy trends

### Manage custom questions
Admins can:
- load custom questions for a specific mode and level
- create new manual questions
- delete existing questions

## 4. Admin Pages and Controls

### Admin dashboard
The main admin UI is likely under `/admin` or the admin dashboard page.
It shows:
- user counts
- session counts
- activity feed
- simple export links

### User management
Admins can use the user management section to:
1. search or filter users
2. change user role to `student`, `educator`, or `admin`
3. delete a user account

> When deleting a user, the app removes that user’s sessions and answer records.

### Session monitoring
Admins can:
- open the sessions list
- review session metadata such as mode, level, score, and accuracy
- download CSV exports for sessions and users

### Activity review
The activity panel displays recent actions and session starts. It can help you verify whether the app is actively used.

## 5. Admin API Endpoints
Use these endpoints for admin tooling or debugging.

### User APIs
- `GET /api/admin/users` — list all users
- `POST /api/admin/users/role` — change a user’s role
- `POST /api/admin/users/delete` — delete a user account

### Activity and sessions
- `GET /api/admin/activity` — recent activity overview
- `GET /api/admin/sessions` — recent sessions list
- `GET /api/admin/export/sessions` — download session CSV
- `GET /api/admin/export/users` — download user CSV

### Custom questions
- `GET /api/admin/questions?mode=<mode>&level=<level>` — load questions for a mode/level
- `POST /api/admin/questions` — add a custom question
- `POST /api/admin/questions/delete` — delete a custom question

## 6. Custom Question Workflow

### Add a question
1. Choose mode and level.
2. Enter the question text.
3. Provide the correct answer.
4. Optionally supply wrong options and solution steps.
5. Save the question.

### Use cases
- add extra practice content
- support classroom assignments
- create exam-style practice challenges

## 7. Monitoring and Troubleshooting

### Check user roles
Make sure educators and admins are assigned correctly.
- students should have `role = student`
- educators should have `role = educator`
- admins should have `role = admin`

### Confirm session data
If students report missing history:
- verify `sessions` rows exist for their user
- verify `answers` rows exist for session IDs

### Custom question issues
If custom questions do not appear:
- confirm the `custom_questions` table exists
- confirm `is_active = 1`
- ensure `mode` and `level` match the selected values

## 8. Schema and ERD Reference
Admins should refer to the simplified schema files for database structure:
- `database/mathgameapp_schema_sqlserver.sql`
- `database/mathgameapp_schema.sql`

## 9. Best Practices
- Keep admin account credentials secure.
- Use role changes when teachers need access, rather than sharing admin login.
- Review session exports periodically to validate student activity.
- Use custom questions to tailor practice to classroom needs.

## 10. Notes
- The app uses a consolidated schema with `users`, `sessions`, `answers`, `custom_questions`, and `audit_log` as core tables.
- `educator_student_map` links educators and students for progress tracking.
- Admin actions are enforced by server middleware and require `role = 'admin'`.
