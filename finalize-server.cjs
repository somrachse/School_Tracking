const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();

const envContent = `# ── Local MySQL ──────────────────────────────────────────
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=Somrach123
DB_DATABASE=school_pack_tracker

# ── Cloudflare R2 ─────────────────────────────────────────
R2_ACCOUNT_ID=b13fd185a4e39a4f8c1ce2b8b6c93f43
R2_ACCESS_KEY_ID=5592880f3862e6baaa30863cbc0423a5
R2_SECRET_ACCESS_KEY=ac8fcd544d9cef9aaa5bec6be6ca3f193be1d81825ac501bb4e78c6dd52868e9
R2_BUCKET_NAME=schoolpack-storage
R2_PUBLIC_URL=https://schoolpack.online/schoolpack-storage
`;

conn.on('ready', () => {
  console.log('✅ Connected to Server via SSH');
  
  // First, upload the .env file using SFTP
  conn.sftp((err, sftp) => {
    if (err) throw err;
    
    const writeStream = sftp.createWriteStream('/var/www/school-pack-tracker/Backend/.env');
    writeStream.write(envContent);
    writeStream.end();
    
    writeStream.on('close', () => {
      console.log('✅ .env file uploaded');
      
      const commands = [
        // 1. Setup MySQL Password and Database
        'mysql -e "ALTER USER \\"root\\"@\\"localhost\\" IDENTIFIED WITH mysql_native_password BY \\"Somrach123\\"; FLUSH PRIVILEGES;"',
        'mysql -u root -pSomrach123 -e "CREATE DATABASE IF NOT EXISTS school_pack_tracker;"',
        'mysql -u root -pSomrach123 school_pack_tracker < /var/www/school-pack-tracker/Backend/setup_local_db.sql',
        
        // 2. Install and Start Backend
        'cd /var/www/school-pack-tracker/Backend && npm install && pm2 start server.js --name "backend-api" || pm2 restart backend-api',
        'pm2 save',
        
        // 3. Setup SSL (Assuming DNS is pointed)
        'certbot --nginx -d schoolpack.online -d www.schoolpack.online -n --agree-tos -m admin@schoolpack.online'
      ];

      conn.exec(commands.join(' && '), (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
          console.log(`\n\n✅ Done with code: ${code}`);
          conn.end();
          process.exit(0);
        }).on('data', (data) => {
          process.stdout.write(data.toString());
        }).stderr.on('data', (data) => {
          process.stderr.write(data.toString());
        });
      });
    });
  });
}).on('error', (err) => {
  console.error('❌ SSH Error:', err.message);
  process.exit(1);
}).connect({
  host: '165.245.182.175',
  port: 22,
  username: 'root',
  password: 'School2026$$Pack',
  readyTimeout: 99999
});
