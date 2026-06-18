-- ============================================================
--  MathGameApp - Drop unused/redundant tables
--  Run this ONCE against an existing database that has the
--  old schema. The new schema (mathgameapp_schema.sql) does
--  NOT create these tables.
--
--  Order matters: drop FKs / dependents first.
-- ============================================================
USE mathgameapp;
GO

-- 1. user_achievements (depends on achievements)
IF EXISTS (SELECT * FROM sysobjects WHERE name='user_achievements' AND xtype='U')
    DROP TABLE user_achievements;
GO

-- 2. achievements
IF EXISTS (SELECT * FROM sysobjects WHERE name='achievements' AND xtype='U')
    DROP TABLE achievements;
GO

-- 3. answer_options (depends on questions old table)
IF EXISTS (SELECT * FROM sysobjects WHERE name='answer_options' AND xtype='U')
    DROP TABLE answer_options;
GO

-- 4. explanation (depends on questions old table)
IF EXISTS (SELECT * FROM sysobjects WHERE name='explanation' AND xtype='U')
    DROP TABLE explanation;
GO

-- 5. leaderboard_snapshots old (will be re-created by new schema)
-- Skip — new schema keeps this table; data is preserved.

-- 6. mode_difficulty_config
IF EXISTS (SELECT * FROM sysobjects WHERE name='mode_difficulty_config' AND xtype='U')
    DROP TABLE mode_difficulty_config;
GO

-- 7. difficulty_level
IF EXISTS (SELECT * FROM sysobjects WHERE name='difficulty_level' AND xtype='U')
    DROP TABLE difficulty_level;
GO

-- 8. educator_student_map
IF EXISTS (SELECT * FROM sysobjects WHERE name='educator_student_map' AND xtype='U')
    DROP TABLE educator_student_map;
GO

-- 9. student_profile
IF EXISTS (SELECT * FROM sysobjects WHERE name='student_profile' AND xtype='U')
    DROP TABLE student_profile;
GO

-- 10. educator_profile
IF EXISTS (SELECT * FROM sysobjects WHERE name='educator_profile' AND xtype='U')
    DROP TABLE educator_profile;
GO

-- 11. admin_profile
IF EXISTS (SELECT * FROM sysobjects WHERE name='admin_profile' AND xtype='U')
    DROP TABLE admin_profile;
GO

-- 12. questions (old generic table — replaced by new questions table)
--  WARNING: only drop if the NEW questions table already exists.
IF EXISTS (SELECT * FROM sysobjects WHERE name='questions' AND xtype='U')
  AND EXISTS (SELECT * FROM sys.columns WHERE object_id=OBJECT_ID('questions') AND name='hint_text')
  -- if hint_text column exists, the table is already the new one — skip
    PRINT 'questions table already migrated, skipping drop.';
ELSE IF EXISTS (SELECT * FROM sysobjects WHERE name='questions' AND xtype='U')
    DROP TABLE questions;
GO

-- 13. roles (role is now a CHECK constraint on users.role column)
IF EXISTS (SELECT * FROM sysobjects WHERE name='roles' AND xtype='U')
BEGIN
    -- Remove FK if any
    DECLARE @fk NVARCHAR(255);
    SELECT @fk = fk.name FROM sys.foreign_keys fk
    JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
    JOIN sys.columns c ON fkc.parent_object_id = c.object_id AND fkc.parent_column_id = c.column_id
    WHERE OBJECT_NAME(fkc.parent_object_id) = 'users' AND c.name = 'role';
    IF @fk IS NOT NULL
        EXEC('ALTER TABLE users DROP CONSTRAINT ' + @fk);
    DROP TABLE roles;
END
GO

-- 14. Old answers table (replaced by user_answers)
--  Only drop if user_answers already exists and answers is the old schema
IF EXISTS (SELECT * FROM sysobjects WHERE name='answers' AND xtype='U')
  AND NOT EXISTS (SELECT * FROM sys.columns WHERE object_id=OBJECT_ID('answers') AND name='hint_used')
BEGIN
    -- Migrate existing answers to user_answers if possible
    -- (Skipped here; run mathgameapp_schema.sql to create user_answers first)
    PRINT 'Old answers table found. After running mathgameapp_schema.sql, run this to drop it:';
    PRINT 'DROP TABLE answers;';
END
GO

PRINT 'Drop-unused-tables migration complete.';
GO
