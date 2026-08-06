"use client";

import { useEffect } from "react";
import { seedInitialData } from "@/db/database";
import { requestStoragePersistence } from "@/lib/storage";

// ─────────────────────────────────────────────────────────
// DB PROVIDER
// Seeds the database on first load.
// Requests persistent storage.
// All purely side-effects; renders nothing.
// ─────────────────────────────────────────────────────────

export function DbProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Seed on mount (checks count before inserting — idempotent)
    seedInitialData().catch((err) => {
      console.error("[DbProvider] Failed to seed database:", err);
    });

    // Request persistent storage (non-blocking)
    requestStoragePersistence().then((persisted) => {
      if (persisted) {
        console.info("[Storage] Persistent storage granted");
      }
    });
  }, []);

  return <>{children}</>;
}
