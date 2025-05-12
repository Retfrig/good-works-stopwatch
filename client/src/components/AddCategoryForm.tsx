import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ColorPicker from "@/components/ColorPicker";

interface AddCategoryFormProps {
  onAdd: (name: string, color: string) => boolean;
}

export default function AddCategoryForm({ onAdd }: AddCategoryFormProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3B82F6");
  const [error, setError] = useState("");
  
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!name.trim()) {
      setError("Please enter a category name");
      return;
    }
    
    const success = onAdd(name.trim(), color);
    
    if (success) {
      setName("");
      // Keep the color as is for convenience
    } else {
      setError("A category with this name already exists");
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4 md:space-y-0 md:flex md:gap-4 md:items-end">
      <div className="w-full md:w-1/2">
        <Label htmlFor="categoryName" className="block text-sm font-medium mb-1">
          Category Name
        </Label>
        <Input 
          id="categoryName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="E.g., Reading, Exercise, Meditation"
          className="w-full"
        />
        {error && <p className="text-sm text-destructive mt-1">{error}</p>}
      </div>
      
      <div className="w-full md:w-1/4">
        <Label htmlFor="categoryColor" className="block text-sm font-medium mb-1">
          Color
        </Label>
        <div className="flex items-center gap-2 border border-input rounded-lg px-4 py-2">
          <ColorPicker color={color} onChange={setColor} />
          <span className="text-sm text-muted-foreground">{color}</span>
        </div>
      </div>
      
      <div className="w-full md:w-1/4">
        <Button type="submit" className="w-full bg-secondary hover:bg-green-600">
          <i className="ri-add-line mr-1"></i>
          Add Category
        </Button>
      </div>
    </form>
  );
}
