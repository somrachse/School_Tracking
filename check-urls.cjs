const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ Connected to Server via SSH');
  
  const commands = [
    'mysql -u root -pSomrach123 school_pack_tracker -e "SELECT name, photo_path FROM students WHERE photo_path IS NOT NULL LIMIT 5;"'
  ];

  conn.exec(commands.join(' && '), (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
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
