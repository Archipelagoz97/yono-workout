import { useState } from "react";
import { exercises } from "@/data/exercises.compact";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import YonoAnimation from "@/components/yono/YonoAnimation";
import { ExerciseSelectorDialog } from "./ExerciseSelectorDialog";
import { RefreshCwIcon } from "lucide-react";

interface ExerciseDetailsDialogProps {
  exerciseId: string | null;
  onOpenChange: (open: boolean) => void;
  onReplace?: (newExerciseId: string) => void;
}

export function ExerciseDetailsDialog({
  exerciseId,
  onOpenChange,
  onReplace,
}: ExerciseDetailsDialogProps) {
  const [selectorOpen, setSelectorOpen] = useState(false);
  const ex = exercises.find((e) => e.id === exerciseId);

  if (!ex) return null;

  return (
    <>
      <Dialog open={!!exerciseId} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm p-5">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-xl">{ex.name}</DialogTitle>
          </DialogHeader>

          {/* Animation View */}
          <div className="bg-muted/30 rounded-xl p-4 flex justify-center items-center h-48 mb-4 border border-border/50 shadow-inner">
            <div className="w-40 h-40 relative">
              <YonoAnimation
                state="performing"
                animationFamily={ex.animationFamily}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Target Muscles
              </p>
              <div className="flex flex-wrap gap-1.5">
                {ex.primaryMuscles.map((m) => (
                  <Badge key={m} variant="default" className="text-xs font-medium px-2 py-0.5">
                    {m.replace(/_/g, " ")}
                  </Badge>
                ))}
                {ex.secondaryMuscles.map((m) => (
                  <Badge key={m} variant="secondary" className="text-xs font-medium px-2 py-0.5 text-muted-foreground">
                    {m.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
            </div>

            {ex.quickCues && ex.quickCues.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Form Cues
                </p>
                <ul className="list-disc pl-4 text-sm text-foreground space-y-1">
                  {ex.quickCues.map((cue, i) => (
                    <li key={i}>{cue}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {onReplace && (
            <div className="mt-6">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setSelectorOpen(true)}
              >
                <RefreshCwIcon className="w-4 h-4 mr-2" />
                Replace Exercise
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ExerciseSelectorDialog
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        onSelect={(newId) => {
          if (onReplace) onReplace(newId);
          onOpenChange(false);
        }}
      />
    </>
  );
}
