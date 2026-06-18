<<<<<<< HEAD
﻿-- ============================================================
--  MathGameApp - Simplified SQL Server Database Schema
--  This version keeps the core app model in under 10 tables while
--  preserving user, educator, admin linkage and manual custom questions.
--  Tables: users, educator_student_map, game_mode, difficulty_level,
--          sessions, answers, custom_questions, audit_log
=======
-- ============================================================
--  MathGameApp  -  SQL Server Schema  (clean, consolidated)
--  Tables kept:
--    users, game_mode, sessions, questions,
--    user_answers, admin_activity_log,
--    performance_summary, leaderboard_snapshots,
--    notifications, custom_questions
--
--  Tables removed:
--    difficulty_level, educator_profile, student_profile,
--    admin_profile, user_achievements, audit_log,
--    answer_options, educator_student_map,
--    mode_difficulty_config, explanation,
--    achievements, roles
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'mathgameapp')
>>>>>>> eb0f918ab16e285c80b4089056cda86dc27cd092
    CREATE DATABASE mathgameapp;
CREATE TABLE [user] (
USE mathgameapp;
GO

-- ============================================================
-- TABLE: users
--  Profile fields merged in; no separate profile tables needed.
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
CREATE TABLE users (
    user_id       INT           IDENTITY(1,1) PRIMARY KEY,
    username      VARCHAR(50)   NOT NULL UNIQUE,
    password_hash VARCHAR(255)  NOT NULL,
    full_name     VARCHAR(100)  NOT NULL,
    email         VARCHAR(100)  NULL UNIQUE,
    role          VARCHAR(20)   NOT NULL DEFAULT 'student'
                                CHECK (role IN ('student','educator','admin')),
    grade_level   VARCHAR(50)   NULL,
    school_name   VARCHAR(100)  NULL,
    institution   VARCHAR(100)  NULL,
<<<<<<< HEAD
=======
    department    VARCHAR(100)  NULL,
    is_active     BIT           NOT NULL DEFAULT 1,
>>>>>>> eb0f918ab16e285c80b4089056cda86dc27cd092
    created_at    DATETIME      NOT NULL DEFAULT GETDATE(),
);
GO

-- ============================================================
<<<<<<< HEAD
-- TABLE: sessions
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='sessions' AND xtype='U')
CREATE TABLE sessions (
    session_id          INT           IDENTITY(1,1) PRIMARY KEY,
    user_id             INT         NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    mode                VARCHAR(30) NOT NULL REFERENCES game_mode(mode_name),
    difficulty          VARCHAR(20) NOT NULL,
    score               INT         NOT NULL DEFAULT 0,
    total_questions     INT         NOT NULL DEFAULT 0,
    played_at           DATETIME    NOT NULL DEFAULT GETDATE()
=======
-- TABLE: game_mode  (lookup)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='game_mode' AND xtype='U')
CREATE TABLE game_mode (
    mode_name    VARCHAR(30)  NOT NULL PRIMARY KEY,
    display_name VARCHAR(60)  NOT NULL,
    description  VARCHAR(300) NULL,
    is_active    BIT          NOT NULL DEFAULT 1
);
GO
IF NOT EXISTS (SELECT * FROM game_mode WHERE mode_name='computational')
    INSERT INTO game_mode (mode_name, display_name, description) VALUES
        ('computational','Computational Maths','Arithmetic: PEMDAS, fractions, decimals'),
        ('algebra',      'Algebra',            'Solve for unknowns and algebraic expressions'),
        ('binary',       'Binary Conversion',  'Convert between binary, decimal and hexadecimal');
GO

-- ============================================================
-- TABLE: sessions  (one row per game session)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='sessions' AND xtype='U')
CREATE TABLE sessions (
    session_id         INT         IDENTITY(1,1) PRIMARY KEY,
    user_id            INT         NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    mode               VARCHAR(30) NOT NULL REFERENCES game_mode(mode_name),
    difficulty         VARCHAR(10) NOT NULL,   -- 'level1'..'level5'
    score              INT         NOT NULL DEFAULT 0,
    total_questions    INT         NOT NULL DEFAULT 0,
    correct_answers    INT         NOT NULL DEFAULT 0,
    skipped_answers    INT         NOT NULL DEFAULT 0,
    hints_used         INT         NOT NULL DEFAULT 0,
    time_taken_seconds INT         NOT NULL DEFAULT 0,
    completed          BIT         NOT NULL DEFAULT 0,  -- set to 1 on /finish
    played_at          DATETIME    NOT NULL DEFAULT GETDATE()
>>>>>>> eb0f918ab16e285c80b4089056cda86dc27cd092
);
GO

