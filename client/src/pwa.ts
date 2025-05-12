// Register service worker for PWA functionality
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    // Wait for the page to load to ensure better reliability
    window.addEventListener('load', () => {
      // Force update existing service workers to avoid caching issues with dev URLs
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (let registration of registrations) {
          registration.update();
        }
      });
      
      // Get the base path - important for GitHub Pages
      const basePath = window.location.pathname.includes('/good-works-stopwatch') 
        ? '/good-works-stopwatch/' 
        : '/';
        
      // Register the service worker with the correct path and scope
      navigator.serviceWorker.register(`${basePath}service-worker.js`, {
        scope: basePath,
        updateViaCache: 'none' // Don't use cache for service worker updates
      })
        .then(registration => {
          console.log('Service Worker registered with scope:', registration.scope);
          
          // Check for updates to the Service Worker
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                console.log('[PWA] Service worker state changed:', newWorker.state);
                
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New service worker is available - could show notification to user
                  console.log('[PWA] New service worker available');
                  
                  // Optionally notify the user about the update
                  if (window.confirm('A new version of the app is available. Reload to update?')) {
                    // Force the waiting service worker to become active
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                  }
                }
              });
            }
          });
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });
      
      // Handle service worker updates
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          console.log('[PWA] Controller changed, reloading...');
          window.location.reload();
        }
      });
      
      // Add offline detection and handling
      window.addEventListener('online', () => {
        console.log('[PWA] App is back online');
        // You could show a toast notification here
      });
      
      window.addEventListener('offline', () => {
        console.log('[PWA] App is offline');
        // You could show a toast notification here
      });
    });
  }
}

// Request permission for notifications
export function requestNotificationPermission() {
  if ('Notification' in window) {
    Notification.requestPermission()
      .then(permission => {
        if (permission === 'granted') {
          console.log('Notification permission granted');
        }
      });
  }
}
