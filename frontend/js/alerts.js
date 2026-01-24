/**
 * alerts.js - Smart Health Alerts Module
 * Calculates health alerts based on patient data
 */

const alertsModule = {
    /**
     * Alert rules for disease detection
     */
    rules: [
        {
            id: 'tb_risk',
            name: 'TB Risk',
            check: (record) => record.fever && record.cough && record.coughDuration > 14,
            severity: 'high',
            getMessage: (record) => `TB Risk - Persistent cough (${record.coughDuration} days) with fever`,
            bodyPart: 'lungs',
            recommendation: 'Refer for TB testing immediately'
        },
        {
            id: 'anemia_severe',
            name: 'Severe Anemia',
            check: (record) => record.hemoglobin && record.hemoglobin < 7,
            severity: 'high',
            getMessage: (record) => `Severe Anemia - Hb: ${record.hemoglobin} g/dL`,
            bodyPart: 'blood',
            recommendation: 'Urgent referral for blood transfusion evaluation'
        },
        {
            id: 'anemia_moderate',
            name: 'Moderate Anemia',
            check: (record) => record.hemoglobin && record.hemoglobin >= 7 && record.hemoglobin < 10,
            severity: 'medium',
            getMessage: (record) => `Moderate Anemia - Hb: ${record.hemoglobin} g/dL`,
            bodyPart: 'blood',
            recommendation: 'Iron and folic acid supplementation'
        },
        {
            id: 'hypertension_severe',
            name: 'Severe Hypertension',
            check: (record) => record.bpSystolic && record.bpSystolic >= 160,
            severity: 'high',
            getMessage: (record) => `Severe Hypertension - BP: ${record.bpSystolic}/${record.bpDiastolic}`,
            bodyPart: 'heart',
            recommendation: 'Immediate medical referral required'
        },
        {
            id: 'hypertension',
            name: 'Hypertension',
            check: (record) => record.bpSystolic && record.bpSystolic >= 140 && record.bpSystolic < 160,
            severity: 'medium',
            getMessage: (record) => `Hypertension - BP: ${record.bpSystolic}/${record.bpDiastolic}`,
            bodyPart: 'heart',
            recommendation: 'Lifestyle modification, regular monitoring'
        },
        {
            id: 'diabetes_high',
            name: 'High Blood Sugar',
            check: (record) => record.bloodSugar && record.bloodSugar > 200,
            severity: 'high',
            getMessage: (record) => `Diabetes Risk - Blood Sugar: ${record.bloodSugar} mg/dL`,
            bodyPart: 'pancreas',
            recommendation: 'Refer for diabetes evaluation'
        },
        {
            id: 'fever_high',
            name: 'High Fever',
            check: (record) => record.temperature && record.temperature > 39,
            severity: 'high',
            getMessage: (record) => `High Fever - Temperature: ${record.temperature}°C`,
            bodyPart: 'head',
            recommendation: 'Immediate medical attention'
        },
        {
            id: 'fever_moderate',
            name: 'Fever',
            check: (record) => record.temperature && record.temperature >= 38 && record.temperature <= 39,
            severity: 'medium',
            getMessage: (record) => `Fever - Temperature: ${record.temperature}°C`,
            bodyPart: 'head',
            recommendation: 'Monitor, paracetamol, rest, fluids'
        },
        {
            id: 'tachycardia',
            name: 'High Heart Rate',
            check: (record) => record.heartRate && record.heartRate > 100,
            severity: 'medium',
            getMessage: (record) => `High Heart Rate - ${record.heartRate} bpm`,
            bodyPart: 'heart',
            recommendation: 'Monitor, check for underlying causes'
        },
        {
            id: 'bradycardia',
            name: 'Low Heart Rate',
            check: (record) => record.heartRate && record.heartRate < 60,
            severity: 'medium',
            getMessage: (record) => `Low Heart Rate - ${record.heartRate} bpm`,
            bodyPart: 'heart',
            recommendation: 'Monitor, may need ECG if symptomatic'
        }
    ],

    /**
     * Analyze a record for alerts
     */
    analyzeRecord(record) {
        const alerts = [];

        for (const rule of this.rules) {
            if (rule.check(record)) {
                alerts.push({
                    id: rule.id,
                    name: rule.name,
                    severity: rule.severity,
                    message: rule.getMessage(record),
                    bodyPart: rule.bodyPart,
                    recommendation: rule.recommendation
                });
            }
        }

        return alerts;
    },

    /**
     * Get risk level from alerts
     */
    getRiskLevel(alerts) {
        if (alerts.some(a => a.severity === 'high')) return 'high';
        if (alerts.some(a => a.severity === 'medium')) return 'medium';
        return 'low';
    },

    /**
     * Get body part risk map for visualization
     */
    getBodyRiskMap(alerts) {
        const bodyRisk = {};

        for (const alert of alerts) {
            const part = alert.bodyPart;
            if (!bodyRisk[part] || this.severityRank(alert.severity) > this.severityRank(bodyRisk[part].severity)) {
                bodyRisk[part] = {
                    severity: alert.severity,
                    alerts: [alert]
                };
            } else if (bodyRisk[part].severity === alert.severity) {
                bodyRisk[part].alerts.push(alert);
            }
        }

        return bodyRisk;
    },

    /**
     * Severity ranking
     */
    severityRank(severity) {
        return { high: 3, medium: 2, low: 1 }[severity] || 0;
    },

    /**
     * Render alerts list in container
     */
    renderAlerts(alerts, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (alerts.length === 0) {
            container.innerHTML = '<p class="empty-state">No alerts at this time</p>';
            return;
        }

        let html = '';
        for (const alert of alerts) {
            html += `
                <div class="alert-card severity-${alert.severity}">
                    <div class="alert-card-header">
                        <span class="alert-patient-name">${alert.patientName || 'Patient'}</span>
                        <span class="alert-severity">${alert.severity}</span>
                    </div>
                    <p class="alert-message">${alert.message}</p>
                    <p class="alert-recommendation">Recommendation: ${alert.recommendation}</p>
                </div>
            `;
        }

        container.innerHTML = html;
    },

    /**
     * Update alert counts in dashboard
     */
    updateAlertCounts(alerts) {
        const highCount = alerts.filter(a => a.severity === 'high').length;
        const mediumCount = alerts.filter(a => a.severity === 'medium').length;

        const highEl = document.getElementById('high-alerts-count');
        const mediumEl = document.getElementById('medium-alerts-count');
        const riskEl = document.getElementById('risk-alerts');

        if (highEl) highEl.textContent = highCount;
        if (mediumEl) mediumEl.textContent = mediumCount;
        if (riskEl) riskEl.textContent = highCount;
    }
};