-- ============================================================
-- TABLE: questions
--  Every auto-generated question is stored here the first time
--  it is used, deduplicated by (mode, difficulty, question_text).
--  History queries draw question text from this table via user_answers.
-- ============================================================
<<<<<<< HEAD
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='answers' AND xtype='U')
CREATE TABLE answers (
    answer_id           INT           IDENTITY(1,1) PRIMARY KEY,
    session_id          INT           NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
    question_number     INT           NOT NULL DEFAULT 1,
    is_correct          BIT           NOT NULL DEFAULT 0,
    answered_at         DATETIME      NOT NULL DEFAULT GETDATE()
);
GO

-- ============================================================
-- TABLE: educator_student_map
-- ============================================================
-- Note: legacy `educator_student_map` removed by request.
-- Educator/student mappings should be handled in-app or via a dedicated
-- management table if required in the future.
--

-- ============================================================
-- TABLE: game_mode
    mode_id      INT          IDENTITY(1,1) PRIMARY KEY,
CREATE TABLE answer (
    display_name VARCHAR(60)  NOT NULL,
     session_id          INT           NOT NULL REFERENCES session(session_id) ON DELETE CASCADE,
    is_active    BIT          NOT NULL DEFAULT 1,
    sort_order   INT          NOT NULL DEFAULT 0
);
GO
IF NOT EXISTS (SELECT * FROM game_mode WHERE mode_name='computational')
BEGIN
    INSERT INTO game_mode (mode_name, display_name, description, sort_order) VALUES
        ('computational', 'Computational', 'Arithmetic operations: addition, subtraction, multiplication, division', 1),
        ('algebra',       'Algebra',       'Solve for unknowns and work with algebraic expressions', 2),
        ('binary',        'Binary',        'Convert between binary, decimal and hexadecimal numbers', 3);
