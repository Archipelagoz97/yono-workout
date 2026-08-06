"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { DownloadIcon, UploadIcon, DatabaseIcon, ShieldIcon, MoonIcon, SunIcon, BrainIcon, TrashIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useLiveQuery } from "dexie-react-hooks";
import db from "@/db/database";
import { exportBackup, downloadBackup, readBackupFile, validateAndParseBackup, importBackupReplace, importBackupMerge } from "@/lib/backup";
import { getTheme, setTheme } from "@/lib/storage";
import { YonoAnimation } from "@/components/yono/YonoAnimation";

export default function ProfilePage() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<"replace" | "merge" | null>(null);
  const [importStats, setImportStats] = useState<{ sessionCount: number; setCount: number } | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [showClearMemories, setShowClearMemories] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(() => getTheme());

  const profile = useLiveQuery(() => db.profiles.get("main-user"), []);
  const memories = useLiveQuery(() => db.aiMemories.toArray(), []);
  const sessionCount = useLiveQuery(() => db.workoutSessions.where("status").equals("completed").count(), []);
  const setCount = useLiveQuery(() => db.workoutSets.count(), []);
  const backupMeta = useLiveQuery(() => db.backupMetadata.get("backup-status"), []);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const backup = await exportBackup();
      downloadBackup(backup);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const raw = await readBackupFile(file);
      const { stats } = validateAndParseBackup(raw);
      setImportFile(file);
      setImportStats({ sessionCount: stats.sessionCount, setCount: stats.setCount });
    } catch (err) {
      alert(`Invalid backup file: ${(err as Error).message}`);
    }
  };

  const handleImportConfirm = async () => {
    if (!importFile || !importMode) return;
    setIsImporting(true);
    try {
      const raw = await readBackupFile(importFile);
      const { backup } = validateAndParseBackup(raw);

      if (importMode === "replace") {
        await importBackupReplace(backup);
        setImportResult("Import complete. All previous data has been replaced.");
      } else {
        const result = await importBackupMerge(backup);
        setImportResult(`Import complete. Added ${result.added} records, skipped ${result.skipped} duplicates.`);
      }
    } catch (err) {
      setImportResult(`Import failed: ${(err as Error).message}`);
    } finally {
      setIsImporting(false);
      setImportFile(null);
      setImportStats(null);
      setImportMode(null);
    }
  };

  const handleThemeChange = (dark: boolean) => {
    const theme = dark ? "dark" : "light";
    setCurrentTheme(theme);
    setTheme(theme);
    document.documentElement.classList.toggle("dark", dark);
  };

  const handleClearMemories = async () => {
    await db.aiMemories.clear();
    setShowClearMemories(false);
  };

  const daysSinceBackup = backupMeta?.lastExportedAt
    ? Math.floor((Date.now() - backupMeta.lastExportedAt) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="min-h-screen yono-gradient content-with-nav">
      {/* Header */}
      <div className="px-4 pt-12 pb-6">
        <div className="flex items-center gap-4">
          <YonoAnimation state="idle" size={64} />
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Profile</h1>
            <p className="text-muted-foreground text-sm">
              {sessionCount ?? 0} sessions · {setCount ?? 0} sets logged
            </p>
          </div>
        </div>
      </div>

      {/* Storage & Backup */}
      <motion.div
        className="px-4 mb-6"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-30px" }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Data & Backup
        </h2>
        <Card className="divide-y divide-border">
          {/* Backup status */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DatabaseIcon className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Local backup</p>
                <p className="text-xs text-muted-foreground">
                  {daysSinceBackup === null
                    ? "Never exported"
                    : daysSinceBackup === 0
                    ? "Exported today"
                    : `Exported ${daysSinceBackup}d ago`}
                </p>
              </div>
            </div>
            {daysSinceBackup !== null && daysSinceBackup > 30 && (
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-200">
                Overdue
              </Badge>
            )}
          </div>

          {/* Export */}
          <div className="p-4">
            <Button
              id="btn-export-backup"
              onClick={handleExport}
              disabled={isExporting}
              variant="outline"
              className="w-full rounded-xl"
            >
              <DownloadIcon className="w-4 h-4 mr-2" />
              {isExporting ? "Exporting..." : "Export all data (.json)"}
            </Button>
          </div>

          {/* Import */}
          <div className="p-4 space-y-3">
            <label
              htmlFor="import-file"
              className="flex items-center justify-center gap-2 w-full h-10 border border-dashed border-border rounded-xl text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 cursor-pointer transition-colors"
            >
              <UploadIcon className="w-4 h-4" />
              Select backup file to import
            </label>
            <input
              id="import-file"
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportFileSelect}
            />

            {importStats && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-muted rounded-xl space-y-3"
              >
                <p className="text-sm font-medium text-foreground">
                  Found: {importStats.sessionCount} sessions · {importStats.setCount} sets
                </p>
                <div className="flex gap-2">
                  <Button
                    id="btn-import-merge"
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setImportMode("merge")}
                  >
                    Merge
                  </Button>
                  <Button
                    id="btn-import-replace"
                    size="sm"
                    variant="destructive"
                    className="flex-1"
                    onClick={() => setImportMode("replace")}
                  >
                    Replace all
                  </Button>
                </div>
              </motion.div>
            )}

            {importResult && (
              <p className="text-sm text-muted-foreground p-3 bg-muted rounded-xl">
                {importResult}
              </p>
            )}
          </div>
        </Card>
      </motion.div>

      {/* AI Memories */}
      <motion.div
        className="px-4 mb-6"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-30px" }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          AI Memory
        </h2>
        <Card className="divide-y divide-border">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BrainIcon className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Stored memories</p>
                <p className="text-xs text-muted-foreground">
                  {memories?.filter((m) => m.active).length ?? 0} active of {memories?.length ?? 0} total
                </p>
              </div>
            </div>
            <Badge variant="secondary">{memories?.length ?? 0}</Badge>
          </div>

          {memories && memories.slice(0, 5).map((memory) => (
            <div key={memory.id} className="px-4 py-3 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
                  {memory.category.replace(/_/g, " ")}
                </p>
                <p className="text-sm text-foreground">{memory.content}</p>
              </div>
              <Badge
                variant={memory.active ? "secondary" : "outline"}
                className="text-xs shrink-0"
              >
                {memory.active ? "Active" : "Inactive"}
              </Badge>
            </div>
          ))}

          {memories && memories.length > 0 && (
            <div className="p-4">
              <Button
                id="btn-clear-memories"
                variant="outline"
                size="sm"
                className="w-full text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/60 rounded-xl"
                onClick={() => setShowClearMemories(true)}
              >
                <TrashIcon className="w-3.5 h-3.5 mr-1.5" />
                Clear all memories
              </Button>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Preferences */}
      <motion.div
        className="px-4 mb-6"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-30px" }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Appearance
        </h2>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentTheme === "dark" ? (
                <MoonIcon className="w-4 h-4 text-muted-foreground" />
              ) : (
                <SunIcon className="w-4 h-4 text-muted-foreground" />
              )}
              <Label htmlFor="theme-toggle" className="text-sm font-medium">
                Dark mode
              </Label>
            </div>
            <Switch
              id="theme-toggle"
              checked={currentTheme === "dark"}
              onCheckedChange={handleThemeChange}
            />
          </div>
        </Card>
      </motion.div>

      {/* Data transparency */}
      <motion.div
        className="px-4 mb-6"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-30px" }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <Card className="p-4 bg-muted/50">
          <div className="flex items-start gap-3">
            <ShieldIcon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              All workout data is stored locally in your browser (IndexedDB). Nothing is sent to
              any server except anonymized requests to the AI coach. Your data is yours. Export
              regularly to avoid data loss if your browser storage is cleared.
            </p>
          </div>
        </Card>
      </motion.div>

      {/* Clear memories dialog */}
      <Dialog open={showClearMemories} onOpenChange={setShowClearMemories}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear all memories?</DialogTitle>
            <DialogDescription>
              This will erase everything Yono has learned about your preferences. Your workout
              records are not affected.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowClearMemories(false)}
            >
              Cancel
            </Button>
            <Button
              id="btn-confirm-clear-memories"
              variant="destructive"
              className="flex-1"
              onClick={handleClearMemories}
            >
              Clear memories
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import mode confirmation */}
      <Dialog open={!!importMode} onOpenChange={() => setImportMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {importMode === "replace" ? "Replace all data?" : "Merge backup?"}
            </DialogTitle>
            <DialogDescription>
              {importMode === "replace"
                ? "This will permanently delete all existing workout records and replace them with the backup. This cannot be undone. Export your current data first."
                : "This will add new records from the backup. Existing records with matching IDs will be skipped."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setImportMode(null)}
            >
              Cancel
            </Button>
            <Button
              id="btn-confirm-import"
              variant={importMode === "replace" ? "destructive" : "default"}
              className="flex-1"
              onClick={handleImportConfirm}
              disabled={isImporting}
            >
              {isImporting
                ? "Importing..."
                : importMode === "replace"
                ? "Yes, replace all"
                : "Yes, merge"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
