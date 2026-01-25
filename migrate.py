#!/usr/bin/env python3
"""
Database Migration Script for AshaCare
Run this after deploying to add the role column
"""
import sqlite3
import os
from werkzeug.security import generate_password_hash

# Try multiple possible database locations
script_dir = os.path.dirname(os.path.abspath(__file__))
possible_paths = [
    os.path.join(script_dir, 'instance', 'ashacare.db'),
    os.path.join(script_dir, 'backend', 'instance', 'ashacare.db'),
    '/home/ec2-user/ai_sm/ai_sm_26/instance/ashacare.db',
    '/home/ec2-user/ai_sm/ai_sm_26/backend/instance/ashacare.db',
]

db_path = None
for path in possible_paths:
    if os.path.exists(path):
        db_path = path
        break

if not db_path:
    print(f"❌ Database not found in any of these locations:")
    for p in possible_paths:
        print(f"   - {p}")
    print("\n💡 The database will be created when Flask starts. Restart the service and try again.")
    exit(0)

print(f"📂 Found database at: {db_path}")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check if role column exists
cursor.execute("PRAGMA table_info(users)")
columns = [col[1] for col in cursor.fetchall()]

if 'role' not in columns:
    print("➕ Adding 'role' column to users table...")
    cursor.execute("ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'asha'")
    conn.commit()
    print("✅ Added role column")
else:
    print("✅ Role column already exists")

# Create or update admin user
cursor.execute("SELECT id FROM users WHERE username = 'admin'")
admin = cursor.fetchone()

if not admin:
    print("➕ Creating admin user...")
    password_hash = generate_password_hash('admin')
    cursor.execute("""
        INSERT INTO users (username, email, password_hash, full_name, role)
        VALUES (?, ?, ?, ?, ?)
    """, ('admin', 'admin@ashacare.com', password_hash, 'Administrator', 'admin'))
    conn.commit()
    print("✅ Admin user created (username: admin, password: admin)")
else:
    print("➕ Updating existing admin user role...")
    cursor.execute("UPDATE users SET role = 'admin' WHERE username = 'admin'")
    conn.commit()
    print("✅ Admin role updated")

conn.close()
print("\n🎉 Migration complete! Restart the service: sudo systemctl restart ashacare")
