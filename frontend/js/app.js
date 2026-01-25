/**
 * app.js - Main Application Logic
 * AshaCare PWA
 */

const app = {
    currentTab: 'dashboard',
    selectedPatient: null,

    /**
     * Initialize application
     */
    async init() {
        // Check authentication
        if (!auth.isAuthenticated()) {
            window.location.href = '/';
            return;
        }

        // Wait for DB
        await this.waitForDB();

        // Setup event listeners
        this.setupTabNavigation();
        this.setupPatientForm();
        this.setupPatientsList();
        this.setupModals();
        this.setupReminders();

        // Load initial data
        await this.loadDashboard();
        await this.loadPatientsList();
        await this.loadAlerts();
        await this.loadReminders();

        // Update online status
        syncManager.updateOnlineStatus(navigator.onLine);

        console.log('AshaCare app initialized');
    },

    /**
     * Wait for IndexedDB to be ready
     */
    waitForDB() {
        return new Promise((resolve) => {
            const checkDB = () => {
                if (db.database) {
                    resolve();
                } else {
                    setTimeout(checkDB, 100);
                }
            };
            checkDB();
        });
    },

    /**
     * Setup tab navigation
     */
    setupTabNavigation() {
        const tabs = document.querySelectorAll('.tab-button');
        const contents = document.querySelectorAll('.tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;

                // Update tabs
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Update content
                contents.forEach(c => {
                    c.classList.remove('active');
                    if (c.id === `${targetTab}-tab`) {
                        c.classList.add('active');
                    }
                });

                this.currentTab = targetTab;

                // Refresh tab data
                this.refreshCurrentTab();
            });
        });
    },

    /**
     * Refresh current tab data
     */
    async refreshCurrentTab() {
        switch (this.currentTab) {
            case 'dashboard':
                await this.loadDashboard();
                break;
            case 'patients':
                await this.loadPatientsList();
                break;
            case 'alerts':
                await this.loadAlerts();
                break;
            case 'reminders':
                await this.loadReminders();
                break;
        }
    },

    /**
     * Load dashboard data
     */
    async loadDashboard() {
        try {
            const stats = await db.getStats();

            document.getElementById('total-patients').textContent = stats.totalPatients;
            document.getElementById('records-today').textContent = stats.recordsToday;
            document.getElementById('pending-reminders').textContent = stats.pendingReminders;

            // Load recent records
            const records = await db.getAllRecords(5);
            this.renderRecentRecords(records);

            // Calculate high risk count
            let highRiskCount = 0;
            for (const record of records) {
                const alerts = alertsModule.analyzeRecord(record);
                if (alerts.some(a => a.severity === 'high')) {
                    highRiskCount++;
                }
            }
            document.getElementById('risk-alerts').textContent = highRiskCount;

            // Draw charts
            await this.drawCharts();

        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    },

    /**
     * Draw dashboard charts
     */
    async drawCharts() {
        const records = await db.getAllRecords(100);

        // BP Chart
        const bpCanvas = document.getElementById('bp-chart');
        if (bpCanvas) {
            const bpValues = records
                .filter(r => r.bpSystolic)
                .map(r => r.bpSystolic);

            if (bpValues.length > 0) {
                const dist = chartUtils.createDistribution(bpValues, 4);
                chartUtils.drawBarChart(bpCanvas, dist.labels, dist.frequencies, 'BP Distribution', '#667eea');
            }
        }

        // Risk Chart
        const riskCanvas = document.getElementById('risk-chart');
        if (riskCanvas) {
            let high = 0, medium = 0, low = 0;

            records.forEach(record => {
                const alerts = alertsModule.analyzeRecord(record);
                const level = alertsModule.getRiskLevel(alerts);
                if (level === 'high') high++;
                else if (level === 'medium') medium++;
                else low++;
            });

            chartUtils.drawRiskChart(riskCanvas, high, medium, low);
        }
    },

    /**
     * Render recent records
     */
    renderRecentRecords(records) {
        const container = document.getElementById('recent-records');
        if (!container) return;

        if (records.length === 0) {
            container.innerHTML = '<p class="empty-state">No records yet</p>';
            return;
        }

        let html = '';
        records.forEach(record => {
            const date = new Date(record.recordDate).toLocaleDateString();
            const alerts = alertsModule.analyzeRecord(record);
            const riskLevel = alertsModule.getRiskLevel(alerts);

            html += `
                <div class="record-item">
                    <div class="record-info">
                        <strong>Patient ID: ${record.patientLocalId}</strong>
                        <span class="record-date">${date}</span>
                    </div>
                    <span class="patient-risk-badge risk-${riskLevel}">${riskLevel}</span>
                </div>
            `;
        });

        container.innerHTML = html;
    },

    /**
     * Setup patient form
     */
    setupPatientForm() {
        const form = document.getElementById('patient-form');
        if (!form) return;

        // Gender change - show pregnancy section
        const genderSelect = document.getElementById('gender');
        const pregnancySection = document.getElementById('pregnancy-section');
        const pregnancyCheckbox = document.getElementById('pregnancy-status');
        const lmpGroup = document.getElementById('lmp-group');

        if (genderSelect && pregnancySection) {
            genderSelect.addEventListener('change', () => {
                pregnancySection.style.display = genderSelect.value === 'female' ? 'block' : 'none';
            });
        }

        if (pregnancyCheckbox && lmpGroup) {
            pregnancyCheckbox.addEventListener('change', () => {
                lmpGroup.style.display = pregnancyCheckbox.checked ? 'block' : 'none';
            });
        }

        // BMI calculation
        const heightInput = document.getElementById('height');
        const weightInput = document.getElementById('weight');
        const bmiDisplay = document.getElementById('bmi-display');

        const calculateBMI = () => {
            const height = parseFloat(heightInput?.value) / 100;
            const weight = parseFloat(weightInput?.value);

            if (height > 0 && weight > 0) {
                const bmi = (weight / (height * height)).toFixed(1);
                document.getElementById('bmi-value').textContent = bmi;

                let category = '';
                let categoryClass = '';
                if (bmi < 18.5) { category = 'Underweight'; categoryClass = 'bmi-underweight'; }
                else if (bmi < 25) { category = 'Normal'; categoryClass = 'bmi-normal'; }
                else if (bmi < 30) { category = 'Overweight'; categoryClass = 'bmi-overweight'; }
                else { category = 'Obese'; categoryClass = 'bmi-obese'; }

                const categoryEl = document.getElementById('bmi-category');
                categoryEl.textContent = category;
                categoryEl.className = `bmi-category ${categoryClass}`;
                bmiDisplay.style.display = 'block';
            } else {
                bmiDisplay.style.display = 'none';
            }
        };

        if (heightInput) heightInput.addEventListener('input', calculateBMI);
        if (weightInput) weightInput.addEventListener('input', calculateBMI);

        // Cough duration visibility
        const coughCheckbox = document.getElementById('symptom-cough');
        const coughDurationGroup = document.getElementById('cough-duration-group');

        if (coughCheckbox && coughDurationGroup) {
            coughCheckbox.addEventListener('change', () => {
                coughDurationGroup.style.display = coughCheckbox.checked ? 'block' : 'none';
            });
        }

        // Form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleFormSubmit(form);
        });

        // Form reset
        form.addEventListener('reset', () => {
            if (bmiDisplay) bmiDisplay.style.display = 'none';
            if (pregnancySection) pregnancySection.style.display = 'none';
            if (lmpGroup) lmpGroup.style.display = 'none';
            if (coughDurationGroup) coughDurationGroup.style.display = 'none';
            voice.clearTranscript();
        });
    },

    /**
     * Handle form submission
     */
    async handleFormSubmit(form) {
        const saveBtn = document.getElementById('save-btn');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="loading-spinner"></span> Saving...';

        try {
            const formData = new FormData(form);

            // Create patient
            const patientData = {
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                age: parseInt(formData.get('age')),
                gender: formData.get('gender'),
                contact: formData.get('contact'),
                bloodGroup: formData.get('bloodGroup'),
                height: parseFloat(formData.get('height')) || null,
                weight: parseFloat(formData.get('weight')) || null,
                pregnancyStatus: formData.get('pregnancyStatus') === 'on',
                lastMenstrualDate: formData.get('lastMenstrualDate') || null
            };

            const patientLocalId = await db.savePatient(patientData);

            // Create medical record
            const recordData = {
                patientLocalId,
                bpSystolic: parseInt(formData.get('bpSystolic')) || null,
                bpDiastolic: parseInt(formData.get('bpDiastolic')) || null,
                heartRate: parseInt(formData.get('heartRate')) || null,
                temperature: parseFloat(formData.get('temperature')) || null,
                bloodSugar: parseInt(formData.get('bloodSugar')) || null,
                hemoglobin: parseFloat(formData.get('hemoglobin')) || null,
                fever: formData.get('fever') === 'on',
                cough: formData.get('cough') === 'on',
                coughDuration: parseInt(formData.get('coughDuration')) || null,
                fatigue: formData.get('fatigue') === 'on',
                headache: formData.get('headache') === 'on',
                bodyPain: formData.get('bodyPain') === 'on',
                breathlessness: formData.get('breathlessness') === 'on',
                weightLoss: formData.get('weightLoss') === 'on',
                nightSweats: formData.get('nightSweats') === 'on',
                diagnosis: formData.get('diagnosis'),
                notes: formData.get('notes')
            };

            await db.saveRecord(recordData);

            // Show success
            alert(i18n.t('record_saved'));

            // Reset form
            form.reset();

            // Trigger sync if online
            if (navigator.onLine) {
                syncManager.triggerSync();
            }

            // Update sync count
            syncManager.updateSyncCount();

            // Refresh dashboard
            await this.loadDashboard();
            await this.loadPatientsList();

        } catch (error) {
            console.error('Error saving record:', error);
            alert(i18n.t('record_error'));
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '💾 Save Record';
        }
    },

    /**
     * Setup patients list
     */
    setupPatientsList() {
        const searchInput = document.getElementById('search-patients');
        const filterGender = document.getElementById('filter-gender');
        const sortBy = document.getElementById('sort-by');
        const addBtn = document.getElementById('add-patient-btn');

        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => this.loadPatientsList(), 300);
            });
        }

        if (filterGender) {
            filterGender.addEventListener('change', () => this.loadPatientsList());
        }

        if (sortBy) {
            sortBy.addEventListener('change', () => this.loadPatientsList());
        }

        if (addBtn) {
            addBtn.addEventListener('click', () => {
                // Switch to form tab
                document.querySelector('[data-tab="form"]').click();
            });
        }
    },

    /**
     * Load patients list
     */
    async loadPatientsList() {
        const container = document.getElementById('patients-list');
        if (!container) return;

        try {
            let patients = await db.getAllPatients();

            // Apply search filter
            const searchQuery = document.getElementById('search-patients')?.value?.toLowerCase() || '';
            if (searchQuery) {
                patients = patients.filter(p => {
                    const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
                    const uid = (p.patientUid || '').toLowerCase();
                    return fullName.includes(searchQuery) || uid.includes(searchQuery);
                });
            }

            // Apply gender filter
            const genderFilter = document.getElementById('filter-gender')?.value;
            if (genderFilter) {
                patients = patients.filter(p => p.gender === genderFilter);
            }

            // Apply sorting
            const sortBy = document.getElementById('sort-by')?.value || 'created_at';
            patients.sort((a, b) => {
                switch (sortBy) {
                    case 'first_name':
                        return (a.firstName || '').localeCompare(b.firstName || '');
                    case 'age':
                        return (a.age || 0) - (b.age || 0);
                    default:
                        return new Date(b.createdAt) - new Date(a.createdAt);
                }
            });

            // Render
            if (patients.length === 0) {
                container.innerHTML = '<p class="empty-state">No patients found</p>';
                return;
            }

            let html = '';
            for (const patient of patients) {
                // Get latest record and calculate risk
                const records = await db.getPatientRecords(patient.localId);
                let riskLevel = 'low';
                if (records.length > 0) {
                    const alerts = alertsModule.analyzeRecord(records[0]);
                    riskLevel = alertsModule.getRiskLevel(alerts);
                }

                html += `
                    <div class="patient-card" data-patient-id="${patient.localId}">
                        <div class="patient-card-header">
                            <h3>${patient.firstName} ${patient.lastName}</h3>
                            <span class="patient-uid">${patient.patientUid || 'Local'}</span>
                        </div>
                        <div class="patient-card-body">
                            <p>Age: ${patient.age}, ${patient.gender}</p>
                            ${patient.contact ? `<p>Tel: ${patient.contact}</p>` : ''}
                            ${patient.pregnancyStatus ? '<p>Pregnant</p>' : ''}
                        </div>
                        <span class="patient-risk-badge risk-${riskLevel}">${riskLevel} risk</span>
                    </div>
                `;
            }

            container.innerHTML = html;

            // Add click handlers
            container.querySelectorAll('.patient-card').forEach(card => {
                card.addEventListener('click', () => {
                    const patientId = parseInt(card.dataset.patientId);
                    this.showPatientDetail(patientId);
                });
            });

        } catch (error) {
            console.error('Error loading patients:', error);
            container.innerHTML = '<p class="empty-state">Error loading patients</p>';
        }
    },

    /**
     * Show patient detail modal
     */
    async showPatientDetail(patientId) {
        try {
            const patient = await db.getPatient(patientId);
            if (!patient) return;

            const modal = document.getElementById('patient-modal');
            const records = await db.getPatientRecords(patientId);

            // Update modal content
            document.getElementById('modal-patient-name').textContent =
                `${patient.firstName} ${patient.lastName}`;
            document.getElementById('modal-patient-uid').textContent =
                patient.patientUid || `Local ID: ${patient.localId}`;

            // Patient info
            document.getElementById('modal-patient-info').innerHTML = `
                <p><strong>Age:</strong> ${patient.age} years</p>
                <p><strong>Gender:</strong> ${patient.gender}</p>
                ${patient.contact ? `<p><strong>Contact:</strong> ${patient.contact}</p>` : ''}
                ${patient.bloodGroup ? `<p><strong>Blood Group:</strong> ${patient.bloodGroup}</p>` : ''}
                ${patient.height ? `<p><strong>Height:</strong> ${patient.height} cm</p>` : ''}
                ${patient.weight ? `<p><strong>Weight:</strong> ${patient.weight} kg</p>` : ''}
                ${patient.pregnancyStatus ? '<p><strong>Status:</strong> 🤰 Pregnant</p>' : ''}
            `;

            // Get alerts from latest record
            let allAlerts = [];
            if (records.length > 0) {
                allAlerts = alertsModule.analyzeRecord(records[0]);
            }

            // Body diagram
            const bodyRiskMap = alertsModule.getBodyRiskMap(allAlerts);
            bodyDiagram.render('body-diagram', bodyRiskMap);
            bodyDiagram.renderLegend('body-legend', bodyRiskMap);

            // Alerts
            const alertsContainer = document.getElementById('modal-patient-alerts');
            if (allAlerts.length > 0) {
                alertsContainer.innerHTML = allAlerts.map(alert => `
                    <div class="alert-card severity-${alert.severity}">
                        <span class="alert-severity">${alert.severity}</span>
                        <p>${alert.message}</p>
                        <small>Recommendation: ${alert.recommendation}</small>
                    </div>
                `).join('');
            } else {
                alertsContainer.innerHTML = '<p class="empty-state">No alerts</p>';
            }

            // Records
            const recordsContainer = document.getElementById('modal-patient-records');
            if (records.length > 0) {
                recordsContainer.innerHTML = records.slice(0, 5).map(record => {
                    const date = new Date(record.recordDate).toLocaleDateString();
                    return `
                        <div class="record-item">
                            <span>${date}</span>
                            <span>BP: ${record.bpSystolic || '-'}/${record.bpDiastolic || '-'}</span>
                            <span>Hb: ${record.hemoglobin || '-'}</span>
                        </div>
                    `;
                }).join('');
            } else {
                recordsContainer.innerHTML = '<p class="empty-state">No records</p>';
            }

            // Store selected patient
            this.selectedPatient = patient;

            // Show modal
            modal.classList.add('show');

        } catch (error) {
            console.error('Error showing patient detail:', error);
        }
    },

    /**
     * Setup modals
     */
    setupModals() {
        // Close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.closest('.modal').classList.remove('show');
            });
        });

        // Click outside to close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('show');
                }
            });
        });

        // Add record button in patient modal
        const addRecordBtn = document.getElementById('add-record-btn');
        if (addRecordBtn) {
            addRecordBtn.addEventListener('click', () => {
                document.getElementById('patient-modal').classList.remove('show');
                // Pre-fill form with patient info
                if (this.selectedPatient) {
                    document.getElementById('first-name').value = this.selectedPatient.firstName;
                    document.getElementById('last-name').value = this.selectedPatient.lastName;
                    document.getElementById('age').value = this.selectedPatient.age;
                    document.getElementById('gender').value = this.selectedPatient.gender;
                }
                document.querySelector('[data-tab="form"]').click();
            });
        }

        // Edit patient button
        const editPatientBtn = document.getElementById('edit-patient-btn');
        if (editPatientBtn) {
            editPatientBtn.addEventListener('click', () => {
                if (this.selectedPatient) {
                    this.openEditPatientModal(this.selectedPatient);
                }
            });
        }

        // Edit patient form submission
        const editPatientForm = document.getElementById('edit-patient-form');
        if (editPatientForm) {
            editPatientForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.savePatientEdit();
            });
        }
    },

    /**
     * Open edit patient modal
     */
    openEditPatientModal(patient) {
        document.getElementById('patient-modal').classList.remove('show');

        document.getElementById('edit-patient-id').value = patient.localId || patient.id;
        document.getElementById('edit-first-name').value = patient.firstName || '';
        document.getElementById('edit-last-name').value = patient.lastName || '';
        document.getElementById('edit-age').value = patient.age || '';
        document.getElementById('edit-gender').value = patient.gender || 'other';
        document.getElementById('edit-contact').value = patient.contact || '';
        document.getElementById('edit-blood-group').value = patient.bloodGroup || '';
        document.getElementById('edit-height').value = patient.height || '';
        document.getElementById('edit-weight').value = patient.weight || '';

        document.getElementById('edit-patient-modal').classList.add('show');
    },

    /**
     * Save patient edit
     */
    async savePatientEdit() {
        const saveBtn = document.getElementById('save-edit-patient-btn');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        try {
            const patientId = parseInt(document.getElementById('edit-patient-id').value);
            const updatedData = {
                firstName: document.getElementById('edit-first-name').value,
                lastName: document.getElementById('edit-last-name').value,
                age: parseInt(document.getElementById('edit-age').value),
                gender: document.getElementById('edit-gender').value,
                contact: document.getElementById('edit-contact').value,
                bloodGroup: document.getElementById('edit-blood-group').value,
                height: parseFloat(document.getElementById('edit-height').value) || null,
                weight: parseFloat(document.getElementById('edit-weight').value) || null
            };

            // Update in local IndexedDB
            await db.updatePatient(patientId, updatedData);

            // Also update on server if online
            if (navigator.onLine && this.selectedPatient?.id) {
                try {
                    await auth.apiRequest(`/api/patients/${this.selectedPatient.id}`, {
                        method: 'PUT',
                        body: JSON.stringify({
                            first_name: updatedData.firstName,
                            last_name: updatedData.lastName,
                            age: updatedData.age,
                            gender: updatedData.gender,
                            contact: updatedData.contact,
                            blood_group: updatedData.bloodGroup,
                            height: updatedData.height,
                            weight: updatedData.weight
                        })
                    });
                } catch (e) {
                    console.warn('Server update failed, will sync later:', e);
                }
            }

            alert('Patient updated successfully!');
            document.getElementById('edit-patient-modal').classList.remove('show');

            // Refresh patient list
            await this.loadPatientsList();

        } catch (error) {
            console.error('Error saving patient:', error);
            alert('Failed to save patient. Please try again.');
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Changes';
        }
    },

    /**
     * Load alerts
     */
    async loadAlerts() {
        try {
            const records = await db.getAllRecords(50);
            const patients = await db.getAllPatients();

            const allAlerts = [];

            for (const record of records) {
                const alerts = alertsModule.analyzeRecord(record);
                const patient = patients.find(p => p.localId === record.patientLocalId);

                alerts.forEach(alert => {
                    allAlerts.push({
                        ...alert,
                        patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown',
                        patientId: record.patientLocalId,
                        recordDate: record.recordDate
                    });
                });
            }

            // Sort by severity
            allAlerts.sort((a, b) => {
                const order = { high: 0, medium: 1, low: 2 };
                return order[a.severity] - order[b.severity];
            });

            alertsModule.updateAlertCounts(allAlerts);
            alertsModule.renderAlerts(allAlerts, 'alerts-list');

        } catch (error) {
            console.error('Error loading alerts:', error);
        }
    },

    /**
     * Setup reminders
     */
    setupReminders() {
        const addBtn = document.getElementById('add-reminder-btn');
        const modal = document.getElementById('reminder-modal');
        const form = document.getElementById('reminder-form');
        const tabs = document.querySelectorAll('.reminder-tab');

        if (addBtn && modal) {
            addBtn.addEventListener('click', async () => {
                // Populate patient dropdown
                const patients = await db.getAllPatients();
                const select = document.getElementById('reminder-patient');
                select.innerHTML = patients.map(p =>
                    `<option value="${p.localId}">${p.firstName} ${p.lastName}</option>`
                ).join('');

                // Set default date to today
                document.getElementById('reminder-date').valueAsDate = new Date();

                modal.classList.add('show');
            });
        }

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveReminder(form);
            });
        }

        // Filter tabs
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.loadReminders(tab.dataset.filter);
            });
        });
    },

    /**
     * Save reminder
     */
    async saveReminder(form) {
        try {
            const formData = new FormData(form);

            const reminderData = {
                patientLocalId: parseInt(document.getElementById('reminder-patient').value),
                reminderType: formData.get('reminder-type') || document.getElementById('reminder-type').value,
                title: document.getElementById('reminder-title').value,
                dueDate: document.getElementById('reminder-date').value,
                description: document.getElementById('reminder-description').value,
                completed: false
            };

            await db.saveReminder(reminderData);

            document.getElementById('reminder-modal').classList.remove('show');
            form.reset();
            await this.loadReminders();

            if (navigator.onLine) {
                syncManager.triggerSync();
            }

        } catch (error) {
            console.error('Error saving reminder:', error);
            alert('Error saving reminder');
        }
    },

    /**
     * Load reminders
     */
    async loadReminders(filter = 'all') {
        try {
            let reminders = await db.getAllReminders();
            const patients = await db.getAllPatients();
            const today = new Date().toDateString();

            // Apply filter
            if (filter === 'overdue') {
                reminders = reminders.filter(r => !r.completed && new Date(r.dueDate) < new Date() && new Date(r.dueDate).toDateString() !== today);
            } else if (filter === 'today') {
                reminders = reminders.filter(r => !r.completed && new Date(r.dueDate).toDateString() === today);
            } else if (filter === 'upcoming') {
                reminders = reminders.filter(r => !r.completed && new Date(r.dueDate) > new Date());
            }

            // Update counts
            const allReminders = await db.getAllReminders();
            const overdueCount = allReminders.filter(r => !r.completed && new Date(r.dueDate) < new Date() && new Date(r.dueDate).toDateString() !== today).length;
            const todayCount = allReminders.filter(r => !r.completed && new Date(r.dueDate).toDateString() === today).length;
            const upcomingCount = allReminders.filter(r => !r.completed && new Date(r.dueDate) > new Date()).length;

            document.getElementById('overdue-count').textContent = overdueCount;
            document.getElementById('today-count').textContent = todayCount;
            document.getElementById('upcoming-count').textContent = upcomingCount;

            // Render
            const container = document.getElementById('reminders-list');
            if (reminders.length === 0) {
                container.innerHTML = '<p class="empty-state">No reminders</p>';
                return;
            }

            container.innerHTML = reminders.map(reminder => {
                const patient = patients.find(p => p.localId === reminder.patientLocalId);
                const dueDate = new Date(reminder.dueDate);
                const isOverdue = dueDate < new Date() && dueDate.toDateString() !== today;
                const isToday = dueDate.toDateString() === today;

                return `
                    <div class="reminder-item ${isOverdue ? 'overdue' : ''} ${isToday ? 'today' : ''}">
                        <input type="checkbox" class="reminder-checkbox" data-id="${reminder.localId}" ${reminder.completed ? 'checked' : ''}>
                        <div class="reminder-info">
                            <div class="reminder-title">${reminder.title}</div>
                            <div class="reminder-patient">${patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown'}</div>
                        </div>
                        <div class="reminder-date">${dueDate.toLocaleDateString()}</div>
                    </div>
                `;
            }).join('');

            // Checkbox handlers
            container.querySelectorAll('.reminder-checkbox').forEach(cb => {
                cb.addEventListener('change', async () => {
                    const id = parseInt(cb.dataset.id);
                    if (cb.checked) {
                        await db.completeReminder(id);
                        await this.loadReminders(filter);
                    }
                });
            });

        } catch (error) {
            console.error('Error loading reminders:', error);
        }
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure all modules are loaded
    setTimeout(() => app.init(), 100);
});
