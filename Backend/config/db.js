const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 4000, // TiDB Cloud always uses 4000
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    connectTimeout: 10000, // Wait 10 seconds before giving up
    ssl: {
        ca: fs.readFileSync(path.join(__dirname, '..', process.env.DB_CA_PATH)),
        rejectUnauthorized: true
    }
});

db.connect((err) => {
    if (err) {
        console.error('❌ Connection Error:', err.code, err.message);
    } else {
        console.log('✅ Connected to TiDB Cloud!');
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
