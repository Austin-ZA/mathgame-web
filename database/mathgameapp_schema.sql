-- ============================================================
--  MathGameApp - SQL Server Database Schema (Full ERD Version)
--  For SQL Server / SQLEXPRESS
--  Table names aligned with ERD:
--    educator_student_map  (was: educator_students)
--    game_mode             (was: game_modes)
--    difficulty_level      (was: difficulty_levels)
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'mathgameapp')
    CREATE DATABASE mathgameapp;
GO
USE mathgameapp;
GO

-- ============================================================
-- TABLE: roles
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='roles' AND xtype='U')
CREATE TABLE roles (
    role_id     INT           IDENTITY(1,1) PRIMARY KEY,
    role_name   VARCHAR(20)   NOT NULL UNIQUE,
    description VARCHAR(200)  NULL
);
GO
IF NOT EXISTS (SELECT * FROM roles WHERE role_name='student')
BEGIN
    INSERT INTO roles (role_name, description) VALUES
        ('student',  'A learner who plays the math game'),
        ('educator', 'A teacher who monitors student progress'),
        ('admin',    'A platform administrator with full access');
END
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
    role          VARCHAR(20)   NOT NULL DEFAULT 'student' REFERENCES roles(role_name),
    is_active     BIT           NOT NULL DEFAULT 1,
    created_at    DATETIME      NOT NULL DEFAULT GETDATE(),
    last_login    DATETIME      NULL
);
GO

-- ============================================================
-- TABLE: student_profile
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='student_profile' AND xtype='U')
CREATE TABLE student_profile (
    profile_id   INT      IDENTITY(1,1) PRIMARY KEY,
    user_id      INT      NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    grade_level  VARCHAR(50)  NULL,
    school_name  VARCHAR(100) NULL,
    created_at   DATETIME     NOT NULL DEFAULT GETDATE()
);
GO

-- ============================================================
-- TABLE: educator_profile
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='educator_profile' AND xtype='U')
CREATE TABLE educator_profile (
    profile_id   INT      IDENTITY(1,1) PRIMARY KEY,
    user_id      INT      NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    institution  VARCHAR(100) NULL,
    department   VARCHAR(100) NULL,
    created_at   DATETIME     NOT NULL DEFAULT GETDATE()
);
GO

-- ============================================================
-- TABLE: admin_profile
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='admin_profile' AND xtype='U')
CREATE TABLE admin_profile (
    profile_id   INT      IDENTITY(1,1) PRIMARY KEY,
    user_id      INT      NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    permissions  VARCHAR(200) NULL,
    created_at   DATETIME     NOT NULL DEFAULT GETDATE()
);
GO

-- ============================================================
-- TABLE: educator_student_map  (ERD: EDUCATOR_STUDENT_MAP)
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
-- TABLE: game_mode  (ERD: GAME_MODE)
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
        ('computational', 'Computational',  'Arithmetic operations: addition, subtraction, multiplication, division', 1),
        ('algebra',       'Algebra',        'Solve for unknowns and work with algebraic expressions', 2),
        ('binary',        'Binary',         'Convert between binary, decimal and hexadecimal numbers', 3);
END
GO

-- ============================================================
-- TABLE: difficulty_level  (ERD: DIFFICULTY_LEVEL)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='difficulty_level' AND xtype='U')
CREATE TABLE difficulty_level (
    level_id              INT         IDENTITY(1,1) PRIMARY KEY,
    level_code            VARCHAR(10) NOT NULL UNIQUE,
    level_number          INT         NOT NULL UNIQUE,
    display_name          VARCHAR(20) NOT NULL,
    description           VARCHAR(200) NULL,
    max_time_seconds      INT         NOT NULL DEFAULT 60,
    questions_per_session INT         NOT NULL DEFAULT 10
);
GO
IF NOT EXISTS (SELECT * FROM difficulty_level WHERE level_code='level1')
BEGIN
    INSERT INTO difficulty_level (level_code, level_number, display_name, description, max_time_seconds, questions_per_session) VALUES
        ('level1', 1, 'Level 1', 'Very easy � single digit operations',              90, 10),
        ('level2', 2, 'Level 2', 'Easy � two digit operations',                       75, 10),
        ('level3', 3, 'Level 3', 'Medium � multi-step problems',                     60, 10),
        ('level4', 4, 'Level 4', 'Hard � complex expressions and larger numbers',    45, 12),
        ('level5', 5, 'Level 5', 'Expert � advanced problems across all sub-topics', 30, 15);
END
GO

