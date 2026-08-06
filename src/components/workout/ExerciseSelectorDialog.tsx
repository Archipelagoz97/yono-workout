import { useState } from "react";
import { exercises } from "@/data/exercises.compact";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface ExerciseSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (exerciseId: string) => void;
}

export function ExerciseSelectorDialog({
  open,
  onOpenChange,
  onSelect,
}: ExerciseSelectorDialogProps) {
  const [search, setSearch] = useState("");

  const filtered = exercises.filter((ex) => {
    const q = search.toLowerCase();
    return (
      ex.name.toLowerCase().includes(q) ||
      ex.primaryMuscles.some((m) => m.toLowerCase().includes(q)) ||
      ex.category.toLowerCase().includes(q)
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-4">
        <DialogHeader className="mb-2">
          <DialogTitle>Select Exercise</DialogTitle>
        </DialogHeader>
        
        <Input
          placeholder="Search exercises or muscles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-3"
          autoFocus
        />

        <ScrollArea className="flex-1 -mx-4 px-4">
          <div className="space-y-2 pb-4">
            {filtered.map((ex) => (
              <div
                key={ex.id}
                onClick={() => {
                  onSelect(ex.id);
                  onOpenChange(false);
                }}
                className="p-3 border border-border rounded-xl cursor-pointer hover:bg-muted transition-colors"
              >
                <div className="font-medium text-sm">{ex.name}</div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {ex.category}
                  </Badge>
                  {ex.primaryMuscles.map((m) => (
                    <Badge key={m} variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                      {m.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No exercises found.
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
