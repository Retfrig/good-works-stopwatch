import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker, requestNotificationPermission } from "./pwa";
import { preloadDefaultSounds } from "./utils/notifications";

// Register service worker for PWA functionality
registerServiceWorker();

// Request notification permissions
requestNotificationPermission();

// Preload sound files for offline use
preloadDefaultSounds();

createRoot(document.getElementById("root")!).render(<App />);
