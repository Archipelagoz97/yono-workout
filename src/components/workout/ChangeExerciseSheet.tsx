"use client";

import { useMemo, useState } from "react";
import { exercises } from "@/data/exercises.compact";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLiveQuery } from "dexie-react-hooks";
import db from "@/db/database";
import { SearchIcon } from "lucide-react";

interface ChangeExerciseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentExerciseId: string | null;
  usedExerciseIds: string[];
  availableEquipmentCodes: string[];
  onSelect: (newExerciseId: string) => void;
}

function ExerciseRow({
  ex,
  onClick,
}: {
  ex: (typeof exercises)[number];
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 border border-border rounded-xl hover:bg-muted transition-colors"
    >
      <div className="font-medium text-sm text-foreground">{ex.name}</div>
      <div className="flex flex-wrap gap-1 mt-1.5">
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {ex.category}
        </Badge>
        {ex.primaryMuscles.slice(0, 3).map((m) => (
          <Badge
            key={m}
            variant="outline"
            className="text-[10px] px-1.5 py-0 text-muted-foreground"
          >
            {m.replace(/_/g, " ")}
          </Badge>
        ))}
      </div>
    </button>
  );
}

export function ChangeExerciseSheet({
  open,
  onOpenChange,
  currentExerciseId,
  usedExerciseIds,
  availableEquipmentCodes,
  onSelect,
}: ChangeExerciseSheetProps) {
  const [search, setSearch] = useState("");
  const current = exercises.find((e) => e.id === currentExerciseId);

  // History familiarity: exercises that have been logged before.
  const familiarIds = useLiveQuery(async () => {
    const sets = await db.workoutSets.toArray();
    return new Set(sets.map((s) => s.exerciseId));
  }, []);

  const ranked = useMemo(() => {
    if (!current) return [];
    const used = new Set(usedExerciseIds);
    used.add(current.id);
    const equip = new Set(availableEquipmentCodes);

    return exercises
      .filter((e) => !used.has(e.id))
      .map((e) => {
        let score = 0;
        if (e.movementPattern === current.movementPattern) score += 3;
        if (e.primaryMuscles.some((m) => current.primaryMuscles.includes(m))) score += 2;
        if (e.equipmentCodes.some((c) => equip.has(c))) score += 1;
        if (familiarIds?.has(e.id)) score += 1;
        if (current.alternatives.includes(e.id)) score += 1;
        return { ex: e, score };
      })
      .sort((a, b) => b.score - a.score);
  }, [current, usedExerciseIds, availableEquipmentCodes, familiarIds]);

  const q = search.toLowerCase().trim();
  const filtered = q
    ? ranked.filter(
        ({ ex }) =>
          ex.name.toLowerCase().includes(q) ||
          ex.primaryMuscles.some((m) => m.toLowerCase().includes(q)) ||
          ex.category.toLowerCase().includes(q)
      )
    : ranked;

  const recommended = ranked.filter((r) => r.score > 0).slice(0, 6);
  const browseAll = ranked.filter((r) => r.score === 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl pb-6 max-h-[85dvh] overflow-hidden">
        <SheetHeader className="pb-2">
          <SheetTitle>Change exercise</SheetTitle>
          <SheetDescription>
            {current
              ? `Replace ${current.name} with another movement.`
              : "Pick a different exercise."}
          </SheetDescription>
        </SheetHeader>

        <div className="px-4">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search all exercises..."
              aria-label="Search all exercises"
              className="pl-9 h-10 rounded-xl bg-muted/40"
            />
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1 -mx-4 px-4">
          <div className="space-y-2 pb-4">
            {!q && (
              <>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4 mb-1">
                  Recommended
                </p>
                {recommended.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No close alternatives found. Search the catalog above.
                  </p>
                )}
                {recommended.map(({ ex }) => (
                  <ExerciseRow
                    key={ex.id}
                    ex={ex}
                    onClick={() => {
                      onSelect(ex.id);
                      onOpenChange(false);
                    }}
                  />
                ))}
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4 mb-1">
                  All exercises
                </p>
              </>
            )}
            {(q ? filtered : browseAll).map(({ ex }) => (
              <ExerciseRow
                key={ex.id}
                ex={ex}
                onClick={() => {
                  onSelect(ex.id);
                  onOpenChange(false);
                }}
              />
            ))}
            {filtered.length === 0 && q && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No exercises match &quot;{search}&quot;.
              </p>
            )}
          </div>
        </ScrollArea>

        <SheetFooter className="pt-2">
          <SheetClose render={<Button variant="outline" className="w-full h-11" />}>
            Cancel
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
