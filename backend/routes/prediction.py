# ML Prediction Routes - Rule Based Fallback
import os
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

prediction_bp = Blueprint('prediction', __name__, url_prefix='/api/predict')

# Model support removed due to missing dependencies
model = None

# Risk level mapping - matches label encoder from model:
# 0 = 'high risk', 1 = 'low risk', 2 = 'mid risk'
RISK_LEVELS = {
    0: {
        'level': 'high',
        'name': 'High Risk',
        'color': '#d32f2f', # Red
        'icon': 'alert-circle',
        'message': 'URGENT: Immediate medical attention required',
        'recommendations': [
            'SEEK IMMEDIATE MEDICAL CARE',
            'Visit the nearest hospital or call emergency services',
            'Keep the patient calm and rested',
            'Monitor vital signs continuously',
            'Prepare for hospitalization'
        ],
        'emergency': True,
        'emergency_contacts': [
            {'name': 'Emergency Ambulance', 'number': '108'},
            {'name': 'Women Helpline', 'number': '1091'},
            {'name': 'National Health Helpline', 'number': '104'}
        ]
    },
    1: {
        'level': 'low',
        'name': 'Low Risk',
        'color': '#2e7d32', # Green
        'icon': 'check-circle',
        'message': 'Pregnancy progressing normally',
        'recommendations': [
            'Continue regular prenatal checkups',
            'Maintain a balanced diet',
            'Take prescribed vitamins',
            'Stay physically active',
            'Get adequate rest'
        ],
        'emergency': False
    },
    2: {
        'level': 'medium',
        'name': 'Medium Risk',
        'color': '#ed6c02', # Orange/Yellow
        'icon': 'alert-triangle',
        'message': 'Monitoring required',
        'recommendations': [
            'Schedule frequent prenatal visits',
            'Monitor blood pressure',
            'Watch for warning signs',
            'Low-sodium diet if BP elevated',
            'Avoid strenuous activities',
            'Contact provider if symptoms worsen'
        ],
        'emergency': False,
        'follow_up_days': 7
    }
}


@prediction_bp.route('/pregnancy', methods=['POST'])
@jwt_required()
def predict_pregnancy_risk():
    """Predict pregnancy risk from patient data"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['age', 'systolic_bp', 'diastolic_bp', 'blood_sugar', 'body_temp', 'heart_rate']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Prepare features for model - Removed ML dependencies
        
        # Rule-based prediction (Fallback)
        risk_class = rule_based_prediction(data)
        
        # Get risk details
        risk_info = RISK_LEVELS.get(risk_class, RISK_LEVELS[1])
        
        response = {
            'prediction': {
                'risk_level': risk_info['level'],
                'risk_name': risk_info['name'],
                'risk_class': risk_class,
                'color': risk_info['color'],
                'icon': risk_info['icon'],
                'message': risk_info['message'],
                'recommendations': risk_info['recommendations'],
                'emergency': risk_info['emergency']
            },
            'input_data': {
                'age': data['age'],
                'systolic_bp': data['systolic_bp'],
                'diastolic_bp': data['diastolic_bp'],
                'blood_sugar': data['blood_sugar'],
                'body_temp': data['body_temp'],
                'heart_rate': data['heart_rate']
            }
        }
        
        # Add emergency contacts for high risk
        if risk_info['emergency']:
            response['prediction']['emergency_contacts'] = risk_info.get('emergency_contacts', [])
        
        # Add follow-up recommendation for medium risk
        if 'follow_up_days' in risk_info:
            response['prediction']['follow_up_days'] = risk_info['follow_up_days']
        
        return jsonify(response), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@prediction_bp.route('/general-emergency', methods=['POST'])
@jwt_required()
def check_general_emergency():
    """Check for general emergency conditions (non-pregnancy)"""
    try:
        data = request.get_json()
        
        emergency = False
        alerts = []
        
        # Check vital signs for emergency conditions
        bp_systolic = data.get('systolic_bp', 0)
        bp_diastolic = data.get('diastolic_bp', 0)
        heart_rate = data.get('heart_rate', 0)
        temperature = data.get('temperature', 0)
        blood_sugar = data.get('blood_sugar', 0)
        hemoglobin = data.get('hemoglobin', 0)
        
        # Critical conditions
        if bp_systolic >= 180 or bp_diastolic >= 120:
            emergency = True
            alerts.append({
                'type': 'hypertensive_crisis',
                'severity': 'critical',
                'message': f'HYPERTENSIVE CRISIS: BP {bp_systolic}/{bp_diastolic}',
                'action': 'Seek immediate emergency care'
            })
        
        if heart_rate > 150 or heart_rate < 40:
            emergency = True
            alerts.append({
                'type': 'cardiac_emergency',
                'severity': 'critical',
                'message': f'ABNORMAL HEART RATE: {heart_rate} bpm',
                'action': 'Seek immediate emergency care'
            })
        
        if temperature >= 40:
            emergency = True
            alerts.append({
                'type': 'hyperthermia',
                'severity': 'critical',
                'message': f'DANGEROUS FEVER: {temperature}°C',
                'action': 'Cool the patient and seek emergency care'
            })
        
        if blood_sugar > 400 or blood_sugar < 50:
            emergency = True
            alerts.append({
                'type': 'glucose_emergency',
                'severity': 'critical',
                'message': f'DANGEROUS BLOOD SUGAR: {blood_sugar} mg/dL',
                'action': 'Seek immediate emergency care'
            })
        
        if hemoglobin and hemoglobin < 5:
            emergency = True
            alerts.append({
                'type': 'severe_anemia',
                'severity': 'critical',
                'message': f'SEVERE ANEMIA: Hb {hemoglobin} g/dL',
                'action': 'Urgent blood transfusion may be needed'
            })
        
        response = {
            'emergency': emergency,
            'alerts': alerts
        }
        
        if emergency:
            response['emergency_contacts'] = [
                {'name': 'Emergency Ambulance', 'number': '108'},
                {'name': 'National Health Helpline', 'number': '104'}
            ]
            response['message'] = 'EMERGENCY: Immediate medical attention required!'
        else:
            response['message'] = 'No critical emergency detected'
        
        return jsonify(response), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def rule_based_prediction(data):
    """Fallback rule-based prediction if ML model not available"""
    score = 0
    
    # Age risk
    age = data.get('age', 25)
    if age < 18 or age > 35:
        score += 1
    if age < 15 or age > 40:
        score += 1
    
    # Blood pressure risk
    systolic = data.get('systolic_bp', 120)
    diastolic = data.get('diastolic_bp', 80)
    if systolic >= 140 or diastolic >= 90:
        score += 1
    if systolic >= 160 or diastolic >= 110:
        score += 2
    
    # Blood sugar risk
    bs = data.get('blood_sugar', 100)
    if bs > 140:
        score += 1
    if bs > 200:
        score += 1
    
    # Heart rate risk
    hr = data.get('heart_rate', 80)
    if hr > 100 or hr < 60:
        score += 1
    if hr > 120 or hr < 50:
        score += 1
    
    # Temperature risk
    temp = data.get('body_temp', 37)
    if temp > 38 or temp < 36:
        score += 1
    
    # Determine risk level
    if score >= 4:
        return 0  # High risk (0)
    elif score >= 2:
        return 2  # Medium risk (2)
    else:
        return 1  # Low risk (1)
