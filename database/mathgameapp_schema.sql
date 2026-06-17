-- ============================================================
--  MathGameApp - Simplified SQL Server Database Schema
--  This version keeps the core app model in under 10 tables while
--  preserving user, educator, admin linkage and manual custom questions.
--  Tables: users, educator_student_map, game_mode, difficulty_level,
--          sessions, answers, custom_questions, audit_log
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'mathgameapp')
    CREATE DATABASE mathgameapp;
GO
USE mathgameapp;
GO

-- ============================================================
-- TABLE: users
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
CREATE TABLE users (
    user_id       INT           IDENTITY(1,1) PRIMARY KEY,
    username      VARCHAR(50)   NOT NULL UNIQUE,
    password_hash VARCHAR(255)  NOT NULL,
    full_name     VARCHAR(100)  NOT NULL,
    email         VARCHAR(100)  NULL UNIQUE,
    role          VARCHAR(20)   NOT NULL DEFAULT 'student',
    grade_level   VARCHAR(50)   NULL,
    school_name   VARCHAR(100)  NULL,
    institution   VARCHAR(100)  NULL,
    department    VARCHAR(100)  NULL,
    permissions   VARCHAR(200)  NULL,
    is_active     BIT           NOT NULL DEFAULT 1,
    created_at    DATETIME      NOT NULL DEFAULT GETDATE(),
    last_login    DATETIME      NULL
);
GO

-- ============================================================
-- TABLE: educator_student_map
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='educator_student_map' AND xtype='U')
CREATE TABLE educator_student_map (
    map_id       INT      IDENTITY(1,1) PRIMARY KEY,
    educator_id  INT      NOT NULL REFERENCES users(user_id) ON DELETE NO ACTION,
    student_id   INT      NOT NULL REFERENCES users(user_id) ON DELETE NO ACTION,
    assigned_at  DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT UQ_educator_student UNIQUE (educator_id, student_id)
);
GO

-- ============================================================
-- TABLE: game_mode
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='game_mode' AND xtype='U')
CREATE TABLE game_mode (
    mode_id      INT          IDENTITY(1,1) PRIMARY KEY,
    mode_name    VARCHAR(30)  NOT NULL UNIQUE,
    display_name VARCHAR(60)  NOT NULL,
    description  VARCHAR(300) NULL,
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
END
GO

-- ============================================================
-- TABLE: difficulty_level
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='difficulty_level' AND xtype='U')
CREATE TABLE difficulty_level (
    level_id              INT         IDENTITY(1,1) PRIMARY KEY,
    level_code            VARCHAR(10) NOT NULL UNIQUE,
    level_number          INT         NOT NULL UNIQUE,
    display_name          VARCHAR(20) NOT NULL,
    description           VARCHAR(200) NULL,
    max_time_seconds      INT         NOT NULL DEFAULT 60,
    questions_per_session INT         NOT NULL DEFAULT 10,
    score_multiplier      DECIMAL(4,2) NOT NULL DEFAULT 1.00
);
GO
IF NOT EXISTS (SELECT * FROM difficulty_level WHERE level_code='level1')
BEGIN
    INSERT INTO difficulty_level (level_code, level_number, display_name, description, max_time_seconds, questions_per_session, score_multiplier) VALUES
        ('level1', 1, 'Level 1', 'Very easy — single digit operations',              90, 10, 1.00),
        ('level2', 2, 'Level 2', 'Easy — two digit operations',                     75, 10, 1.20),
        ('level3', 3, 'Level 3', 'Medium — multi-step problems',                   60, 10, 1.50),
        ('level4', 4, 'Level 4', 'Hard — complex expressions and larger numbers',  45, 12, 1.80),
        ('level5', 5, 'Level 5', 'Expert — advanced problems across all sub-topics', 30, 15, 2.00);
END
GO

