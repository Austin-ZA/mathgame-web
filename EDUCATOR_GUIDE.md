# MathGameApp Web — Educator Guide

## 1. Purpose
This guide is for educators using MathGameApp to monitor student progress, review class activity, and export reports.

## 2. Educator Access
Your account must have `role = educator`.
- Educator access is enforced in `middleware/auth.js`.
- If your account is not an educator, ask an admin to update your role.

## 3. Educator Dashboard
Educators are routed to the educator dashboard after login.
The dashboard includes three main tabs:
- **Overview** — class metrics and alerts
- **My Students** — detailed student performance
- **Reports** — export session and student CSV files

The dashboard page is implemented in `public/js/pages/educatorDashboard.js`.

## 4. What Educators Can Do

### View class performance
The Overview tab shows:
- number of students
- active students this week
- average class score
- students with low accuracy
- per-mode accuracy (Computational, Algebra, Binary)

### Review student progress
The Students tab displays:
- student name and username
- total sessions completed
- average accuracy
- best mode
- last active date
- status indicators like "On track", "At risk", or "Struggling"

### Export reports
The Reports tab allows educators to download:
- `class_report.csv` — all student session details
- `students_report.csv` — per-student summary data

## 5. Using the Dashboard
The educator dashboard is your main workspace.

### Overview tab
Use this tab to see:
- how many students are in your class
- how many were active in the last 7 days
- class average score
- how well students are performing in each mode
- flags for students who are struggling or inactive

### My Students tab
This tab shows a list of students and their performance details:
- number of sessions completed
- average accuracy
- best mode
- most recent active date
- a status label to identify students who need attention

### Reports tab
Use this tab to download two useful reports:
- **Class performance report** — detailed session data for the whole class
- **Student summary report** — summary stats for each student

## 6. How Student Lists Work
If students have been assigned to you, the dashboard will show only your assigned students.
If you have not yet been assigned students, the dashboard will still display all students so you can start monitoring performance immediately.

## 7. Typical Educator Workflow

### 1. Log in
Sign in with your educator account.

### 2. Check the Overview tab
Look for:
- low engagement
- low average accuracy
- students who have not played recently

### 3. Review student details
Open the My Students tab to identify:
- students who need help
- students with improving or declining accuracy
- which mode each student performs best in

### 4. Download reports
Use the Reports tab to export data when you need:
- class-wide performance insights
- individual student progress summaries

These reports are useful for classroom planning and sharing with parents.

## 8. Troubleshooting

### No students visible
- Make sure you are logged in with the correct educator account.
- If there are no assigned students yet, the dashboard may still show all students.

### Reports not downloading
- Try again if the page fails to load.
- If downloads still fail, refresh the dashboard and retry.

### Dashboard load errors
- Reload the page if data does not appear.
- Check your browser console for network errors if the dashboard still fails.

## 9. Notes for Educators
- All dashboard views are read-only and show student performance only.
- The educator dashboard is designed to help you monitor progress and export reports.
- If you need help or access issues, contact your admin.
