-- ============================================================
--  MathGameApp - Migration: Rename tables to match ERD names
--  Run this ONCE on an existing database that was created
--  with the old schema (before ERD alignment).
--
--  Old name                -> New name (ERD)
--  ──────────────────────────────────────────
--  educator_students       -> educator_student_map
--  game_modes              -> game_mode
--  difficulty_levels       -> difficulty_level
-- ============================================================

USE mathgameapp;
GO

-- 1. educator_students -> educator_student_map
IF EXISTS (SELECT * FROM sysobjects WHERE name='educator_students' AND xtype='U')
   AND NOT EXISTS (SELECT * FROM sysobjects WHERE name='educator_student_map' AND xtype='U')
BEGIN
    -- Drop existing FK constraints on educator_students before renaming
    DECLARE @sql NVARCHAR(MAX) = '';
    SELECT @sql += 'ALTER TABLE educator_students DROP CONSTRAINT ' + QUOTENAME(name) + '; '
    FROM sys.foreign_keys
    WHERE parent_object_id = OBJECT_ID('educator_students');
    IF LEN(@sql) > 0 EXEC sp_executesql @sql;

    EXEC sp_rename 'educator_students', 'educator_student_map';
    PRINT 'Renamed: educator_students -> educator_student_map';

    -- Re-add FK constraints
    ALTER TABLE educator_student_map
        ADD CONSTRAINT FK_esmap_educator FOREIGN KEY (educator_id) REFERENCES users(user_id),
            CONSTRAINT FK_esmap_student  FOREIGN KEY (student_id)  REFERENCES users(user_id);

    -- Add map_id primary key if it was a composite PK before
    IF NOT EXISTS (
        SELECT * FROM sys.columns
        WHERE object_id = OBJECT_ID('educator_student_map') AND name = 'map_id'
    )
    BEGIN
        ALTER TABLE educator_student_map DROP CONSTRAINT PK_educator_students;
        ALTER TABLE educator_student_map ADD map_id INT IDENTITY(1,1) NOT NULL;
        ALTER TABLE educator_student_map ADD CONSTRAINT PK_educator_student_map PRIMARY KEY (map_id);
        ALTER TABLE educator_student_map ADD CONSTRAINT UQ_educator_student UNIQUE (educator_id, student_id);
    END
END
GO

-- 2. game_modes -> game_mode
IF EXISTS (SELECT * FROM sysobjects WHERE name='game_modes' AND xtype='U')
   AND NOT EXISTS (SELECT * FROM sysobjects WHERE name='game_mode' AND xtype='U')
BEGIN
    EXEC sp_rename 'game_modes', 'game_mode';
    PRINT 'Renamed: game_modes -> game_mode';
END
GO

-- 3. difficulty_levels -> difficulty_level
IF EXISTS (SELECT * FROM sysobjects WHERE name='difficulty_levels' AND xtype='U')
   AND NOT EXISTS (SELECT * FROM sysobjects WHERE name='difficulty_level' AND xtype='U')
BEGIN
    EXEC sp_rename 'difficulty_levels', 'difficulty_level';
    PRINT 'Renamed: difficulty_levels -> difficulty_level';
END
GO

PRINT 'Migration complete. Table names now match the ERD.';
GO

-- ============================================================
-- Migration: Add hint_text to custom_questions (if not exists)
-- Run this if upgrading from an older schema version
-- ============================================================
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'custom_questions' AND COLUMN_NAME = 'hint_text'
)
BEGIN
    ALTER TABLE custom_questions ADD hint_text NVARCHAR(300) NOT NULL DEFAULT '';
END
GO

-- Migration: Create consolidated profiles table (replaces student_profile, educator_profile, admin_profile)
-- Only run if old tables still exist
IF EXISTS (SELECT * FROM sysobjects WHERE name='student_profile' AND xtype='U')
AND NOT EXISTS (SELECT * FROM sysobjects WHERE name='profiles' AND xtype='U')
BEGIN
    CREATE TABLE profiles (
        profile_id    INT           IDENTITY(1,1) PRIMARY KEY,
        user_id       INT           NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
        grade_level   VARCHAR(50)   NULL,
        school_name   VARCHAR(100)  NULL,
        institution   VARCHAR(100)  NULL,
        department    VARCHAR(100)  NULL,
        created_at    DATETIME      NOT NULL DEFAULT GETDATE()
    );
    INSERT INTO profiles (user_id, grade_level, school_name, created_at)
        SELECT user_id, grade_level, school_name, created_at FROM student_profile;
    INSERT INTO profiles (user_id, institution, department, created_at)
        SELECT ep.user_id, ep.institution, ep.department, ep.created_at
        FROM educator_profile ep
        WHERE ep.user_id NOT IN (SELECT user_id FROM profiles);
END
GO

-- Migration: Merge admin_activity_log into audit_log (if old table exists)
IF EXISTS (SELECT * FROM sysobjects WHERE name='admin_activity_log' AND xtype='U')
BEGIN
    INSERT INTO audit_log (actor_id, action_type, description, target_user_id, logged_at)
        SELECT admin_id, action_type, description, target_user_id, logged_at
        FROM admin_activity_log;
END
GO
