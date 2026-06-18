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
    CREATE DATABASE mathgameapp;
GO
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
    department    VARCHAR(100)  NULL,
    is_active     BIT           NOT NULL DEFAULT 1,
    created_at    DATETIME      NOT NULL DEFAULT GETDATE(),
    last_login    DATETIME      NULL
);
GO

-- ============================================================
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
);
GO

-- ============================================================
-- TABLE: questions
--  Every auto-generated question is stored here the first time
--  it is used, deduplicated by (mode, difficulty, question_text).
--  History queries draw question text from this table via user_answers.
-- ============================================================
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
);
GO

-- ============================================================
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
);
GO

-- ============================================================
-- INDEXES
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_sessions_user_id')
    CREATE INDEX IX_sessions_user_id  ON sessions(user_id);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_sessions_played_at')
    CREATE INDEX IX_sessions_played_at ON sessions(played_at DESC);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_sessions_mode')
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
