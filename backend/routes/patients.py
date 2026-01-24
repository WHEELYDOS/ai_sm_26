# Patient routes
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db
from models.patient import Patient
from models.record import MedicalRecord
from datetime import datetime

patients_bp = Blueprint('patients', __name__, url_prefix='/api/patients')


@patients_bp.route('', methods=['GET'])
@jwt_required()
def get_patients():
    """Get all patients with search, sort, and filter"""
    try:
        user_id = int(get_jwt_identity())
        
        # Build query
        query = Patient.query.filter_by(created_by=user_id)
        
        # Search by name or patient ID
        search = request.args.get('search', '')
        if search:
            search_filter = f'%{search}%'
            query = query.filter(
                db.or_(
                    Patient.first_name.ilike(search_filter),
                    Patient.last_name.ilike(search_filter),
                    Patient.patient_uid.ilike(search_filter)
                )
            )
        
        # Filter by gender
        gender = request.args.get('gender')
        if gender:
            query = query.filter_by(gender=gender)
        
        # Filter by age range
        min_age = request.args.get('min_age', type=int)
        max_age = request.args.get('max_age', type=int)
        if min_age is not None:
            query = query.filter(Patient.age >= min_age)
        if max_age is not None:
            query = query.filter(Patient.age <= max_age)
        
        # Filter by pregnancy status
        pregnancy = request.args.get('pregnancy')
        if pregnancy is not None:
            query = query.filter_by(pregnancy_status=(pregnancy.lower() == 'true'))
        
        # Sort
        sort_by = request.args.get('sort_by', 'created_at')
        sort_order = request.args.get('sort_order', 'desc')
        
        if hasattr(Patient, sort_by):
            sort_column = getattr(Patient, sort_by)
            if sort_order == 'desc':
                query = query.order_by(sort_column.desc())
            else:
                query = query.order_by(sort_column.asc())
        
        # Pagination
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        patients = pagination.items
        
        return jsonify({
            'patients': [p.to_dict() for p in patients],
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@patients_bp.route('', methods=['POST'])
@jwt_required()
def create_patient():
    """Create a new patient"""
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['first_name', 'last_name', 'age', 'gender']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Create patient
        patient = Patient(
            patient_uid=Patient.generate_uid(),
            first_name=data['first_name'],
            last_name=data['last_name'],
            age=data['age'],
            gender=data['gender'],
            contact=data.get('contact'),
            address=data.get('address'),
            height=data.get('height'),
            weight=data.get('weight'),
            blood_group=data.get('blood_group'),
            pregnancy_status=data.get('pregnancy_status', False),
            created_by=user_id,
            local_id=data.get('local_id'),
            sync_status='synced'
        )
        
        # Parse dates
        if data.get('last_menstrual_date'):
            patient.last_menstrual_date = datetime.strptime(
                data['last_menstrual_date'], '%Y-%m-%d'
            ).date()
        
        db.session.add(patient)
        db.session.commit()
        
        return jsonify({
            'message': 'Patient created successfully',
            'patient': patient.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@patients_bp.route('/<int:patient_id>', methods=['GET'])
@jwt_required()
def get_patient(patient_id):
    """Get patient details with records and reminders"""
    try:
        user_id = int(get_jwt_identity())
        patient = Patient.query.filter_by(id=patient_id, created_by=user_id).first()
        
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404
        
        # Get recent records
        records = MedicalRecord.query.filter_by(patient_id=patient_id).order_by(
            MedicalRecord.record_date.desc()
        ).limit(10).all()
        
        # Get all alerts from records
        all_alerts = []
        for record in records:
            all_alerts.extend(record.calculate_alerts())
        
        # Get reminders
        from models.reminder import Reminder
        reminders = Reminder.query.filter_by(patient_id=patient_id).order_by(
            Reminder.due_date.asc()
        ).all()
        
        return jsonify({
            'patient': patient.to_dict(),
            'records': [r.to_dict() for r in records],
            'alerts': all_alerts,
            'reminders': [r.to_dict() for r in reminders]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@patients_bp.route('/<int:patient_id>', methods=['PUT'])
@jwt_required()
def update_patient(patient_id):
    """Update patient information"""
    try:
        user_id = int(get_jwt_identity())
        patient = Patient.query.filter_by(id=patient_id, created_by=user_id).first()
        
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404
        
        data = request.get_json()
        
        # Update fields
        updatable_fields = [
            'first_name', 'last_name', 'age', 'gender', 'contact', 'address',
            'height', 'weight', 'blood_group', 'pregnancy_status'
        ]
        
        for field in updatable_fields:
            if field in data:
                setattr(patient, field, data[field])
        
        # Parse dates
        if 'last_menstrual_date' in data and data['last_menstrual_date']:
            patient.last_menstrual_date = datetime.strptime(
                data['last_menstrual_date'], '%Y-%m-%d'
            ).date()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Patient updated successfully',
            'patient': patient.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@patients_bp.route('/<int:patient_id>', methods=['DELETE'])
@jwt_required()
def delete_patient(patient_id):
    """Delete patient and associated records"""
    try:
        user_id = int(get_jwt_identity())
        patient = Patient.query.filter_by(id=patient_id, created_by=user_id).first()
        
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404
        
        db.session.delete(patient)
        db.session.commit()
        
        return jsonify({'message': 'Patient deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
