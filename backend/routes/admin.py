# Admin routes for user and patient management
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from functools import wraps
from models import db
from models.user import User
from models.patient import Patient

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')


def admin_required(fn):
    """Decorator to check if user is admin"""
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        return fn(*args, **kwargs)
    return wrapper


# ==================== STATS ====================

@admin_bp.route('/stats', methods=['GET'])
@admin_required
def get_stats():
    """Get dashboard statistics"""
    try:
        total_users = User.query.count()
        total_patients = Patient.query.count()
        admin_count = User.query.filter_by(role='admin').count()
        asha_count = User.query.filter_by(role='asha').count()
        
        return jsonify({
            'total_users': total_users,
            'total_patients': total_patients,
            'admin_count': admin_count,
            'asha_count': asha_count
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==================== USER MANAGEMENT ====================

@admin_bp.route('/users', methods=['GET'])
@admin_required
def get_users():
    """Get all users with pagination and search"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '')
        
        query = User.query
        
        if search:
            search_filter = f'%{search}%'
            query = query.filter(
                db.or_(
                    User.username.ilike(search_filter),
                    User.email.ilike(search_filter),
                    User.full_name.ilike(search_filter)
                )
            )
        
        query = query.order_by(User.created_at.desc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'users': [u.to_dict() for u in pagination.items],
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/users/<int:user_id>', methods=['GET'])
@admin_required
def get_user(user_id):
    """Get single user details"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get count of patients created by this user
        patient_count = Patient.query.filter_by(created_by=user_id).count()
        
        user_data = user.to_dict()
        user_data['patient_count'] = patient_count
        
        return jsonify({'user': user_data}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/users/<int:user_id>', methods=['PUT'])
@admin_required
def update_user(user_id):
    """Update user details"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        
        # Update allowed fields
        if 'full_name' in data:
            user.full_name = data['full_name']
        if 'role' in data and data['role'] in ['admin', 'asha']:
            user.role = data['role']
        if 'email' in data:
            # Check if email is already taken by another user
            existing = User.query.filter(User.email == data['email'], User.id != user_id).first()
            if existing:
                return jsonify({'error': 'Email already taken'}), 409
            user.email = data['email']
        
        db.session.commit()
        
        return jsonify({
            'message': 'User updated successfully',
            'user': user.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    """Delete user"""
    try:
        current_user_id = int(get_jwt_identity())
        
        # Prevent self-deletion
        if user_id == current_user_id:
            return jsonify({'error': 'Cannot delete your own account'}), 400
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Delete associated patients first (cascade)
        Patient.query.filter_by(created_by=user_id).delete()
        
        db.session.delete(user)
        db.session.commit()
        
        return jsonify({'message': 'User deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ==================== PATIENT MANAGEMENT ====================

@admin_bp.route('/patients', methods=['GET'])
@admin_required
def get_all_patients():
    """Get all patients across all users"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '')
        
        query = Patient.query
        
        if search:
            search_filter = f'%{search}%'
            query = query.filter(
                db.or_(
                    Patient.first_name.ilike(search_filter),
                    Patient.last_name.ilike(search_filter),
                    Patient.patient_uid.ilike(search_filter),
                    db.and_(Patient.contact.isnot(None), Patient.contact.ilike(search_filter))
                )
            )
        
        query = query.order_by(Patient.created_at.desc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        # Add creator info to each patient
        patients_data = []
        for patient in pagination.items:
            p_dict = patient.to_dict()
            creator = User.query.get(patient.created_by)
            p_dict['created_by_name'] = creator.full_name or creator.username if creator else 'Unknown'
            patients_data.append(p_dict)
        
        return jsonify({
            'patients': patients_data,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/patients/<int:patient_id>', methods=['GET'])
@admin_required
def get_patient_admin(patient_id):
    """Get patient details (admin view)"""
    try:
        patient = Patient.query.get(patient_id)
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404
        
        p_dict = patient.to_dict()
        creator = User.query.get(patient.created_by)
        p_dict['created_by_name'] = creator.full_name or creator.username if creator else 'Unknown'
        
        return jsonify({'patient': p_dict}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/patients/<int:patient_id>', methods=['PUT'])
@admin_required
def update_patient_admin(patient_id):
    """Update patient details (admin)"""
    try:
        patient = Patient.query.get(patient_id)
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
        
        db.session.commit()
        
        return jsonify({
            'message': 'Patient updated successfully',
            'patient': patient.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/patients/<int:patient_id>', methods=['DELETE'])
@admin_required
def delete_patient_admin(patient_id):
    """Delete patient (admin)"""
    try:
        patient = Patient.query.get(patient_id)
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404
        
        db.session.delete(patient)
        db.session.commit()
        
        return jsonify({'message': 'Patient deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
