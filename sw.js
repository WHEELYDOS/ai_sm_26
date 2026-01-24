/**
 * Service Worker for Patient EHR PWA
 * Handles offline functionality, caching, and background sync
 * Cache first strategy for better performance
 */

const CACHE_NAME = 'patient-ehr-v1';
const RUNTIME_CACHE = 'patient-ehr-runtime-v1';

// Assets to cache on install
const ASSETS_TO_CACHE = [
    '/',
    'index.html',
    'css/styles.css',
    'js/i18n.js',
    'js/db.js',
    'js/voice.js',
    'js/chart-utils.js',
    'js/app.js',
    'manifest.json'
];

/**
 * Install event - Cache essential assets
 */
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('Service Worker: Caching essential assets');
            return cache.addAll(ASSETS_TO_CACHE);
        }).catch(error => {
            console.error('Service Worker: Install failed', error);
        })
    );
    // Force the waiting service worker to become the active service worker
    self.skipWaiting();
});

/**
 * Activate event - Clean up old caches
 */
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // Delete old caches
                    if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
                        console.log('Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    // Take control of clients immediately
    self.clients.claim();
});

/**
 * Fetch event - Implement cache-first strategy
 * Serve from cache if available, fall back to network
 */
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Don't cache cross-origin requests
    if (url.origin !== location.origin) {
        return;
    }

    // Implement cache-first strategy
    event.respondWith(
        caches.match(request).then(response => {
            // Return cached response if available
            if (response) {
                return response;
            }

            // Try network request
            return fetch(request).then(response => {
                // Don't cache non-successful responses
                if (!response || response.status !== 200 || response.type === 'error') {
                    return response;
                }

                // Clone the response
                const responseToCache = response.clone();

                // Cache successful responses
                caches.open(RUNTIME_CACHE).then(cache => {
                    cache.put(request, responseToCache);
                });

                return response;
            }).catch(() => {
                // Fallback response when offline
                // Return a basic offline page or empty response
                console.log('Service Worker: Offline fallback for', request.url);
                return new Response('Offline - Resource not available in cache');
            });
        })
    );
});

/**
 * Message event handler - Handle messages from clients
 */
self.addEventListener('message', event => {
    console.log('Service Worker: Message received', event.data);
    
    // Handle different message types
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        caches.delete(RUNTIME_CACHE).then(() => {
            console.log('Service Worker: Runtime cache cleared');
        });
    }
});

/**
 * Periodic sync event - Sync data periodically
 * This requires the browser to support periodic background sync
 */
self.addEventListener('periodicsync', event => {
    if (event.tag === 'sync-patient-data') {
        event.waitUntil(
            // Sync patient data with server
            fetch('/api/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            }).then(response => {
                console.log('Service Worker: Data sync completed');
                return response;
            }).catch(error => {
                console.error('Service Worker: Data sync failed', error);
            })
        );
    }
});

/**
 * Background sync event - Sync data when connection is restored
 */
self.addEventListener('sync', event => {
    if (event.tag === 'sync-patient-data') {
        event.waitUntil(
            // Sync data when back online
            console.log('Service Worker: Background sync triggered')
        );
    }
});
