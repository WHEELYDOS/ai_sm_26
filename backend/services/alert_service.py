# Alert Service - Health alert detection and management
from models.record import MedicalRecord
from models.patient import Patient
from models.reminder import Reminder, VACCINATION_SCHEDULE, ANC_VISIT_SCHEDULE
from datetime import date, timedelta


class AlertService:
    """Service for generating and managing health alerts"""
    
    # Symptom-based alert rules
    ALERT_RULES = [
        {
            'id': 'tb_risk',
            'name': 'TB Risk',
            'conditions': ['fever', 'cough'],
            'extra_condition': lambda r: r.cough_duration and r.cough_duration > 14,
            'severity': 'high',
            'message': 'TB Risk - Persistent cough ({duration} days) with fever. Refer for testing.',
            'body_part': 'lungs',
            'recommendation': 'Refer to TB testing center immediately'
        },
        {
            'id': 'anemia_severe',
            'name': 'Severe Anemia',
            'field': 'hemoglobin',
            'condition': lambda hb: hb < 7,
            'severity': 'high',
            'message': 'Severe Anemia - Hb: {value} g/dL',
            'body_part': 'blood',
            'recommendation': 'Urgent referral for blood transfusion evaluation'
        },
        {
            'id': 'anemia_moderate',
            'name': 'Moderate Anemia',
            'field': 'hemoglobin',
            'condition': lambda hb: 7 <= hb < 10,
            'severity': 'medium',
            'message': 'Moderate Anemia - Hb: {value} g/dL',
            'body_part': 'blood',
            'recommendation': 'Iron and folic acid supplementation, diet counseling'
        },
        {
            'id': 'hypertension_severe',
            'name': 'Severe Hypertension',
            'field': 'bp_systolic',
            'condition': lambda bp: bp >= 160,
            'severity': 'high',
            'message': 'Severe Hypertension - BP: {systolic}/{diastolic}',
            'body_part': 'heart',
            'recommendation': 'Immediate medical referral required'
        },
        {
            'id': 'hypertension',
            'name': 'Hypertension',
            'field': 'bp_systolic',
            'condition': lambda bp: 140 <= bp < 160,
            'severity': 'medium',
            'message': 'Hypertension - BP: {systolic}/{diastolic}',
            'body_part': 'heart',
            'recommendation': 'Lifestyle modification, regular monitoring'
        },
        {
            'id': 'diabetes_high',
            'name': 'High Blood Sugar',
            'field': 'blood_sugar',
            'condition': lambda bs: bs > 200,
            'severity': 'high',
            'message': 'Diabetes Risk - Blood Sugar: {value} mg/dL',
            'body_part': 'pancreas',
            'recommendation': 'Refer for diabetes evaluation'
        },
        {
            'id': 'fever_high',
            'name': 'High Fever',
            'field': 'temperature',
            'condition': lambda t: t > 39,
            'severity': 'high',
            'message': 'High Fever - Temperature: {value}°C',
            'body_part': 'head',
            'recommendation': 'Immediate medical attention, check for infection'
        },
        {
            'id': 'fever_moderate',
            'name': 'Fever',
            'field': 'temperature',
            'condition': lambda t: 38 <= t <= 39,
            'severity': 'medium',
            'message': 'Fever - Temperature: {value}°C',
            'body_part': 'head',
            'recommendation': 'Monitor, paracetamol, fluids'
        },
    ]
    
    @classmethod
    def analyze_record(cls, record):
        """Analyze a medical record for health alerts"""
        alerts = []
        
        # Check symptom-based rules (TB)
        for rule in cls.ALERT_RULES:
            if 'conditions' in rule:
                # Multi-symptom rule
                conditions_met = all(getattr(record, c, False) for c in rule['conditions'])
                extra_met = rule.get('extra_condition', lambda r: True)(record)
                
                if conditions_met and extra_met:
                    message = rule['message']
                    if '{duration}' in message and record.cough_duration:
                        message = message.replace('{duration}', str(record.cough_duration))
                    
                    alerts.append({
                        'type': rule['id'],
                        'name': rule['name'],
                        'severity': rule['severity'],
                        'message': message,
                        'body_part': rule['body_part'],
                        'recommendation': rule['recommendation']
                    })
            
            elif 'field' in rule:
                # Single field rule
                value = getattr(record, rule['field'], None)
                if value is not None and rule['condition'](value):
                    message = rule['message']
                    message = message.replace('{value}', str(value))
                    if '{systolic}' in message:
                        message = message.replace('{systolic}', str(record.bp_systolic))
                        message = message.replace('{diastolic}', str(record.bp_diastolic or 0))
                    
                    alerts.append({
                        'type': rule['id'],
                        'name': rule['name'],
                        'severity': rule['severity'],
                        'message': message,
                        'body_part': rule['body_part'],
                        'recommendation': rule['recommendation']
                    })
        
        return alerts
    
    @classmethod
    def get_body_risk_map(cls, patient_id):
        """Get risk levels for body parts based on latest record"""
        from models.record import MedicalRecord
        
        record = MedicalRecord.query.filter_by(patient_id=patient_id).order_by(
            MedicalRecord.record_date.desc()
        ).first()
        
        if not record:
            return {}
        
        alerts = cls.analyze_record(record)
        
        # Map body parts to risk levels
        body_risk = {}
        for alert in alerts:
            body_part = alert['body_part']
            severity = alert['severity']
            
            # Keep highest severity for each body part
            if body_part not in body_risk or cls._severity_rank(severity) > cls._severity_rank(body_risk[body_part]['severity']):
                body_risk[body_part] = {
                    'severity': severity,
                    'alerts': [alert]
                }
            else:
                body_risk[body_part]['alerts'].append(alert)
        
        return body_risk
    
    @staticmethod
    def _severity_rank(severity):
        """Get numeric rank for severity"""
        return {'high': 3, 'medium': 2, 'low': 1}.get(severity, 0)
    
    @classmethod
    def generate_pregnancy_alerts(cls, patient):
        """Generate pregnancy-related alerts"""
        alerts = []
        
        if not patient.pregnancy_status or not patient.last_menstrual_date:
            return alerts
        
        today = date.today()
        pregnancy_weeks = (today - patient.last_menstrual_date).days // 7
        
        # Check for overdue ANC visits
        for visit in ANC_VISIT_SCHEDULE:
            week_start, week_end = visit['week_range']
            if week_start <= pregnancy_weeks <= week_end:
                # Check if reminder exists and not completed
                existing = Reminder.query.filter_by(
                    patient_id=patient.id,
                    reminder_type='anc_visit',
                    title=f"ANC Visit {visit['visit']}"
                ).first()
                
                if not existing or not existing.completed:
                    alerts.append({
                        'type': 'anc_due',
                        'severity': 'medium',
                        'message': f"ANC Visit {visit['visit']} due - Week {pregnancy_weeks}",
                        'body_part': 'abdomen',
                        'recommendation': visit['description']
                    })
        
        return alerts


