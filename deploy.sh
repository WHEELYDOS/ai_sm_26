#!/bin/bash
# AshaCare Deployment Script for Amazon Linux 2023

set -e # Exit on error

echo "🚀 Starting Deployment on Amazon Linux 2023..."

# 1. Update System
echo "📦 Updating system packages..."
sudo dnf update -y
sudo dnf install -y python3 python3-pip git

# 2. Setup Python Environment
echo "🐍 Setting up Python environment..."
# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

# Activate venv
source venv/bin/activate

# 3. Install Dependencies
echo "📥 Installing dependencies..."
if [ -f "backend/requirements.txt" ]; then
    pip3 install -r backend/requirements.txt
else
    echo "⚠️ backend/requirements.txt not found! Installing flask manually..."
    pip3 install flask flask-cors flask-jwt-extended
fi

# Install gunicorn for production server
pip3 install gunicorn

# 4. Create Systemd Service
echo "⚙️ Configuring systemd service..."

# Get current directory and user
APP_DIR=$(pwd)
USER_NAME=$(whoami)

# Create service file content
SERVICE_CONTENT="[Unit]
Description=AshaCare Flask App
After=network.target

[Service]
User=$USER_NAME
Group=$USER_NAME
WorkingDirectory=$APP_DIR
Environment=\"PATH=$APP_DIR/venv/bin\"
ExecStart=$APP_DIR/venv/bin/gunicorn --workers 3 --bind 0.0.0.0:5000 --chdir backend app:app
Restart=always

[Install]
WantedBy=multi-user.target"

# Write service file with sudo
echo "$SERVICE_CONTENT" | sudo tee /etc/systemd/system/ashacare.service

# 5. Run Database Migration
echo "🔧 Running database migration..."
if [ -f "migrate.py" ]; then
    python3 migrate.py
fi

# 6. Start Application
echo "🚀 Starting the application..."
sudo systemctl daemon-reload
sudo systemctl enable ashacare
sudo systemctl restart ashacare

# 6. Status Check
sleep 2
SERVICE_STATUS=$(sudo systemctl is-active ashacare)

if [ "$SERVICE_STATUS" = "active" ]; then
    echo "✅ Deployment Successful!"
    
    # Try to get public IP using IMDSv2 (Amazon standard) or fallback
    TOKEN=`curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600" 2>/dev/null`
    if [ -n "$TOKEN" ]; then
        PUBLIC_IP=$(curl -H "X-aws-ec2-metadata-token: $TOKEN" -s http://169.254.169.254/latest/meta-data/public-ipv4)
    else
        PUBLIC_IP=$(curl -s ifconfig.me)
    fi
    
    echo "🌍 App is running at: http://$PUBLIC_IP:5000"
else
    echo "❌ Service failed to start. Check logs with: sudo journalctl -u ashacare -n 50"
    exit 1
fi
