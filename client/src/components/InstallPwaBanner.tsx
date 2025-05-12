import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Download } from 'lucide-react';

// Type definitions are now in src/types/pwa.d.ts

export default function InstallPwaBanner() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Detect if the app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches || 
        // @ts-ignore - Safari on iOS specific property
        window.navigator.standalone === true) {
      setIsInstalled(true);
      return;
    }

    // Store the install prompt for later use
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      // Store the event so it can be triggered later
      setInstallPrompt(e as BeforeInstallPromptEvent);
      // Show the install banner
      setShowBanner(true);
    };

    // Listen for the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if it's been more than 3 days since the user was last prompted
    const lastPrompt = localStorage.getItem('pwaInstallPromptTime');
    if (lastPrompt) {
      const daysSincePrompt = (Date.now() - parseInt(lastPrompt, 10)) / (1000 * 60 * 60 * 24);
      if (daysSincePrompt < 3) {
        // Don't show the banner if it's been less than 3 days
        setShowBanner(false);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;

    // Show the install prompt
    await installPrompt.prompt();

    // Wait for the user to respond to the prompt
    const choiceResult = await installPrompt.userChoice;
    
    // Update based on user choice
    if (choiceResult.outcome === 'accepted') {
      console.log('User accepted the install prompt');
      setIsInstalled(true);
    } else {
      console.log('User dismissed the install prompt');
      // Save the current time so we don't prompt again for a while
      localStorage.setItem('pwaInstallPromptTime', Date.now().toString());
    }

    // Clear the saved prompt
    setInstallPrompt(null);
    setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    // Save the current time so we don't prompt again for a while
    localStorage.setItem('pwaInstallPromptTime', Date.now().toString());
  };

  if (isInstalled || !showBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <Alert className="bg-gradient-to-r from-indigo-50 to-blue-50 border-blue-200">
        <div className="flex items-start justify-between w-full">
          <div>
            <AlertTitle className="text-blue-700 text-lg font-semibold mb-2">
              Install Good Works Stopwatch
            </AlertTitle>
            <AlertDescription className="text-slate-600">
              Install this app for easier access and offline functionality!
            </AlertDescription>
          </div>
          <div className="flex space-x-2 ml-4 mt-1">
            <Button variant="outline" size="sm" onClick={handleDismiss}>
              Not Now
            </Button>
            <Button 
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700" 
              size="sm" 
              onClick={handleInstallClick}
            >
              <Download className="mr-2 h-4 w-4" />
              Install
            </Button>
          </div>
        </div>
      </Alert>
    </div>
  );
}