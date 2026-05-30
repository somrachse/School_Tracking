const mysql = require('mysql2');

const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || 'Somrach123',
    database: process.env.DB_DATABASE || 'school_pack_tracker',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000,
});

db.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Local MySQL Connection Error:', err.code, err.message);
    } else {
        console.log('✅ Connected to Local MySQL!');
        connection.release();
    }
});

const query = (sql, params = []) =>
    new Promise((resolve, reject) => {
        db.query(sql, params, (err, result) => {
            if (err) reject(err);
            else resolve(result);
        });
    });

module.exports = { db, query };
