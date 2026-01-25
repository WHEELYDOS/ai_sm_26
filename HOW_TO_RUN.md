# 🏥 AshaCare - How to Run

This guide covers how to run the AshaCare application locally and deploy it to production (AWS EC2).

---

## 📋 Prerequisites

- **Python 3.10+** installed
- **pip** (Python package manager)
- **Git** (for cloning the repository)

---

## 🖥️ Local Development

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd AshaCarePackage
```

### 2. Create Virtual Environment

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**Linux/Mac:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r backend/requirements.txt
```

### 4. Run Database Migration (Optional)

```bash
python migrate.py
```

### 5. Start the Development Server

```bash
cd backend
python app.py
```

The app will be available at: **http://localhost:5000**

---

## 🌐 Application URLs

| Page       | URL                           |
|------------|-------------------------------|
| Login      | http://localhost:5000/        |
| Main App   | http://localhost:5000/app     |
| Admin      | http://localhost:5000/admin   |
| Health API | http://localhost:5000/api/health |

---

## 🚀 Production Deployment (AWS EC2)

### Quick Deploy (Amazon Linux 2023)

1. **SSH into your EC2 instance**

2. **Clone or upload the project**
   ```bash
   git clone <your-repo-url>
   cd AshaCarePackage
   ```

3. **Run the deployment script**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

The script will:
- ✅ Update system packages
- ✅ Set up Python virtual environment
- ✅ Install all dependencies
- ✅ Run database migrations
- ✅ Configure systemd service
- ✅ Start the application with Gunicorn

### Managing the Service

```bash
# Check status
sudo systemctl status ashacare

# View logs
sudo journalctl -u ashacare -n 50

# Restart service
sudo systemctl restart ashacare

# Stop service
sudo systemctl stop ashacare
```

---

## 🔧 Environment Variables

| Variable    | Default       | Description            |
|-------------|---------------|------------------------|
| `FLASK_ENV` | `development` | Environment mode       |
| `PORT`      | `5000`        | Server port            |

---

## 📦 Dependencies

The main dependencies are listed in `backend/requirements.txt`:

- Flask 3.0.0
- Flask-JWT-Extended 4.6.0
- Flask-CORS 4.0.0
- Flask-SQLAlchemy 3.1.1
- scikit-learn 1.3.2
- pandas 2.1.3
- numpy 1.26.2

---

## ❓ Troubleshooting

### Port Already in Use
```bash
# Kill process on port 5000 (Windows)
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Kill process on port 5000 (Linux)
sudo lsof -i :5000
kill -9 <PID>
```

### Module Not Found
Make sure your virtual environment is activated and dependencies are installed:
```bash
pip install -r backend/requirements.txt
```

### Database Issues
Run the migration script:
```bash
python migrate.py
```

---

## � Patient Categories

AshaCare supports different patient categories with specialized fields:

| Type | Icon | Name Fields | Default Age Unit |
|------|------|-------------|------------------|
| **Adult** | 👤 | First + Last Name | Years |
| **Child** | 👶 | First + Last Name | Months |
| **Newborn** | 🍼 | Father + Mother Name | Days |
| **Pregnant** | 🤰 | First + Last Name | Years |

### Newborn Registration
- Newborns are registered using **parent names** instead of baby's name
- They appear in the patient list as "Baby of [Father's Name]"
- Age is tracked in **days** by default

---

## �📞 Support

For issues or questions, please open an issue in the repository.
