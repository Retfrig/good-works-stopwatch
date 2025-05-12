import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatTime } from "@/lib/utils";
import { CategoryData } from "@/lib/storage";
import EditCategoryDialog from "@/components/EditCategoryDialog";

interface CategoryItemProps {
  name: string;
  data: CategoryData;
  isActive: boolean;
  onStart: () => void;
  onTimer: () => void;
  onStop: () => void;
  onEdit: (newName: string, newColor: string) => void;
  onDelete: () => void;
}

export default function CategoryItem({ 
  name, 
  data, 
  isActive, 
  onStart, 
  onTimer, 
  onStop,
  onEdit,
  onDelete
}: CategoryItemProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  return (
    <>
      <div 
        className={`
          ${isActive ? 'bg-primary/10 border-2 border-primary animate-pulse' : 'bg-card border border-border'} 
          rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4
        `}
      >
        <div className="flex items-center gap-3">
          <div className="w-3 h-12 rounded-full" style={{ backgroundColor: data.color }}></div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium">{name}</h3>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6" 
                onClick={() => setIsEditDialogOpen(true)}
              >
                <i className="ri-edit-line text-muted-foreground text-sm"></i>
              </Button>
            </div>
            <p className="text-xl font-semibold">{formatTime(data.time)}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 justify-center sm:justify-end">
          <Button
            onClick={onStart}
            disabled={isActive}
            variant={isActive ? "outline" : "default"}
            className={`min-w-[80px] ${isActive ? "cursor-not-allowed bg-gray-300 text-gray-500" : ""}`}
            size="sm"
          >
            <i className="ri-play-fill mr-1"></i>
            Start
          </Button>
          
          <Button
            onClick={onTimer}
            disabled={isActive}
            variant="outline"
            className={`min-w-[80px] ${isActive ? "cursor-not-allowed bg-gray-300 text-gray-500" : ""}`}
            size="sm"
          >
            <i className="ri-timer-line mr-1"></i>
            Timer
          </Button>
          
          <Button
            onClick={onStop}
            variant={isActive ? "destructive" : "outline"}
            className="min-w-[80px]"
            size="sm"
          >
            <i className="ri-stop-fill mr-1"></i>
            Stop
          </Button>
        </div>
      </div>

      <EditCategoryDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        categoryName={name}
        categoryColor={data.color}
        onSave={(newName, newColor) => onEdit(newName, newColor)}
        onDelete={onDelete}
      />
    </>
  );
}
