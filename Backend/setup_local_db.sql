-- ============================================================
-- School Pack Tracker – Local MySQL Setup Script
-- Run with: mysql -u root -p < setup_local_db.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS school_pack_tracker
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE school_pack_tracker;

-- ── Ministries ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ministries (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    is_active   TINYINT(1) NOT NULL DEFAULT 1,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_ministry_name (name)
) ENGINE=InnoDB;

-- ── Churches ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS churches (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    location    VARCHAR(255),
    is_active   TINYINT(1) NOT NULL DEFAULT 1,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_church_name (name)
) ENGINE=InnoDB;

-- ── Students ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id          VARCHAR(20) NOT NULL,
    name                VARCHAR(255) NOT NULL,
    date_of_birth       DATE,
    gender              VARCHAR(20),
    grade               TINYINT UNSIGNED,
    school_name         VARCHAR(255),
    phone_number        VARCHAR(30),
    ministry_id         INT UNSIGNED,
    church_id           INT UNSIGNED,
    address             TEXT,
    future_dream        TEXT,
    role_position       VARCHAR(100),
    date_of_conversion  DATE,
    date_of_baptism     DATE,
    fathers_name        VARCHAR(255),
    fathers_phone       VARCHAR(30),
    mothers_name        VARCHAR(255),
    mothers_phone       VARCHAR(30),
    guardian_name       VARCHAR(255),
    guardian_phone      VARCHAR(30),
    pack_history_year   SMALLINT UNSIGNED,
    -- R2 stores the full public URL (e.g. https://pub-xxx.r2.dev/students/uuid.jpg)
    photo_path          TEXT,
    is_active           TINYINT(1) NOT NULL DEFAULT 1,
    created_by          VARCHAR(100),
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_student_id (student_id),
    FOREIGN KEY (ministry_id) REFERENCES ministries(id) ON DELETE SET NULL,
    FOREIGN KEY (church_id)   REFERENCES churches(id)   ON DELETE SET NULL
) ENGINE=InnoDB;

-- ── Pack Distributions ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS pack_distributions (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id      INT UNSIGNED NOT NULL,
    year            SMALLINT UNSIGNED NOT NULL,
    bag_given       TINYINT(1) NOT NULL DEFAULT 0,
    uniforms_given  TINYINT(1) NOT NULL DEFAULT 0,
    books_given     TINYINT(1) NOT NULL DEFAULT 0,
    notes           TEXT,
    distributed_by  VARCHAR(100),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Deleted Students Log ────────────────────────────────────
CREATE TABLE IF NOT EXISTS deleted_students_log (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id    INT UNSIGNED,
    student_name  VARCHAR(255),
    deleted_by    VARCHAR(100),
    snapshot_json LONGTEXT,
    deleted_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

SELECT 'Database setup complete! Tables created in school_pack_tracker.' AS status;