-- ============================================================
-- TABLE: mode_difficulty_config
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='mode_difficulty_config' AND xtype='U')
CREATE TABLE mode_difficulty_config (
    config_id           INT          IDENTITY(1,1) PRIMARY KEY,
    mode_name           VARCHAR(30)  NOT NULL REFERENCES game_mode(mode_name),
    level_code          VARCHAR(10)  NOT NULL REFERENCES difficulty_level(level_code),
    score_multiplier    DECIMAL(4,2) NOT NULL DEFAULT 1.00,
    bonus_time_seconds  INT          NOT NULL DEFAULT 0,
    CONSTRAINT UQ_mode_difficulty UNIQUE (mode_name, level_code)
);
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
-- TABLE: admin_activity_log
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='admin_activity_log' AND xtype='U')
CREATE TABLE admin_activity_log (
    log_id         INT      IDENTITY(1,1) PRIMARY KEY,
    admin_id       INT      NOT NULL REFERENCES users(user_id) ON DELETE NO ACTION,
    action_type    VARCHAR(100) NOT NULL,
    description    VARCHAR(500) NULL,
    target_user_id INT      NULL REFERENCES users(user_id) ON DELETE SET NULL,
    logged_at      DATETIME NOT NULL DEFAULT GETDATE()
);
GO

-- ============================================================
-- TABLE: performance_summary
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='performance_summary' AND xtype='U')
CREATE TABLE performance_summary (
    summary_id       INT      IDENTITY(1,1) PRIMARY KEY,
    user_id          INT      NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    total_sessions   INT      NOT NULL DEFAULT 0,
    average_score    DECIMAL(6,2) NOT NULL DEFAULT 0.00,
    average_accuracy DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    last_played      DATETIME NULL,
    updated_at       DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT UQ_performance_summary_user UNIQUE (user_id)
);
GO

-- ============================================================
-- TABLE: questions
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='questions' AND xtype='U')
CREATE TABLE questions (
    question_id     INT           IDENTITY(1,1) PRIMARY KEY,
    mode_id         INT           NULL REFERENCES game_mode(mode_id),
    difficulty_id   INT           NULL REFERENCES difficulty_level(level_id),
    selection_type  VARCHAR(30)   NOT NULL DEFAULT 'multiple_choice',
    question_text   NVARCHAR(MAX) NOT NULL,
    created_by      INT           NULL REFERENCES users(user_id),
    is_active       BIT           NOT NULL DEFAULT 1,
    created_at      DATETIME      NOT NULL DEFAULT GETDATE()
);
GO

-- ============================================================
-- TABLE: answer_options
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='answer_options' AND xtype='U')
CREATE TABLE answer_options (
    option_id      INT           IDENTITY(1,1) PRIMARY KEY,
    question_id    INT           NOT NULL REFERENCES questions(question_id) ON DELETE CASCADE,
    option_text    NVARCHAR(255) NOT NULL,
    is_correct     BIT           NOT NULL DEFAULT 0,
    order_index    INT           NOT NULL DEFAULT 0
);
GO

-- ============================================================
-- TABLE: explanation
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='explanation' AND xtype='U')
CREATE TABLE explanation (
    explanation_id INT      IDENTITY(1,1) PRIMARY KEY,
    question_id    INT      NOT NULL REFERENCES questions(question_id) ON DELETE CASCADE,
    stage_text     NVARCHAR(MAX) NOT NULL,
    audio_url      VARCHAR(255) NULL
);
GO

-- ============================================================
-- TABLE: user_answers
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='user_answers' AND xtype='U')
CREATE TABLE user_answers (
    answer_id          INT      IDENTITY(1,1) PRIMARY KEY,
    session_id         INT      NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
    question_id        INT      NOT NULL REFERENCES questions(question_id) ON DELETE NO ACTION,
    selected_option_id INT      NULL REFERENCES answer_options(option_id) ON DELETE SET NULL,
    is_correct         BIT      NOT NULL DEFAULT 0,
    time_taken_seconds INT      NOT NULL DEFAULT 0,
    answered_at        DATETIME NOT NULL DEFAULT GETDATE()
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
    is_active       BIT           NOT NULL DEFAULT 1,
    created_by      INT           NOT NULL REFERENCES users(user_id),
    created_at      DATETIME      NOT NULL DEFAULT GETDATE(),
    updated_at      DATETIME      NULL
);
GO

-- ============================================================
-- TABLE: leaderboard_snapshots
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='leaderboard_snapshots' AND xtype='U')
CREATE TABLE leaderboard_snapshots (
    snapshot_id    INT         IDENTITY(1,1) PRIMARY KEY,
    user_id        INT         NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    period_type    VARCHAR(10) NOT NULL,
    period_date    DATE        NOT NULL,
    total_score    INT         NOT NULL DEFAULT 0,
    total_sessions INT         NOT NULL DEFAULT 0,
    avg_accuracy   DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    rank_position  INT         NULL,
    captured_at    DATETIME    NOT NULL DEFAULT GETDATE(),
    CONSTRAINT UQ_leaderboard_user_period UNIQUE (user_id, period_type, period_date)
);
GO

