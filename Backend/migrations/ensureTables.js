const { query } = require('../config/db');

async function ensureStudentDocumentsTable() {
    const sql = `
    CREATE TABLE IF NOT EXISTS student_documents (
        id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        student_id  INT UNSIGNED NOT NULL,
        name        VARCHAR(255) NOT NULL,
        url         TEXT NOT NULL,
        created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
    `;
    try {
        await query(sql);
        console.log('✅ Ensured student_documents table exists');
    } catch (err) {
        console.error('❌ Failed to ensure student_documents table:', err && err.message ? err.message : err);
        throw err;
    }
}

async function runMigrations() {
    await ensureStudentDocumentsTable();
}

module.exports = { runMigrations };
