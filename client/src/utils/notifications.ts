// Utility functions for handling notifications

// Check if notifications are supported and permission is granted
export async function checkNotificationPermission(): Promise<boolean> {
  // Check if the browser supports notifications
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }
  
  // Check if permission is already granted
  if (Notification.permission === 'granted') {
    return true;
  }
  
  // Request permission if it's not denied
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
}

// Send a notification
export async function sendNotification(title: string, options: NotificationOptions = {}): Promise<Notification | null> {
  const hasPermission = await checkNotificationPermission();
  
  if (!hasPermission) {
    console.log('Notification permission not granted');
    return null;
  }
  
  // Set default options
  const defaultOptions: NotificationOptions = {
    icon: '/icons/app-logo.png',
    badge: '/icons/app-logo.png',
    ...options
  };
  
  // Add vibration if supported (not in the TypeScript type but supported in browsers)
  const extendedOptions = {
    ...defaultOptions,
    vibrate: [200, 100, 200]
  };
  
  // Create and return the notification with extended options
  // Using 'as any' to bypass TypeScript checking for vibrate property
  return new Notification(title, extendedOptions as any);
}

// Utility for playing sounds even in offline mode
export class SoundPlayer {
  private audioContext: AudioContext | null = null;
  private soundCache: Map<string, AudioBuffer> = new Map();
  
  constructor() {
    // Initialize audio context on first user interaction
    document.addEventListener('click', () => {
      if (!this.audioContext) {
        this.initAudioContext();
      }
    });
  }
  
  private initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.error('Web Audio API not supported', e);
    }
  }
  
  // Pre-load and cache sounds for offline use
  async preloadSound(url: string): Promise<boolean> {
    if (!this.audioContext) {
      this.initAudioContext();
    }
    
    if (!this.audioContext) return false;
    
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      this.soundCache.set(url, audioBuffer);
      return true;
    } catch (error) {
      console.error('Failed to preload sound', error);
      return false;
    }
  }
  
  // Play a sound from cache or fetch it first
  async playSound(url: string, loop: boolean = false): Promise<AudioBufferSourceNode | null> {
    if (!this.audioContext) {
      this.initAudioContext();
    }
    
    if (!this.audioContext) return null;
    
    try {
      let buffer = this.soundCache.get(url);
      
      // If sound is not cached, try to fetch and decode it
      if (!buffer) {
        const success = await this.preloadSound(url);
        if (!success) return null;
        buffer = this.soundCache.get(url);
      }
      
      if (!buffer) return null;
      
      // Create and configure the sound source
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      source.loop = loop;
      
      // Start playing
      source.start(0);
      return source;
    } catch (error) {
      console.error('Failed to play sound', error);
      return null;
    }
  }
  
  // Stop a playing sound
  stopSound(source: AudioBufferSourceNode): void {
    if (source) {
      try {
        source.stop();
      } catch (error) {
        console.error('Failed to stop sound', error);
      }
    }
  }
}

// Create a singleton instance of the sound player
export const soundPlayer = new SoundPlayer();

// Default alarm sounds
export const DEFAULT_SOUNDS = {
  bell: '/sounds/bell.mp3',
  chime: '/sounds/chime.mp3',
  alert: '/sounds/alert.mp3'
};

// Preload default sounds
export function preloadDefaultSounds(): void {
  Object.values(DEFAULT_SOUNDS).forEach(url => {
    soundPlayer.preloadSound(url).catch(() => {
      console.log(`Failed to preload sound: ${url}`);
    });
  });
}