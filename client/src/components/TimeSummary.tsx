import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DayData, CategoryData, loadWeeklyData, clearAllData, exportDataToJson, importDataFromJson } from "@/lib/storage";
import { formatTime, getTotalTime } from "@/lib/utils";
import { Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  ChartOptions
} from "chart.js";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface WeekData {
  weekNumber: number;
  startDate: string;
  endDate: string;
  data: DayData[];
  combinedCategories: Record<string, CategoryData>;
}

interface MonthData {
  monthNumber: number;
  monthName: string;
  startDate: string;
  endDate: string;
  combinedCategories: Record<string, CategoryData>;
}

export default function TimeSummary() {
  const [activeTab, setActiveTab] = useState<"weekly" | "monthly" | "yearly">("weekly");
  const [importStatus, setImportStatus] = useState<{success: boolean, message: string} | null>(null);
  const fileInputRef = useState<HTMLInputElement | null>(null);
  const [weeklyData, setWeeklyData] = useState<DayData[]>([]);

  // Function to load data
  const loadData = () => {
    const data = loadWeeklyData();
    setWeeklyData(data);
  };
  
  // Function to reset all data
  const handleResetData = () => {
    if (window.confirm('Are you sure you want to reset all data? This action cannot be undone.')) {
      clearAllData();
      loadData(); // Reload to show empty state
    }
  };
  
  // Handle export button click
  const handleExport = () => {
    const success = exportDataToJson();
    if (!success) {
      alert("Failed to export data. Please try again.");
    }
  };
  
  // Handle import file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonContent = e.target?.result as string;
        const success = importDataFromJson(jsonContent);
        
        if (success) {
          setImportStatus({
            success: true,
            message: "Data imported successfully!"
          });
          // Reload data to display the imported data
          loadData();
        } else {
          setImportStatus({
            success: false,
            message: "Failed to import data. Invalid format."
          });
        }
      } catch (error) {
        setImportStatus({
          success: false,
          message: "Error reading file. Please try again."
        });
      }
      
      // Clear the file input
      if (event.target) {
        event.target.value = "";
      }
      
      // Auto-clear status message after 5 seconds
      setTimeout(() => {
        setImportStatus(null);
      }, 5000);
    };
    
    reader.readAsText(file);
  };
  
  // Handle import button click - triggers file input
  const handleImportClick = () => {
    // Create a file input if it doesn't exist
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.style.display = 'none';
    input.onchange = handleFileChange as any;
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  };

  // Load the archived data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Process weekly chart data
  const processWeeklyChartData = () => {
    if (weeklyData.length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }

    // Get the last 7 days of data
    const lastWeekData = weeklyData.slice(-7);
    
    // Create labels (day names)
    const labels = lastWeekData.map(day => {
      const date = new Date(day.date);
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    });

    // Get all unique categories
    const allCategories = new Set<string>();
    lastWeekData.forEach(day => {
      Object.keys(day.categories).forEach(cat => allCategories.add(cat));
    });
    
    // Create datasets
    const datasets = Array.from(allCategories).map(category => {
      const data = lastWeekData.map(day => {
        return day.categories[category]?.time || 0;
      });
      
      // Get color from the most recent day that has this category
      let color = "#cccccc";
      for (let i = lastWeekData.length - 1; i >= 0; i--) {
        if (lastWeekData[i].categories[category]) {
          color = lastWeekData[i].categories[category].color;
          break;
        }
      }
      
      return {
        label: category,
        data,
        backgroundColor: color,
        borderColor: color,
        borderWidth: 1
      };
    });
    
    return {
      labels,
      datasets
    };
  };
  
  // Weekly chart data
  const weeklyChartData = useMemo(() => processWeeklyChartData(), [weeklyData]);
  
  // Process monthly chart data
  const processMonthlyChartData = () => {
    if (weeklyData.length === 0) {
      return {
        labels: [],
        datasets: [{ data: [], backgroundColor: [] }]
      };
    }
    
    // Combine all data for the month
    const combinedCategories: Record<string, CategoryData> = {};
    
    weeklyData.forEach(day => {
      Object.entries(day.categories).forEach(([category, data]) => {
        if (!combinedCategories[category]) {
          combinedCategories[category] = { time: 0, color: data.color };
        }
        combinedCategories[category].time += data.time;
      });
    });
    
    // Sort categories by time (descending)
    const sortedCategories = Object.entries(combinedCategories)
      .sort(([_, a], [__, b]) => b.time - a.time);
    
    const labels = sortedCategories.map(([name, _]) => name);
    const data = sortedCategories.map(([_, data]) => data.time);
    const backgroundColor = sortedCategories.map(([_, data]) => data.color);
    
    return {
      labels,
      datasets: [{
        data,
        backgroundColor,
        borderWidth: 1
      }]
    };
  };
  
  // Monthly chart data
  const monthlyChartData = useMemo(() => processMonthlyChartData(), [weeklyData]);
  
  // Process weekly breakdown
  const weeklyBreakdown = useMemo(() => {
    // Group data by week
    const weeks: WeekData[] = [];
    
    if (weeklyData.length === 0) {
      return weeks;
    }
    
    // Sort data by date
    const sortedData = [...weeklyData].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // Group into weeks
    let currentWeek: DayData[] = [];
    let currentWeekNumber = 1;
    
    sortedData.forEach((day, index) => {
      const dayDate = new Date(day.date);
      
      // Start a new week if this is the first day or if it's a Monday
      if (index === 0 || dayDate.getDay() === 1) {
        if (currentWeek.length > 0) {
          // Save the current week
          const startDate = currentWeek[0].date;
          const endDate = currentWeek[currentWeek.length - 1].date;
          
          const combinedCategories: Record<string, CategoryData> = {};
          
          currentWeek.forEach(day => {
            Object.entries(day.categories).forEach(([category, data]) => {
              if (!combinedCategories[category]) {
                combinedCategories[category] = { time: 0, color: data.color };
              }
              combinedCategories[category].time += data.time;
            });
          });
          
          weeks.push({
            weekNumber: currentWeekNumber++,
            startDate,
            endDate,
            data: currentWeek,
            combinedCategories
          });
          
          // Start a new week
          currentWeek = [day];
        } else {
          currentWeek.push(day);
        }
      } else {
        currentWeek.push(day);
      }
    });
    
    // Add the last week
    if (currentWeek.length > 0) {
      const startDate = currentWeek[0].date;
      const endDate = currentWeek[currentWeek.length - 1].date;
      
      const combinedCategories: Record<string, CategoryData> = {};
      
      currentWeek.forEach(day => {
        Object.entries(day.categories).forEach(([category, data]) => {
          if (!combinedCategories[category]) {
            combinedCategories[category] = { time: 0, color: data.color };
          }
          combinedCategories[category].time += data.time;
        });
      });
      
      weeks.push({
        weekNumber: currentWeekNumber,
        startDate,
        endDate,
        data: currentWeek,
        combinedCategories
      });
    }
    
    // Return the most recent 4 weeks
    return weeks.slice(-4);
  }, [weeklyData]);
  
  // Create chart data for a week
  const createWeeklyChartData = (weekData: WeekData) => {
    const categories = weekData.combinedCategories;
    const labels = Object.keys(categories);
    const data = labels.map(name => categories[name].time);
    const backgroundColor = labels.map(name => categories[name].color);
    
    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor,
          borderWidth: 1,
        }
      ]
    };
  };

  // Process monthly breakdown for yearly view
  const monthlyBreakdown = useMemo(() => {
    const months: MonthData[] = [];
    
    if (weeklyData.length === 0) {
      return months;
    }
    
    // Sort data by date
    const sortedData = [...weeklyData].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // Group into months
    const monthGroups: Record<string, DayData[]> = {};
    
    sortedData.forEach(day => {
      const date = new Date(day.date);
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      
      if (!monthGroups[monthKey]) {
        monthGroups[monthKey] = [];
      }
      
      monthGroups[monthKey].push(day);
    });
    
    // Create MonthData objects
    Object.entries(monthGroups).forEach(([key, days], index) => {
      const [year, month] = key.split('-').map(Number);
      const date = new Date(year, month - 1, 1);
      
      const monthName = date.toLocaleDateString('en-US', { month: 'long' });
      const startDate = days[0].date;
      const endDate = days[days.length - 1].date;
      
      const combinedCategories: Record<string, CategoryData> = {};
      
      days.forEach(day => {
        Object.entries(day.categories).forEach(([category, data]) => {
          if (!combinedCategories[category]) {
            combinedCategories[category] = { time: 0, color: data.color };
          }
          combinedCategories[category].time += data.time;
        });
      });
      
      months.push({
        monthNumber: month,
        monthName,
        startDate,
        endDate,
        combinedCategories
      });
    });
    
    // Return all months in the last year
    return months;
  }, [weeklyData]);
  
  // Create chart data for a month
  const createMonthlyChartData = (monthData: MonthData) => {
    const categories = monthData.combinedCategories;
    const labels = Object.keys(categories);
    const data = labels.map(name => categories[name].time);
    const backgroundColor = labels.map(name => categories[name].color);
    
    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor,
          borderWidth: 1,
        }
      ]
    };
  };
  
  // Format week range (e.g., "Jan 1 - Jan 7")
  const formatWeekRange = (weekData: WeekData) => {
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    };
    
    const startDate = new Date(weekData.startDate);
    const endDate = new Date(weekData.endDate);
    
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };
  
  // Chart options
  const weeklyOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            // Convert seconds to hours:minutes
            return formatTime(value as number);
          }
        }
      }
    },
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const value = context.raw as number;
            const label = context.dataset.label || '';
            return `${label}: ${formatTime(value)}`;
          }
        }
      }
    }
  };
  
  const monthlyOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const value = context.raw as number;
            const label = context.label || '';
            const total = context.dataset.data.reduce((a: any, b: any) => a + b, 0);
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${formatTime(value)} (${percentage}%)`;
          }
        }
      }
    }
  };
  
  const weeklyBreakdownOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const value = context.raw as number;
            const label = context.label || '';
            const total = context.dataset.data.reduce((a: any, b: any) => a + b, 0);
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${formatTime(value)} (${percentage}%)`;
          }
        }
      }
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-xl font-semibold flex items-center">
            <i className="ri-calendar-line mr-2 text-primary"></i>
            Time Summaries
          </h2>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={loadData} className="flex-1 sm:flex-initial justify-center">
              <i className="ri-refresh-line mr-2"></i>
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} className="flex-1 sm:flex-initial justify-center">
              <i className="ri-download-line mr-2"></i>
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={handleImportClick} className="flex-1 sm:flex-initial justify-center">
              <i className="ri-upload-line mr-2"></i>
              Import
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleResetData} 
              className="flex-1 sm:flex-initial justify-center text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <i className="ri-delete-bin-line mr-2"></i>
              Reset Data
            </Button>
          </div>
        </div>

        {/* Import Status Message */}
        {importStatus && (
          <div className={`mb-4 p-3 rounded-md ${importStatus.success ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'}`}>
            <div className="flex items-center">
              <i className={`mr-2 ${importStatus.success ? 'ri-check-line' : 'ri-error-warning-line'}`}></i>
              {importStatus.message}
            </div>
          </div>
        )}

        <Tabs defaultValue="weekly" onValueChange={(value) => setActiveTab(value as "weekly" | "monthly" | "yearly")}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="weekly">Weekly Summary</TabsTrigger>
            <TabsTrigger value="monthly">Monthly Summaries</TabsTrigger>
            <TabsTrigger value="yearly">Yearly Summaries</TabsTrigger>
          </TabsList>
          
          <TabsContent value="weekly" className="space-y-4">
            {weeklyData.length > 0 ? (
              <div className="space-y-8">
                {/* Bar Chart */}
                <div style={{ height: "300px" }}>
                  <Bar data={weeklyChartData} options={weeklyOptions} />
                </div>
                
                {/* Weekly Details */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Last {Math.min(7, weeklyData.length)} Days Detail</h3>
                  <div className="space-y-4">
                    {weeklyData.slice(-7).map((day, index) => (
                      <div key={index} className="border border-border rounded-md p-4">
                        <h4 className="font-medium mb-2">{new Date(day.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'short',
                          day: 'numeric'
                        })}</h4>
                        <div className="space-y-2">
                          {Object.entries(day.categories).map(([category, data]) => (
                            <div key={category} className="flex justify-between">
                              <div className="flex items-center">
                                <div 
                                  className="w-3 h-3 rounded-full mr-2" 
                                  style={{ backgroundColor: data.color }}
                                ></div>
                                <span>{category}</span>
                              </div>
                              <span className="font-medium">{formatTime(data.time)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-10">
                <i className="ri-calendar-line text-5xl text-muted-foreground mb-3"></i>
                <p className="text-muted-foreground">No weekly data available yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Data is saved at the end of each day
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="monthly" className="space-y-4">
            {weeklyData.length > 0 ? (
              <div className="space-y-6">
                {/* Text about time period */}
                <p className="text-muted-foreground">
                  Displaying data for the last {weeklyData.length} {weeklyData.length === 1 ? 'day' : 'days'} (up to 365 days)
                </p>
                
                <div className="space-y-6">
                  <p className="text-sm text-muted-foreground">
                    View how your time was distributed each week during the month
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {weeklyBreakdown.map((week) => (
                      <div key={`week${week.weekNumber}`} className="space-y-3 border border-border rounded-lg p-4">
                        <div className="text-center">
                          <h3 className="text-md font-medium">Week {week.weekNumber}: {formatWeekRange(week)}</h3>
                          <p className="text-sm text-muted-foreground">
                            Total: {formatTime(getTotalTime(week.combinedCategories))}
                          </p>
                        </div>
                        
                        <div className="w-full" style={{ height: "180px" }}>
                          {getTotalTime(week.combinedCategories) > 0 ? (
                            <Pie data={createWeeklyChartData(week)} options={weeklyBreakdownOptions} />
                          ) : (
                            <div className="h-full flex items-center justify-center text-center text-muted-foreground">
                              <div>
                                <i className="ri-time-line text-3xl mb-2 block"></i>
                                <p>No data available</p>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {getTotalTime(week.combinedCategories) > 0 && (
                          <div>
                            <h4 className="font-medium text-sm mb-2">Top Categories</h4>
                            <div className="space-y-2">
                              {Object.entries(week.combinedCategories)
                                .sort(([_, a], [__, b]) => b.time - a.time)
                                .slice(0, 3)
                                .map(([category, data]) => {
                                  const totalTime = getTotalTime(week.combinedCategories);
                                  const percentage = Math.round((data.time / totalTime) * 100);
                                  
                                  return (
                                    <div key={category} className="flex justify-between items-center">
                                      <div className="flex items-center">
                                        <div 
                                          className="w-2 h-2 rounded-full mr-2" 
                                          style={{ backgroundColor: data.color }}
                                        ></div>
                                        <span className="truncate max-w-[100px]">{category}</span>
                                      </div>
                                      <div className="text-right whitespace-nowrap">
                                        <span className="font-medium">{formatTime(data.time)}</span>
                                        <span className="text-xs text-muted-foreground ml-1">
                                          ({percentage}%)
                                        </span>
                                      </div>
                                    </div>
                                  );
                              })}
                              
                              {/* Show "more" indicator if there are more than 3 categories */}
                              {Object.keys(week.combinedCategories).length > 3 && (
                                <div className="text-xs text-muted-foreground text-center italic">
                                  +{Object.keys(week.combinedCategories).length - 3} more categories
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-10">
                <i className="ri-calendar-line text-5xl text-muted-foreground mb-3"></i>
                <p className="text-muted-foreground">No monthly data available yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Data is saved at the end of each day
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="yearly" className="space-y-4">
            {weeklyData.length > 0 ? (
              <div className="space-y-6">
                {/* Text about time period */}
                <p className="text-muted-foreground">
                  Displaying data for the last {weeklyData.length} {weeklyData.length === 1 ? 'day' : 'days'} (up to 365 days)
                </p>
                
                <div className="space-y-6">
                  <p className="text-sm text-muted-foreground">
                    View how your time was distributed across months during the year
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {monthlyBreakdown.map((month) => (
                      <div key={`month${month.monthNumber}`} className="space-y-3 border border-border rounded-lg p-4">
                        <div className="text-center">
                          <h3 className="text-md font-medium">{month.monthName}</h3>
                          <p className="text-sm text-muted-foreground">
                            Total: {formatTime(getTotalTime(month.combinedCategories))}
                          </p>
                        </div>
                        
                        <div className="w-full" style={{ height: "180px" }}>
                          {getTotalTime(month.combinedCategories) > 0 ? (
                            <Pie data={createMonthlyChartData(month)} options={weeklyBreakdownOptions} />
                          ) : (
                            <div className="h-full flex items-center justify-center text-center text-muted-foreground">
                              <div>
                                <i className="ri-time-line text-3xl mb-2 block"></i>
                                <p>No data available</p>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {getTotalTime(month.combinedCategories) > 0 && (
                          <div>
                            <h4 className="font-medium text-sm mb-2">Top Categories</h4>
                            <div className="space-y-2">
                              {Object.entries(month.combinedCategories)
                                .sort(([_, a], [__, b]) => b.time - a.time)
                                .slice(0, 3)
                                .map(([category, data]) => {
                                  const totalTime = getTotalTime(month.combinedCategories);
                                  const percentage = Math.round((data.time / totalTime) * 100);
                                  
                                  return (
                                    <div key={category} className="flex justify-between items-center">
                                      <div className="flex items-center">
                                        <div 
                                          className="w-2 h-2 rounded-full mr-2" 
                                          style={{ backgroundColor: data.color }}
                                        ></div>
                                        <span className="truncate max-w-[100px]">{category}</span>
                                      </div>
                                      <div className="text-right whitespace-nowrap">
                                        <span className="font-medium">{formatTime(data.time)}</span>
                                        <span className="text-xs text-muted-foreground ml-1">
                                          ({percentage}%)
                                        </span>
                                      </div>
                                    </div>
                                  );
                              })}
                              
                              {/* Show "more" indicator if there are more than 3 categories */}
                              {Object.keys(month.combinedCategories).length > 3 && (
                                <div className="text-xs text-muted-foreground text-center italic">
                                  +{Object.keys(month.combinedCategories).length - 3} more categories
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-10">
                <i className="ri-calendar-line text-5xl text-muted-foreground mb-3"></i>
                <p className="text-muted-foreground">No yearly data available yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Data is saved at the end of each day
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}