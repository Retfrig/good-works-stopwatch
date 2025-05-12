import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription,
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatTime } from "@/lib/utils";
import { soundPlayer } from "@/utils/notifications";

// Preset ringtones to choose from
const presetRingtones = [
  { name: "Bell", url: "/sounds/bell.mp3" },
  { name: "Chime", url: "/sounds/chime.mp3" },
  { name: "Alert", url: "/sounds/alert.mp3" },
];

interface TimerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  categoryName: string;
  onStart: (seconds: number, ringtoneUrl: string) => void;
}

export default function TimerDialog({
  isOpen,
  onClose,
  categoryName,
  onStart
}: TimerDialogProps) {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);
  const [ringtoneUrl, setRingtoneUrl] = useState(presetRingtones[0].url);
  const [customUrl, setCustomUrl] = useState("");
  const [activeTab, setActiveTab] = useState("presets");
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [spotifyTrackUrl, setSpotifyTrackUrl] = useState("");
  const [customFile, setCustomFile] = useState<File | null>(null);

  // Initialize audio element for previews
  useEffect(() => {
    const audio = new Audio();
    audio.addEventListener('ended', () => {
      setIsPlaying(null);
    });
    setPreviewAudio(audio);

    return () => {
      if (audio) {
        audio.pause();
        audio.src = "";
      }
    };
  }, []);

  // Handle preset ringtone selection
  const handleRingtoneSelect = (url: string) => {
    setRingtoneUrl(url);
  };

  // Handle hours input change
  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 0 && value <= 23) {
      setHours(value);
    }
  };

  // Handle minutes input change
  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 0 && value <= 59) {
      setMinutes(value);
    }
  };

  // Handle seconds input change
  const handleSecondsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 0 && value <= 59) {
      setSeconds(value);
    }
  };

  // Play a preview of the ringtone with enhanced offline support
  const playPreview = (url: string) => {
    // Handle Stop/Pause
    if (isPlaying === url) {
      if (previewAudio) {
        previewAudio.pause();
        previewAudio.currentTime = 0;
      }
      setIsPlaying(null);
      return;
    }
    
    // Stop any currently playing audio
    if (isPlaying) {
      if (previewAudio) {
        previewAudio.pause();
        previewAudio.currentTime = 0;
      }
    }
    
    // Skip preview for Spotify links
    if (url.includes('spotify.com')) {
      alert("Spotify links can only be played when the timer completes");
      return;
    }
    
    // Try our enhanced sound player first for offline support
    soundPlayer.playSound(url)
      .then(source => {
        if (source) {
          // Set a timeout to automatically stop the preview after 3 seconds
          setTimeout(() => {
            soundPlayer.stopSound(source);
            setIsPlaying(null);
          }, 3000);
          
          setIsPlaying(url);
        } else {
          // Fallback to HTML Audio
          if (previewAudio) {
            previewAudio.src = url;
            previewAudio.play()
              .then(() => {
                setIsPlaying(url);
              })
              .catch(error => {
                console.error("Audio playback failed:", error);
                alert("Could not preview sound. It will still work when timer completes.");
              });
          }
        }
      })
      .catch(error => {
        console.error("Sound player failed:", error);
        
        // Try HTML Audio as fallback
        if (previewAudio) {
          previewAudio.src = url;
          previewAudio.play()
            .then(() => {
              setIsPlaying(url);
            })
            .catch(audioError => {
              console.error("Fallback audio also failed:", audioError);
              alert("Could not preview sound. It will still work when timer completes.");
            });
        }
      });
  };

  // Handle custom URL input
  const handleCustomUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomUrl(e.target.value);
  };

  // Save custom URL as ringtone
  const saveCustomUrl = () => {
    if (customUrl.trim()) {
      setRingtoneUrl(customUrl);
      setActiveTab("presets");
    }
  };

  // Handle Spotify URL input
  const handleSpotifyUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSpotifyTrackUrl(e.target.value);
  };

  // Extract Spotify track ID and save
  const saveSpotifyTrack = () => {
    // Extract the Spotify track ID from URL
    const trackIdMatch = spotifyTrackUrl.match(/track\/([a-zA-Z0-9]+)/);
    if (trackIdMatch && trackIdMatch[1]) {
      const trackId = trackIdMatch[1];
      // Create embedded player URL
      const embedUrl = `https://open.spotify.com/embed/track/${trackId}`;
      setRingtoneUrl(embedUrl);
      setActiveTab("presets");
    }
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setCustomFile(files[0]);
      
      // Create a local URL for the uploaded file
      const objectUrl = URL.createObjectURL(files[0]);
      setRingtoneUrl(objectUrl);
    }
  };

  // Handle start timer
  const handleStartTimer = () => {
    const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;
    if (totalSeconds > 0) {
      onStart(totalSeconds, ringtoneUrl);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Set Timer for {categoryName}</DialogTitle>
          <DialogDescription>
            Set the duration and choose a ringtone to play when the timer completes.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          {/* Timer Duration */}
          <div className="space-y-3">
            <Label>Timer Duration: {formatTime((hours * 3600) + (minutes * 60) + seconds)}</Label>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center">
                <Label className="text-xs mb-1">Hours</Label>
                <Input
                  type="number"
                  value={hours}
                  onChange={handleHoursChange}
                  min={0}
                  max={23}
                  className="text-center"
                />
              </div>
              
              <div className="flex flex-col items-center">
                <Label className="text-xs mb-1">Minutes</Label>
                <Input
                  type="number"
                  value={minutes}
                  onChange={handleMinutesChange}
                  min={0}
                  max={59}
                  className="text-center"
                />
              </div>
              
              <div className="flex flex-col items-center">
                <Label className="text-xs mb-1">Seconds</Label>
                <Input
                  type="number"
                  value={seconds}
                  onChange={handleSecondsChange}
                  min={0}
                  max={59}
                  className="text-center"
                />
              </div>
            </div>
            
            {/* Quick time presets */}
            <div className="flex flex-wrap gap-2 mt-2">
              <Button 
                variant="outline" 
                size="sm"
                type="button"
                onClick={() => { setHours(0); setMinutes(5); setSeconds(0); }}
              >
                5m
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                type="button"
                onClick={() => { setHours(0); setMinutes(10); setSeconds(0); }}
              >
                10m
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                type="button"
                onClick={() => { setHours(0); setMinutes(15); setSeconds(0); }}
              >
                15m
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                type="button"
                onClick={() => { setHours(0); setMinutes(30); setSeconds(0); }}
              >
                30m
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                type="button"
                onClick={() => { setHours(1); setMinutes(0); setSeconds(0); }}
              >
                1h
              </Button>
            </div>
          </div>
          
          {/* Ringtone Selection */}
          <div className="space-y-2">
            <Label>Ringtone</Label>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="presets">Presets</TabsTrigger>
                <TabsTrigger value="custom">Custom URL</TabsTrigger>
                <TabsTrigger value="spotify">Spotify</TabsTrigger>
              </TabsList>
              
              {/* Preset Ringtones */}
              <TabsContent value="presets" className="space-y-3">
                <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto p-1">
                  {presetRingtones.map((ringtone) => (
                    <div 
                      key={ringtone.url}
                      className={`
                        p-3 border rounded-md flex items-center justify-between 
                        ${ringtoneUrl === ringtone.url ? 'border-primary bg-primary/10' : 'border-input'}
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8" 
                          onClick={() => playPreview(ringtone.url)}
                        >
                          <i className={`ri-${isPlaying === ringtone.url ? 'pause' : 'play'}-fill`}></i>
                        </Button>
                        <span>{ringtone.name}</span>
                      </div>
                      <Button 
                        size="sm" 
                        variant={ringtoneUrl === ringtone.url ? "default" : "outline"} 
                        onClick={() => handleRingtoneSelect(ringtone.url)}
                      >
                        {ringtoneUrl === ringtone.url ? "Selected" : "Select"}
                      </Button>
                    </div>
                  ))}

                  {customFile && (
                    <div 
                      className={`
                        p-3 border rounded-md flex items-center justify-between 
                        ${ringtoneUrl.startsWith('blob:') ? 'border-primary bg-primary/10' : 'border-input'}
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8" 
                          onClick={() => playPreview(ringtoneUrl)}
                        >
                          <i className={`ri-${isPlaying === ringtoneUrl ? 'pause' : 'play'}-fill`}></i>
                        </Button>
                        <span>{customFile.name}</span>
                      </div>
                      <Button 
                        size="sm" 
                        variant={ringtoneUrl.startsWith('blob:') ? "default" : "outline"} 
                        onClick={() => handleRingtoneSelect(ringtoneUrl)}
                      >
                        {ringtoneUrl.startsWith('blob:') ? "Selected" : "Select"}
                      </Button>
                    </div>
                  )}
                </div>
                
                {/* Upload custom audio file */}
                <div className="pt-2">
                  <Label htmlFor="upload-ringtone" className="block mb-2">Upload Audio</Label>
                  <Input 
                    id="upload-ringtone" 
                    type="file" 
                    accept="audio/*" 
                    onChange={handleFileUpload}
                  />
                </div>
              </TabsContent>
              
              {/* Custom URL Input */}
              <TabsContent value="custom" className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="custom-url">Audio URL</Label>
                  <Input
                    id="custom-url"
                    type="url"
                    placeholder="https://example.com/audio.mp3"
                    value={customUrl}
                    onChange={handleCustomUrlChange}
                  />
                </div>
                <div className="flex justify-between">
                  <Button 
                    variant="outline" 
                    onClick={() => playPreview(customUrl)}
                    disabled={!customUrl.trim()}
                  >
                    <i className={`ri-${isPlaying === customUrl ? 'pause' : 'play'}-fill mr-1`}></i>
                    {isPlaying === customUrl ? "Stop" : "Preview"}
                  </Button>
                  <Button 
                    onClick={saveCustomUrl}
                    disabled={!customUrl.trim()}
                  >
                    Use This Sound
                  </Button>
                </div>
              </TabsContent>
              
              {/* Spotify Track Selection */}
              <TabsContent value="spotify" className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="spotify-url">Spotify Track URL</Label>
                  <Input
                    id="spotify-url"
                    type="url"
                    placeholder="https://open.spotify.com/track/..."
                    value={spotifyTrackUrl}
                    onChange={handleSpotifyUrlChange}
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste a Spotify track URL to use as your timer sound
                  </p>
                </div>
                <Button 
                  onClick={saveSpotifyTrack}
                  disabled={!spotifyTrackUrl.includes('spotify.com/track/')}
                  className="w-full"
                >
                  <i className="ri-spotify-fill mr-1"></i>
                  Use Spotify Track
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">Cancel</Button>
          <Button onClick={handleStartTimer} className="w-full sm:w-auto">Start Timer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}