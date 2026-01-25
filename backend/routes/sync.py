# Sync routes for offline data synchronization
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db
from models.patient import Patient
from models.record import MedicalRecord
from models.reminder import Reminder
from datetime import datetime

sync_bp = Blueprint('sync', __name__, url_prefix='/api/sync')


@sync_bp.route('', methods=['POST'])
@jwt_required()
def sync_data():
    """Sync offline data to server"""
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        
        results = {
            'patients': {'created': 0, 'updated': 0, 'errors': []},
            'records': {'created': 0, 'updated': 0, 'errors': []},
            'reminders': {'created': 0, 'updated': 0, 'errors': []}
        }
        
        # Sync patients
        for patient_data in data.get('patients', []):
            try:
                local_id = patient_data.get('local_id')
                existing = Patient.query.filter_by(local_id=local_id, created_by=user_id).first()
                
                if existing:
                    # Update existing
                    for key, value in patient_data.items():
                        if key not in ['id', 'local_id', 'created_by', 'patient_uid']:
                            if hasattr(existing, key):
                                setattr(existing, key, value)
                    existing.sync_status = 'synced'
                    results['patients']['updated'] += 1
                else:
                    # Create new - accept both camelCase and snake_case
                    patient = Patient(
                        patient_uid=Patient.generate_uid(),
                        first_name=patient_data.get('first_name') or patient_data.get('firstName', ''),
                        last_name=patient_data.get('last_name') or patient_data.get('lastName', ''),
                        age=patient_data.get('age', 0),
                        gender=patient_data.get('gender', 'other'),
                        contact=patient_data.get('contact'),
                        height=patient_data.get('height'),
                        weight=patient_data.get('weight'),
                        blood_group=patient_data.get('blood_group') or patient_data.get('bloodGroup'),
                        pregnancy_status=patient_data.get('pregnancy_status') or patient_data.get('pregnancyStatus', False),
                        created_by=user_id,
                        local_id=local_id,
                        sync_status='synced'
                    )
                    db.session.add(patient)
                    results['patients']['created'] += 1
            except Exception as e:
                results['patients']['errors'].append({
                    'local_id': patient_data.get('local_id'),
                    'error': str(e)
                })
        
        db.session.commit()
        
        # Sync records
        for record_data in data.get('records', []):
            try:
                local_id = record_data.get('local_id')
                patient_local_id = record_data.get('patient_local_id')
                
                # Find patient by local_id or server id
                patient = None
                if record_data.get('patient_id'):
                    patient = Patient.query.get(record_data['patient_id'])
                elif patient_local_id:
                    patient = Patient.query.filter_by(local_id=patient_local_id, created_by=user_id).first()
                
                if not patient:
                    results['records']['errors'].append({
                        'local_id': local_id,
                        'error': 'Patient not found'
                    })
                    continue
                
                existing = MedicalRecord.query.filter_by(local_id=local_id, created_by=user_id).first()
                
                if existing:
                    # Update existing
                    for key, value in record_data.items():
                        if key not in ['id', 'local_id', 'created_by', 'patient_id', 'patient_local_id']:
                            if hasattr(existing, key):
                                setattr(existing, key, value)
                    existing.sync_status = 'synced'
                    results['records']['updated'] += 1
                else:
                    # Create new - accept both camelCase and snake_case
                    record = MedicalRecord(
                        patient_id=patient.id,
                        bp_systolic=record_data.get('bp_systolic') or record_data.get('bpSystolic'),
                        bp_diastolic=record_data.get('bp_diastolic') or record_data.get('bpDiastolic'),
                        heart_rate=record_data.get('heart_rate') or record_data.get('heartRate'),
                        temperature=record_data.get('temperature'),
                        blood_sugar=record_data.get('blood_sugar') or record_data.get('bloodSugar'),
                        hemoglobin=record_data.get('hemoglobin'),
                        fever=record_data.get('fever', False),
                        cough=record_data.get('cough', False),
                        cough_duration=record_data.get('cough_duration') or record_data.get('coughDuration'),
                        diagnosis=record_data.get('diagnosis'),
                        notes=record_data.get('notes'),
                        local_id=local_id,
                        sync_status='synced',
                        created_by=user_id
                    )
                    db.session.add(record)
                    results['records']['created'] += 1
            except Exception as e:
                results['records']['errors'].append({
                    'local_id': record_data.get('local_id'),
                    'error': str(e)
                })
        
        db.session.commit()
        
        # Sync reminders
        for reminder_data in data.get('reminders', []):
            try:
                local_id = reminder_data.get('local_id')
                patient_local_id = reminder_data.get('patient_local_id')
                
                # Find patient
                patient = None
                if reminder_data.get('patient_id'):
                    patient = Patient.query.get(reminder_data['patient_id'])
                elif patient_local_id:
                    patient = Patient.query.filter_by(local_id=patient_local_id, created_by=user_id).first()
                
                if not patient:
                    results['reminders']['errors'].append({
                        'local_id': local_id,
                        'error': 'Patient not found'
                    })
                    continue
                
                existing = Reminder.query.filter_by(local_id=local_id, created_by=user_id).first()
                
                if existing:
                    # Update existing
                    for key, value in reminder_data.items():
                        if key not in ['id', 'local_id', 'created_by', 'patient_id', 'patient_local_id']:
                            if hasattr(existing, key):
                                setattr(existing, key, value)
                    existing.sync_status = 'synced'
                    results['reminders']['updated'] += 1
                else:
                    # Create new - accept both camelCase and snake_case
                    due_date_str = reminder_data.get('due_date') or reminder_data.get('dueDate')
                    reminder = Reminder(
                        patient_id=patient.id,
                        reminder_type=reminder_data.get('reminder_type') or reminder_data.get('reminderType', 'follow_up'),
                        title=reminder_data.get('title', 'Reminder'),
                        description=reminder_data.get('description'),
                        due_date=datetime.strptime(due_date_str, '%Y-%m-%d').date() if due_date_str else None,
                        priority=reminder_data.get('priority', 'normal'),
                        local_id=local_id,
                        sync_status='synced',
                        created_by=user_id
                    )
                    db.session.add(reminder)
                    results['reminders']['created'] += 1
            except Exception as e:
                results['reminders']['errors'].append({
                    'local_id': reminder_data.get('local_id'),
                    'error': str(e)
                })
        
        db.session.commit()
        
        return jsonify({
            'message': 'Sync completed',
            'results': results,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@sync_bp.route('/latest', methods=['GET'])
@jwt_required()
def get_latest():
    """Get latest data since timestamp"""
    try:
        user_id = int(get_jwt_identity())
        since = request.args.get('since')
        
        if since:
            since_datetime = datetime.fromisoformat(since)
        else:
            since_datetime = datetime.min
        
        # Get updated patients
        patients = Patient.query.filter(
            Patient.created_by == user_id,
            Patient.updated_at > since_datetime
        ).all()
        
        # Get updated records
        records = db.session.query(MedicalRecord).join(Patient).filter(
            Patient.created_by == user_id,
            MedicalRecord.updated_at > since_datetime
        ).all()
        
        # Get updated reminders
        reminders = db.session.query(Reminder).join(Patient).filter(
            Patient.created_by == user_id,
            Reminder.updated_at > since_datetime
        ).all()
        
        return jsonify({
            'patients': [p.to_dict() for p in patients],
            'records': [r.to_dict() for r in records],
            'reminders': [r.to_dict() for r in reminders],
            'timestamp': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@sync_bp.route('/status', methods=['GET'])
@jwt_required()
def get_sync_status():
    """Get sync status summary"""
    try:
        user_id = int(get_jwt_identity())
        
        pending_patients = Patient.query.filter_by(
            created_by=user_id, sync_status='pending'
        ).count()
        
        pending_records = db.session.query(MedicalRecord).join(Patient).filter(
            Patient.created_by == user_id,
            MedicalRecord.sync_status == 'pending'
        ).count()
        
        pending_reminders = db.session.query(Reminder).join(Patient).filter(
            Patient.created_by == user_id,
            Reminder.sync_status == 'pending'
        ).count()
        
        return jsonify({
            'pending': {
                'patients': pending_patients,
                'records': pending_records,
                'reminders': pending_reminders,
                'total': pending_patients + pending_records + pending_reminders
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
