"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { RepeatIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ─────────────────────────────────────────────────────────
// Today page primitives — consistent selection controls used
// across the /today dashboard.
// ─────────────────────────────────────────────────────────

export function SectionHeader({
  title,
  action,
  onAction,
  className,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between mb-2.5", className)}>
      <h2 className="text-[19px] font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      {action && onAction && (
        <button
          onClick={onAction}
          className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {action}
        </button>
      )}
    </div>
  );
}

export function SelectionCard({
  icon,
  label,
  selected,
  onClick,
  id,
  className,
}: {
  icon: ReactNode;
  label: string;
  selected: boolean;
  onClick: () => void;
  id?: string;
  className?: string;
}) {
  return (
    <motion.button
      id={id}
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.14 }}
      className={cn(
        "w-full min-h-[88px] rounded-2xl px-3.5 py-3 flex items-center gap-3 text-left border transition-colors duration-150",
        selected
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card text-foreground border-border hover:bg-muted/50",
        className
      )}
    >
      <span
        className={cn(
          "w-9 h-9 shrink-0 rounded-xl flex items-center justify-center",
          selected ? "bg-primary-foreground/15" : "bg-muted"
        )}
      >
        {icon}
      </span>
      <span className="text-[13px] font-semibold leading-tight min-w-0">{label}</span>
    </motion.button>
  );
}

export function SegmentedControl({
  options,
  value,
  onChange,
  idPrefix,
  className,
}: {
  options: Array<{ id: string; label: string; icon?: ReactNode }>;
  value: string | null;
  onChange: (id: string) => void;
  idPrefix: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      className={cn("flex w-full min-w-0 gap-1.5 p-1 bg-muted/60 rounded-2xl", className)}
    >
      {options.map((opt) => {
        const selected = value === opt.id;
        return (
          <button
            key={opt.id}
            id={`${idPrefix}-${opt.id}`}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(opt.id)}
            className={cn(
              "flex-1 min-w-0 h-10 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors duration-150 flex items-center justify-center gap-1 px-1 touch-target",
              selected
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function ChipSelector({
  options,
  value,
  onChange,
  idPrefix,
  className,
}: {
  options: Array<{ id: string; label: string }>;
  value: string;
  onChange: (id: string) => void;
  idPrefix: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      className={cn(
        "flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 snap-x",
        className
      )}
    >
      {options.map((opt) => {
        const selected = value === opt.id;
        return (
          <button
            key={opt.id}
            id={`${idPrefix}-${opt.id}`}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(opt.id)}
            className={cn(
              "flex-shrink-0 h-9 px-3.5 rounded-xl text-[13px] font-semibold whitespace-nowrap border transition-colors duration-150 snap-start touch-target",
              selected
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function CompactWorkoutRow({
  name,
  meta,
  onRepeat,
  repeatId,
  onClick,
}: {
  name: string;
  meta: string;
  onRepeat: () => void;
  repeatId?: string;
  onClick?: () => void;
}) {
  return (
    <div className="w-full min-w-0 flex items-center gap-3 px-4 py-3.5 bg-card rounded-2xl ring-1 ring-foreground/10">
      <div className="min-w-0 flex-1" onClick={onClick}>
        <p className="text-sm font-semibold text-foreground truncate">{name}</p>
        <p className="text-[13px] text-muted-foreground mt-0.5 truncate">{meta}</p>
      </div>
      <Button
        id={repeatId}
        variant="outline"
        size="sm"
        onClick={onRepeat}
        className="shrink-0 rounded-lg"
      >
        <RepeatIcon className="w-3.5 h-3.5" />
        Repeat
      </Button>
    </div>
  );
}

export function StatusChip({
  status,
  className,
}: {
  status: "fresh" | "recovering" | "recent";
  className?: string;
}) {
  const map = {
    fresh: {
      label: "Fresh",
      cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      dot: "bg-emerald-500",
    },
    recovering: {
      label: "Recovering",
      cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      dot: "bg-amber-500",
    },
    recent: {
      label: "Recently trained",
      cls: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
      dot: "bg-orange-500",
    },
  }[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        map.cls,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", map.dot)} />
      {map.label}
    </span>
  );
}
