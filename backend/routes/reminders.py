# Reminders routes
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db
from models.patient import Patient
from models.reminder import Reminder
from datetime import datetime, date, timedelta

reminders_bp = Blueprint('reminders', __name__, url_prefix='/api/reminders')


@reminders_bp.route('', methods=['GET'])
@jwt_required()
def get_reminders():
    """Get all reminders with filters"""
    try:
        user_id = int(get_jwt_identity())
        
        # Base query - reminders for user's patients
        query = db.session.query(Reminder).join(Patient).filter(
            Patient.created_by == user_id
        )
        
        # Filter by type
        reminder_type = request.args.get('type')
        if reminder_type:
            query = query.filter(Reminder.reminder_type == reminder_type)
        
        # Filter by status
        status = request.args.get('status')
        if status == 'pending':
            query = query.filter(Reminder.completed == False)
        elif status == 'completed':
            query = query.filter(Reminder.completed == True)
        elif status == 'overdue':
            query = query.filter(Reminder.completed == False, Reminder.due_date < date.today())
        elif status == 'upcoming':
            next_week = date.today() + timedelta(days=7)
            query = query.filter(
                Reminder.completed == False,
                Reminder.due_date >= date.today(),
                Reminder.due_date <= next_week
            )
        
        # Filter by patient
        patient_id = request.args.get('patient_id', type=int)
        if patient_id:
            query = query.filter(Reminder.patient_id == patient_id)
        
        # Sort
        query = query.order_by(Reminder.due_date.asc())
        
        reminders = query.all()
        
        # Add patient info to each reminder
        result = []
        for reminder in reminders:
            r_dict = reminder.to_dict()
            patient = Patient.query.get(reminder.patient_id)
            if patient:
                r_dict['patient_name'] = f"{patient.first_name} {patient.last_name}"
                r_dict['patient_uid'] = patient.patient_uid
            result.append(r_dict)
        
        return jsonify({'reminders': result}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@reminders_bp.route('', methods=['POST'])
@jwt_required()
def create_reminder():
    """Create a new reminder"""
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        
        # Validate patient exists
        patient_id = data.get('patient_id')
        if not patient_id:
            return jsonify({'error': 'patient_id is required'}), 400
        
        patient = Patient.query.filter_by(id=patient_id, created_by=user_id).first()
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404
        
        # Validate required fields
        if not data.get('reminder_type') or not data.get('title') or not data.get('due_date'):
            return jsonify({'error': 'reminder_type, title, and due_date are required'}), 400
        
        # Create reminder
        reminder = Reminder(
            patient_id=patient_id,
            reminder_type=data['reminder_type'],
            title=data['title'],
            description=data.get('description'),
            due_date=datetime.strptime(data['due_date'], '%Y-%m-%d').date(),
            priority=data.get('priority', 'normal'),
            is_recurring=data.get('is_recurring', False),
            recurrence_pattern=data.get('recurrence_pattern'),
            local_id=data.get('local_id'),
            sync_status='synced',
            created_by=user_id
        )
        
        if data.get('due_time'):
            reminder.due_time = datetime.strptime(data['due_time'], '%H:%M').time()
        
        if data.get('recurrence_end_date'):
            reminder.recurrence_end_date = datetime.strptime(
                data['recurrence_end_date'], '%Y-%m-%d'
            ).date()
        
        db.session.add(reminder)
        db.session.commit()
        
        return jsonify({
            'message': 'Reminder created successfully',
            'reminder': reminder.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@reminders_bp.route('/<int:reminder_id>', methods=['PUT'])
@jwt_required()
def update_reminder(reminder_id):
    """Update a reminder"""
    try:
        user_id = int(get_jwt_identity())
        
        reminder = db.session.query(Reminder).join(Patient).filter(
            Reminder.id == reminder_id,
            Patient.created_by == user_id
        ).first()
        
        if not reminder:
            return jsonify({'error': 'Reminder not found'}), 404
        
        data = request.get_json()
        
        # Update fields
        if 'title' in data:
            reminder.title = data['title']
        if 'description' in data:
            reminder.description = data['description']
        if 'due_date' in data:
            reminder.due_date = datetime.strptime(data['due_date'], '%Y-%m-%d').date()
        if 'due_time' in data and data['due_time']:
            reminder.due_time = datetime.strptime(data['due_time'], '%H:%M').time()
        if 'priority' in data:
            reminder.priority = data['priority']
        if 'is_recurring' in data:
            reminder.is_recurring = data['is_recurring']
        if 'recurrence_pattern' in data:
            reminder.recurrence_pattern = data['recurrence_pattern']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Reminder updated successfully',
            'reminder': reminder.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@reminders_bp.route('/<int:reminder_id>/complete', methods=['POST'])
@jwt_required()
def complete_reminder(reminder_id):
    """Mark reminder as completed"""
    try:
        user_id = int(get_jwt_identity())
        
        reminder = db.session.query(Reminder).join(Patient).filter(
            Reminder.id == reminder_id,
            Patient.created_by == user_id
        ).first()
        
        if not reminder:
            return jsonify({'error': 'Reminder not found'}), 404
        
        reminder.mark_completed()
        db.session.commit()
        
        return jsonify({
            'message': 'Reminder marked as completed',
            'reminder': reminder.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@reminders_bp.route('/<int:reminder_id>', methods=['DELETE'])
@jwt_required()
def delete_reminder(reminder_id):
    """Delete a reminder"""
    try:
        user_id = get_jwt_identity()
        
        reminder = db.session.query(Reminder).join(Patient).filter(
            Reminder.id == reminder_id,
            Patient.created_by == user_id
        ).first()
        
        if not reminder:
            return jsonify({'error': 'Reminder not found'}), 404
        
        db.session.delete(reminder)
        db.session.commit()
        
        return jsonify({'message': 'Reminder deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@reminders_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def get_reminder_dashboard():
    """Get reminders dashboard summary"""
    try:
        user_id = get_jwt_identity()
        today = date.today()
        
        # Base query
        base_query = db.session.query(Reminder).join(Patient).filter(
            Patient.created_by == user_id,
            Reminder.completed == False
        )
        
        # Overdue
        overdue = base_query.filter(Reminder.due_date < today).count()
        
        # Due today
        due_today = base_query.filter(Reminder.due_date == today).count()
        
        # Upcoming (next 7 days)
        next_week = today + timedelta(days=7)
        upcoming = base_query.filter(
            Reminder.due_date > today,
            Reminder.due_date <= next_week
        ).count()
        
        # Get today's reminders details
        today_reminders = base_query.filter(Reminder.due_date == today).all()
        today_list = []
        for r in today_reminders:
            r_dict = r.to_dict()
            patient = Patient.query.get(r.patient_id)
            if patient:
                r_dict['patient_name'] = f"{patient.first_name} {patient.last_name}"
            today_list.append(r_dict)
        
        # Get overdue reminders details
        overdue_reminders = base_query.filter(Reminder.due_date < today).all()
        overdue_list = []
        for r in overdue_reminders:
            r_dict = r.to_dict()
            patient = Patient.query.get(r.patient_id)
            if patient:
                r_dict['patient_name'] = f"{patient.first_name} {patient.last_name}"
            overdue_list.append(r_dict)
        
        return jsonify({
            'summary': {
                'overdue': overdue,
                'due_today': due_today,
                'upcoming': upcoming
            },
            'today_reminders': today_list,
            'overdue_reminders': overdue_list
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
