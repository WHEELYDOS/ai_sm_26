/**
 * Service Worker for AshaCare PWA
 * Implements offline-first caching strategy
 */

const CACHE_NAME = 'ashacare-v1';
const STATIC_CACHE = 'ashacare-static-v1';
const API_CACHE = 'ashacare-api-v1';
const MODEL_CACHE = 'vosk-models';

// Assets to cache on install
const STATIC_ASSETS = [
    '/',
    '/app',
    '/login.html',
    '/index.html',
    '/manifest.json',
    '/css/styles.css',
    '/js/i18n.js',
    '/js/db.js',
    '/js/auth.js',
    '/js/sync.js',
    '/js/voice.js',
    '/js/alerts.js',
    '/js/body-diagram.js',
    '/js/chart-utils.js',
    '/js/app.js'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('Service Worker: Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== STATIC_CACHE && 
                        cacheName !== API_CACHE && 
                        cacheName !== MODEL_CACHE) {
                        console.log('Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Handle API requests differently
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(networkFirstStrategy(request));
        return;
    }

    // Handle Vosk models - cache forever
    if (url.pathname.includes('/models/')) {
        event.respondWith(cacheFirstStrategy(request, MODEL_CACHE));
        return;
    }

    // Default: cache first for static assets
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
});

/**
 * Cache-first strategy
 * Try cache first, fall back to network, update cache
 */
async function cacheFirstStrategy(request, cacheName) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        // Return offline page if available
        const offlinePage = await caches.match('/');
        if (offlinePage) {
            return offlinePage;
        }
        
        return new Response('Offline', { status: 503 });
    }
}

/**
 * Network-first strategy for API calls
 * Try network, fall back to cache
 */
async function networkFirstStrategy(request) {
    try {
        const networkResponse = await fetch(request);
        
        // Cache successful GET responses
        if (networkResponse.ok && request.method === 'GET') {
            const cache = await caches.open(API_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        // Try cache for GET requests
        if (request.method === 'GET') {
            const cachedResponse = await caches.match(request);
            if (cachedResponse) {
                return cachedResponse;
            }
        }
        
        return new Response(
            JSON.stringify({ error: 'Offline - data will sync when online' }),
            { 
                status: 503, 
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

// Background sync for offline data
self.addEventListener('sync', (event) => {
    console.log('Service Worker: Background sync triggered:', event.tag);
    
    if (event.tag === 'sync-patient-data') {
        event.waitUntil(syncPatientData());
    }
});

/**
 * Sync patient data to server
 */
async function syncPatientData() {
    try {
        // This would be triggered from the main app
        // The actual sync logic is in sync.js
        console.log('Service Worker: Syncing patient data...');
        
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({ type: 'SYNC_TRIGGERED' });
        });
        
    } catch (error) {
        console.error('Service Worker: Sync failed:', error);
    }
}

// Periodic background sync
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'check-reminders') {
        event.waitUntil(checkReminders());
    }
});

/**
 * Check for due reminders and show notifications
 */
async function checkReminders() {
    // This would check IndexedDB for due reminders
    // and show push notifications
    console.log('Service Worker: Checking reminders...');
}

// Push notifications
self.addEventListener('push', (event) => {
    const data = event.data?.json() || {};
    
    const options = {
        body: data.body || 'You have a notification',
        icon: '/assets/icon-192.png',
        badge: '/assets/badge-72.png',
        vibrate: [200, 100, 200],
        data: data,
        actions: [
            { action: 'view', title: 'View' },
            { action: 'dismiss', title: 'Dismiss' }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'AshaCare', options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'view') {
        event.waitUntil(
            clients.openWindow('/app#reminders')
        );
    }
});

// Message handler for communication with main app
self.addEventListener('message', (event) => {
    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data.type === 'CACHE_MODEL') {
        event.waitUntil(cacheVoskModel(event.data.url));
    }
});

/**
 * Cache Vosk model files
 */
async function cacheVoskModel(modelUrl) {
    try {
        const cache = await caches.open(MODEL_CACHE);
        const response = await fetch(modelUrl);
        if (response.ok) {
            await cache.put(modelUrl, response);
            console.log('Service Worker: Cached model:', modelUrl);
        }
    } catch (error) {
        console.error('Service Worker: Failed to cache model:', error);
    }
}
