/**
 * sync.js - Data Synchronization Module
 * Handles offline/online sync with server
 */

const syncManager = {
    isSyncing: false,
    lastSyncTime: null,

    /**
     * Initialize sync manager
     */
    init() {
        // Listen for online/offline events
        window.addEventListener('online', () => this.onOnline());
        window.addEventListener('offline', () => this.onOffline());

        // Setup sync button
        const syncBtn = document.getElementById('sync-btn');
        if (syncBtn) {
            syncBtn.addEventListener('click', () => this.triggerSync());
        }

        // Update sync count
        this.updateSyncCount();

        // Auto-sync when coming online
        if (navigator.onLine) {
            this.triggerSync();
        }

        // Periodic sync check
        setInterval(() => this.updateSyncCount(), 30000);
    },

    /**
     * Handle coming online
     */
    onOnline() {
        this.updateOnlineStatus(true);
        this.triggerSync();
    },

    /**
     * Handle going offline
     */
    onOffline() {
        this.updateOnlineStatus(false);
    },

    /**
     * Update online status in UI
     */
    updateOnlineStatus(isOnline) {
        const indicator = document.getElementById('offline-indicator');
        const statusText = document.getElementById('status-text');

        if (indicator && statusText) {
            if (isOnline) {
                indicator.classList.remove('offline');
                indicator.classList.add('online');
                statusText.textContent = 'Online';
            } else {
                indicator.classList.remove('online');
                indicator.classList.add('offline');
                statusText.textContent = 'Offline';
            }
        }
    },

    /**
     * Update sync queue count in UI
     */
    async updateSyncCount() {
        try {
            const count = await db.getSyncQueueCount();
            const syncCount = document.getElementById('sync-count');

            if (syncCount) {
                if (count > 0) {
                    syncCount.textContent = count;
                    syncCount.style.display = 'block';
                } else {
                    syncCount.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Error updating sync count:', error);
        }
    },

    /**
     * Trigger sync process
     */
    async triggerSync() {
        if (this.isSyncing || !navigator.onLine) {
            return;
        }

        this.isSyncing = true;
        const syncBtn = document.getElementById('sync-btn');

        try {
            if (syncBtn) syncBtn.classList.add('syncing');

            // Get pending items
            const pendingItems = await db.getPendingSyncItems();

            if (pendingItems.length === 0) {
                // Just fetch latest from server
                await this.fetchLatestFromServer();
                this.updateSyncStatus('Synced');
            } else {
                // Push pending items to server
                await this.pushToServer(pendingItems);
                this.updateSyncStatus(`Synced ${pendingItems.length} items`);
            }

            this.lastSyncTime = new Date();

        } catch (error) {
            console.error('Sync failed:', error);
            this.updateSyncStatus('Sync failed');
        } finally {
            this.isSyncing = false;
            if (syncBtn) syncBtn.classList.remove('syncing');
            this.updateSyncCount();
        }
    },

    /**
     * Push pending items to server
     */
    async pushToServer(items) {
        // Group items by type
        const patients = [];
        const records = [];
        const reminders = [];

        items.forEach(item => {
            const data = {
                ...item.data,
                local_id: item.data.localId?.toString()
            };

            switch (item.type) {
                case 'patient':
                    patients.push(data);
                    break;
                case 'record':
                    records.push({
                        ...data,
                        patient_local_id: data.patientLocalId?.toString()
                    });
                    break;
                case 'reminder':
                    reminders.push({
                        ...data,
                        patient_local_id: data.patientLocalId?.toString()
                    });
                    break;
            }
        });

        try {
            const response = await auth.apiRequest('/api/sync', {
                method: 'POST',
                body: JSON.stringify({ patients, records, reminders })
            });

            if (response && response.ok) {
                const result = await response.json();

                // Clear synced items from queue
                for (const item of items) {
                    await db.clearSyncQueueItem(item.id);
                }

                // Update local records with server IDs
                // This would need more detailed implementation

                return result;
            }
        } catch (error) {
            console.error('Push to server failed:', error);
            throw error;
        }
    },

    /**
     * Fetch latest data from server
     */
    async fetchLatestFromServer() {
        try {
            const since = this.lastSyncTime ? this.lastSyncTime.toISOString() : null;
            const url = since ? `/api/sync/latest?since=${since}` : '/api/sync/latest';

            const response = await auth.apiRequest(url);

            if (response && response.ok) {
                const data = await response.json();

                // TODO: Merge server data with local data
                // This requires conflict resolution logic

                return data;
            }
        } catch (error) {
            console.error('Fetch from server failed:', error);
            throw error;
        }
    },

    /**
     * Update sync status in footer
     */
    updateSyncStatus(message) {
        const syncStatus = document.getElementById('sync-status');
        if (syncStatus) {
            const time = new Date().toLocaleTimeString();
            syncStatus.textContent = `${message} at ${time}`;
        }
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for db to initialize
    setTimeout(() => syncManager.init(), 500);
});
