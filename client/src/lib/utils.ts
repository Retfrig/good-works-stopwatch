import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}

export function getTotalTime(categories: Record<string, { time: number; color: string }>): number {
  return Object.values(categories).reduce((acc, cat) => acc + cat.time, 0);
}

export function getMostTimeSpentCategory(categories: Record<string, { time: number; color: string }>): {
  name: string;
  time: number;
} | null {
  if (Object.keys(categories).length === 0) return null;
  
  let maxTime = 0;
  let maxCategory = "";
  
  for (const [name, data] of Object.entries(categories)) {
    if (data.time > maxTime) {
      maxTime = data.time;
      maxCategory = name;
    }
  }
  
  return { name: maxCategory, time: maxTime };
}
