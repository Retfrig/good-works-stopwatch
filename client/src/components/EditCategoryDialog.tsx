import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import ColorPicker from "@/components/ColorPicker";

interface EditCategoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  categoryName: string;
  categoryColor: string;
  onSave: (newName: string, newColor: string) => void;
  onDelete: () => void;
}

export default function EditCategoryDialog({
  isOpen,
  onClose,
  categoryName,
  categoryColor,
  onSave,
  onDelete
}: EditCategoryDialogProps) {
  const [name, setName] = useState(categoryName);
  const [color, setColor] = useState(categoryColor);
  const [error, setError] = useState("");

  // Update local state when props change
  useEffect(() => {
    setName(categoryName);
    setColor(categoryColor);
  }, [categoryName, categoryColor]);

  const handleSave = () => {
    setError("");

    if (!name.trim()) {
      setError("Category name cannot be empty");
      return;
    }

    onSave(name.trim(), color);
    onClose();
  };

  const handleDelete = () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the category "${categoryName}"? This category will still appear in historical data but will be removed from your active categories.`
    );
    
    if (confirmed) {
      onDelete();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Category</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="category-name">Category Name</Label>
            <Input
              id="category-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Reading, Exercise, Meditation"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          
          <div className="space-y-2">
            <Label>Category Color</Label>
            <div className="flex items-center space-x-4">
              <ColorPicker color={color} onChange={setColor} />
              <span className="text-sm text-muted-foreground">{color}</span>
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex flex-col gap-4 sm:flex-row sm:justify-between">
          <Button
            variant="destructive"
            onClick={handleDelete}
            type="button"
            className="w-full sm:w-auto"
          >
            Delete
          </Button>
          <div className="flex gap-3 w-full sm:w-auto">
            <DialogClose asChild>
              <Button variant="outline" className="flex-1 sm:flex-initial">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave} className="flex-1 sm:flex-initial">Save Changes</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}