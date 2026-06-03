const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ Connected to Server via SSH');
  
  const commands = [
    // 1. Reset remote repository to match origin/main (to ensure latest commits are checked out)
    'cd /var/www/school-pack-tracker && git fetch origin && git reset --hard origin/main',
    
    // 2. Build Frontend
    'cd /var/www/school-pack-tracker && npm install && npm run build',
    
    // 3. Reload Nginx
    'systemctl reload nginx'
  ];

  console.log('🚀 Running deploy commands on remote server...');
  
  conn.exec(commands.join(' && '), (err, stream) => {
    if (err) {
      console.error('❌ Exec Error:', err.message);
      conn.end();
      process.exit(1);
    }
    
    stream.on('close', (code, signal) => {
      console.log(`\n\n✅ Remote setup finished with code: ${code}`);
      conn.end();
      process.exit(code === 0 ? 0 : 1);
    }).on('data', (data) => {
      process.stdout.write(data.toString());
    }).stderr.on('data', (data) => {
      process.stderr.write(data.toString());
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
