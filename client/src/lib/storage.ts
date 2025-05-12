export interface CategoryData {
  time: number;
  color: string;
}

export interface DayData {
  date: string;
  categories: Record<string, CategoryData>;
}

const STORAGE_KEY = "goodWorksData";
const WEEKLY_KEY = "goodWorksWeekly";

export function loadTodayData(): Record<string, CategoryData> {
  const raw = localStorage.getItem(STORAGE_KEY);
  
  if (raw) {
    const parsed = JSON.parse(raw) as DayData;
    const today = new Date().toDateString();
    
    if (parsed.date !== today) {
      // Archive yesterday's data and start fresh
      archiveDay(parsed);
      return {};
    }
    
    return parsed.categories;
  }
  
  return {};
}

/**
 * Loads historical tracking data (up to 365 days)
 * @returns Array of DayData objects representing historical tracking data
 */
export function loadWeeklyData(): DayData[] {
  const weeklyRaw = localStorage.getItem(WEEKLY_KEY);
  
  if (weeklyRaw) {
    try {
      return JSON.parse(weeklyRaw) as DayData[];
    } catch (e) {
      console.error("Failed to parse weekly data:", e);
      // Return empty array instead of creating sample data
      return [];
    }
  }
  
  // Return empty array when no data exists
  return [];
}

export function saveData(categories: Record<string, CategoryData>): void {
  const dayData: DayData = {
    date: new Date().toDateString(),
    categories
  };
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dayData));
}

function archiveDay(dayData: DayData): void {
  // Only archive if there's actual activity data (at least one category with time)
  const hasActivity = Object.values(dayData.categories).some(cat => cat.time > 0);
  
  if (hasActivity) {
    const weeklyRaw = localStorage.getItem(WEEKLY_KEY);
    let weekly: DayData[] = [];
    
    try {
      weekly = weeklyRaw ? JSON.parse(weeklyRaw) : [];
    } catch (e) {
      console.error("Failed to parse weekly data:", e);
    }
    
    // Add the day data to the weekly archive
    weekly.push(dayData);
    
    // Keep up to 365 days (1 year) of data
    if (weekly.length > 365) {
      weekly = weekly.slice(weekly.length - 365);
    }
    
    localStorage.setItem(WEEKLY_KEY, JSON.stringify(weekly));
  }
  
  // Always remove the current day data to start fresh
  localStorage.removeItem(STORAGE_KEY);
}

// Function to clear all data and reset the app
export function clearAllData(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(WEEKLY_KEY);
}

/**
 * Exports all tracking data to a JSON file for backup
 * @returns A boolean indicating success or failure
 */
export function exportDataToJson(): boolean {
  try {
    const currentDay = localStorage.getItem(STORAGE_KEY);
    const archiveData = localStorage.getItem(WEEKLY_KEY);
    
    const exportData = {
      version: 1,  // For future compatibility
      exportDate: new Date().toISOString(),
      currentDay: currentDay ? JSON.parse(currentDay) : null,
      archiveData: archiveData ? JSON.parse(archiveData) : []
    };
    
    // Convert to JSON string
    const dataStr = JSON.stringify(exportData, null, 2);
    
    // Create download link
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    const exportFilename = `goodworks_data_${new Date().toISOString().split('T')[0]}.json`;
    
    // Create and click a download link
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFilename);
    linkElement.style.display = 'none';
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);
    
    return true;
  } catch (error) {
    console.error("Failed to export data:", error);
    return false;
  }
}

/**
 * Imports tracking data from a JSON file
 * @param jsonData The JSON data to import
 * @returns A boolean indicating success or failure
 */
export function importDataFromJson(jsonData: string): boolean {
  try {
    const parsedData = JSON.parse(jsonData);
    
    // Validate data structure
    if (!parsedData || typeof parsedData !== 'object') {
      throw new Error("Invalid data format");
    }
    
    // Check for version compatibility
    const version = parsedData.version || 1;
    if (version > 1) {
      throw new Error(`Unsupported data version: ${version}`);
    }
    
    // Import current day data if it exists
    if (parsedData.currentDay) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsedData.currentDay));
    }
    
    // Import archive data if it exists
    if (Array.isArray(parsedData.archiveData)) {
      localStorage.setItem(WEEKLY_KEY, JSON.stringify(parsedData.archiveData));
    }
    
    return true;
  } catch (error) {
    console.error("Failed to import data:", error);
    return false;
  }
}

// Function to explicitly create and load sample data
export function createAndLoadSampleData(): void {
  localStorage.removeItem(WEEKLY_KEY);
  createSampleData();
}

// Function to create sample data for testing (only used for development)
function createSampleData(): void {
  const sampleData: DayData[] = [];
  const categories = [
    { name: "Reading", color: "#4C8BF5" }, 
    { name: "Exercise", color: "#2BA24C" },
    { name: "Meditation", color: "#F1B211" },
    { name: "Work", color: "#9C27B0" },
    { name: "Learning", color: "#FF5722" },
    { name: "Cooking", color: "#E91E63" },
    { name: "Family Time", color: "#00BCD4" },
    { name: "Volunteering", color: "#8BC34A" },
    { name: "Hobbies", color: "#673AB7" },
    { name: "Sleep Tracking", color: "#795548" }
  ];
  
  // Create past 28 days sample data for a full month
  for (let i = 27; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    const dayCats: Record<string, CategoryData> = {};
    
    // Add times for each category
    categories.forEach(cat => {
      if (Math.random() > 0.1) { // 90% chance the category appears on this day
        // Random time - more realistic values:
        // Reading: 15-45 min
        // Exercise: 20-60 min
        // Meditation: 5-20 min
        // Work: 2-6 hours
        // Learning: 30-90 min
        let time = 0;
        
        switch(cat.name) {
          case "Reading":
            time = Math.floor(Math.random() * (45 - 15 + 1) + 15) * 60;
            break;
          case "Exercise":
            time = Math.floor(Math.random() * (60 - 20 + 1) + 20) * 60;
            break;
          case "Meditation":
            time = Math.floor(Math.random() * (20 - 5 + 1) + 5) * 60;
            break;
          case "Work":
            time = Math.floor(Math.random() * (6 - 2 + 1) + 2) * 3600;
            break;
          case "Learning":
            time = Math.floor(Math.random() * (90 - 30 + 1) + 30) * 60;
            break;
          case "Cooking":
            time = Math.floor(Math.random() * (75 - 25 + 1) + 25) * 60;
            break;
          case "Family Time":
            time = Math.floor(Math.random() * (180 - 60 + 1) + 60) * 60;
            break;
          case "Volunteering":
            time = Math.floor(Math.random() * (120 - 60 + 1) + 60) * 60;
            break;
          case "Hobbies":
            time = Math.floor(Math.random() * (90 - 30 + 1) + 30) * 60;
            break;
          case "Sleep Tracking":
            time = Math.floor(Math.random() * (9 - 6 + 1) + 6) * 3600;
            break;
          default:
            time = Math.floor(Math.random() * 3600) + 600;
        }
        
        dayCats[cat.name] = {
          time,
          color: cat.color
        };
      }
    });
    
    // Only add days with activity
    if (Object.keys(dayCats).length > 0) {
      sampleData.push({
        date: date.toDateString(),
        categories: dayCats
      });
    }
  }
  
  localStorage.setItem(WEEKLY_KEY, JSON.stringify(sampleData));
}
