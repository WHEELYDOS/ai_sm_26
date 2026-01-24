#!/bin/bash

# AshaCare Simple Deployment Script
# Run this on your Ubuntu EC2 instance

set -e # Exit on error

echo "🚀 Starting Deployment..."

# 1. Update System
echo "📦 Updating system packages..."
sudo apt-get update -y
sudo apt-get install -y python3-pip python3-venv

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
    pip install -r backend/requirements.txt
else
    echo "⚠️ backend/requirements.txt not found! Installing flask manually..."
    pip install flask flask-cors flask-jwt-extended
fi

# Install gunicorn for production server
pip install gunicorn

# 4. Create Systemd Service
echo "⚙️ Configuring systemd service..."

# Get current directory
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

# 5. Start Application
echo "🚀 Starting the application..."
sudo systemctl daemon-reload
sudo systemctl enable ashacare
sudo systemctl restart ashacare

# 6. Status Check
sleep 2
SERVICE_STATUS=$(sudo systemctl is-active ashacare)

if [ "$SERVICE_STATUS" = "active" ]; then
    echo "✅ Deployment Successful!"
    echo "🌍 App is running at: http://$(curl -s ifconfig.me):5000"
else
    echo "❌ Service failed to start. Check logs with: sudo journalctl -u ashacare"
    exit 1
fi
