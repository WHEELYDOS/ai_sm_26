/**
 * prediction.js - ML Prediction and Emergency Alert Module
 * Handles pregnancy risk prediction and emergency alerts
 */

const prediction = {
    /**
     * Get pregnancy risk prediction from ML model
     */
    async getPrediction(patientData) {
        try {
            const response = await auth.apiRequest('/api/predict/pregnancy', {
                method: 'POST',
                body: JSON.stringify({
                    age: patientData.age,
                    systolic_bp: patientData.bpSystolic,
                    diastolic_bp: patientData.bpDiastolic,
                    blood_sugar: patientData.bloodSugar,
                    body_temp: patientData.temperature,
                    heart_rate: patientData.heartRate
                })
            });

            if (response && response.ok) {
                return await response.json();
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Prediction failed');
            }
        } catch (error) {
            console.error('Prediction error:', error);
            throw error;
        }
    },

    /**
     * Check for general emergency conditions
     */
    async checkEmergency(vitals) {
        try {
            const response = await auth.apiRequest('/api/predict/general-emergency', {
                method: 'POST',
                body: JSON.stringify({
                    systolic_bp: vitals.bpSystolic,
                    diastolic_bp: vitals.bpDiastolic,
                    heart_rate: vitals.heartRate,
                    temperature: vitals.temperature,
                    blood_sugar: vitals.bloodSugar,
                    hemoglobin: vitals.hemoglobin
                })
            });

            if (response && response.ok) {
                return await response.json();
            }
            return { emergency: false };
        } catch (error) {
            console.error('Emergency check error:', error);
            return { emergency: false };
        }
    },

    /**
     * Show prediction result modal
     */
    showPredictionModal(result) {
        const modal = document.getElementById('prediction-modal');
        if (!modal) return;

        const pred = result.prediction;
        const isEmergency = pred.emergency;

        // Update modal content
        document.getElementById('prediction-risk-level').textContent = pred.risk_name;
        document.getElementById('prediction-risk-level').className = `risk-badge risk-${pred.risk_level}`;
        document.getElementById('prediction-icon').textContent = pred.icon;
        document.getElementById('prediction-message').textContent = pred.message;

        // Recommendations
        const recList = document.getElementById('prediction-recommendations');
        recList.innerHTML = pred.recommendations.map(r => `<li>${r}</li>`).join('');

        // Input data summary
        const inputData = result.input_data;
        document.getElementById('prediction-input-data').innerHTML = `
            <div class="input-data-grid">
                <div><strong>Age:</strong> ${inputData.age} years</div>
                <div><strong>BP:</strong> ${inputData.systolic_bp}/${inputData.diastolic_bp}</div>
                <div><strong>Blood Sugar:</strong> ${inputData.blood_sugar} mg/dL</div>
                <div><strong>Temperature:</strong> ${inputData.body_temp}°C</div>
                <div><strong>Heart Rate:</strong> ${inputData.heart_rate} bpm</div>
            </div>
        `;

        // Emergency section
        const emergencySection = document.getElementById('emergency-section');
        if (isEmergency) {
            emergencySection.style.display = 'block';
            emergencySection.classList.add('pulse-emergency');
            
            const contactsList = document.getElementById('emergency-contacts');
            contactsList.innerHTML = pred.emergency_contacts.map(c => `
                <a href="tel:${c.number}" class="emergency-call-btn">
                    📞 Call ${c.name} (${c.number})
                </a>
            `).join('');
        } else {
            emergencySection.style.display = 'none';
            emergencySection.classList.remove('pulse-emergency');
        }

        // Modal styling based on risk
        const modalContent = modal.querySelector('.modal-content');
        modalContent.className = `modal-content prediction-modal risk-${pred.risk_level}`;

        modal.classList.add('show');
    },

    /**
     * Show general emergency alert
     */
    showEmergencyAlert(emergencyData) {
        const modal = document.getElementById('emergency-modal');
        if (!modal || !emergencyData.emergency) return;

        // Update alerts
        const alertsList = document.getElementById('emergency-alerts-list');
        alertsList.innerHTML = emergencyData.alerts.map(alert => `
            <div class="emergency-alert-item">
                <span class="alert-icon">🚨</span>
                <div class="alert-content">
                    <strong>${alert.message}</strong>
                    <p>${alert.action}</p>
                </div>
            </div>
        `).join('');

        // Emergency contacts
        const contactsList = document.getElementById('general-emergency-contacts');
        contactsList.innerHTML = emergencyData.emergency_contacts.map(c => `
            <a href="tel:${c.number}" class="emergency-call-btn">
                📞 Call ${c.name} (${c.number})
            </a>
        `).join('');

        modal.classList.add('show');
        modal.classList.add('pulse-emergency');
    },

    /**
     * Initialize prediction UI
     */
    init() {
        // Setup prediction button
        const predictBtn = document.getElementById('predict-btn');
        if (predictBtn) {
            predictBtn.addEventListener('click', async () => {
                await this.runPrediction();
            });
        }

        // Close modal handlers
        document.querySelectorAll('.prediction-modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.closest('.modal').classList.remove('show');
            });
        });

        // Show prediction button when pregnancy is checked
        const pregnancyCheckbox = document.getElementById('pregnancy-status');
        if (pregnancyCheckbox) {
            pregnancyCheckbox.addEventListener('change', () => {
                this.togglePredictionButton();
            });
        }
    },

    /**
     * Toggle prediction button visibility
     */
    togglePredictionButton() {
        const pregnancyCheckbox = document.getElementById('pregnancy-status');
        const predictSection = document.getElementById('prediction-section');
        
        if (predictSection && pregnancyCheckbox) {
            predictSection.style.display = pregnancyCheckbox.checked ? 'block' : 'none';
        }
    },

    /**
     * Run prediction with current form data
     */
    async runPrediction() {
        const predictBtn = document.getElementById('predict-btn');
        predictBtn.disabled = true;
        predictBtn.innerHTML = '<span class="loading-spinner"></span> Analyzing...';

        try {
            // Get form data
            const patientData = {
                age: parseInt(document.getElementById('age').value) || 0,
                bpSystolic: parseInt(document.getElementById('bp-systolic').value) || 120,
                bpDiastolic: parseInt(document.getElementById('bp-diastolic').value) || 80,
                bloodSugar: parseInt(document.getElementById('blood-sugar').value) || 100,
                temperature: parseFloat(document.getElementById('temperature').value) || 37,
                heartRate: parseInt(document.getElementById('heart-rate').value) || 80
            };

            // Validate required fields
            if (!patientData.age || !document.getElementById('bp-systolic').value) {
                alert('Please fill in Age and Blood Pressure for prediction');
                return;
            }

            const result = await this.getPrediction(patientData);
            this.showPredictionModal(result);

        } catch (error) {
            alert('Prediction failed: ' + error.message);
        } finally {
            predictBtn.disabled = false;
            predictBtn.innerHTML = '🔮 Get Risk Prediction';
        }
    },

    /**
     * Check emergency after saving patient
     */
    async checkAfterSave(vitals) {
        // Check general emergency for all patients
        const emergencyResult = await this.checkEmergency(vitals);
        if (emergencyResult.emergency) {
            this.showEmergencyAlert(emergencyResult);
        }
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => prediction.init());
