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
