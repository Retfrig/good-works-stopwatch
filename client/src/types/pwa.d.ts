// Type definitions for PWA-specific browser features

interface BeforeInstallPromptEvent extends Event {
  /**
   * Returns a Promise that resolves to a DOMString containing either "accepted" or "dismissed".
   */
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;

  /**
   * Allows you to show the install prompt at a time of your own choosing.
   * This method returns a Promise.
   */
  prompt(): Promise<void>;
}

// Extend the Window interface to include beforeinstallprompt event
interface WindowEventMap {
  /**
   * Fired when the browser determines that a Progressive Web App could be installed.
   */
  beforeinstallprompt: BeforeInstallPromptEvent;
  
  /**
   * Fired when the installed PWA is successfully installed on the device.
   */
  appinstalled: Event;
}