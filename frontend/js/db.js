/**
 * db.js - IndexedDB Database Module
 * Enhanced for offline-first with sync queue
 */

const db = {
    database: null,
    dbName: 'AshaCareDB',
    version: 2,

    stores: {
        patients: 'patients',
        records: 'records',
        reminders: 'reminders',
        syncQueue: 'syncQueue',
        cache: 'cache'
    },

    /**
     * Initialize IndexedDB
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onupgradeneeded = (event) => {
                const database = event.target.result;

                // Patients store
                if (!database.objectStoreNames.contains(this.stores.patients)) {
                    const patientStore = database.createObjectStore(
                        this.stores.patients,
                        { keyPath: 'localId', autoIncrement: true }
                    );
                    patientStore.createIndex('serverId', 'serverId', { unique: false });
                    patientStore.createIndex('patientUid', 'patientUid', { unique: false });
                    patientStore.createIndex('syncStatus', 'syncStatus', { unique: false });
                    patientStore.createIndex('firstName', 'firstName', { unique: false });
                }

                // Records store
                if (!database.objectStoreNames.contains(this.stores.records)) {
                    const recordStore = database.createObjectStore(
                        this.stores.records,
                        { keyPath: 'localId', autoIncrement: true }
                    );
                    recordStore.createIndex('serverId', 'serverId', { unique: false });
                    recordStore.createIndex('patientLocalId', 'patientLocalId', { unique: false });
                    recordStore.createIndex('syncStatus', 'syncStatus', { unique: false });
                    recordStore.createIndex('recordDate', 'recordDate', { unique: false });
                }

                // Reminders store
                if (!database.objectStoreNames.contains(this.stores.reminders)) {
                    const reminderStore = database.createObjectStore(
                        this.stores.reminders,
                        { keyPath: 'localId', autoIncrement: true }
                    );
                    reminderStore.createIndex('serverId', 'serverId', { unique: false });
                    reminderStore.createIndex('patientLocalId', 'patientLocalId', { unique: false });
                    reminderStore.createIndex('dueDate', 'dueDate', { unique: false });
                    reminderStore.createIndex('syncStatus', 'syncStatus', { unique: false });
                }

                // Sync queue store
                if (!database.objectStoreNames.contains(this.stores.syncQueue)) {
                    const syncStore = database.createObjectStore(
                        this.stores.syncQueue,
                        { keyPath: 'id', autoIncrement: true }
                    );
                    syncStore.createIndex('type', 'type', { unique: false });
                    syncStore.createIndex('createdAt', 'createdAt', { unique: false });
                }

                // Cache store
                if (!database.objectStoreNames.contains(this.stores.cache)) {
                    database.createObjectStore(this.stores.cache, { keyPath: 'key' });
                }
            };

            request.onsuccess = (event) => {
                this.database = event.target.result;
                console.log('IndexedDB initialized');
                resolve(this.database);
            };

            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Save patient locally
     */
    async savePatient(patientData) {
        return new Promise((resolve, reject) => {
            const transaction = this.database.transaction([this.stores.patients], 'readwrite');
            const store = transaction.objectStore(this.stores.patients);

            const data = {
                ...patientData,
                syncStatus: 'pending',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const request = store.add(data);

            request.onsuccess = () => {
                const localId = request.result;
                // Add to sync queue
                this.addToSyncQueue('patient', 'create', { ...data, localId });
                resolve(localId);
            };

            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Update patient locally
     */
    async updatePatient(localId, patientData) {
        return new Promise((resolve, reject) => {
            const transaction = this.database.transaction([this.stores.patients], 'readwrite');
            const store = transaction.objectStore(this.stores.patients);

            const getRequest = store.get(localId);

            getRequest.onsuccess = () => {
                const existing = getRequest.result;
                if (!existing) {
                    reject(new Error('Patient not found'));
                    return;
                }

                const updated = {
                    ...existing,
                    ...patientData,
                    syncStatus: 'pending',
                    updatedAt: new Date().toISOString()
                };

                const putRequest = store.put(updated);

                putRequest.onsuccess = () => {
                    this.addToSyncQueue('patient', 'update', updated);
                    resolve(updated);
                };

                putRequest.onerror = () => reject(putRequest.error);
            };

            getRequest.onerror = () => reject(getRequest.error);
        });
    },

    /**
     * Get all patients
     */
    async getAllPatients() {
        return new Promise((resolve, reject) => {
            const transaction = this.database.transaction([this.stores.patients], 'readonly');
            const store = transaction.objectStore(this.stores.patients);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Get patient by local ID
     */
    async getPatient(localId) {
        return new Promise((resolve, reject) => {
            const transaction = this.database.transaction([this.stores.patients], 'readonly');
            const store = transaction.objectStore(this.stores.patients);
            const request = store.get(localId);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Search patients
     */
    async searchPatients(query) {
        const patients = await this.getAllPatients();
        const lowerQuery = query.toLowerCase();

        return patients.filter(p => {
            const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
            const uid = (p.patientUid || '').toLowerCase();
            return fullName.includes(lowerQuery) || uid.includes(lowerQuery);
        });
    },

    /**
     * Save medical record locally
     */
    async saveRecord(recordData) {
        return new Promise((resolve, reject) => {
            const transaction = this.database.transaction([this.stores.records], 'readwrite');
            const store = transaction.objectStore(this.stores.records);

            const data = {
                ...recordData,
                syncStatus: 'pending',
                recordDate: new Date().toISOString(),
                createdAt: new Date().toISOString()
            };

            const request = store.add(data);

            request.onsuccess = () => {
                const localId = request.result;
                this.addToSyncQueue('record', 'create', { ...data, localId });
                resolve(localId);
            };

            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Get records for patient
     */
    async getPatientRecords(patientLocalId) {
        return new Promise((resolve, reject) => {
            const transaction = this.database.transaction([this.stores.records], 'readonly');
            const store = transaction.objectStore(this.stores.records);
            const index = store.index('patientLocalId');
            const request = index.getAll(patientLocalId);

            request.onsuccess = () => {
                const records = request.result.sort((a, b) => 
                    new Date(b.recordDate) - new Date(a.recordDate)
                );
                resolve(records);
            };
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Get all records
     */
    async getAllRecords(limit = 100) {
        return new Promise((resolve, reject) => {
            const transaction = this.database.transaction([this.stores.records], 'readonly');
            const store = transaction.objectStore(this.stores.records);
            const request = store.getAll();

            request.onsuccess = () => {
                const records = request.result
                    .sort((a, b) => new Date(b.recordDate) - new Date(a.recordDate))
                    .slice(0, limit);
                resolve(records);
            };
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Save reminder locally
     */
    async saveReminder(reminderData) {
        return new Promise((resolve, reject) => {
            const transaction = this.database.transaction([this.stores.reminders], 'readwrite');
            const store = transaction.objectStore(this.stores.reminders);

            const data = {
                ...reminderData,
                syncStatus: 'pending',
                createdAt: new Date().toISOString()
            };

            const request = store.add(data);

            request.onsuccess = () => {
                const localId = request.result;
                this.addToSyncQueue('reminder', 'create', { ...data, localId });
                resolve(localId);
            };

            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Get all reminders
     */
    async getAllReminders() {
        return new Promise((resolve, reject) => {
            const transaction = this.database.transaction([this.stores.reminders], 'readonly');
            const store = transaction.objectStore(this.stores.reminders);
            const request = store.getAll();

            request.onsuccess = () => {
                const reminders = request.result.sort((a, b) => 
                    new Date(a.dueDate) - new Date(b.dueDate)
                );
                resolve(reminders);
            };
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Mark reminder as complete
     */
    async completeReminder(localId) {
        return new Promise((resolve, reject) => {
            const transaction = this.database.transaction([this.stores.reminders], 'readwrite');
            const store = transaction.objectStore(this.stores.reminders);

            const getRequest = store.get(localId);

            getRequest.onsuccess = () => {
                const reminder = getRequest.result;
                if (!reminder) {
                    reject(new Error('Reminder not found'));
                    return;
                }

                reminder.completed = true;
                reminder.completedAt = new Date().toISOString();
                reminder.syncStatus = 'pending';

                const putRequest = store.put(reminder);

                putRequest.onsuccess = () => {
                    this.addToSyncQueue('reminder', 'complete', reminder);
                    resolve(reminder);
                };
            };

            getRequest.onerror = () => reject(getRequest.error);
        });
    },

    /**
     * Add item to sync queue
     */
    async addToSyncQueue(type, action, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.database.transaction([this.stores.syncQueue], 'readwrite');
            const store = transaction.objectStore(this.stores.syncQueue);

            const queueItem = {
                type,
                action,
                data,
                createdAt: new Date().toISOString()
            };

            const request = store.add(queueItem);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Get pending sync items
     */
    async getPendingSyncItems() {
        return new Promise((resolve, reject) => {
            const transaction = this.database.transaction([this.stores.syncQueue], 'readonly');
            const store = transaction.objectStore(this.stores.syncQueue);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Clear sync queue item
     */
    async clearSyncQueueItem(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.database.transaction([this.stores.syncQueue], 'readwrite');
            const store = transaction.objectStore(this.stores.syncQueue);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Get sync queue count
     */
    async getSyncQueueCount() {
        return new Promise((resolve, reject) => {
            const transaction = this.database.transaction([this.stores.syncQueue], 'readonly');
            const store = transaction.objectStore(this.stores.syncQueue);
            const request = store.count();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Update patient with server data
     */
    async updatePatientFromServer(localId, serverData) {
        return new Promise((resolve, reject) => {
            const transaction = this.database.transaction([this.stores.patients], 'readwrite');
            const store = transaction.objectStore(this.stores.patients);

            const getRequest = store.get(localId);

            getRequest.onsuccess = () => {
                const existing = getRequest.result;
                if (!existing) {
                    reject(new Error('Patient not found'));
                    return;
                }

                const updated = {
                    ...existing,
                    ...serverData,
                    serverId: serverData.id,
                    patientUid: serverData.patient_uid,
                    syncStatus: 'synced'
                };

                const putRequest = store.put(updated);

                putRequest.onsuccess = () => resolve(updated);
                putRequest.onerror = () => reject(putRequest.error);
            };

            getRequest.onerror = () => reject(getRequest.error);
        });
    },

    /**
     * Get database statistics
     */
    async getStats() {
        try {
            const patients = await this.getAllPatients();
            const records = await this.getAllRecords(1000);
            const reminders = await this.getAllReminders();
            const today = new Date().toDateString();

            const recordsToday = records.filter(r => {
                const recordDate = new Date(r.recordDate).toDateString();
                return recordDate === today;
            }).length;

            const pendingReminders = reminders.filter(r => {
                if (r.completed) return false;
                const dueDate = new Date(r.dueDate).toDateString();
                return dueDate === today;
            }).length;

            return {
                totalPatients: patients.length,
                totalRecords: records.length,
                recordsToday,
                pendingReminders
            };
        } catch (error) {
            console.error('Error getting stats:', error);
            return {
                totalPatients: 0,
                totalRecords: 0,
                recordsToday: 0,
                pendingReminders: 0
            };
        }
    }
};

// Initialize database
db.init().catch(err => console.error('DB init failed:', err));