-- Note: legacy `difficulty_level` table removed by request.
CREATE TABLE custom_question (
-- difficulty levels can be managed in-app rather than as a rigid FK.
-- If you need a separate levels table in future, reintroduce with care.
--

-- ============================================================
-- TABLE: sessions
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='sessions' AND xtype='U')
CREATE TABLE sessions (
     created_by      INT           NOT NULL REFERENCES [user](user_id),
    user_id             INT         NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    mode                VARCHAR(30) NOT NULL REFERENCES game_mode(mode_name),
    difficulty          VARCHAR(20) NOT NULL,
    score               INT         NOT NULL DEFAULT 0,
    total_questions     INT         NOT NULL DEFAULT 0,
    played_at           DATETIME    NOT NULL DEFAULT GETDATE()
CREATE TABLE question (
GO

-- ============================================================
-- TABLE: answers
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='answers' AND xtype='U')
CREATE TABLE answers (
    answer_id           INT           IDENTITY(1,1) PRIMARY KEY,
    session_id          INT           NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
    question_number     INT           NOT NULL DEFAULT 1,
    is_correct          BIT           NOT NULL DEFAULT 0,
CREATE TABLE user_answer (
    answered_at         DATETIME      NOT NULL DEFAULT GETDATE()
=======
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='questions' AND xtype='U')
CREATE TABLE questions (
    question_id     INT            IDENTITY(1,1) PRIMARY KEY,
    mode            VARCHAR(30)    NOT NULL REFERENCES game_mode(mode_name),
    difficulty      VARCHAR(10)    NOT NULL,
    question_text   NVARCHAR(1000) NOT NULL,
    correct_answer  NVARCHAR(255)  NOT NULL,
    hint_text       NVARCHAR(500)  NOT NULL DEFAULT '',
    solution_steps  NVARCHAR(MAX)  NOT NULL DEFAULT '',
    is_multiple_choice BIT         NOT NULL DEFAULT 0,
    options_json    NVARCHAR(500)  NULL,   -- JSON array of 4 choices, NULL for type-in
    created_at      DATETIME       NOT NULL DEFAULT GETDATE(),
    CONSTRAINT UQ_question UNIQUE (mode, difficulty, question_text)
>>>>>>> eb0f918ab16e285c80b4089056cda86dc27cd092
);
GO

-- ============================================================
-- TABLE: user_answers
--  One row per question per session.
--  question_id links back to questions so history can show
--  full question text and correct answer without re-storing them.
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='user_answers' AND xtype='U')
CREATE TABLE user_answers (
    answer_id          INT           IDENTITY(1,1) PRIMARY KEY,
    session_id         INT           NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
    question_id        INT           NOT NULL REFERENCES questions(question_id),
    question_number    INT           NOT NULL DEFAULT 1,
    student_answer     NVARCHAR(255) NULL,
    hint_used          BIT           NOT NULL DEFAULT 0,
    is_correct         BIT           NOT NULL DEFAULT 0,
    status             VARCHAR(10)   NOT NULL DEFAULT 'answered'
                                     CHECK (status IN ('answered','skipped','timeout')),
    time_taken_seconds INT           NOT NULL DEFAULT 0,
    answered_at        DATETIME      NOT NULL DEFAULT GETDATE()
);
GO

-- ============================================================
-- TABLE: custom_questions  (admin-added questions, optional pool)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='custom_questions' AND xtype='U')
CREATE TABLE custom_questions (
<<<<<<< HEAD
    question_id     INT           IDENTITY(1,1) PRIMARY KEY,
    mode            VARCHAR(30)   NOT NULL REFERENCES game_mode(mode_name),
    level           INT           NOT NULL,
    solution_steps  NVARCHAR(1000) NOT NULL DEFAULT '',
    hint_text       NVARCHAR(300) NOT NULL DEFAULT '',
    is_active       BIT           NOT NULL DEFAULT 1,
     actor_id INT NULL REFERENCES [user](user_id),
    created_at      DATETIME      NOT NULL DEFAULT GETDATE(),
    updated_at      DATETIME      NULL
=======
    question_id    INT            IDENTITY(1,1) PRIMARY KEY,
    mode           VARCHAR(30)    NOT NULL REFERENCES game_mode(mode_name),
    level          INT            NOT NULL,
    question_text  NVARCHAR(500)  NOT NULL,
    correct_answer NVARCHAR(200)  NOT NULL,
    wrong_options  NVARCHAR(500)  NOT NULL DEFAULT '',
    solution_steps NVARCHAR(1000) NOT NULL DEFAULT '',
    hint_text      NVARCHAR(300)  NOT NULL DEFAULT '',
    is_active      BIT            NOT NULL DEFAULT 1,
    created_by     INT            NOT NULL REFERENCES users(user_id),
    created_at     DATETIME       NOT NULL DEFAULT GETDATE(),
    updated_at     DATETIME       NULL
>>>>>>> eb0f918ab16e285c80b4089056cda86dc27cd092
);
GO

-- ============================================================
<<<<<<< HEAD
-- TABLE: audit_log
--

-- ============================================================
-- TABLE: questions
-- Stores every question presented/asked so history and analytics can draw
-- from a persistent question repository. A trigger below ensures questions
-- are recorded when `answers` rows are inserted.
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='questions' AND xtype='U')
    difficulty     VARCHAR(20)   NULL,
    question_text  NVARCHAR(MAX) NOT NULL,
    correct_answer NVARCHAR(255) NULL,
    source         VARCHAR(50)   NOT NULL DEFAULT 'generated',
    created_at     DATETIME      NOT NULL DEFAULT GETDATE()
=======
-- TABLE: admin_activity_log
--  Populated automatically on login, role change, delete, session.
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='admin_activity_log' AND xtype='U')
CREATE TABLE admin_activity_log (
    log_id         INT           IDENTITY(1,1) PRIMARY KEY,
    actor_id       INT           NOT NULL REFERENCES users(user_id),
    action_type    VARCHAR(100)  NOT NULL,
    description    NVARCHAR(500) NULL,
    target_user_id INT           NULL REFERENCES users(user_id),
    ip_address     VARCHAR(45)   NULL,
    logged_at      DATETIME      NOT NULL DEFAULT GETDATE()
);
GO

