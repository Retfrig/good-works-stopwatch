import { useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface BackgroundPermissionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onGrantPermission: () => void;
}

export default function BackgroundPermissionDialog({
  isOpen,
  onClose,
  onGrantPermission
}: BackgroundPermissionDialogProps) {
  
  const handleGrantPermission = useCallback(() => {
    onGrantPermission();
    onClose();
  }, [onGrantPermission, onClose]);
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Allow Background Operation</DialogTitle>
          <DialogDescription>
            For the timer to work reliably when your device is locked or the app is in the background, 
            we need your permission to run in the background.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <h3 className="font-medium">This allows:</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>Accurate timer tracking even when your screen is off</li>
              <li>Notification updates with remaining time</li>
              <li>Proper tracking when switching between apps</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-medium">We respect your privacy:</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>Background operation is optimized to save battery</li>
              <li>All data stays on your device (no tracking/analytics)</li>
              <li>You can disable this in your browser settings anytime</li>
            </ul>
          </div>
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Not Now
          </Button>
          <Button 
            onClick={handleGrantPermission}
            className="w-full sm:w-auto"
          >
            Allow Background Operation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}