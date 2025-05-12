import { useState, useEffect, useRef } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  className?: string;
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface HSV {
  h: number;
  s: number;
  v: number;
}

// Predefined color palette
const presetColors = [
  "#4C8BF5", // Blue
  "#2BA24C", // Green
  "#F1B211", // Yellow
  "#9C27B0", // Purple
  "#FF5722", // Orange
  "#E91E63", // Pink
  "#00BCD4", // Cyan
  "#795548", // Brown
  "#607D8B", // Blue Gray
  "#009688", // Teal
  "#FF1744", // Red
  "#FFCA28", // Amber
  "#3F51B5", // Indigo
  "#8BC34A", // Light Green
  "#FF9800", // Orange
  "#9E9E9E", // Grey
  "#000000", // Black
  "#FFFFFF", // White
];

// Convert HEX to RGB
const hexToRgb = (hex: string): RGB => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
};

// Convert RGB to HEX
const rgbToHex = (r: number, g: number, b: number): string => {
  return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
};

// Convert RGB to HSV
const rgbToHsv = (r: number, g: number, b: number): HSV => {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, v: v * 100 };
};

// Convert HSV to RGB
const hsvToRgb = (h: number, s: number, v: number): RGB => {
  h /= 360;
  s /= 100;
  v /= 100;

  let r = 0, g = 0, b = 0;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  switch (i % 6) {
    case 0:
      r = v; g = t; b = p;
      break;
    case 1:
      r = q; g = v; b = p;
      break;
    case 2:
      r = p; g = v; b = t;
      break;
    case 3:
      r = p; g = q; b = v;
      break;
    case 4:
      r = t; g = p; b = v;
      break;
    case 5:
      r = v; g = p; b = q;
      break;
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
};

export default function ColorPicker({ color, onChange, className }: ColorPickerProps) {
  const [selectedColor, setSelectedColor] = useState(color || presetColors[0]);
  const [customTab, setCustomTab] = useState("hsv");
  const [open, setOpen] = useState(false);
  
  // RGB values
  const rgb = hexToRgb(selectedColor);
  const [r, setR] = useState(rgb.r);
  const [g, setG] = useState(rgb.g);
  const [b, setB] = useState(rgb.b);
  
  // HSV values
  const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
  const [h, setH] = useState(hsv.h);
  const [s, setS] = useState(hsv.s);
  const [v, setV] = useState(hsv.v);
  
  // Refs for color gradient and saturation/value picker
  const gradientRef = useRef<HTMLDivElement>(null);
  const svPickerRef = useRef<HTMLDivElement>(null);
  const isDraggingGradient = useRef(false);
  const isDraggingSV = useRef(false);

  // Update the selected color if the color prop changes
  useEffect(() => {
    const newRgb = hexToRgb(color);
    const newHsv = rgbToHsv(newRgb.r, newRgb.g, newRgb.b);
    
    setSelectedColor(color);
    setR(newRgb.r);
    setG(newRgb.g);
    setB(newRgb.b);
    setH(newHsv.h);
    setS(newHsv.s);
    setV(newHsv.v);
  }, [color]);

  // Update RGB values when HSV changes
  useEffect(() => {
    const newRgb = hsvToRgb(h, s, v);
    setR(newRgb.r);
    setG(newRgb.g);
    setB(newRgb.b);
    setSelectedColor(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
  }, [h, s, v]);

  // Update HSV values when RGB changes
  useEffect(() => {
    const newColor = rgbToHex(r, g, b);
    const newHsv = rgbToHsv(r, g, b);
    
    setSelectedColor(newColor);
    setH(newHsv.h);
    setS(newHsv.s);
    setV(newHsv.v);
  }, [r, g, b]);

  // Apply the selected color
  const applyColor = (newColor: string) => {
    setSelectedColor(newColor);
    onChange(newColor);
  };

  // Handle preset color selection
  const handlePresetColorChange = (newColor: string) => {
    applyColor(newColor);
  };

  // Handle RGB sliders
  const handleRgbChange = (channel: 'r' | 'g' | 'b', value: number) => {
    switch (channel) {
      case 'r':
        setR(value);
        break;
      case 'g':
        setG(value);
        break;
      case 'b':
        setB(value);
        break;
    }
  };

  // Handle HSV sliders
  const handleHsvChange = (channel: 'h' | 's' | 'v', value: number) => {
    switch (channel) {
      case 'h':
        setH(value);
        break;
      case 's':
        setS(value);
        break;
      case 'v':
        setV(value);
        break;
    }
  };

  // Handle hex input change
  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Make sure it's a valid hex color
    if (/^#[0-9A-F]{6}$/i.test(value)) {
      applyColor(value);
    } else if (/^[0-9A-F]{6}$/i.test(value)) {
      applyColor(`#${value}`);
    }
  };

  // Color gradient background
  const gradientBackground = `linear-gradient(to right, 
    hsl(0, 100%, 50%), 
    hsl(60, 100%, 50%), 
    hsl(120, 100%, 50%), 
    hsl(180, 100%, 50%), 
    hsl(240, 100%, 50%), 
    hsl(300, 100%, 50%), 
    hsl(360, 100%, 50%)
  )`;

  // Handle hue gradient click/drag
  const handleHueGradientInteraction = (e: React.MouseEvent) => {
    if (!gradientRef.current) return;
    
    const rect = gradientRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const hueValue = (x / rect.width) * 360;
    
    setH(hueValue);
  };

  // Handle saturation/value picker click/drag
  const handleSVPickerInteraction = (e: React.MouseEvent) => {
    if (!svPickerRef.current) return;
    
    const rect = svPickerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    
    const saturationValue = (x / rect.width) * 100;
    const brightnessValue = 100 - (y / rect.height) * 100;
    
    setS(saturationValue);
    setV(brightnessValue);
  };

  // Mouse event handlers for dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingGradient.current) {
        handleHueGradientInteraction(e as unknown as React.MouseEvent);
      }
      if (isDraggingSV.current) {
        handleSVPickerInteraction(e as unknown as React.MouseEvent);
      }
    };

    const handleMouseUp = () => {
      isDraggingGradient.current = false;
      isDraggingSV.current = false;
      
      // Apply the selected color when dragging ends
      onChange(selectedColor);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove as unknown as (e: TouchEvent) => void);
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove as unknown as (e: TouchEvent) => void);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [selectedColor, onChange]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-10 h-10 p-0 border-2",
            open ? "border-ring" : "border-input",
            className
          )}
          style={{ backgroundColor: selectedColor }}
          aria-label="Pick a color"
        />
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3">
        <div className="space-y-3">
          {/* Preview of selected color */}
          <div className="flex items-center gap-2">
            <div 
              className="w-12 h-12 rounded-md border border-input" 
              style={{ backgroundColor: selectedColor }}
            />
            <Input 
              value={selectedColor} 
              onChange={handleHexChange}
              className="font-mono text-sm"
            />
          </div>
          
          {/* Color picker tabs */}
          <Tabs value={customTab} onValueChange={setCustomTab} className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="palette" className="flex-1">Palette</TabsTrigger>
              <TabsTrigger value="hsv" className="flex-1">Custom</TabsTrigger>
            </TabsList>
            
            {/* Preset color palette */}
            <TabsContent value="palette" className="mt-2">
              <div className="grid grid-cols-6 gap-2">
                {presetColors.map((presetColor) => (
                  <Button
                    key={presetColor}
                    variant="outline"
                    className={cn(
                      "w-9 h-9 p-0 rounded-md border-2",
                      selectedColor.toLowerCase() === presetColor.toLowerCase()
                        ? "border-primary"
                        : "border-transparent"
                    )}
                    style={{ backgroundColor: presetColor }}
                    onClick={() => handlePresetColorChange(presetColor)}
                    aria-label={`Select color ${presetColor}`}
                  />
                ))}
              </div>
            </TabsContent>
            
            {/* Custom color picker (HSV) */}
            <TabsContent value="hsv" className="mt-2 space-y-3">
              {/* Saturation/Value picker */}
              <div 
                ref={svPickerRef}
                className="w-full h-40 rounded-md relative cursor-crosshair"
                style={{ 
                  backgroundColor: `hsl(${h}, 100%, 50%)`,
                  backgroundImage: 'linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)'
                }}
                onMouseDown={(e) => {
                  isDraggingSV.current = true;
                  handleSVPickerInteraction(e);
                }}
                onTouchStart={(e) => {
                  isDraggingSV.current = true;
                  const touchEvent = {
                    clientX: e.touches[0].clientX,
                    clientY: e.touches[0].clientY
                  } as React.MouseEvent;
                  handleSVPickerInteraction(touchEvent);
                }}
              >
                {/* Color selection indicator */}
                <div 
                  className="w-4 h-4 rounded-full border-2 border-white absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none shadow-md"
                  style={{ 
                    left: `${s}%`, 
                    top: `${100 - v}%`,
                    backgroundColor: selectedColor
                  }}
                />
              </div>
              
              {/* Hue gradient slider */}
              <div 
                ref={gradientRef}
                className="w-full h-5 rounded-md cursor-pointer"
                style={{ background: gradientBackground }}
                onMouseDown={(e) => {
                  isDraggingGradient.current = true;
                  handleHueGradientInteraction(e);
                }}
                onTouchStart={(e) => {
                  isDraggingGradient.current = true;
                  const touchEvent = {
                    clientX: e.touches[0].clientX,
                    clientY: e.touches[0].clientY
                  } as React.MouseEvent;
                  handleHueGradientInteraction(touchEvent);
                }}
              >
                {/* Hue selection indicator */}
                <div 
                  className="w-2 h-5 rounded-sm border-2 border-white absolute -translate-x-1/2 pointer-events-none shadow-md"
                  style={{ 
                    left: `${(h / 360) * 100}%`,
                    backgroundColor: `hsl(${h}, 100%, 50%)`
                  }}
                />
              </div>
              
              {/* RGB sliders */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs w-6">R</span>
                  <Slider
                    value={[r]} 
                    min={0} 
                    max={255} 
                    step={1}
                    className="flex-1"
                    onValueChange={(vals) => handleRgbChange('r', vals[0])}
                  />
                  <span className="text-xs w-8 text-right">{r}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs w-6">G</span>
                  <Slider
                    value={[g]} 
                    min={0} 
                    max={255} 
                    step={1}
                    className="flex-1"
                    onValueChange={(vals) => handleRgbChange('g', vals[0])}
                  />
                  <span className="text-xs w-8 text-right">{g}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs w-6">B</span>
                  <Slider
                    value={[b]} 
                    min={0} 
                    max={255} 
                    step={1}
                    className="flex-1"
                    onValueChange={(vals) => handleRgbChange('b', vals[0])}
                  />
                  <span className="text-xs w-8 text-right">{b}</span>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          {/* Action buttons */}
          <div className="flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                onChange(selectedColor);
                setOpen(false);
              }}
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}