-- ============================================================
-- TABLE: performance_summary
--  One row per user, updated automatically after every /finish.
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='performance_summary' AND xtype='U')
CREATE TABLE performance_summary (
    summary_id       INT          IDENTITY(1,1) PRIMARY KEY,
    user_id          INT          NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    total_sessions   INT          NOT NULL DEFAULT 0,
    total_score      INT          NOT NULL DEFAULT 0,
    average_score    DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    average_accuracy DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    best_score       INT          NOT NULL DEFAULT 0,
    last_played      DATETIME     NULL,
    updated_at       DATETIME     NOT NULL DEFAULT GETDATE()
);
GO

-- ============================================================
-- TABLE: leaderboard_snapshots
--  One row per user per day; updated after every /finish.
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='leaderboard_snapshots' AND xtype='U')
CREATE TABLE leaderboard_snapshots (
    snapshot_id    INT          IDENTITY(1,1) PRIMARY KEY,
    user_id        INT          NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    snapshot_date  DATE         NOT NULL DEFAULT CAST(GETDATE() AS DATE),
    total_score    INT          NOT NULL DEFAULT 0,
    total_sessions INT          NOT NULL DEFAULT 0,
    avg_accuracy   DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    rank_position  INT          NULL,
    updated_at     DATETIME     NOT NULL DEFAULT GETDATE(),
    CONSTRAINT UQ_leaderboard_user_date UNIQUE (user_id, snapshot_date)
);
GO

-- ============================================================
-- TABLE: notifications
--  Populated after session finish (achievement-style messages).
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='notifications' AND xtype='U')
CREATE TABLE notifications (
    notification_id INT           IDENTITY(1,1) PRIMARY KEY,
    user_id         INT           NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    type            VARCHAR(30)   NOT NULL,   -- 'session_complete','milestone','alert'
    title           VARCHAR(100)  NOT NULL,
    body            NVARCHAR(500) NOT NULL,
    is_read         BIT           NOT NULL DEFAULT 0,
    created_at      DATETIME      NOT NULL DEFAULT GETDATE()
>>>>>>> eb0f918ab16e285c80b4089056cda86dc27cd092
);
GO

-- display question + answer pairs easily.
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='user_answers' AND xtype='U')
CREATE TABLE user_answers (
    user_answer_id   INT           IDENTITY(1,1) PRIMARY KEY,
    answer_id        INT           NULL,
    question_id      INT           NOT NULL REFERENCES questions(question_id),
    session_id       INT           NOT NULL REFERENCES sessions(session_id),
    time_taken_seconds INT         NOT NULL DEFAULT 0,
    answered_at      DATETIME      NOT NULL DEFAULT GETDATE()
);
GO

-- ============================================================
-- TABLE: admin_activity_log
-- Replaces the old audit table and is seeded below with a small row
-- so admin views are not empty on first run.
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='admin_activity_log' AND xtype='U')
CREATE TABLE admin_activity_log (
    event_id INT IDENTITY(1,1) PRIMARY KEY,
    actor_id INT NULL REFERENCES users(user_id),
    action   VARCHAR(100) NOT NULL,
    details  NVARCHAR(1000) NULL,
    ip_address VARCHAR(45) NULL,
    logged_at DATETIME NOT NULL DEFAULT GETDATE()
);
GO
-- Stores explanations or worked solutions for questions.
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='explanation' AND xtype='U')
CREATE TABLE explanation (
    explanation_id INT IDENTITY(1,1) PRIMARY KEY,
    question_id INT NULL REFERENCES questions(question_id),
    explanation_text NVARCHAR(MAX) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT GETDATE()
);
GO

-- ============================================================
-- TABLE: leaderboard_snapshots
-- Small seeded snapshot so leaderboard views aren't empty initially.
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='leaderboard_snapshots' AND xtype='U')
CREATE TABLE leaderboard_snapshots (
    snapshot_id INT IDENTITY(1,1) PRIMARY KEY,
    snapshot_date DATETIME NOT NULL DEFAULT GETDATE(),
    data NVARCHAR(MAX) NULL
);
GO