-- ============================================================
-- TABLE: sessions
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='sessions' AND xtype='U')
CREATE TABLE sessions (
    session_id          INT         IDENTITY(1,1) PRIMARY KEY,
    user_id             INT         NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    mode                VARCHAR(30) NOT NULL REFERENCES game_mode(mode_name),
    difficulty          VARCHAR(10) NOT NULL REFERENCES difficulty_level(level_code),
    score               INT         NOT NULL DEFAULT 0,
    total_questions     INT         NOT NULL DEFAULT 0,
    correct_answers     INT         NOT NULL DEFAULT 0,
    time_taken_seconds  INT         NOT NULL DEFAULT 0,
    completed           BIT         NOT NULL DEFAULT 1,
    played_at           DATETIME    NOT NULL DEFAULT GETDATE()
);
GO

-- ============================================================
-- TABLE: answers
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='answers' AND xtype='U')
CREATE TABLE answers (
    answer_id           INT           IDENTITY(1,1) PRIMARY KEY,
    session_id          INT           NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
    question_number     INT           NOT NULL DEFAULT 1,
    question_text       NVARCHAR(MAX) NOT NULL,
    correct_answer      NVARCHAR(255) NOT NULL,
    student_answer      NVARCHAR(255) NULL,
    is_correct          BIT           NOT NULL DEFAULT 0,
    time_taken_seconds  INT           NOT NULL DEFAULT 0,
    answered_at         DATETIME      NOT NULL DEFAULT GETDATE()
);
GO

-- ============================================================
-- TABLE: custom_questions
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='custom_questions' AND xtype='U')
CREATE TABLE custom_questions (
    question_id     INT           IDENTITY(1,1) PRIMARY KEY,
    mode            VARCHAR(30)   NOT NULL REFERENCES game_mode(mode_name),
    level           INT           NOT NULL,
    question_text   NVARCHAR(500) NOT NULL,
    correct_answer  NVARCHAR(200) NOT NULL,
    wrong_options   NVARCHAR(500) NOT NULL DEFAULT '',
    solution_steps  NVARCHAR(1000) NOT NULL DEFAULT '',
    hint_text       NVARCHAR(300) NOT NULL DEFAULT '',
    is_active       BIT           NOT NULL DEFAULT 1,
    created_by      INT           NOT NULL REFERENCES users(user_id),
    created_at      DATETIME      NOT NULL DEFAULT GETDATE(),
    updated_at      DATETIME      NULL
);
GO

-- ============================================================
-- TABLE: audit_log
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='audit_log' AND xtype='U')
CREATE TABLE audit_log (
    log_id      INT           IDENTITY(1,1) PRIMARY KEY,
    actor_id    INT           NOT NULL REFERENCES users(user_id),
    action_type VARCHAR(100)  NOT NULL,
    description VARCHAR(500)  NULL,
    target_type VARCHAR(50)   NULL,
    target_id   INT           NULL,
    ip_address  VARCHAR(45)   NULL,
    logged_at   DATETIME      NOT NULL DEFAULT GETDATE()
);
GO

-- ============================================================
-- INDEXES
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_sessions_user_id')
    CREATE INDEX IX_sessions_user_id ON sessions(user_id);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_sessions_played_at')
    CREATE INDEX IX_sessions_played_at ON sessions(played_at DESC);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_sessions_mode')
    CREATE INDEX IX_sessions_mode ON sessions(mode);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_answers_session_id')
    CREATE INDEX IX_answers_session_id ON answers(session_id);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_audit_log_actor')
    CREATE INDEX IX_audit_log_actor ON audit_log(actor_id, logged_at DESC);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_esmap_educator')
    CREATE INDEX IX_esmap_educator ON educator_student_map(educator_id);
GO

-- ============================================================
-- Default admin account
-- ============================================================
IF NOT EXISTS (SELECT * FROM users WHERE username = 'admin')
BEGIN
    INSERT INTO users (username, password_hash, full_name, email, role)
    VALUES ('admin',
            '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
            'System Administrator', 'admin@mathgameapp.com', 'admin');
END
GO

PRINT 'MathGameApp simplified schema created / verified successfully.';
GO
