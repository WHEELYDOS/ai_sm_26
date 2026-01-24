# Medical Record model
import json
from datetime import datetime
from . import db


class MedicalRecord(db.Model):
    """Medical record with disease prediction inputs"""
    __tablename__ = 'medical_records'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False, index=True)
    
    # Vital Signs
    bp_systolic = db.Column(db.Integer)   # mmHg
    bp_diastolic = db.Column(db.Integer)  # mmHg
    heart_rate = db.Column(db.Integer)    # bpm
    temperature = db.Column(db.Float)     # Celsius
    
    # Blood Work
    blood_sugar = db.Column(db.Integer)   # mg/dL
    hemoglobin = db.Column(db.Float)      # g/dL - Critical for anemia detection
    
    # Symptoms (for disease prediction)
    fever = db.Column(db.Boolean, default=False)
    cough = db.Column(db.Boolean, default=False)
    cough_duration = db.Column(db.Integer)  # days - TB risk indicator
    fatigue = db.Column(db.Boolean, default=False)
    weight_loss = db.Column(db.Boolean, default=False)
    night_sweats = db.Column(db.Boolean, default=False)
    breathlessness = db.Column(db.Boolean, default=False)
    headache = db.Column(db.Boolean, default=False)
    body_pain = db.Column(db.Boolean, default=False)
    
    # Additional symptoms as JSON array
    symptoms_list = db.Column(db.Text)  # JSON array of symptom strings
    
    # Diagnosis and Notes
    diagnosis = db.Column(db.Text)
    notes = db.Column(db.Text)
    
    # Vaccination History
    vaccination_history = db.Column(db.Text)  # JSON array
    
    # Risk Levels (computed)
    risk_level = db.Column(db.String(20))  # low, medium, high
    risk_factors = db.Column(db.Text)  # JSON array of risk factors
    
    # Timestamps
    record_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Sync
    sync_status = db.Column(db.String(20), default='synced')
    local_id = db.Column(db.String(50))
    
    # Created by
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    def get_symptoms_list(self):
        """Parse symptoms JSON"""
        if self.symptoms_list:
            try:
                return json.loads(self.symptoms_list)
            except:
                return []
        return []
    
    def set_symptoms_list(self, symptoms):
        """Set symptoms as JSON"""
        self.symptoms_list = json.dumps(symptoms)
    
    def calculate_alerts(self):
        """Calculate health alerts based on record data"""
        alerts = []
        
        # TB Risk: Fever + Cough for extended period
        if self.fever and self.cough and self.cough_duration and self.cough_duration > 14:
            alerts.append({
                'type': 'tb_risk',
                'severity': 'high',
                'message': 'TB Risk - Persistent cough with fever. Refer for testing.',
                'body_part': 'lungs'
            })
        
        # Anemia Risk: Low Hemoglobin
        if self.hemoglobin and self.hemoglobin < 10:
            severity = 'high' if self.hemoglobin < 7 else 'medium'
            alerts.append({
                'type': 'anemia_risk',
                'severity': severity,
                'message': f'Anemia Risk - Hemoglobin: {self.hemoglobin} g/dL',
                'body_part': 'blood'
            })
        
        # Hypertension: High BP
        if self.bp_systolic and self.bp_systolic > 140:
            alerts.append({
                'type': 'hypertension',
                'severity': 'high',
                'message': f'Hypertension Alert - BP: {self.bp_systolic}/{self.bp_diastolic}',
                'body_part': 'heart'
            })
        
        # Hypotension: Low BP
        if self.bp_systolic and self.bp_systolic < 90:
            alerts.append({
                'type': 'hypotension',
                'severity': 'medium',
                'message': f'Low BP Alert - BP: {self.bp_systolic}/{self.bp_diastolic}',
                'body_part': 'heart'
            })
        
        # Diabetes Risk: High Blood Sugar
        if self.blood_sugar and self.blood_sugar > 200:
            alerts.append({
                'type': 'diabetes_risk',
                'severity': 'high',
                'message': f'Diabetes Risk - Blood Sugar: {self.blood_sugar} mg/dL',
                'body_part': 'pancreas'
            })
        
        # Fever Alert
        if self.temperature and self.temperature > 38.5:
            alerts.append({
                'type': 'fever',
                'severity': 'medium',
                'message': f'High Fever - Temperature: {self.temperature}°C',
                'body_part': 'head'
            })
        
        # Low Heart Rate
        if self.heart_rate and self.heart_rate < 60:
            alerts.append({
                'type': 'bradycardia',
                'severity': 'medium',
                'message': f'Low Heart Rate - {self.heart_rate} bpm',
                'body_part': 'heart'
            })
        
        # High Heart Rate
        if self.heart_rate and self.heart_rate > 100:
            alerts.append({
                'type': 'tachycardia',
                'severity': 'medium',
                'message': f'High Heart Rate - {self.heart_rate} bpm',
                'body_part': 'heart'
            })
        
        return alerts
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'bp_systolic': self.bp_systolic,
            'bp_diastolic': self.bp_diastolic,
            'heart_rate': self.heart_rate,
            'temperature': self.temperature,
            'blood_sugar': self.blood_sugar,
            'hemoglobin': self.hemoglobin,
            'fever': self.fever,
            'cough': self.cough,
            'cough_duration': self.cough_duration,
            'fatigue': self.fatigue,
            'weight_loss': self.weight_loss,
            'night_sweats': self.night_sweats,
            'breathlessness': self.breathlessness,
            'headache': self.headache,
            'body_pain': self.body_pain,
            'symptoms_list': self.get_symptoms_list(),
            'diagnosis': self.diagnosis,
            'notes': self.notes,
            'vaccination_history': self.vaccination_history,
            'risk_level': self.risk_level,
            'alerts': self.calculate_alerts(),
            'record_date': self.record_date.isoformat() if self.record_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'sync_status': self.sync_status
        }