-- ============================================================
-- TABLE: achievements
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='achievements' AND xtype='U')
CREATE TABLE achievements (
    achievement_id   INT           IDENTITY(1,1) PRIMARY KEY,
    achievement_code VARCHAR(50)   NOT NULL UNIQUE,
    title            VARCHAR(100)  NOT NULL,
    description      VARCHAR(300)  NOT NULL,
    icon_emoji       VARCHAR(10)   NULL,
    points_awarded   INT           NOT NULL DEFAULT 0,
    is_active        BIT           NOT NULL DEFAULT 1
);
GO
IF NOT EXISTS (SELECT * FROM achievements WHERE achievement_code='FIRST_SESSION')
BEGIN
    INSERT INTO achievements (achievement_code, title, description, icon_emoji, points_awarded) VALUES
        ('FIRST_SESSION',     'First Steps',         'Complete your first game session',                                   N'??', 10),
        ('PERFECT_SESSION',   'Perfect Score',       'Answer every question correctly in a single session',               N'??', 50),
        ('STREAK_7',          '7-Day Streak',        'Play at least one session every day for 7 consecutive days',        N'??', 30),
        ('LEVEL5_COMPLETE',   'Expert Mode',         'Complete a session on Level 5',                                     N'?', 40),
        ('ALL_MODES',         'Mode Explorer',       'Play at least one session in every game mode',                      N'???', 25),
        ('ACCURACY_90',       'Sharp Mind',          'Achieve 90% or higher accuracy in a session',                      N'??', 20),
        ('SESSIONS_50',       'Dedicated Learner',   'Complete 50 sessions in total',                                    N'??', 35);
END
GO

-- ============================================================
-- TABLE: user_achievements
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='user_achievements' AND xtype='U')
CREATE TABLE user_achievements (
    ua_id           INT      IDENTITY(1,1) PRIMARY KEY,
    user_id         INT      NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    achievement_id  INT      NOT NULL REFERENCES achievements(achievement_id),
    session_id      INT      NULL REFERENCES sessions(session_id) ON DELETE NO ACTION,
    earned_at       DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT UQ_user_achievement UNIQUE (user_id, achievement_id)
);
GO

-- ============================================================
-- TABLE: notifications
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='notifications' AND xtype='U')
CREATE TABLE notifications (
    notification_id INT          IDENTITY(1,1) PRIMARY KEY,
    user_id         INT          NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    type            VARCHAR(30)  NOT NULL,
    title           VARCHAR(100) NOT NULL,
    body            NVARCHAR(MAX) NOT NULL,
    is_read         BIT          NOT NULL DEFAULT 0,
    related_id      INT          NULL,
    created_at      DATETIME     NOT NULL DEFAULT GETDATE()
);
GO

-- ============================================================
-- TABLE: audit_log
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='audit_log' AND xtype='U')
CREATE TABLE audit_log (
    log_id      INT          IDENTITY(1,1) PRIMARY KEY,
    actor_id    INT          NOT NULL REFERENCES users(user_id),
    action      VARCHAR(100) NOT NULL,
    target_type VARCHAR(50)  NULL,
    target_id   INT          NULL,
    details     NVARCHAR(MAX) NULL,
    ip_address  VARCHAR(45)  NULL,
    logged_at   DATETIME     NOT NULL DEFAULT GETDATE()
);
GO

-- ============================================================
-- INDEXES
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_sessions_user_id')
    CREATE INDEX IX_sessions_user_id ON sessions(user_id);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_sessions_played_at')
    CREATE INDEX IX_sessions_played_at ON sessions(played_at);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_sessions_mode')
    CREATE INDEX IX_sessions_mode ON sessions(mode);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_answers_session_id')
    CREATE INDEX IX_answers_session_id ON answers(session_id);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_notif_user_unread')
    CREATE INDEX IX_notif_user_unread ON notifications(user_id, is_read);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_audit_actor')
    CREATE INDEX IX_audit_actor ON audit_log(actor_id);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_esmap_educator')
    CREATE INDEX IX_esmap_educator ON educator_student_map(educator_id);
GO

-- ============================================================
-- Default admin account
-- ============================================================
IF NOT EXISTS (SELECT * FROM users WHERE username = 'admin')
BEGIN
    INSERT INTO users (username, password_hash, full_name, email, role)
    VALUES ('admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
            'System Administrator', 'admin@mathgameapp.com', 'admin');
END
GO

-- ============================================================
-- Final confirmation
-- ============================================================
PRINT 'MathGameApp schema created / verified successfully.';
GO
