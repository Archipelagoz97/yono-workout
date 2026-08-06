"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { CalendarIcon, SearchIcon, TrashIcon, DownloadIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useLiveQuery } from "dexie-react-hooks";
import db from "@/db/database";
import type { WorkoutSession } from "@/types";

export default function HistoryPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<WorkoutSession | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const sessions = useLiveQuery(
    () =>
      db.workoutSessions
        .where("status")
        .equals("completed")
        .reverse()
        .sortBy("completedAt"),
    []
  );

  const filtered = sessions?.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.focus?.some((f) => f.toLowerCase().includes(search.toLowerCase()))
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const exercises = await db.sessionExercises
        .where("sessionId")
        .equals(deleteTarget.id)
        .toArray();
      await db.transaction(
        "rw",
        [db.workoutSessions, db.sessionExercises, db.workoutSets],
        async () => {
          for (const ex of exercises) {
            await db.workoutSets.where("sessionExerciseId").equals(ex.id).delete();
          }
          await db.sessionExercises.where("sessionId").equals(deleteTarget.id).delete();
          await db.workoutSessions.delete(deleteTarget.id);
        }
      );
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const totalSessions = sessions?.length ?? 0;

  return (
    <div className="min-h-screen yono-gradient content-with-nav">
      {/* Header */}
      <div className="px-4 pt-12 pb-4">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-display font-bold text-foreground">History</h1>
          <Badge variant="secondary">{totalSessions} sessions</Badge>
        </div>
        <p className="text-muted-foreground text-sm mb-4">
          All your workout records, stored locally.
        </p>

        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="history-search"
            placeholder="Search workouts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl"
          />
        </div>
      </div>

      {/* Session list */}
      <div className="px-4 space-y-3">
        {!sessions && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 skeleton rounded-2xl" />
            ))}
          </div>
        )}

        {sessions && filtered?.length === 0 && (
          <div className="text-center py-16">
            <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {search ? "No workouts match your search." : "No completed workouts yet."}
            </p>
            {!search && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => router.push("/today")}
              >
                Start your first workout
              </Button>
            )}
          </div>
        )}

        {filtered?.map((session, index) => (
          <motion.div
            key={session.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <SessionCard
              session={session}
              onDelete={() => setDeleteTarget(session)}
            />
          </motion.div>
        ))}
      </div>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete workout?</DialogTitle>
            <DialogDescription>
              This will permanently delete &quot;{deleteTarget?.name}&quot; and all its sets.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleDelete}
              disabled={isDeleting}
              id="btn-confirm-delete-session"
            >
              <TrashIcon className="w-4 h-4 mr-1.5" />
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SessionCard({
  session,
  onDelete,
}: {
  session: WorkoutSession;
  onDelete: () => void;
}) {
  const date = session.completedAt
    ? new Date(session.completedAt)
    : new Date(session.updatedAt);

  const daysSince = Math.floor(
    (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  const setCount = useLiveQuery(
    () => db.workoutSets.where("sessionId").equals(session.id).count(),
    [session.id]
  );

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        {/* Date badge */}
        <div className="flex flex-col items-center justify-center w-12 h-12 bg-primary/10 rounded-xl shrink-0">
          <span className="text-xs font-bold text-primary">
            {date.toLocaleDateString("en", { month: "short" }).toUpperCase()}
          </span>
          <span className="text-lg font-bold text-primary leading-none">{date.getDate()}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{session.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground">
              {daysSince === 0 ? "Today" : daysSince === 1 ? "Yesterday" : `${daysSince}d ago`}
            </span>
            {setCount !== undefined && (
              <span className="text-xs text-muted-foreground">· {setCount} sets</span>
            )}
            {session.estimatedMinutes && (
              <span className="text-xs text-muted-foreground">
                · ~{session.estimatedMinutes}m
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={onDelete}
            className="p-2 text-muted-foreground hover:text-destructive rounded-lg transition-colors"
            aria-label="Delete workout"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
          <ChevronRightIcon className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
    </Card>
  );
}
