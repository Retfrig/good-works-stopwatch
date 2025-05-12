import { useState, useEffect, useCallback } from 'react';

// Interface for the background mode hook
interface UseBackgroundModeResult {
  isBackgroundPermissionGranted: boolean;
  requestBackgroundPermission: () => void;
  showBackgroundNotification: (title: string, options?: NotificationOptions) => void;
  clearBackgroundNotification: () => void;
}

// Extended notification options with mobile-specific properties
interface ExtendedNotificationOptions extends NotificationOptions {
  // These properties are supported by some browsers but not in the standard TypeScript definitions
  requireInteraction?: boolean;
  renotify?: boolean;
  timestamp?: number;
  vibrate?: number[]; // Vibration pattern for mobile devices
}

// Service worker notification message type
interface ServiceWorkerNotificationMessage {
  type: 'SHOW_NOTIFICATION';
  title: string;
  options: ExtendedNotificationOptions;
}

export function useBackgroundMode(): UseBackgroundModeResult {
  const [isBackgroundPermissionGranted, setIsBackgroundPermissionGranted] = useState<boolean>(false);
  
  // Check if background permission is granted (using Notification API as a proxy)
  useEffect(() => {
    // Check notification permission as a proxy for background permissions
    if ("Notification" in window) {
      setIsBackgroundPermissionGranted(Notification.permission === "granted");
    }
    
    // Check wake lock permission if available
    if ("wakeLock" in navigator) {
      // The mere existence of this API suggests modern background capabilities
      setIsBackgroundPermissionGranted(true);
    }
  }, []);
  
  // Function to request background permission
  const requestBackgroundPermission = useCallback(() => {
    // Request notification permission
    if ("Notification" in window) {
      Notification.requestPermission().then(permission => {
        setIsBackgroundPermissionGranted(permission === "granted");
        
        // If permission granted, trigger a test notification
        if (permission === "granted") {
          // Send a test notification
          const testNotification = new Notification("Background Mode Enabled", {
            body: "You will now receive notifications even when the app is in the background",
            icon: '/icons/app-logo.png',
            badge: '/icons/app-logo.png'
          } as NotificationOptions);
          
          // Close the test notification after 3 seconds
          setTimeout(() => {
            testNotification.close();
          }, 3000);
        }
      });
    }
    
    // Use a more battery-friendly approach for wake locks
    let wakeLockObj: any = null;
    
    // Only acquire wake lock when necessary (when a timer is active)
    const handleVisibilityChange = () => {
      // When the app goes to background and we have an active timer
      if (document.visibilityState === "hidden" && document.getElementById('active-timer-indicator')) {
        // Try to acquire a minimal wake lock only when needed
        if ("wakeLock" in navigator && wakeLockObj === null) {
          try {
            // Request a CPU wake lock instead of screen wake lock (more battery friendly)
            (navigator as any).wakeLock.request("system")
              .then((wl: any) => {
                wakeLockObj = wl;
                console.log("Minimal wake lock acquired to maintain timer accuracy");
                
                // Set up auto-release after a reasonable time (30 minutes max)
                // This prevents battery drain if user forgets to stop timer
                setTimeout(() => {
                  if (wakeLockObj !== null) {
                    wakeLockObj.release().then(() => {
                      console.log("Wake lock auto-released after timeout to save battery");
                      wakeLockObj = null;
                    });
                  }
                }, 30 * 60 * 1000); // 30 minutes
              });
          } catch (err) {
            console.error(`Could not acquire minimal wake lock: ${err}`);
          }
        }
      } else if (document.visibilityState === "visible" && wakeLockObj !== null) {
        // Release wake lock when returning to the app to save battery
        wakeLockObj.release().then(() => {
          console.log("Wake lock released to save battery");
          wakeLockObj = null;
        }).catch((err: any) => {
          console.error("Error releasing wake lock:", err);
        });
      }
    };
    
    // Add visibility change listener 
    document.removeEventListener("visibilitychange", handleVisibilityChange); // Remove any existing
    document.addEventListener("visibilitychange", (e) => {
      // Handle wake lock management
      handleVisibilityChange();
      
      // Log visibility changes
      if (document.visibilityState === "hidden") {
        // App is going to background, start more aggressive notification updates
        console.log("App moved to background, enabling persistent notifications");
      } else {
        console.log("App is visible again");
      }
    });
    
    // Request persistent storage (helpful for maintaining state in background)
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().then(isPersisted => {
        console.log(`Persistent storage granted: ${isPersisted}`);
      });
    }
    
    // Check for background sync API - another indicator of background capabilities
    if ("serviceWorker" in navigator && "SyncManager" in window) {
      console.log("Background Sync API available");
    }
  }, []);
  
  // Active notification for background mode
  let activeNotification: Notification | null = null;
  
  // Function to show a notification for background operation
  const showBackgroundNotification = useCallback((title: string, options: NotificationOptions = {}) => {
    // Clear any existing notification first
    if (activeNotification) {
      activeNotification.close();
    }
    
    // Create and show new notification
    if ("Notification" in window && Notification.permission === "granted") {
      const notificationOptions: ExtendedNotificationOptions = {
        badge: '/icons/app-logo.png',
        icon: '/icons/app-logo.png',
        tag: 'background-timer', 
        requireInteraction: true, // Keep notification visible until user dismisses
        renotify: true, // Make the notification reappear even if using the same tag
        vibrate: [200, 100, 200], // Vibration pattern for mobile devices
        silent: false, // Allow sound for better visibility
        ...options
      };
      
      try {
        // Mobile device detection
        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
          console.log("Mobile device detected, using enhanced notifications");
          
          // For mobile, always use service worker when available
          if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
            // Use the registration showNotification method for better persistence
            navigator.serviceWorker.ready.then(registration => {
              // Service worker registration is ready, show notification through it
              registration.showNotification(title, {
                ...notificationOptions,
                // Mobile-specific options for better visibility
                vibrate: [100, 50, 100, 50, 100], // More pronounced vibration
                actions: [
                  {
                    action: 'view',
                    title: 'View Timer'
                  }
                ]
              } as NotificationOptions);
              
              // Set up an adaptive notification refresh strategy that balances 
              // reliability with battery conservation
              let refreshCount = 0;
              const maxRefreshes = 5; // Limit total refresh count
              let currentRefreshInterval = 20000; // Start with 20 seconds
              
              const adaptiveRefreshInterval = setInterval(() => {
                if (document.visibilityState === 'hidden') {
                  refreshCount++;
                  
                  // Update notification with progressive intervals to save battery
                  registration.showNotification(title, {
                    ...notificationOptions,
                    body: options.body || 'Still running in background',
                    // Only vibrate on the first few refreshes to save battery
                    vibrate: refreshCount <= 2 ? [50] : undefined, 
                    renotify: refreshCount <= 3 // Only make sound for first few refreshes
                  } as NotificationOptions);
                  
                  // After a few refreshes, increase the interval to save battery
                  if (refreshCount === 2) {
                    clearInterval(adaptiveRefreshInterval);
                    currentRefreshInterval = 60000; // Switch to 1 minute after initial refreshes
                    
                    // Start the longer interval
                    const longerInterval = setInterval(() => {
                      if (document.visibilityState === 'hidden' && refreshCount < maxRefreshes) {
                        refreshCount++;
                        registration.showNotification(title, {
                          ...notificationOptions,
                          body: options.body || 'Still running in background',
                          vibrate: undefined, // No vibration for later refreshes
                          renotify: false // No sound for later refreshes
                        } as NotificationOptions);
                      } else {
                        // Either app is visible again or we reached max refreshes
                        clearInterval(longerInterval);
                      }
                    }, currentRefreshInterval);
                  }
                } else {
                  // App is visible again, clear the interval
                  clearInterval(adaptiveRefreshInterval);
                }
              }, currentRefreshInterval);
            });
          } else {
            // Fallback for mobile without service worker
            activeNotification = new Notification(title, notificationOptions as NotificationOptions);
            
            // Set up a battery-friendly refresh strategy
            let fallbackRefreshCount = 0;
            const maxFallbackRefreshes = 4; // Limit refreshes without service worker
            
            // We use slightly different intervals for the fallback
            const fallbackRefreshTimer = setInterval(() => {
              if (document.visibilityState === 'hidden' && activeNotification) {
                fallbackRefreshCount++;
                
                // Close old notification and create a new one
                activeNotification.close();
                
                // Add running time indicator to body
                const updatedBody = options.body || 'Timer running';
                
                activeNotification = new Notification(title, {
                  ...notificationOptions,
                  body: updatedBody
                } as NotificationOptions);
                
                // Increase interval after initial refreshes to save battery
                if (fallbackRefreshCount === 2) {
                  clearInterval(fallbackRefreshTimer);
                  
                  // Start less frequent refreshes
                  const reducedFrequencyTimer = setInterval(() => {
                    if (document.visibilityState === 'hidden' && activeNotification && fallbackRefreshCount < maxFallbackRefreshes) {
                      fallbackRefreshCount++;
                      activeNotification.close();
                      activeNotification = new Notification(title, {
                        ...notificationOptions,
                        body: updatedBody
                      } as NotificationOptions);
                    } else {
                      clearInterval(reducedFrequencyTimer);
                    }
                  }, 60000); // Every minute for later refreshes
                }
              } else {
                clearInterval(fallbackRefreshTimer);
              }
            }, 20000); // Every 20 seconds initially
          }
        } else {
          // Desktop approach
          if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            // Send message to service worker to show notification
            const message: ServiceWorkerNotificationMessage = {
              type: 'SHOW_NOTIFICATION',
              title,
              options: notificationOptions
            };
            navigator.serviceWorker.controller.postMessage(message);
          } else {
            // Fallback to standard notification if service worker not available
            activeNotification = new Notification(title, notificationOptions as NotificationOptions);
          }
          
          // Less frequent refresh for desktop browsers
          const desktopRefreshInterval = setInterval(() => {
            if (document.visibilityState === 'hidden') {
              // Only refresh when app is in background
              if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                const message: ServiceWorkerNotificationMessage = {
                  type: 'SHOW_NOTIFICATION',
                  title: title + ' (still running)',
                  options: {
                    ...notificationOptions,
                    timestamp: Date.now() // Update timestamp to make it appear new
                  }
                };
                navigator.serviceWorker.controller.postMessage(message);
              } else if (activeNotification) {
                activeNotification.close();
                activeNotification = new Notification(title, notificationOptions as NotificationOptions);
              }
            } else {
              // If we're visible again, we can clear the interval
              clearInterval(desktopRefreshInterval);
            }
          }, 30000); // Every 30 seconds for desktop
        }
      } catch (err) {
        console.error("Could not create background notification", err);
        
        // Last-resort fallback
        try {
          // Use the most basic notification possible for maximum compatibility
          activeNotification = new Notification(title, {
            body: options.body || "Timer still running",
            icon: '/icons/app-logo.png'
          });
          
          // Even with the basic notification, try to keep it alive with a minimal approach
          const basicRefreshInterval = setInterval(() => {
            if (document.visibilityState === 'hidden' && activeNotification) {
              activeNotification.close();
              activeNotification = new Notification(title, {
                body: options.body || "Timer still running",
                icon: '/icons/app-logo.png'
              });
            } else {
              clearInterval(basicRefreshInterval);
            }
          }, 20000); // Every 20 seconds
        } catch (e) {
          console.error("Even fallback notification failed", e);
        }
      }
    }
  }, []);
  
  // Function to clear the background notification
  const clearBackgroundNotification = useCallback(() => {
    if (activeNotification) {
      activeNotification.close();
      activeNotification = null;
    }
  }, []);
  
  return {
    isBackgroundPermissionGranted,
    requestBackgroundPermission,
    showBackgroundNotification,
    clearBackgroundNotification
  };
}