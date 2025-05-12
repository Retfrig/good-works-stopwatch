import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import { CategoryData } from "@/lib/storage";

interface ActivityChartProps {
  categories: Record<string, CategoryData>;
}

export default function ActivityChart({ categories }: ActivityChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);
  
  useEffect(() => {
    if (!chartRef.current) return;
    
    // Clean up any existing chart
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }
    
    const labels = Object.keys(categories);
    
    // Only render chart if we have data
    if (labels.length > 0) {
      const data = labels.map(name => categories[name].time);
      const colors = labels.map(name => categories[name].color);
      
      const ctx = chartRef.current.getContext("2d");
      if (!ctx) return;
      
      chartInstanceRef.current = new Chart(ctx, {
        type: "doughnut",
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor: colors,
            borderWidth: 1,
            borderColor: window.document.documentElement.classList.contains('dark') ? '#1e293b' : '#fff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                usePointStyle: true,
                padding: 20,
                color: window.document.documentElement.classList.contains('dark') ? 
                  'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)'
              }
            }
          }
        }
      });
    }
    
    // Clean up on unmount
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [categories]);
  
  return (
    <div className="chart-container" style={{ position: "relative", height: "250px" }}>
      <canvas ref={chartRef} id="activityChart"></canvas>
      {Object.keys(categories).length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-muted-foreground">No data available</p>
        </div>
      )}
    </div>
  );
}
