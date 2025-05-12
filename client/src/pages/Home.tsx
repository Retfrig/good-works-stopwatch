import { useState, useCallback, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CategoryItem from "@/components/CategoryItem";
import AddCategoryForm from "@/components/AddCategoryForm";
import ActivityChart from "@/components/ActivityChart";
import StatisticsPanel from "@/components/StatisticsPanel";

import TimeSummary from "@/components/TimeSummary";
import ThemeToggle from "@/components/ThemeToggle";
import TimerDialog from "@/components/TimerDialog";
import BackgroundPermissionDialog from "@/components/BackgroundPermissionDialog";

import { useGoodWorks } from "@/hooks/useGoodWorks";
import { CategoryData } from "@/lib/storage";

export default function Home() {
  const { 
    categories, 
    activeCategory, 
    startCategory, 
    startTimer, 
    stopActive, 
    addCategory,
    editCategory,
    deleteCategory,
    timerAudio,
    // Background mode permissions
    isBackgroundPermissionGranted,
    requestBackgroundPermission,
    shouldShowBackgroundPermission,
    setShouldShowBackgroundPermission
  } = useGoodWorks();
  
  // Separate state for visualization data that doesn't update in real-time
  const [visualizationData, setVisualizationData] = useState<Record<string, CategoryData>>({});
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
  
  // Manual refresh function for visualization data
  const refreshVisualizationData = useCallback(() => {
    setVisualizationData({...categories});
    setLastUpdateTime(Date.now());
  }, [categories]);
  
  // Update visualization data initially and when activeCategory changes from active to inactive
  useEffect(() => {
    if (!activeCategory) {
      refreshVisualizationData();
    }
  }, [activeCategory, refreshVisualizationData]);
  
  // Initialize visualization data on first load
  useEffect(() => {
    // Only update if visualization data is empty
    if (Object.keys(visualizationData).length === 0 && Object.keys(categories).length > 0) {
      refreshVisualizationData();
    }
  }, [categories, visualizationData, refreshVisualizationData]);
  
  // Format the last update time
  const formattedUpdateTime = useMemo(() => {
    const date = new Date(lastUpdateTime);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [lastUpdateTime]);
  
  const [timerDialogOpen, setTimerDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");

  const handleTimerClick = useCallback((name: string) => {
    setSelectedCategory(name);
    setTimerDialogOpen(true);
  }, []);
  
  const handleStartTimer = useCallback((seconds: number, ringtoneUrl: string) => {
    startTimer(selectedCategory, seconds, ringtoneUrl);
  }, [selectedCategory, startTimer]);

  return (
    <div className="font-sans bg-background text-foreground min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* App Header */}
        <header className="mb-6 relative">
          <div className="absolute right-0 top-0">
            <ThemeToggle />
          </div>
          <div className="text-center pr-10">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Good Works Stopwatch</h1>
            <p className="text-muted-foreground">Track time spent on your activities</p>
          </div>
        </header>

        {/* Main Content */}
        <main>
          {/* Categories Section */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <i className="ri-time-line mr-2 text-primary"></i>
                Your Categories
              </h2>
              
              <div className="space-y-4">
                {Object.keys(categories).length > 0 ? (
                  Object.entries(categories).map(([name, data]) => (
                    <CategoryItem
                      key={name}
                      name={name}
                      data={data}
                      isActive={activeCategory === name}
                      onStart={() => startCategory(name)}
                      onTimer={() => handleTimerClick(name)}
                      onStop={stopActive}
                      onEdit={(newName, newColor) => editCategory(name, newName, newColor)}
                      onDelete={() => deleteCategory(name)}
                    />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <i className="ri-timer-line text-5xl text-muted-foreground mb-3"></i>
                    <p className="text-muted-foreground">No categories yet. Add your first category below.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Add Category Section */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <i className="ri-add-circle-line mr-2 text-secondary"></i>
                Add New Category
              </h2>
              <AddCategoryForm onAdd={addCategory} />
            </CardContent>
          </Card>

          {/* Visualization Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold flex items-center">
                    <i className="ri-pie-chart-line mr-2 text-primary"></i>
                    Today's Activity
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Updated: {formattedUpdateTime}</span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 px-2"
                      onClick={refreshVisualizationData}
                    >
                      <i className="ri-refresh-line mr-1"></i>
                      Refresh
                    </Button>
                  </div>
                </div>
                <ActivityChart categories={visualizationData} />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold flex items-center">
                    <i className="ri-database-2-line mr-2 text-accent"></i>
                    Statistics
                  </h2>
                  {activeCategory && (
                    <div className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                      Timer active - stats paused
                    </div>
                  )}
                </div>
                <StatisticsPanel categories={visualizationData} />
              </CardContent>
            </Card>
          </div>
          
          {/* Time Summaries Section */}
          <TimeSummary />
          

        </main>

        {/* Footer */}
        <footer className="mt-8 text-center text-muted-foreground text-sm">
          <p>Data is stored locally in your browser</p>
        </footer>
      </div>
      
      {/* Timer Dialog */}
      <TimerDialog
        isOpen={timerDialogOpen}
        onClose={() => setTimerDialogOpen(false)}
        categoryName={selectedCategory}
        onStart={handleStartTimer}
      />
      
      {/* Background Permission Dialog */}
      <BackgroundPermissionDialog
        isOpen={shouldShowBackgroundPermission && !isBackgroundPermissionGranted}
        onClose={() => setShouldShowBackgroundPermission(false)}
        onGrantPermission={requestBackgroundPermission}
      />
    </div>
  );
}