class ReminderService:
    """Service for managing reminders and scheduling"""
    
    @classmethod
    def create_vaccination_reminders(cls, patient, birth_date):
        """Create vaccination reminders for infant"""
        from models import db
        
        reminders = []
        for key, vax in VACCINATION_SCHEDULE.items():
            if 'age_weeks' in vax:
                due_date = birth_date + timedelta(weeks=vax['age_weeks'])
            elif 'age_months' in vax:
                due_date = birth_date + timedelta(days=vax['age_months'] * 30)
            else:
                continue
            
            reminder = Reminder(
                patient_id=patient.id,
                reminder_type='vaccination',
                title=vax['name'],
                description=f"Vaccination: {vax['name']}",
                due_date=due_date,
                priority='high' if due_date <= date.today() else 'normal',
                created_by=patient.created_by
            )
            db.session.add(reminder)
            reminders.append(reminder)
        
        db.session.commit()
        return reminders
    
    @classmethod
    def create_anc_reminders(cls, patient):
        """Create ANC visit reminders for pregnant patient"""
        from models import db
        
        if not patient.pregnancy_status or not patient.last_menstrual_date:
            return []
        
        reminders = []
        for visit in ANC_VISIT_SCHEDULE:
            week_start = visit['week_range'][0]
            due_date = patient.last_menstrual_date + timedelta(weeks=week_start)
            
            reminder = Reminder(
                patient_id=patient.id,
                reminder_type='anc_visit',
                title=f"ANC Visit {visit['visit']}",
                description=visit['description'],
                due_date=due_date,
                priority='high',
                created_by=patient.created_by
            )
            db.session.add(reminder)
            reminders.append(reminder)
        
        db.session.commit()
        return reminders
