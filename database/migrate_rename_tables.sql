-- ============================================================
--  MathGameApp - Legacy Table Rename Helper
--  This simplified schema keeps the active app model under 10 tables.
--  If upgrading from an older database, only legacy naming renames are preserved.
-- ============================================================

USE mathgameapp;
GO

-- Rename old educator_students table if present
IF EXISTS (SELECT * FROM sysobjects WHERE name='educator_students' AND xtype='U')
   AND NOT EXISTS (SELECT * FROM sysobjects WHERE name='educator_student_map' AND xtype='U')
BEGIN
    DECLARE @sql NVARCHAR(MAX) = '';
    SELECT @sql += 'ALTER TABLE educator_students DROP CONSTRAINT ' + QUOTENAME(name) + '; '
    FROM sys.foreign_keys
    WHERE parent_object_id = OBJECT_ID('educator_students');
    IF LEN(@sql) > 0 EXEC sp_executesql @sql;

    EXEC sp_rename 'educator_students', 'educator_student_map';
    PRINT 'Renamed: educator_students -> educator_student_map';

    ALTER TABLE educator_student_map
        ADD CONSTRAINT FK_esmap_educator FOREIGN KEY (educator_id) REFERENCES users(user_id),
            CONSTRAINT FK_esmap_student FOREIGN KEY (student_id) REFERENCES users(user_id);
END
GO

-- Rename old game_modes table if present
IF EXISTS (SELECT * FROM sysobjects WHERE name='game_modes' AND xtype='U')
   AND NOT EXISTS (SELECT * FROM sysobjects WHERE name='game_mode' AND xtype='U')
BEGIN
    EXEC sp_rename 'game_modes', 'game_mode';
    PRINT 'Renamed: game_modes -> game_mode';
END
GO

-- Rename old difficulty_levels table if present
IF EXISTS (SELECT * FROM sysobjects WHERE name='difficulty_levels' AND xtype='U')
   AND NOT EXISTS (SELECT * FROM sysobjects WHERE name='difficulty_level' AND xtype='U')
BEGIN
    EXEC sp_rename 'difficulty_levels', 'difficulty_level';
    PRINT 'Renamed: difficulty_levels -> difficulty_level';
END
GO

PRINT 'Legacy rename helper complete. Deprecated profile/achievement tables are not migrated automatically.';
GO
