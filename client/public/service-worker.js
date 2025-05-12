// Generate a unique cache name based on the current URL to handle changing dev domains
const ORIGIN = self.location.origin;
const CACHE_ID = ORIGIN.includes('replit.dev') ? ORIGIN.replace(/[^\w]/g, '-') : 'stable';
const APP_CACHE = `goodworks-app-${CACHE_ID}-v1`;
const DATA_CACHE = `goodworks-data-${CACHE_ID}-v1`;

// Core app files to cache for complete offline functionality
const APP_SHELL_FILES = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icons/app-logo.png',
  '/service-worker.js',
  '/assets/index.css',
  '/assets/index.js',
  '/sounds/bell.mp3',
  '/sounds/chime.mp3',
  '/sounds/alert.mp3'
];

// Install: Cache app shell for completely offline operation
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing');
  
  // Cache all essential files during installation
  event.waitUntil(
    caches.open(APP_CACHE)
      .then(cache => {
        console.log('[Service Worker] Caching app shell');
        
        // Try to cache all core files, but don't fail if some are missing
        return Promise.allSettled(
          APP_SHELL_FILES.map(url => 
            fetch(new Request(url, { cache: 'reload' }))
              .then(response => {
                if (response.status === 200) {
                  return cache.put(url, response);
                }
              })
              .catch(err => console.warn(`Failed to cache ${url}: ${err}`))
          )
        ).then(() => {
          // After caching core files, also try to cache the current page
          // and other important assets that might be in memory
          return self.skipWaiting();
        });
      })
  );
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating');
  
  const currentCaches = [APP_CACHE, DATA_CACHE];
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (!currentCaches.includes(cacheName)) {
              console.log('[Service Worker] Removing old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Ensure the service worker takes control immediately
        console.log('[Service Worker] Claiming clients');
        return self.clients.claim();
      })
  );
});

// Helper function to determine if a request is for an API
const isApiRequest = (request) => {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/');
};

// Helper function to determine if a request is for a static asset
const isStaticAsset = (request) => {
  const url = new URL(request.url);
  return url.pathname.startsWith('/assets/') || 
         url.pathname.startsWith('/icons/') ||
         url.pathname.endsWith('.js') ||
         url.pathname.endsWith('.css') ||
         url.pathname.endsWith('.json') ||
         url.pathname.endsWith('.html') ||
         url.pathname.endsWith('.svg') ||
         url.pathname.endsWith('.png');
};

// Fetch strategy: Cache first for app shell, network first for API, cache then network for other assets
self.addEventListener('fetch', (event) => {
  // Handle only GET requests
  if (event.request.method !== 'GET') return;
  
  const requestUrl = new URL(event.request.url);
  
  // Don't handle requests from other origins
  if (requestUrl.origin !== location.origin) return;
  
  // Choose strategy based on request type
  if (isApiRequest(event.request)) {
    // Network first, fallback to cached API responses if network fails
    event.respondWith(handleApiRequest(event.request));
  } else if (APP_SHELL_FILES.includes(requestUrl.pathname) || requestUrl.pathname === '/') {
    // Cache first for app shell files (most important for offline)
    event.respondWith(handleAppShellRequest(event.request));
  } else if (isStaticAsset(event.request)) {
    // Cache first for static assets with background refresh
    event.respondWith(handleStaticAssetRequest(event.request));
  } else {
    // Generic strategy for other resources
    event.respondWith(handleOtherRequest(event.request));
  }
});

// Handle app shell requests (most critical for app functionality)
async function handleAppShellRequest(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[Service Worker] Serving from cache:', request.url);
      
      // Refresh cache in background
      refreshCache(request, APP_CACHE);
      
      return cachedResponse;
    }
    
    // If not in cache, get from network and cache it
    console.log('[Service Worker] Fetching from network:', request.url);
    const networkResponse = await fetch(request);
    
    // Cache the response
    const cache = await caches.open(APP_CACHE);
    cache.put(request, networkResponse.clone());
    
    return networkResponse;
  } catch (error) {
    console.error('[Service Worker] Fetch failed:', error);
    
    // If both cache and network fail, return the offline fallback page
    if (request.mode === 'navigate') {
      return caches.match('/offline.html')
        .then(response => {
          return response || new Response('App is offline and offline page is not cached.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        });
    }
    
    // For non-navigation requests, return a simple error
    return new Response('App is offline and resource is not cached.', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/plain'
      })
    });
  }
}

// Handle API requests (prioritize freshness)
async function handleApiRequest(request) {
  try {
    // Try network first for API requests to ensure data is fresh
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(DATA_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Network request failed, using cache for:', request.url);
    
    // Fallback to cache if network fails
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If no cache is available, return an offline API response
    return new Response(JSON.stringify({ 
      offline: true, 
      message: 'You are offline and this data is not cached.' 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle static assets (styles, scripts, images)
async function handleStaticAssetRequest(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Refresh cache in background
      refreshCache(request, APP_CACHE);
      return cachedResponse;
    }
    
    // If not in cache, get from network
    const networkResponse = await fetch(request);
    const cache = await caches.open(APP_CACHE);
    cache.put(request, networkResponse.clone());
    
    return networkResponse;
  } catch (error) {
    console.error('[Service Worker] Static asset fetch failed:', error);
    
    // For failed image requests, could return a placeholder image
    if (request.url.match(/\.(jpg|jpeg|png|gif|svg)$/)) {
      // Return blank transparent image as fallback
      return new Response('');
    }
    
    // For other resources, return a basic error response
    return new Response('Resource unavailable offline', { 
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Handle messages from the client
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);
  
  // Handle notification request from the client
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    
    console.log('[Service Worker] Showing notification:', title);
    
    // Register the notification and show it
    self.registration.showNotification(title, {
      ...options,
      // Add these to make notification persist better on mobile
      requireInteraction: true,
      actions: [
        {
          action: 'view',
          title: 'View Timer'
        }
      ]
    }).catch(err => {
      console.error('[Service Worker] Notification failed:', err);
    });
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event.notification.tag);
  
  // Close the notification
  event.notification.close();
  
  // Focus on the main window or open a new one
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      if (clientList.length > 0) {
        // Focus the first client
        return clientList[0].focus();
      }
      // Otherwise open a new window
      return clients.openWindow('/');
    })
  );
});

// Handle all other requests
async function handleOtherRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(APP_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If no cache, use the offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html')
        .then(response => {
          // If offline page is available, use it
          if (response) {
            return response;
          }
          
          // Otherwise try the home page
          return caches.match('/');
        })
        .catch(() => {
          // Last resort - basic message
          return new Response('You are offline. Please reconnect to use the app.', { 
            status: 503, 
            headers: { 'Content-Type': 'text/plain' }
          });
        });
    }
    
    // For other resources, return error
    return new Response('Resource unavailable offline', { 
      status: 503, 
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Helper function to refresh cache in the background
function refreshCache(request, cacheName) {
  fetch(request)
    .then(response => {
      if (!response.ok) return;
      
      caches.open(cacheName).then(cache => {
        cache.put(request, response);
      });
    })
    .catch(() => {
      // Silently fail on background refresh
    });
}

// Listen for messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});