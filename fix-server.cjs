const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ Connected to Server via SSH');
  
  const commands = [
    'ufw allow 80/tcp',
    'ufw allow 443/tcp',
    'ufw allow 22/tcp',
    'ufw --force enable',
    'ufw status',
    'systemctl status nginx --no-pager',
    // Let's also set up the actual app code so it shows up!
    'cd /var/www/school-pack-tracker && git clone https://github.com/somrachse/School_Tracking.git . || echo "Repo already exists"',
    'cd /var/www/school-pack-tracker && npm install && npm run build',
    'systemctl restart nginx'
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
