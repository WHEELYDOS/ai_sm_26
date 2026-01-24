/**
 * db.js - IndexedDB Database Module
 * Handles local storage of patient data with IndexedDB
 * Provides offline-first data persistence
 */

const db = {
    // Database reference
    database: null,
    dbName: 'PatientEHRDB',
    version: 1,

    // Object store names
    stores: {
        patients: 'patients',
        records: 'records',
        syncQueue: 'syncQueue'
    },

    /**
     * Initialize IndexedDB
     * @returns {Promise} - Resolves when DB is initialized
     */
    init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            /**
             * Upgrade schema if needed
             */
            request.onupgradeneeded = (event) => {
                const database = event.target.result;

                // Create patients store
                if (!database.objectStoreNames.contains(this.stores.patients)) {
                    const patientStore = database.createObjectStore(
                        this.stores.patients,
                        { keyPath: 'id', autoIncrement: true }
                    );
                    patientStore.createIndex('firstName', 'firstName', { unique: false });
                    patientStore.createIndex('lastName', 'lastName', { unique: false });
                    patientStore.createIndex('createdDate', 'createdDate', { unique: false });
                    console.log('Patients store created');
                }

                // Create records store
                if (!database.objectStoreNames.contains(this.stores.records)) {
                    const recordStore = database.createObjectStore(
                        this.stores.records,
                        { keyPath: 'id', autoIncrement: true }
                    );
                    recordStore.createIndex('patientId', 'patientId', { unique: false });
                    recordStore.createIndex('date', 'date', { unique: false });
                    console.log('Records store created');
                }

                // Create sync queue store
                if (!database.objectStoreNames.contains(this.stores.syncQueue)) {
                    database.createObjectStore(this.stores.syncQueue, { keyPath: 'id', autoIncrement: true });
                    console.log('Sync queue store created');
                }
            };

            request.onsuccess = (event) => {
                this.database = event.target.result;
                console.log('Database initialized successfully');
                resolve(this.database);
            };

            request.onerror = () => {
                console.error('Database initialization failed');
                reject(request.error);
            };
        });
    },

    /**
     * Save patient record
     * @param {object} patientData - Patient information
     * @returns {Promise} - Resolves with saved patient ID
     */
    async savePatient(patientData) {
        return new Promise((resolve, reject) => {
            if (!this.database) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.database.transaction([this.stores.patients], 'readwrite');
            const store = transaction.objectStore(this.stores.patients);

            // Add timestamp
            patientData.createdDate = new Date().toISOString();
            patientData.updatedDate = patientData.createdDate;

            const request = store.add(patientData);

            request.onsuccess = () => {
                console.log('Patient saved with ID:', request.result);
                resolve(request.result);
            };

            request.onerror = () => {
                console.error('Error saving patient:', request.error);
                reject(request.error);
            };
        });
    },

    /**
     * Save medical record
     * @param {object} recordData - Medical record information
     * @returns {Promise} - Resolves with saved record ID
     */
    async saveRecord(recordData) {
        return new Promise((resolve, reject) => {
            if (!this.database) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.database.transaction([this.stores.records], 'readwrite');
            const store = transaction.objectStore(this.stores.records);

            // Add timestamp
            recordData.date = new Date().toISOString();

            const request = store.add(recordData);

            request.onsuccess = () => {
                console.log('Record saved with ID:', request.result);
                resolve(request.result);
            };

            request.onerror = () => {
                console.error('Error saving record:', request.error);
                reject(request.error);
            };
        });
    },

    /**
     * Get patient by ID
     * @param {number} id - Patient ID
     * @returns {Promise} - Resolves with patient data
     */
    async getPatient(id) {
        return new Promise((resolve, reject) => {
            if (!this.database) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.database.transaction([this.stores.patients], 'readonly');
            const store = transaction.objectStore(this.stores.patients);
            const request = store.get(id);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    },

    /**
     * Get all patients
     * @returns {Promise} - Resolves with array of patients
     */
    async getAllPatients() {
        return new Promise((resolve, reject) => {
            if (!this.database) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.database.transaction([this.stores.patients], 'readonly');
            const store = transaction.objectStore(this.stores.patients);
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    },

    /**
     * Get records for a patient
     * @param {number} patientId - Patient ID
     * @returns {Promise} - Resolves with array of records
     */
    async getPatientRecords(patientId) {
        return new Promise((resolve, reject) => {
            if (!this.database) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.database.transaction([this.stores.records], 'readonly');
            const store = transaction.objectStore(this.stores.records);
            const index = store.index('patientId');
            const request = index.getAll(patientId);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    },

    /**
     * Get all records (recent first)
     * @param {number} limit - Maximum number of records to return
     * @returns {Promise} - Resolves with array of records
     */
    async getAllRecords(limit = 10) {
        return new Promise((resolve, reject) => {
            if (!this.database) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.database.transaction([this.stores.records], 'readonly');
            const store = transaction.objectStore(this.stores.records);
            const index = store.index('date');
            const request = index.openCursor(null, 'prev');

            const records = [];
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor && records.length < limit) {
                    records.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(records);
                }
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    },

    /**
     * Search patients by name
     * @param {string} query - Search query
     * @returns {Promise} - Resolves with matching patients
     */
    async searchPatients(query) {
        return new Promise((resolve, reject) => {
            if (!this.database) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.database.transaction([this.stores.patients], 'readonly');
            const store = transaction.objectStore(this.stores.patients);
            const request = store.getAll();

            request.onsuccess = () => {
                const results = request.result.filter(patient => {
                    const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
                    return fullName.includes(query.toLowerCase());
                });
                resolve(results);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    },

    /**
     * Delete patient
     * @param {number} id - Patient ID
     * @returns {Promise} - Resolves when deleted
     */
    async deletePatient(id) {
        return new Promise((resolve, reject) => {
            if (!this.database) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.database.transaction([this.stores.patients], 'readwrite');
            const store = transaction.objectStore(this.stores.patients);
            const request = store.delete(id);

            request.onsuccess = () => {
                console.log('Patient deleted with ID:', id);
                resolve();
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    },

    /**
     * Delete record by ID
     * @param {number} id - Record ID
     * @returns {Promise} - Resolves when deleted
     */
    async deleteRecord(id) {
        return new Promise((resolve, reject) => {
            if (!this.database) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.database.transaction([this.stores.records], 'readwrite');
            const store = transaction.objectStore(this.stores.records);
            const request = store.delete(id);

            request.onsuccess = () => {
                console.log('Record deleted with ID:', id);
                resolve();
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    },

    /**
     * Clear all data from a store (use with caution)
     * @param {string} storeName - Store name to clear
     * @returns {Promise} - Resolves when cleared
     */
    async clearStore(storeName) {
        return new Promise((resolve, reject) => {
            if (!this.database) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.database.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => {
                console.log('Store cleared:', storeName);
                resolve();
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    },

    /**
     * Get database statistics
     * @returns {Promise} - Resolves with stats
     */
    async getStats() {
        try {
            const patients = await this.getAllPatients();
            const records = await this.getAllRecords(1000);

            return {
                totalPatients: patients.length,
                totalRecords: records.length,
                recordsToday: records.filter(r => {
                    const recordDate = new Date(r.date).toDateString();
                    const today = new Date().toDateString();
                    return recordDate === today;
                }).length,
                averageAge: patients.length > 0 
                    ? Math.round(patients.reduce((sum, p) => sum + (p.age || 0), 0) / patients.length)
                    : 0
            };
        } catch (error) {
            console.error('Error getting stats:', error);
            return {
                totalPatients: 0,
                totalRecords: 0,
                recordsToday: 0,
                averageAge: 0
            };
        }
    }
};

// Initialize database when module loads
db.init().catch(error => console.error('Failed to initialize database:', error));
