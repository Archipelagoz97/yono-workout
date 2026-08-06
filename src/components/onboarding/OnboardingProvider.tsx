"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import db from "@/db/database";
import { OnboardingDialog } from "./OnboardingDialog";

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [onboardingDone, setOnboardingDone] = useState(false);
  const profile = useLiveQuery(() => db.profiles.get("main-user"), []);

  // If profile exists (reloaded from DB on cold start), skip onboarding
  const hasProfile = !!profile;
  const showOnboarding = !hasProfile && !onboardingDone;

  if (showOnboarding) {
    return <OnboardingDialog onComplete={() => setOnboardingDone(true)} />;
  }

  return <>{children}</>;
}
