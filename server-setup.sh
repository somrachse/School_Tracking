#!/bin/bash
# ==============================================================================
# Server Provisioning Script for Ubuntu 22.04 / 24.04
# Run as root user:
#   wget https://raw.githubusercontent.com/somrachse/School_Tracking/main/server-setup.sh
#   bash server-setup.sh
# ==============================================================================

set -e

echo "🚀 Starting server provisioning..."

# 1. Update and Upgrade
apt-get update
apt-get upgrade -y

# 2. Install Node.js (v20) and NPM
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
echo "✅ Node.js installed: $(node -v)"

# 3. Install PM2 globally
npm install -g pm2
echo "✅ PM2 installed: $(pm2 -v)"

# 4. Install Nginx and Certbot
apt-get install -y nginx certbot python3-certbot-nginx
systemctl enable nginx
echo "✅ Nginx and Certbot installed"

# 5. Install MySQL Server
apt-get install -y mysql-server
systemctl enable mysql
systemctl start mysql
echo "✅ MySQL installed"

# 6. Create Directory for App
mkdir -p /var/www/school-pack-tracker
chown -R $USER:$USER /var/www/school-pack-tracker
echo "✅ Directory created: /var/www/school-pack-tracker"

# 7. Configure Nginx for schooltracking.online
cat > /etc/nginx/sites-available/schooltracking.online << 'EOF'
server {
    listen 80;
    server_name schooltracking.online www.schooltracking.online;

    # Serve the React Frontend
    root /var/www/school-pack-tracker/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to the Node.js Backend
    location /api/ {
        rewrite ^/api/(.*)$ /$1 break;
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Enable site and remove default
ln -sf /etc/nginx/sites-available/schooltracking.online /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
echo "✅ Nginx configured for schooltracking.online"

# 8. Set up SSH Keys for GitHub Actions
# If the root user does not have a key, generate one
if [ ! -f ~/.ssh/id_rsa ]; then
    ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""
    cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys
    chmod 600 ~/.ssh/authorized_keys
fi

echo ""
echo "================================================================================"
echo "🎉 PROVISIONING COMPLETE!"
echo ""
echo "IMPORTANT NEXT STEPS:"
echo "1. Configure MySQL Database:"
echo "   Run: mysql"
echo "   Inside MySQL, run: ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'YourNewPassword';"
echo "   Then run: mysql_secure_installation"
echo ""
echo "2. Clone Repository & Setup .env:"
echo "   git clone https://github.com/somrachse/School_Tracking.git /var/www/school-pack-tracker"
echo "   cd /var/www/school-pack-tracker/Backend"
echo "   cp .env.example .env (and fill in DB and R2 credentials)"
echo "   mysql -u root -p < setup_local_db.sql"
echo ""
echo "3. Issue SSL Certificate (After DNS propagates):"
echo "   certbot --nginx -d schooltracking.online -d www.schooltracking.online"
echo ""
echo "4. Add this Private Key to GitHub Secrets as SSH_PRIVATE_KEY:"
echo "--------------------------------------------------------------------------------"
cat ~/.ssh/id_rsa
echo "--------------------------------------------------------------------------------"
echo "Also add SERVER_IP (165.245.182.175) and SSH_USERNAME (root) to GitHub Secrets."
echo "================================================================================"
