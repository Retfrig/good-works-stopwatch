import { useState, useEffect, useCallback, useRef } from "react";
import { loadTodayData, saveData, CategoryData } from "@/lib/storage";
import { sendNotification, soundPlayer, DEFAULT_SOUNDS } from "@/utils/notifications";
import { useBackgroundMode } from "@/hooks/useBackgroundMode";
import { formatTime } from "@/lib/utils";

export function useGoodWorks() {
  const [categories, setCategories] = useState<Record<string, CategoryData>>({});
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);
  const timerEndRef = useRef<number | null>(null);
  
  // Background mode support
  const {
    isBackgroundPermissionGranted,
    requestBackgroundPermission,
    showBackgroundNotification,
    clearBackgroundNotification
  } = useBackgroundMode();
  
  // Track if we should request background permission
  const [shouldShowBackgroundPermission, setShouldShowBackgroundPermission] = useState(false);

  // Load data on initial render
  useEffect(() => {
    const savedCategories = loadTodayData();
    setCategories(savedCategories);
  }, []);

  // Save data whenever categories change
  useEffect(() => {
    saveData(categories);
  }, [categories]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, []);

  const stopActive = useCallback(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setActiveCategory(null);
    timerEndRef.current = null;
    
    // Clear any background notification when stopping the timer
    clearBackgroundNotification();
    
    // Remove the timer indicator element to stop wake locks
    const indicator = document.getElementById('active-timer-indicator');
    if (indicator) {
      indicator.remove();
    }
  }, [clearBackgroundNotification]);

  const startCategory = useCallback((name: string) => {
    stopActive();
    setActiveCategory(name);
    
    // Check if we should ask for background permission
    if (!isBackgroundPermissionGranted && !shouldShowBackgroundPermission) {
      setShouldShowBackgroundPermission(true);
    }
    
    // Add a hidden marker element to indicate active timer
    // This will be used by our battery-efficient wake lock strategy
    if (!document.getElementById('active-timer-indicator')) {
      const indicator = document.createElement('div');
      indicator.id = 'active-timer-indicator';
      indicator.style.display = 'none';
      indicator.dataset.categoryName = name;
      document.body.appendChild(indicator);
    }
    
    // Show background notification if permission is granted
    if (isBackgroundPermissionGranted) {
      showBackgroundNotification(`Tracking: ${name}`, {
        body: 'Timer is running in the background',
        tag: 'background-tracking'
      });
    }
    
    // Standard timing interval
    intervalRef.current = window.setInterval(() => {
      // Get the current time for this category to show in background notification
      setCategories(prev => {
        const updatedTime = prev[name].time + 1;
        
        // Update background notification with current time every 15 seconds
        if (isBackgroundPermissionGranted && updatedTime % 15 === 0) {
          showBackgroundNotification(`Tracking: ${name} - ${formatTime(updatedTime)}`, {
            body: 'Timer is running in the background',
            tag: 'background-tracking'
          });
        }
        
        return {
          ...prev,
          [name]: {
            ...prev[name],
            time: updatedTime
          }
        };
      });
    }, 1000);
  }, [stopActive, isBackgroundPermissionGranted, shouldShowBackgroundPermission, showBackgroundNotification]);

  const [timerAudio, setTimerAudio] = useState<HTMLAudioElement | null>(null);
  const [ringtoneUrl, setRingtoneUrl] = useState<string>("");
  
  // Create audio element for the timer
  useEffect(() => {
    const audio = new Audio();
    audio.loop = true;
    setTimerAudio(audio);
    
    return () => {
      if (audio) {
        audio.pause();
        audio.src = "";
      }
    };
  }, []);
  
  // Function to play ringtone automatically when timer completes
  const playRingtone = useCallback((name: string, ringtone: string) => {
    let ringtonePlaying = false;
    let audioSource: AudioBufferSourceNode | null = null;
    
    // Alert dialog for timer completion (always show, but don't block audio)
    setTimeout(() => {
      window.alert(`Timer completed for ${name}!`);
    }, 10);
    
    if (!ringtone) {
      // If no ringtone provided, use the default bell sound
      ringtone = "/sounds/bell.mp3";
    }
    
    // For Spotify links, show special alert
    if (ringtone.includes('spotify.com')) {
      window.alert(`Timer completed for ${name}! Open Spotify to hear your selected track.`);
      return;
    }
    
    // Try multiple audio playback methods
    
    // Method 1: Web Audio API through our sound player
    try {
      soundPlayer.playSound(ringtone, true)
        .then(source => {
          audioSource = source;
          if (source) {
            ringtonePlaying = true;
            
            // Show stop button after a delay
            setTimeout(() => {
              const stopSound = window.confirm("Sound playing. Stop sound?");
              if (stopSound && audioSource) {
                soundPlayer.stopSound(audioSource);
              }
            }, 1000);
          }
        })
        .catch(err => console.error("Sound player error:", err));
    } catch (e) {
      console.warn("Sound player method failed:", e);
    }
    
    // Method 2: HTML Audio element (parallel attempt, as a fallback)
    if (timerAudio) {
      try {
        // Configure the audio element
        timerAudio.loop = true;
        timerAudio.src = ringtone;
        timerAudio.volume = 0.7;
        
        const playPromise = timerAudio.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              // If the Web Audio API method didn't work
              if (!ringtonePlaying) {
                ringtonePlaying = true;
                
                // Show stop button after a delay
                setTimeout(() => {
                  const stopSound = window.confirm("Sound playing. Stop sound?");
                  if (stopSound && timerAudio) {
                    timerAudio.pause();
                    timerAudio.currentTime = 0;
                  }
                }, 1000);
              }
            })
            .catch(err => {
              console.error("HTML Audio playback failed:", err);
              
              // Method 3: AudioContext Oscillator as last resort
              if (!ringtonePlaying) {
                try {
                  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                  const oscillator = audioContext.createOscillator();
                  oscillator.type = 'sine';
                  oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 note
                  oscillator.connect(audioContext.destination);
                  oscillator.start();
                  
                  // Play the beep for 2 seconds
                  setTimeout(() => {
                    oscillator.stop();
                  }, 2000);
                  
                  ringtonePlaying = true;
                } catch (oscillatorError) {
                  console.error("Oscillator method failed:", oscillatorError);
                  
                  // If all else fails, just show an additional alert
                  if (!ringtonePlaying) {
                    window.alert(`Timer for ${name} has completed! (Sound playback failed)`);
                  }
                }
              }
            });
        }
      } catch (audioError) {
        console.error("HTML Audio setup failed:", audioError);
      }
    }
  }, [timerAudio]);

  const startTimer = useCallback((name: string, seconds: number, ringtone: string = "") => {
    // Stop any existing timer
    stopActive();
    
    // Set the active category
    setActiveCategory(name);
    
    // Use the exact number of seconds requested
    const startTime = Date.now();
    const endTime = startTime + (seconds * 1000);
    timerEndRef.current = endTime;
    
    // Calculate the end time as a real time
    const endDateTime = new Date(endTime);
    const formattedEndTime = endDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Save the ringtone URL for when the timer completes
    if (ringtone) {
      setRingtoneUrl(ringtone);
    }
    
    // Add a hidden marker element to indicate active timer
    // This will be used by our battery-efficient wake lock strategy
    if (!document.getElementById('active-timer-indicator')) {
      const indicator = document.createElement('div');
      indicator.id = 'active-timer-indicator';
      indicator.style.display = 'none';
      indicator.dataset.categoryName = name;
      indicator.dataset.timerEnd = endTime.toString();
      document.body.appendChild(indicator);
    }
    
    // Check if we should ask for background permission
    if (!isBackgroundPermissionGranted && !shouldShowBackgroundPermission) {
      setShouldShowBackgroundPermission(true);
    }
    
    // Initialize AudioContext early to help with mobile browsers
    try {
      if (typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined') {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const silentContext = new AudioContextClass();
        // Create and immediately cancel a silent sound to "warm up" the audio system
        const silent = silentContext.createBuffer(1, 1, 22050);
        const source = silentContext.createBufferSource();
        source.buffer = silent;
        source.connect(silentContext.destination);
        source.start(0);
        source.stop(0.001);
      }
    } catch (e) {
      console.warn("Could not initialize audio context:", e);
    }
    
    // Show background notification if permission is granted
    if (isBackgroundPermissionGranted) {
      showBackgroundNotification(`Timer: ${name} (${formatTime(seconds)})`, {
        body: `Will complete at ${formattedEndTime}`,
        tag: 'background-timer'
      });
    }
    
    // Calculate expected elapsed time at each interval
    let elapsedIntervals = 0;
    let lastNotificationUpdate = 0;
    
    // Start the interval for tracking time
    intervalRef.current = window.setInterval(() => {
      const now = Date.now();
      const totalElapsed = now - startTime;
      const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
      
      // Only increment time once per second (avoid double counting)
      const expectedElapsed = Math.floor(totalElapsed / 1000);
      const increment = expectedElapsed - elapsedIntervals;
      
      if (increment > 0 && remaining > 0) {
        elapsedIntervals = expectedElapsed;
        
        // Update the category time
        setCategories(prev => ({
          ...prev,
          [name]: {
            ...prev[name],
            time: prev[name].time + increment
          }
        }));
        
        // Update background notification every 15 seconds or when seconds remaining is a nice round number
        if (isBackgroundPermissionGranted && 
            (now - lastNotificationUpdate > 15000 || 
             remaining % 60 === 0 || 
             remaining <= 10)) {
          
          showBackgroundNotification(`Timer: ${name} - ${formatTime(remaining)}`, {
            body: `Will complete at ${formattedEndTime}`,
            tag: 'background-timer'
          });
          
          lastNotificationUpdate = now;
        }
      } 
      
      // Check if timer has completed
      if (now >= endTime) {
        // Stop the timer
        window.clearInterval(intervalRef.current!);
        intervalRef.current = null;
        
        // Reset active category
        setActiveCategory(null);
        
        // Clear the background notification
        clearBackgroundNotification();
        
        // Create and send notification
        sendNotification(`Timer Complete: ${name}`, {
          body: `Your timer for ${name} has completed!`,
          icon: '/icons/app-logo.png'
        }).catch(err => console.error("Failed to send notification:", err));
        
        // Play the ringtone automatically
        playRingtone(name, ringtone);
      }
    }, 100); // Use shorter interval for more accurate checks
  }, [
    stopActive, 
    playRingtone, 
    isBackgroundPermissionGranted, 
    shouldShowBackgroundPermission, 
    showBackgroundNotification,
    clearBackgroundNotification
  ]);
  
  // For backward compatibility
  const handleTimerCompletion = useCallback((name: string, ringtone: string) => {
    playRingtone(name, ringtone);
  }, [playRingtone]);

  const addCategory = useCallback((name: string, color: string) => {
    if (!name.trim()) {
      return false;
    }
    
    if (categories[name]) {
      return false;
    }
    
    setCategories(prev => ({
      ...prev,
      [name]: {
        time: 0,
        color
      }
    }));
    
    return true;
  }, [categories]);

  const editCategory = useCallback((oldName: string, newName: string, newColor: string) => {
    if (!oldName.trim() || !newName.trim()) {
      return false;
    }
    
    // If the name is changing, ensure the new name doesn't already exist
    if (oldName !== newName && categories[newName]) {
      return false;
    }
    
    setCategories(prev => {
      const updated = { ...prev };
      
      // Get the existing category data
      const categoryData = { ...updated[oldName] };
      
      // Update color
      categoryData.color = newColor;
      
      // If the name is changing, remove the old entry and add a new one
      if (oldName !== newName) {
        delete updated[oldName];
        updated[newName] = categoryData;
        
        // If this was the active category, update the active category name
        if (activeCategory === oldName) {
          setActiveCategory(newName);
        }
      } else {
        // Just update the existing entry
        updated[oldName] = categoryData;
      }
      
      return updated;
    });
    
    return true;
  }, [categories, activeCategory]);

  const deleteCategory = useCallback((name: string) => {
    if (!name.trim() || !categories[name]) {
      return false;
    }
    
    // If this is the active category, stop tracking
    if (activeCategory === name) {
      stopActive();
    }
    
    setCategories(prev => {
      const updated = { ...prev };
      delete updated[name];
      return updated;
    });
    
    return true;
  }, [categories, activeCategory, stopActive]);

  return {
    categories,
    activeCategory,
    startCategory,
    startTimer,
    stopActive,
    addCategory,
    editCategory,
    deleteCategory,
    timerAudio,
    // Background mode related exports
    isBackgroundPermissionGranted,
    requestBackgroundPermission,
    shouldShowBackgroundPermission,
    setShouldShowBackgroundPermission
  };
}
