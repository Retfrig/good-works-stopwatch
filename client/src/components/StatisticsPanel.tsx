import { CategoryData } from "@/lib/storage";
import { formatTime, getTotalTime, getMostTimeSpentCategory } from "@/lib/utils";

interface StatisticsPanelProps {
  categories: Record<string, CategoryData>;
}

export default function StatisticsPanel({ categories }: StatisticsPanelProps) {
  const totalCategories = Object.keys(categories).length;
  const totalTime = getTotalTime(categories);
  const mostTimeSpent = getMostTimeSpentCategory(categories);
  
  return (
    <div className="space-y-4">
      <div className="border-b border-border pb-2">
        <p className="text-sm text-muted-foreground">Total Categories</p>
        <p className="text-2xl font-bold">{totalCategories}</p>
      </div>
      
      <div className="border-b border-border pb-2">
        <p className="text-sm text-muted-foreground">Total Time Today</p>
        <p className="text-2xl font-bold">{formatTime(totalTime)}</p>
      </div>
      
      <div>
        <p className="text-sm text-muted-foreground">Most Time Spent On</p>
        {mostTimeSpent ? (
          <p className="text-2xl font-bold">
            {mostTimeSpent.name} <span className="text-sm font-normal text-muted-foreground">({formatTime(mostTimeSpent.time)})</span>
          </p>
        ) : (
          <p className="text-xl text-muted-foreground">No activities yet</p>
        )}
      </div>
    </div>
  );
}
