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

-- ============================================================
-- Additional safe renames (create backups then rename)
-- Each block: create a *_backup table, then execute sp_rename if target doesn't exist
-- ============================================================

-- Helper: safely backup a table (drop existing backup first)
-- Usage: replace <old> with table name

-- Rename: sessions -> session
IF EXISTS (SELECT * FROM sysobjects WHERE name='sessions' AND xtype='U')
   AND NOT EXISTS (SELECT * FROM sysobjects WHERE name='session' AND xtype='U')
BEGIN
    IF OBJECT_ID('dbo.sessions_backup','U') IS NOT NULL DROP TABLE dbo.sessions_backup;
    SELECT * INTO dbo.sessions_backup FROM dbo.sessions;
    EXEC sp_rename 'sessions', 'session';
    PRINT 'Renamed: sessions -> session (backup: sessions_backup)';
END
GO

-- Rename: answers -> answer
IF EXISTS (SELECT * FROM sysobjects WHERE name='answers' AND xtype='U')
   AND NOT EXISTS (SELECT * FROM sysobjects WHERE name='answer' AND xtype='U')
BEGIN
    IF OBJECT_ID('dbo.answers_backup','U') IS NOT NULL DROP TABLE dbo.answers_backup;
    SELECT * INTO dbo.answers_backup FROM dbo.answers;
    EXEC sp_rename 'answers', 'answer';
    PRINT 'Renamed: answers -> answer (backup: answers_backup)';
END
GO

-- Rename: users -> user (SQL Server reserved word handled via brackets in queries)
IF EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
   AND NOT EXISTS (SELECT * FROM sysobjects WHERE name='user' AND xtype='U')
BEGIN
    IF OBJECT_ID('dbo.users_backup','U') IS NOT NULL DROP TABLE dbo.users_backup;
    SELECT * INTO dbo.users_backup FROM dbo.users;
    EXEC sp_rename 'users', 'user';
    PRINT 'Renamed: users -> user (backup: users_backup)';
END
GO

-- Rename: custom_questions -> custom_question
IF EXISTS (SELECT * FROM sysobjects WHERE name='custom_questions' AND xtype='U')
   AND NOT EXISTS (SELECT * FROM sysobjects WHERE name='custom_question' AND xtype='U')
BEGIN
    IF OBJECT_ID('dbo.custom_questions_backup','U') IS NOT NULL DROP TABLE dbo.custom_questions_backup;
    SELECT * INTO dbo.custom_questions_backup FROM dbo.custom_questions;
    EXEC sp_rename 'custom_questions', 'custom_question';
    PRINT 'Renamed: custom_questions -> custom_question (backup: custom_questions_backup)';
END
GO

-- Rename: questions -> question
IF EXISTS (SELECT * FROM sysobjects WHERE name='questions' AND xtype='U')
   AND NOT EXISTS (SELECT * FROM sysobjects WHERE name='question' AND xtype='U')
BEGIN
    IF OBJECT_ID('dbo.questions_backup','U') IS NOT NULL DROP TABLE dbo.questions_backup;
    SELECT * INTO dbo.questions_backup FROM dbo.questions;
    EXEC sp_rename 'questions', 'question';
    PRINT 'Renamed: questions -> question (backup: questions_backup)';
END
GO

-- Rename: user_answers -> user_answer
IF EXISTS (SELECT * FROM sysobjects WHERE name='user_answers' AND xtype='U')
   AND NOT EXISTS (SELECT * FROM sysobjects WHERE name='user_answer' AND xtype='U')
BEGIN
    IF OBJECT_ID('dbo.user_answers_backup','U') IS NOT NULL DROP TABLE dbo.user_answers_backup;
    SELECT * INTO dbo.user_answers_backup FROM dbo.user_answers;
    EXEC sp_rename 'user_answers', 'user_answer';
    PRINT 'Renamed: user_answers -> user_answer (backup: user_answers_backup)';
END
GO

-- Rename: leaderboard_snapshots -> leaderboard_snapshot
IF EXISTS (SELECT * FROM sysobjects WHERE name='leaderboard_snapshots' AND xtype='U')
   AND NOT EXISTS (SELECT * FROM sysobjects WHERE name='leaderboard_snapshot' AND xtype='U')
BEGIN
    IF OBJECT_ID('dbo.leaderboard_snapshots_backup','U') IS NOT NULL DROP TABLE dbo.leaderboard_snapshots_backup;
    SELECT * INTO dbo.leaderboard_snapshots_backup FROM dbo.leaderboard_snapshots;
    EXEC sp_rename 'leaderboard_snapshots', 'leaderboard_snapshot';
    PRINT 'Renamed: leaderboard_snapshots -> leaderboard_snapshot (backup: leaderboard_snapshots_backup)';
END
GO

-- Rename: notifications_snapshot -> notification_snapshot
IF EXISTS (SELECT * FROM sysobjects WHERE name='notifications_snapshot' AND xtype='U')
   AND NOT EXISTS (SELECT * FROM sysobjects WHERE name='notification_snapshot' AND xtype='U')
BEGIN
    IF OBJECT_ID('dbo.notifications_snapshot_backup','U') IS NOT NULL DROP TABLE dbo.notifications_snapshot_backup;
    SELECT * INTO dbo.notifications_snapshot_backup FROM dbo.notifications_snapshot;
    EXEC sp_rename 'notifications_snapshot', 'notification_snapshot';
    PRINT 'Renamed: notifications_snapshot -> notification_snapshot (backup: notifications_snapshot_backup)';
END
GO

-- Rename: user_achievements -> user_achievement
IF EXISTS (SELECT * FROM sysobjects WHERE name='user_achievements' AND xtype='U')
   AND NOT EXISTS (SELECT * FROM sysobjects WHERE name='user_achievement' AND xtype='U')
BEGIN
    IF OBJECT_ID('dbo.user_achievements_backup','U') IS NOT NULL DROP TABLE dbo.user_achievements_backup;
    SELECT * INTO dbo.user_achievements_backup FROM dbo.user_achievements;
    EXEC sp_rename 'user_achievements', 'user_achievement';
    PRINT 'Renamed: user_achievements -> user_achievement (backup: user_achievements_backup)';
END
GO

PRINT 'Additional renames complete. Review backups (*_backup) before dropping.';
GO

/*
Rollback notes (manual):
To rollback a rename, run: EXEC sp_rename 'new_name','old_name';
Example: EXEC sp_rename 'user','users';
Be careful: if you created backup tables, you can restore by copying data back or renaming backups.
*/
