# Reminder model for follow-ups and alerts
from datetime import datetime, date
from . import db


class Reminder(db.Model):
    """Reminder model for vaccinations, ANC visits, and medicine"""
    __tablename__ = 'reminders'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False, index=True)
    
    # Reminder Type
    reminder_type = db.Column(db.String(50), nullable=False)  # vaccination, anc_visit, medicine, follow_up
    
    # Details
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    
    # Scheduling
    due_date = db.Column(db.Date, nullable=False, index=True)
    due_time = db.Column(db.Time)
    
    # Status
    completed = db.Column(db.Boolean, default=False)
    completed_at = db.Column(db.DateTime)
    
    # Priority
    priority = db.Column(db.String(20), default='normal')  # low, normal, high, urgent
    
    # Recurrence (for medicine reminders)
    is_recurring = db.Column(db.Boolean, default=False)
    recurrence_pattern = db.Column(db.String(50))  # daily, weekly, monthly
    recurrence_end_date = db.Column(db.Date)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Sync
    sync_status = db.Column(db.String(20), default='synced')
    local_id = db.Column(db.String(50))
    
    # Created by
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    def is_overdue(self):
        """Check if reminder is overdue"""
        if self.completed:
            return False
        return self.due_date < date.today()
    
    def is_due_today(self):
        """Check if reminder is due today"""
        return self.due_date == date.today() and not self.completed
    
    def is_upcoming(self, days=7):
        """Check if reminder is coming up within specified days"""
        if self.completed:
            return False
        delta = (self.due_date - date.today()).days
        return 0 < delta <= days
    
    def mark_completed(self):
        """Mark reminder as completed"""
        self.completed = True
        self.completed_at = datetime.utcnow()
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'reminder_type': self.reminder_type,
            'title': self.title,
            'description': self.description,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'due_time': self.due_time.isoformat() if self.due_time else None,
            'completed': self.completed,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'priority': self.priority,
            'is_recurring': self.is_recurring,
            'recurrence_pattern': self.recurrence_pattern,
            'is_overdue': self.is_overdue(),
            'is_due_today': self.is_due_today(),
            'is_upcoming': self.is_upcoming(),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'sync_status': self.sync_status
        }


# Predefined reminder templates
VACCINATION_SCHEDULE = {
    'bcg': {'name': 'BCG Vaccine', 'age_weeks': 0},
    'opv_0': {'name': 'OPV-0 (Birth Dose)', 'age_weeks': 0},
    'hep_b_1': {'name': 'Hepatitis B-1', 'age_weeks': 0},
    'opv_1': {'name': 'OPV-1', 'age_weeks': 6},
    'penta_1': {'name': 'Pentavalent-1', 'age_weeks': 6},
    'rotavirus_1': {'name': 'Rotavirus-1', 'age_weeks': 6},
    'opv_2': {'name': 'OPV-2', 'age_weeks': 10},
    'penta_2': {'name': 'Pentavalent-2', 'age_weeks': 10},
    'rotavirus_2': {'name': 'Rotavirus-2', 'age_weeks': 10},
    'opv_3': {'name': 'OPV-3', 'age_weeks': 14},
    'penta_3': {'name': 'Pentavalent-3', 'age_weeks': 14},
    'rotavirus_3': {'name': 'Rotavirus-3', 'age_weeks': 14},
    'ipv': {'name': 'IPV', 'age_weeks': 14},
    'measles_1': {'name': 'Measles-1', 'age_months': 9},
    'vitamin_a_1': {'name': 'Vitamin A (1st dose)', 'age_months': 9},
    'mr_1': {'name': 'MR-1', 'age_months': 16},
    'opv_booster': {'name': 'OPV Booster', 'age_months': 16},
    'dpt_booster_1': {'name': 'DPT Booster-1', 'age_months': 16},
}

ANC_VISIT_SCHEDULE = [
    {'visit': 1, 'week_range': (0, 12), 'description': 'Registration, history, examination'},
    {'visit': 2, 'week_range': (14, 26), 'description': 'Routine checkup, iron/folic acid'},
    {'visit': 3, 'week_range': (28, 32), 'description': 'Blood pressure, weight, fetal position'},
    {'visit': 4, 'week_range': (36, 40), 'description': 'Final checkup, delivery planning'},
]
