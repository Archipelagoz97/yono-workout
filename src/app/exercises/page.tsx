"use client";
import { useRouter } from "next/navigation";
import { DumbbellIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { exercises as exerciseCatalog } from "@/data/exercises.compact";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { ExerciseDetailsDialog } from "@/components/workout/ExerciseDetailsDialog";

const categories = [...new Set(exerciseCatalog.map((e) => e.category))].sort();

export default function ExercisesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [detailsExId, setDetailsExId] = useState<string | null>(null);

  const filtered = exerciseCatalog.filter((e) => {
    const matchesSearch =
      !search ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.aliases.some((a) => a.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = !selectedCategory || e.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-dvh yono-gradient content-with-nav">
      <div className="px-4 pt-12 pb-4">
        <h1 className="text-2xl font-display font-bold text-foreground mb-1">Exercises</h1>
        <p className="text-muted-foreground text-sm mb-4">
          {exerciseCatalog.length} exercises in catalog
        </p>
        <Input
          id="exercise-search"
          placeholder="Search exercises..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-xl mb-3"
        />
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap border transition-all ${
              !selectedCategory
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap border transition-all ${
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-2 pb-4">
        {filtered.map((exercise) => (
          <Card
            key={exercise.id}
            className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => setDetailsExId(exercise.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm">{exercise.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {exercise.primaryMuscles.join(", ").replace(/_/g, " ")}
                </p>
              </div>
              <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground ml-2 shrink-0">
                {exercise.difficulty}
              </span>
            </div>
            {exercise.quickCues.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {exercise.quickCues.slice(0, 2).map((cue, i) => (
                  <span
                    key={i}
                    className="text-xs bg-muted/60 border border-border px-2 py-0.5 rounded-full text-muted-foreground"
                  >
                    {cue}
                  </span>
                ))}
              </div>
            )}
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <DumbbellIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No exercises found.</p>
          </div>
        )}
      </div>

      <ExerciseDetailsDialog
        exerciseId={detailsExId}
        onOpenChange={(open) => !open && setDetailsExId(null)}
      />
    </div>
  );
}
