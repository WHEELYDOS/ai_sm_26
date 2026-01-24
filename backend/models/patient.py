# Patient model
import uuid
from datetime import datetime
from . import db


class Patient(db.Model):
    """Patient model with comprehensive health information"""
    __tablename__ = 'patients'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_uid = db.Column(db.String(20), unique=True, nullable=False, index=True)
    
    # Personal Information
    first_name = db.Column(db.String(80), nullable=False)
    last_name = db.Column(db.String(80), nullable=False)
    age = db.Column(db.Integer, nullable=False)
    gender = db.Column(db.String(20), nullable=False)
    contact = db.Column(db.String(20))
    address = db.Column(db.Text)
    
    # Physical Information
    height = db.Column(db.Float)  # in cm
    weight = db.Column(db.Float)  # in kg
    blood_group = db.Column(db.String(10))
    
    # Pregnancy Information (for female patients)
    pregnancy_status = db.Column(db.Boolean, default=False)
    last_menstrual_date = db.Column(db.Date)
    expected_delivery_date = db.Column(db.Date)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Sync status for offline functionality
    sync_status = db.Column(db.String(20), default='synced')  # pending, synced, conflict
    local_id = db.Column(db.String(50))  # For matching with IndexedDB records
    
    # Foreign key
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # Relationships
    records = db.relationship('MedicalRecord', backref='patient', lazy='dynamic', cascade='all, delete-orphan')
    reminders = db.relationship('Reminder', backref='patient', lazy='dynamic', cascade='all, delete-orphan')
    
    @staticmethod
    def generate_uid():
        """Generate unique patient ID"""
        return 'ASHA-' + str(uuid.uuid4())[:8].upper()
    
    def calculate_bmi(self):
        """Calculate BMI if height and weight available"""
        if self.height and self.weight and self.height > 0:
            height_m = self.height / 100
            return round(self.weight / (height_m * height_m), 1)
        return None
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'patient_uid': self.patient_uid,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': f"{self.first_name} {self.last_name}",
            'age': self.age,
            'gender': self.gender,
            'contact': self.contact,
            'address': self.address,
            'height': self.height,
            'weight': self.weight,
            'bmi': self.calculate_bmi(),
            'blood_group': self.blood_group,
            'pregnancy_status': self.pregnancy_status,
            'last_menstrual_date': self.last_menstrual_date.isoformat() if self.last_menstrual_date else None,
            'expected_delivery_date': self.expected_delivery_date.isoformat() if self.expected_delivery_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'sync_status': self.sync_status,
            'created_by': self.created_by
        }
