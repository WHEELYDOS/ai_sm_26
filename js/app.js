/**
 * app.js - Main Application Logic
 * Handles UI interactions, form submission, and data management
 * Coordinates between database, UI, and voice input modules
 */

const app = {
    currentTab: 'dashboard',
    currentPatientId: null,

    /**
     * Initialize the application
     */
    async init() {
        console.log('Initializing Patient EHR Application');

        // Wait for database to be ready
        await this.waitForDatabase();

        // Setup event listeners
        this.setupTabNavigation();
        this.setupFormHandling();
        this.setupOnlineOfflineDetection();
        this.setupLanguageChangeListener();

        // Load initial data
        await this.loadDashboard();

        console.log('Application initialized successfully');
    },

    /**
     * Wait for database to be initialized
     */
    async waitForDatabase() {
        return new Promise((resolve) => {
            const checkDb = setInterval(() => {
                if (db.database) {
                    clearInterval(checkDb);
                    resolve();
                }
            }, 100);

            // Timeout after 5 seconds
            setTimeout(() => {
                clearInterval(checkDb);
                resolve();
            }, 5000);
        });
    },

    /**
     * Setup tab navigation
     */
    setupTabNavigation() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                const tabName = button.getAttribute('data-tab');
                
                // Update active button
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                // Update active content
                tabContents.forEach(content => content.classList.remove('active'));
                document.getElementById(`${tabName}-tab`).classList.add('active');

                // Load tab-specific content
                await this.loadTabContent(tabName);

                this.currentTab = tabName;
            });
        });
    },

    /**
     * Load content for specific tab
     */
    async loadTabContent(tabName) {
        try {
            switch (tabName) {
                case 'dashboard':
                    await this.loadDashboard();
                    break;
                case 'patients':
                    await this.loadPatients();
                    break;
                case 'alerts':
                    await this.loadAlerts();
                    break;
                case 'form':
                    this.resetForm();
                    break;
            }
        } catch (error) {
            console.error('Error loading tab content:', error);
        }
    },

    /**
     * Load and display dashboard
     */
    async loadDashboard() {
        try {
            // Get statistics
            const stats = await db.getStats();
            
            // Update stat cards
            document.getElementById('total-patients').textContent = stats.totalPatients;
            document.getElementById('records-today').textContent = stats.recordsToday;
            document.getElementById('avg-age').textContent = stats.averageAge;

            // Get risk alerts count
            const alerts = await this.generateRiskAlerts();
            document.getElementById('risk-alerts').textContent = alerts.length;

            // Load recent records
            await this.loadRecentRecords();

            // Draw charts
            await this.drawDashboardCharts();
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    },

    /**
     * Load recent records
     */
    async loadRecentRecords() {
        try {
            const records = await db.getAllRecords(5);
            const recentRecordsDiv = document.getElementById('recent-records');

            if (records.length === 0) {
                recentRecordsDiv.innerHTML = `<p class="empty-state" data-i18n="no_records">${i18n.t('no_records')}</p>`;
                return;
            }

            let html = '<div class="records-table">';
            
            for (const record of records) {
                const patient = await db.getPatient(record.patientId);
                const date = new Date(record.date).toLocaleDateString();
                
                html += `
                    <div class="record-item">
                        <div class="record-details">
                            <div class="record-name">${patient?.firstName} ${patient?.lastName}</div>
                            <div class="record-date">${date}</div>
                            <div class="record-bp">BP: ${record.bpSystolic}/${record.bpDiastolic}</div>
                        </div>
                        <button class="btn-delete-small" data-record-id="${record.id}" title="Delete record">
                            🗑️
                        </button>
                    </div>
                `;
            }
            
            html += '</div>';
            recentRecordsDiv.innerHTML = html;
            
            // Add delete event listeners
            document.querySelectorAll('.btn-delete-small').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const recordId = parseInt(btn.getAttribute('data-record-id'));
                    this.deleteRecordHandler(recordId);
                });
            });
        } catch (error) {
            console.error('Error loading recent records:', error);
        }
    },

    /**
     * Draw dashboard charts
     */
    async drawDashboardCharts() {
        try {
            const records = await db.getAllRecords(100);

            // Prepare data for blood pressure chart
            const bpSystolicValues = records
                .filter(r => r.bpSystolic)
                .map(r => r.bpSystolic);
            
            if (bpSystolicValues.length > 0) {
                const bpDist = chartUtils.createDistribution(bpSystolicValues, 5);
                const bpCanvas = document.getElementById('bp-chart');
                if (bpCanvas) {
                    chartUtils.drawBarChart(bpCanvas, bpDist.labels, bpDist.frequencies, 'BP Distribution', '#0066cc');
                }
            }

            // Prepare data for BMI chart
            const patients = await db.getAllPatients();
            const bmiValues = patients
                .filter(p => p.height && p.weight)
                .map(p => {
                    const heightM = p.height / 100;
                    return p.weight / (heightM * heightM);
                });
            
            if (bmiValues.length > 0) {
                const bmiDist = chartUtils.createDistribution(bmiValues, 5);
                const bmiCanvas = document.getElementById('bmi-chart');
                if (bmiCanvas) {
                    chartUtils.drawBarChart(bmiCanvas, bmiDist.labels, bmiDist.frequencies, 'BMI Distribution', '#ff6b6b');
                }
            }
        } catch (error) {
            console.error('Error drawing charts:', error);
        }
    },

    /**
     * Load and display patients list
     */
    async loadPatients() {
        try {
            const patients = await db.getAllPatients();
            const patientsList = document.getElementById('patients-list');

            if (patients.length === 0) {
                patientsList.innerHTML = `<p class="empty-state" data-i18n="no_patients">${i18n.t('no_patients')}</p>`;
                return;
            }

            let html = '<div class="patients-cards">';
            
            patients.forEach(patient => {
                const age = patient.age || '-';
                const contact = patient.contact || '-';
                
                html += `
                    <div class="patient-card">
                        <div class="patient-card-header">
                            <h3>${patient.firstName} ${patient.lastName}</h3>
                            <button class="btn-delete" data-patient-id="${patient.id}" title="Delete patient">
                                🗑️
                            </button>
                        </div>
                        <p><strong>${i18n.t('age')}:</strong> ${age}</p>
                        <p><strong>${i18n.t('gender')}:</strong> ${patient.gender || '-'}</p>
                        <p><strong>${i18n.t('contact')}:</strong> ${contact}</p>
                    </div>
                `;
            });
            
            html += '</div>';
            patientsList.innerHTML = html;
            
            // Add delete event listeners
            document.querySelectorAll('.btn-delete').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const patientId = parseInt(btn.getAttribute('data-patient-id'));
                    this.deletePatientHandler(patientId);
                });
            });
        } catch (error) {
            console.error('Error loading patients:', error);
        }
    },

    /**
     * Generate risk alerts based on patient data
     */
    async generateRiskAlerts() {
        try {
            const alerts = [];
            const records = await db.getAllRecords(100);

            records.forEach(record => {
                // High blood pressure alert
                if (record.bpSystolic && record.bpSystolic > 140) {
                    alerts.push({
                        type: 'high_bp',
                        severity: 'high',
                        message: `High BP: ${record.bpSystolic}/${record.bpDiastolic}`,
                        patientId: record.patientId,
                        date: record.date
                    });
                }

                // High blood sugar alert
                if (record.bloodSugar && record.bloodSugar > 200) {
                    alerts.push({
                        type: 'high_blood_sugar',
                        severity: 'high',
                        message: `High blood sugar: ${record.bloodSugar} mg/dL`,
                        patientId: record.patientId,
                        date: record.date
                    });
                }

                // Low heart rate alert
                if (record.heartRate && record.heartRate < 60) {
                    alerts.push({
                        type: 'low_heart_rate',
                        severity: 'medium',
                        message: `Low heart rate: ${record.heartRate} bpm`,
                        patientId: record.patientId,
                        date: record.date
                    });
                }

                // High BMI alert
                if (record.weight && record.height) {
                    const heightM = record.height / 100;
                    const bmi = record.weight / (heightM * heightM);
                    if (bmi > 30) {
                        alerts.push({
                            type: 'high_bmi',
                            severity: 'medium',
                            message: `High BMI: ${bmi.toFixed(1)}`,
                            patientId: record.patientId,
                            date: record.date
                        });
                    }
                }
            });

            return alerts;
        } catch (error) {
            console.error('Error generating risk alerts:', error);
            return [];
        }
    },

    /**
     * Load and display risk alerts
     */
    async loadAlerts() {
        try {
            const alerts = await this.generateRiskAlerts();
            const alertsList = document.getElementById('alerts-list');

            if (alerts.length === 0) {
                alertsList.innerHTML = `<p class="empty-state" data-i18n="no_alerts">${i18n.t('no_alerts')}</p>`;
                return;
            }

            let html = '<div class="alerts-cards">';
            
            for (const alert of alerts) {
                const patient = await db.getPatient(alert.patientId);
                const date = new Date(alert.date).toLocaleString();
                const severityClass = `alert-${alert.severity}`;
                
                html += `
                    <div class="alert-card ${severityClass}">
                        <div class="alert-severity">${alert.severity.toUpperCase()}</div>
                        <h3>${patient?.firstName} ${patient?.lastName}</h3>
                        <p class="alert-message">${alert.message}</p>
                        <p class="alert-date">${date}</p>
                    </div>
                `;
            }
            
            html += '</div>';
            alertsList.innerHTML = html;
        } catch (error) {
            console.error('Error loading alerts:', error);
        }
    },

    /**
     * Setup form handling
     */
    setupFormHandling() {
        const form = document.getElementById('patient-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.submitForm();
        });

        form.addEventListener('reset', () => {
            voice.clearTranscript();
        });
    },

    /**
     * Submit patient form
     */
    async submitForm() {
        try {
            const form = document.getElementById('patient-form');
            const formData = new FormData(form);

            // Create patient data object
            const patientData = {
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                age: parseInt(formData.get('age')),
                gender: formData.get('gender'),
                contact: formData.get('contact'),
                height: parseFloat(formData.get('height')),
                weight: parseFloat(formData.get('weight')),
                bpSystolic: parseInt(formData.get('bpSystolic')),
                bpDiastolic: parseInt(formData.get('bpDiastolic')),
                heartRate: parseInt(formData.get('heartRate')),
                bloodSugar: parseInt(formData.get('bloodSugar')),
                diagnosis: formData.get('diagnosis')
            };

            // Validate required fields
            if (!patientData.firstName || !patientData.lastName || !patientData.age) {
                alert(i18n.t('record_error'));
                return;
            }

            // Save patient if new
            let patientId = this.currentPatientId;
            if (!patientId) {
                patientId = await db.savePatient(patientData);
            }

            // Create medical record
            const recordData = {
                patientId: patientId,
                ...patientData
            };

            await db.saveRecord(recordData);

            // Show success message
            alert(i18n.t('record_saved'));

            // Reset form and reload dashboard
            form.reset();
            voice.clearTranscript();
            this.currentPatientId = null;

            // Switch to dashboard
            const dashboardBtn = document.querySelector('[data-tab="dashboard"]');
            if (dashboardBtn) dashboardBtn.click();

        } catch (error) {
            console.error('Error submitting form:', error);
            alert(i18n.t('record_error'));
        }
    },

    /**
     * Reset form
     */
    resetForm() {
        const form = document.getElementById('patient-form');
        if (form) {
            form.reset();
            voice.clearTranscript();
            this.currentPatientId = null;
        }
    },

    /**
     * Setup online/offline detection
     */
    setupOnlineOfflineDetection() {
        const updateStatus = () => {
            const indicator = document.getElementById('offline-indicator');
            const statusText = document.getElementById('status-text');
            
            if (navigator.onLine) {
                indicator.classList.remove('offline');
                indicator.classList.add('online');
                statusText.textContent = i18n.t('online');
                statusText.setAttribute('data-i18n', 'online');
            } else {
                indicator.classList.remove('online');
                indicator.classList.add('offline');
                statusText.textContent = i18n.t('offline');
                statusText.setAttribute('data-i18n', 'offline');
            }
        };

        window.addEventListener('online', updateStatus);
        window.addEventListener('offline', updateStatus);
        updateStatus(); // Initial check
    },

    /**
     * Setup language change listener
     */
    setupLanguageChangeListener() {
        window.addEventListener('languageChanged', (e) => {
            // Reload current tab content with new language
            this.loadTabContent(this.currentTab);
        });
    },

    /**
     * Update sync status
     */
    updateSyncStatus(message) {
        const syncStatus = document.getElementById('sync-status');
        if (syncStatus) {
            syncStatus.textContent = message;
        }
    },

    /**
     * Delete patient handler with confirmation
     * @param {number} patientId - Patient ID to delete
     */
    async deletePatientHandler(patientId) {
        try {
            const patient = await db.getPatient(patientId);
            const confirmMsg = i18n.t('confirm_delete_patient');
            
            if (window.confirm(confirmMsg)) {
                await db.deletePatient(patientId);
                alert(i18n.t('deleted_success'));
                await this.loadPatients();
            }
        } catch (error) {
            console.error('Error deleting patient:', error);
            alert(i18n.t('delete_error'));
        }
    },

    /**
     * Delete record handler with confirmation
     * @param {number} recordId - Record ID to delete
     */
    async deleteRecordHandler(recordId) {
        try {
            const confirmMsg = i18n.t('confirm_delete');
            
            if (window.confirm(confirmMsg)) {
                await db.deleteRecord(recordId);
                alert(i18n.t('deleted_success'));
                await this.loadDashboard();
            }
        } catch (error) {
            console.error('Error deleting record:', error);
            alert(i18n.t('delete_error'));
        }
    }
};

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init());
} else {
    app.init();
}