-- ============================================================
-- TABLE: notifications_snapshot
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='notifications_snapshot' AND xtype='U')
CREATE TABLE notifications_snapshot (
    snapshot_id INT IDENTITY(1,1) PRIMARY KEY,
    snapshot_date DATETIME NOT NULL DEFAULT GETDATE(),
    data NVARCHAR(MAX) NULL
);
GO

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='performance_summary' AND xtype='U')
CREATE TABLE performance_summary (
    summary_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NULL REFERENCES users(user_id),
    summary_date DATETIME NOT NULL DEFAULT GETDATE(),
    summary_data NVARCHAR(MAX) NULL
);
GO
-- Seed small rows so admin/dashboard pages have initial content
IF NOT EXISTS (SELECT * FROM admin_activity_log)
IF NOT EXISTS (SELECT * FROM notifications_snapshot)
    INSERT INTO notifications_snapshot (data) VALUES ('{"note":"seeded"}');
IF NOT EXISTS (SELECT * FROM performance_summary)
    INSERT INTO performance_summary (summary_data) VALUES ('{"note":"seeded"}');
GO

-- ============================================================
-- TRIGGER: trg_answers_to_questions
-- When a row is inserted into `answers` (questions shown during a session),
-- ensure the question is persisted in `questions` and a normalized `user_answers`
-- row is created. This enables the History view to pull question + answers.
-- ============================================================
IF OBJECT_ID('trg_answers_to_questions','TR') IS NOT NULL
    DROP TRIGGER trg_answers_to_questions;
GO
CREATE TRIGGER trg_answers_to_questions
ON answers
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;

    -- Insert any new questions (avoid duplicates by matching text)
    INSERT INTO questions (mode, difficulty, question_text, correct_answer, source, created_at)
    SELECT s.mode, s.difficulty, i.question_text, i.correct_answer, 'generated', GETDATE()
    FROM inserted i
    JOIN sessions s ON i.session_id = s.session_id
    LEFT JOIN questions q ON q.question_text = i.question_text
    WHERE q.question_id IS NULL;

    -- Link answers to questions in user_answers
    INSERT INTO user_answers (answer_id, question_id, session_id, question_number, student_answer, is_correct, time_taken_seconds, answered_at)
    SELECT i.answer_id,
           q.question_id,
           i.session_id,
           i.question_number,
           i.student_answer,
           i.is_correct,
           i.time_taken_seconds,
           i.answered_at
    FROM inserted i
    JOIN sessions s ON i.session_id = s.session_id
    JOIN questions q ON q.question_text = i.question_text;
END;
GO

-- ============================================================
-- INDEXES
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_sessions_user_id')
    CREATE INDEX IX_sessions_user_id  ON sessions(user_id);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_sessions_played_at')
    CREATE INDEX IX_sessions_played_at ON sessions(played_at DESC);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_sessions_mode')
<<<<<<< HEAD
    CREATE INDEX IX_sessions_mode ON sessions(mode);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_answers_session_id')
    CREATE INDEX IX_answers_session_id ON answers(session_id);
-- Legacy indexes for removed tables omitted (audit_log, educator_student_map).
=======
    CREATE INDEX IX_sessions_mode     ON sessions(mode);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_user_answers_session')
    CREATE INDEX IX_user_answers_session ON user_answers(session_id);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_user_answers_question')
    CREATE INDEX IX_user_answers_question ON user_answers(question_id);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_questions_mode_diff')
    CREATE INDEX IX_questions_mode_diff ON questions(mode, difficulty);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_notif_user')
    CREATE INDEX IX_notif_user        ON notifications(user_id, is_read);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_lb_date')
    CREATE INDEX IX_lb_date           ON leaderboard_snapshots(snapshot_date DESC);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_activity_actor')
    CREATE INDEX IX_activity_actor    ON admin_activity_log(actor_id, logged_at DESC);
>>>>>>> eb0f918ab16e285c80b4089056cda86dc27cd092
GO

-- ============================================================
-- Default admin account  (password: admin123)
-- ============================================================
IF NOT EXISTS (SELECT * FROM users WHERE username='admin')
    INSERT INTO users (username, password_hash, full_name, email, role)
    VALUES ('admin',
            '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
            'System Administrator','admin@mathgameapp.com','admin');
GO

PRINT 'MathGameApp schema created/verified successfully.';
GO
