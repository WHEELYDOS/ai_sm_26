# Medical records routes
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db
from models.patient import Patient
from models.record import MedicalRecord
from datetime import datetime

records_bp = Blueprint('records', __name__, url_prefix='/api/records')


@records_bp.route('', methods=['POST'])
@jwt_required()
def create_record():
    """Create a new medical record"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # Validate patient exists
        patient_id = data.get('patient_id')
        if not patient_id:
            return jsonify({'error': 'patient_id is required'}), 400
        
        patient = Patient.query.filter_by(id=patient_id, created_by=user_id).first()
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404
        
        # Create record
        record = MedicalRecord(
            patient_id=patient_id,
            bp_systolic=data.get('bp_systolic'),
            bp_diastolic=data.get('bp_diastolic'),
            heart_rate=data.get('heart_rate'),
            temperature=data.get('temperature'),
            blood_sugar=data.get('blood_sugar'),
            hemoglobin=data.get('hemoglobin'),
            fever=data.get('fever', False),
            cough=data.get('cough', False),
            cough_duration=data.get('cough_duration'),
            fatigue=data.get('fatigue', False),
            weight_loss=data.get('weight_loss', False),
            night_sweats=data.get('night_sweats', False),
            breathlessness=data.get('breathlessness', False),
            headache=data.get('headache', False),
            body_pain=data.get('body_pain', False),
            diagnosis=data.get('diagnosis'),
            notes=data.get('notes'),
            vaccination_history=data.get('vaccination_history'),
            local_id=data.get('local_id'),
            sync_status='synced',
            created_by=user_id
        )
        
        # Set symptoms list
        if data.get('symptoms_list'):
            record.set_symptoms_list(data['symptoms_list'])
        
        # Calculate risk level
        alerts = record.calculate_alerts()
        if any(a['severity'] == 'high' for a in alerts):
            record.risk_level = 'high'
        elif any(a['severity'] == 'medium' for a in alerts):
            record.risk_level = 'medium'
        else:
            record.risk_level = 'low'
        
        db.session.add(record)
        db.session.commit()
        
        return jsonify({
            'message': 'Record created successfully',
            'record': record.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@records_bp.route('/patient/<int:patient_id>', methods=['GET'])
@jwt_required()
def get_patient_records(patient_id):
    """Get all records for a patient"""
    try:
        user_id = get_jwt_identity()
        
        # Verify patient belongs to user
        patient = Patient.query.filter_by(id=patient_id, created_by=user_id).first()
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404
        
        records = MedicalRecord.query.filter_by(patient_id=patient_id).order_by(
            MedicalRecord.record_date.desc()
        ).all()
        
        return jsonify({
            'patient': patient.to_dict(),
            'records': [r.to_dict() for r in records]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@records_bp.route('/<int:record_id>', methods=['GET'])
@jwt_required()
def get_record(record_id):
    """Get a specific record"""
    try:
        user_id = get_jwt_identity()
        record = MedicalRecord.query.filter_by(id=record_id, created_by=user_id).first()
        
        if not record:
            return jsonify({'error': 'Record not found'}), 404
        
        return jsonify({'record': record.to_dict()}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@records_bp.route('/<int:record_id>', methods=['PUT'])
@jwt_required()
def update_record(record_id):
    """Update a medical record"""
    try:
        user_id = get_jwt_identity()
        record = MedicalRecord.query.filter_by(id=record_id, created_by=user_id).first()
        
        if not record:
            return jsonify({'error': 'Record not found'}), 404
        
        data = request.get_json()
        
        # Update fields
        updatable_fields = [
            'bp_systolic', 'bp_diastolic', 'heart_rate', 'temperature',
            'blood_sugar', 'hemoglobin', 'fever', 'cough', 'cough_duration',
            'fatigue', 'weight_loss', 'night_sweats', 'breathlessness',
            'headache', 'body_pain', 'diagnosis', 'notes', 'vaccination_history'
        ]
        
        for field in updatable_fields:
            if field in data:
                setattr(record, field, data[field])
        
        if 'symptoms_list' in data:
            record.set_symptoms_list(data['symptoms_list'])
        
        # Recalculate risk level
        alerts = record.calculate_alerts()
        if any(a['severity'] == 'high' for a in alerts):
            record.risk_level = 'high'
        elif any(a['severity'] == 'medium' for a in alerts):
            record.risk_level = 'medium'
        else:
            record.risk_level = 'low'
        
        db.session.commit()
        
        return jsonify({
            'message': 'Record updated successfully',
            'record': record.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@records_bp.route('/<int:record_id>', methods=['DELETE'])
@jwt_required()
def delete_record(record_id):
    """Delete a medical record"""
    try:
        user_id = get_jwt_identity()
        record = MedicalRecord.query.filter_by(id=record_id, created_by=user_id).first()
        
        if not record:
            return jsonify({'error': 'Record not found'}), 404
        
        db.session.delete(record)
        db.session.commit()
        
        return jsonify({'message': 'Record deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@records_bp.route('/alerts', methods=['GET'])
@jwt_required()
def get_all_alerts():
    """Get all alerts across all patients"""
    try:
        user_id = get_jwt_identity()
        
        # Get recent records for user's patients
        records = db.session.query(MedicalRecord).join(Patient).filter(
            Patient.created_by == user_id
        ).order_by(MedicalRecord.record_date.desc()).limit(100).all()
        
        all_alerts = []
        for record in records:
            alerts = record.calculate_alerts()
            for alert in alerts:
                alert['patient_id'] = record.patient_id
                alert['record_id'] = record.id
                alert['record_date'] = record.record_date.isoformat() if record.record_date else None
                
                # Get patient name
                patient = Patient.query.get(record.patient_id)
                if patient:
                    alert['patient_name'] = f"{patient.first_name} {patient.last_name}"
                    alert['patient_uid'] = patient.patient_uid
                
                all_alerts.append(alert)
        
        # Sort by severity (high first)
        severity_order = {'high': 0, 'medium': 1, 'low': 2}
        all_alerts.sort(key=lambda x: severity_order.get(x['severity'], 3))
        
        return jsonify({'alerts': all_alerts}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
