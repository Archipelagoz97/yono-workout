# Yono Workout — Project Status

## Latest: Coach actually sees your workout history (2026-08-07)

User reported Coach Yono couldn't answer "what did I last train" even though it claimed to see
workout history.

### Root cause
The coach page fetched the last 5 completed sessions
(`src/app/coach/page.tsx`) but **never included them in the request body** to
`/api/ai/coach/stream`, and `CoachRequestSchema` had no field for them either. The system prompt
told the AI to "use the workout history provided", but none was ever sent — the API received only
the chat message, chat summary, memories, and an empty `exerciseContext`. So the coach was
answering from general knowledge with zero ground truth.

### Fix
- `src/lib/ai/schemas/index.ts`: added optional `recentSessions` to `CoachRequestSchema` —
  array of `{ name, focus, completedAt, exercises: [{ exerciseId, sets: [{ weightKg, reps, rpe }] }] }`.
- `src/app/coach/page.tsx`: builds the same rich history payload as the planner (last 5 completed
  sessions + their exercises + sets with weight/reps/RPE) and sends it as `recentSessions`.
- `src/lib/ai/buildCoachMessages.ts`: injects a system message
  `"Recent workout history (last N completed sessions): …"` with readable lines
  (`- Back + Arms (Aug 5, focus: back, arms): - lat_pulldown: 60kg x 12 (RPE 8), 60kg x 11 (RPE 9) …`).
- `src/lib/ai/prompts/index.ts`: both coach prompts (JSON + streaming) now tell Yono to treat the
  history message as ground truth, quote it when asked about past sessions/lifts, and to admit
  when no records exist yet.

### Checks
- `npx tsc --noEmit` clean; `npm run build` clean; `npm run lint` 46 problems vs 47 baseline
  (no regressions).
- Playwright (prod, chromium, port 3101): intercepted the real `/api/ai/coach/stream` request
  after seeding 2 completed sessions — request body contains `recentSessions` with both sessions,
  `Back + Arms` exercises (`lat_pulldown`, `dumbbell_curl`), and `lat_pulldown` sets
  (`60kg x 12 RPE 8`, `60kg x 11 RPE 9`). **PASS — coach now receives real workout history.**

## Previous: Scrollable exercise pickers (2026-08-07)

Fix for "Select Exercise" / Change-exercise pickers growing past the viewport instead of
scrolling — the exercise list could not be fully seen.

### Root cause
`@base-ui/react/scroll-area` viewport is `size-full` (height:100%), which resolves against the
parent's *specified* height. In the bottom sheet (`ChangeExerciseSheet`) and centered dialog
(`ExerciseSelectorDialog`) the wrapper only had `max-height`, so `height:100%` fell back to the
un-clamped content height — the viewport grew to the full catalog height and got clipped by the
container's `overflow-hidden` instead of scrolling.

### Fix
- `src/components/ui/scroll-area.tsx`: Root is now `flex flex-col` and the viewport uses
  `w-full flex-1 min-h-0` instead of `size-full`. Flexbox resolves the viewport height against
  the constrained root regardless of the parent's height mode, so the list scrolls inside the
  sheet/dialog.
- `src/components/workout/ChangeExerciseSheet.tsx`: ScrollArea is `flex-1 min-h-0` inside the
  `max-h-[85dvh]` sheet (was `max-h-[55dvh]`, which did not flex-fill).
- `src/components/workout/ExerciseSelectorDialog.tsx`: ScrollArea is `flex-1 min-h-0` (was
  missing `min-h-0`, so the flex item's `min-height:auto` blocked shrinking).
- `src/app/history/page.tsx`: same `min-h-0` for the session-detail ScrollArea.

### Checks
- `npx tsc --noEmit` clean; `npm run build` clean; `npm run lint` unchanged at 47-problem baseline.
- Playwright (prod, chromium, port 3101): Change sheet scrolls (99 search results,
  clientHeight 466 vs scrollHeight 7928, scrollTop changes); **Select Exercise dialog** list
  scrolls (clientHeight 587 vs scrollHeight 8888) and the dialog fits the viewport; responsive
  320/430 sheet/search/overlay/toast **ALL PASS**; undo script 5/5.

## Previous: Change-exercise sheet, start transition, set toast + undo (2026-08-07)

Three UX improvements verified end-to-end on the production build.

### 1. Change-exercise flow (every draft exercise)
New `src/components/workout/ChangeExerciseSheet.tsx` bottom sheet, opened per-row via a
Change button (`aria-label="Change <name>"`) or row tap on the `/today` suggestion card.
- Shows the current exercise description ("Replace <name> with another movement.").
- **Recommended** section: top-6 ranked by movementPattern + primary-muscle overlap with the
  original, gym equipment match, training-history familiarity (`db.workoutSets` live query),
  and `alternatives` hints; score 0 → falls to "All exercises".
- **All exercises** list + search field (`SearchIcon`, filters by name/alias).
- Cancel button; replace is async and re-suggests weight from the last logged set for the new
  exercise via a Dexie `[exerciseId+completedAt]` range query.

### 2. Start-workout transition overlay
Starting/repeating/template-starting a workout now shows a full-screen `z-[100]` Yono overlay
(min 900ms, double-tap guarded via `startingRef`, `useReducedMotion` respected) with the exact
text **"janji harus semangat ya maniez"** and "Yono is setting up your session…" before
navigating to `/workout/<id>`.

### 3. Complete-set toast with real Undo
Completing a set shows a compact toast **`Set X ditambah · 40 lb × 12 reps · Logged`**
(weight/assistance/duration/distance/setType aware) with a working **Undo** button
(`#btn-undo-set-toast`). Undo deletes the exact set, stops the rest timer, restores exercise
position/set number and the input values, then shows `Set dibatalkan.` Auto-dismisses after 5s.
Positioned above the BottomNav: `bottom: calc(64px + env(safe-area-inset-bottom, 0px) + 16px)`,
`z-[60]`, `role="status"`. The `savedCopy` Yono quote under the exercise now shows only the
flavor text (the "Set X ditambah" text lives in the toast).

### Files changed
- `src/components/workout/ChangeExerciseSheet.tsx` (new).
- `src/app/today/page.tsx` (sheet wiring, `startSessionWithTransition`, guarded start handlers,
  async `onReplaceExercise`, overlay JSX, `Dexie` import).
- `src/app/workout/[sessionId]/page.tsx` (`showSetToast`/`handleUndoSet`/`handleToastUndo`,
  toast JSX, duration toast branch, `savedCopy` flavor-only).

### Checks
- `npx tsc --noEmit` clean; `npm run build` clean (18 routes); `npm run lint` unchanged at the
  47-problem pre-existing baseline.
- Playwright (prod build, chromium, port 3101): **19/20** feature script (sole "failure" was a
  harness artifact — weight-undo on a bodyweight exercise has no weight input to restore);
  **5/5** undo script (weight prefill `88.18 lb`, toast `Set 1 ditambah · 95 lb × 12 reps ·
  Logged`, undo restores weight 95, second toast, toast dismissed); cardio duration toast
  `Set 1 ditambah · 15 sec · Logged` + undo present (initial harness failure was a bug in the
  test's `page.evaluate` string, not the app).
- Responsive matrix at **320px and 430px**: change sheet fits (width = viewport, search
  filters, Cancel works), start-overlay text fits in-view, toast in-view and above the bottom
  nav — **ALL PASS**.

## Previous: Workout UX — final-set button, RPE explainer, multi-undo, Complete-modal layout (2026-08-07)

### 1. Final-set Complete button
On the last working set of the last exercise (non-superset last-in-group, `workingSetsDone + 1 === targetSets`)
the Complete button switches to accent-orange styling, label **"Complete Last Set"** (Flag icon), and a caption
"This is the last set — you're almost done!". Purely presentational — completion logic untouched.

### 2. RPE explainer popup
"What's RPE?" pill next to the RPE control opens a dialog explaining the 8/9/10 anchors
(reps in reserve) and that Yono uses RPE for next-session weight suggestions.

### 3. Multi-level undo
Replaced the single `lastSavedSet` + 6s auto-clear with a persistent `undoStack`. Every completed set
(warmup/working) is pushed; the Undo button deletes the most recent set, reverts exercise/set position,
and stays available (`Undo last set (N)`) until the stack is empty. Works across exercises.

### 4. Workout Complete modal layout
- Kept mathematically centered (`calc(100vw-32px)` / `max-w-440px`, `max-h-[calc(100dvh-32px)]` + scroll).
- Title centered independently; close button is absolute top-right, 44×44px touch target.
- Fixed spacing rhythm (title→Yono 24, Yono→icon 20, icon→title 8, title→desc 10, desc→volume 10,
  volume→summary 28, rows 10, list→button 32, button→bottom 24).
- Achievement text in centered `max-w-[320px]` block; summary rows use
  `grid-cols-[minmax(0,1fr)_auto]` + `tabular-nums` so metadata never overflows.
- Back to Dashboard: full-width 52px, rounded 14px, aligned with rows.

### Files changed
- `src/app/workout/[sessionId]/page.tsx` (undo stack, RPE dialog, final-set button, complete modal).

### Checks
- `npx tsc --noEmit` clean; `npm run build` clean (18 routes); `npm run lint` unchanged at the
  47-problem pre-existing baseline.
- Playwright (prod build, chromium): EX1 normal button, EX2 accent "Complete Last Set" + caption;
  multi-undo (2 sets → undo×2 → back to exercise 1, button gone); complete modal at 320/390/430 —
  title center delta 0, no horizontal overflow, close 44px, modal scrolls, summary rows don't overflow.
  Bodyweight exercises (pull-up/chin-up/assisted) correctly omitted from the weight summary (no weightKg).

## Previous: Weight-Unit Precision Fix (2026-08-07)

Fixed a display/round-trip bug on the workout screen: entering `5 lb` and completing a set
re-displayed `5.004493351486 lb` as the next entered weight.

### Root cause
`handleCompleteSet` stored canonical kg rounded to 2 decimals
(`Math.round(displayToKg(weight, unit) * 100) / 100`) → 5 lb became `2.27 kg`. The
"pre-fill from last set" effect then set `weight = kgToDisplay(2.27, "lb")` = `5.004493351486`
and the weight control rendered that raw float.

### Fix
- Store full-precision canonical kg (`displayToKg(weight, weightUnit)`), no premature rounding —
  round-trip 5 lb → 2.26796185 kg → exactly 5 lb.
- Round display values to 2 dp whenever `weight` is derived from kg (suggestion init + last-set
  pre-fill) so the control never shows a raw float. Unit toggle already rounded to 2 dp.
- Old records stored as 2.27 kg self-heal on display (rounded to "5 lb") and re-store exactly
  on next completion.

### Files changed
- `src/app/workout/[sessionId]/page.tsx` — store full-precision kg (both `weightKg` and
  `assistanceWeightKg`), round display on suggestion init (line ~250) and pre-fill (line ~270).

### Checks
- Node simulation: 5 lb → stored 2.267961850050177 kg → displays 5 lb across complete /
  pre-fill / next set / refresh; unit toggle 5 lb ↔ 5 kg ↔ 5 lb stable; 20 kg suggestion
  shows 44.09 lb and round-trips cleanly.
- `npm run build` — clean (18 routes). `npm run lint` — unchanged at the 47-problem
  pre-existing baseline (workout-page setState-in-effect errors are not regressions).

## Previous: /today Redesign — Premium Calm Dashboard (2026-08-07)

Complete visual/UX redesign of the `/today` dashboard into a calm, premium mobile layout.
All generation logic (DeepSeek, offline fallback, IndexedDB context), active-workout restore,
templates, and import are preserved; only presentation changed.

### UI problems found during redesign
- Focus cards were emoji-based, horizontally-scrolled (hidden options, cramped 88px cards),
  and `choose`/specific targets used identical 🔥 icons.
- Muscle recovery rendered muscle IDs that map to the same display label — **"Back" appeared
  twice** because multiple muscle IDs (`latissimus_dorsi`, `rhomboids`, `middle_traps`) all
  label as "Back" in `MUSCLE_LABELS`. Fixed by grouping by display label and keeping only the
  least-recovered muscle per group (see below).
- Header was oversized (title `text-3xl`, `pt-12 mb-10`) pushing CTAs below the fold;
  vertical column of duration/energy buttons wasted vertical space.
- Equipment mode was a wrapping flex of `min-w-[80px]` buttons that reflowed awkwardly.
- Import + Templates competed visually with the primary CTA; an unlabeled "+" button sat
  next to "Yono AI".

### Files changed
| File | Change |
| --- | --- |
| `src/app/today/page.tsx` | Rewritten: compact header (30px title, 15px sub, 68px Yono, 24-28px padding), single Active/Last-workout card (Resume/Repeat), 2-col focus grid (3-col on ≥sm, 88-100px cards, `aria-pressed`, Lucide icons, cream selected state), segmented Duration (20m/30m/40m/60m/No limit), 3-button Energy (Low/Okay/Strong), Equipment = gym selector row (ChevronDown → `/gyms`) + horizontally-scrolling quick-mode chips, full-width "Generate workout with Yono" + "Create manually" CTAs, "More options" bottom sheet (Import + Templates), compact Recent-workout rows with Repeat + "See all" → `/history`. Removed unused `greetingCopy`/`getCopy`. Fixed `Date.now()` purity lint in this file (via `nowTs` lazy state). |
| `src/components/workout/TodayControls.tsx` | New: shared primitives — `SectionHeader`, `SelectionCard`, `SegmentedControl`, `ChipSelector`, `CompactWorkoutRow`, `StatusChip`. |
| `src/components/workout/MuscleRecoveryPanel.tsx` | Rewritten: dedupes muscle display labels (fixes duplicate "Back"), compact status list rows (label + relative time + `StatusChip`), statuses Fresh (sage) / Recovering (muted amber) / Recently trained (muted coral), caption "Approximate training history based on recent logged workouts." |
| `src/lib/storage/index.ts` | (unchanged) still provides `getSelectedGymId`/`getWorkoutPrefs`/`saveWorkoutPrefs` used by today. |
| `src/components/layout/BottomNav.tsx` | (unchanged) fixed nav kept; Today dot still shows on active session. |

### Duplicate-"Back" root cause
`src/components/workout/MuscleRecoveryPanel.tsx` builds recovery from `def.primaryMuscles`.
Multiple primary-muscle IDs label to "Back" (`latissimus_dorsi`, `rhomboids`, `middle_traps`),
and `muscleOrder` includes two of them, so a per-ID render produced two "Back" rows. The panel
now groups by `MUSCLE_LABELS` in a `Map`, keeping the least-recovered (largest elapsed hours)
muscle per label — one row per visible group.

### Responsive / viewport
- Target tested widths 320/360/375/393/412/430px. Root container keeps `overflow-hidden`,
  chips scroll internally (`overflow-x-auto scrollbar-none`), segmented controls use
  `min-w-0` + `text-xs` so 5 duration options fit at 320px without page-level scroll.
- Same layout shell as before (single column, `pb-safe-nav`), no doc-level horizontal scroll.

### Checks
- `npm run build` — clean (Next 16.3.0, Turbopack; all 18 routes)
- `npm run lint` — **47 problems (31 errors, 16 warnings)** vs 55 baseline before this change.
  My diff fixed 2 `Date.now` purity errors in today/page.tsx. All remaining errors are
  pre-existing repo-wide (`no-explicit-any` in API routes + suggestion handlers preserved
  verbatim, setState-in-effect in coach/workout, impure `Date.now`/`Math.random` in
  history/profile/progress/YonoAnimation, unescaped entities in onboarding).
- No typecheck/test scripts exist in package.json (only dev/build/start/lint).

### Notes / next steps
- "Import from AI chat log" moved into the "More options" bottom sheet (feature preserved).
- Could later move Import into `/coach` entirely, and type the suggestion handlers
  (`as any` / `prev: any`) to eliminate remaining lint noise.

## Previous: Workout Volume Achievement (2026-08-06)

Per-session celebration popup shown on the "Workout Complete" dialog, based on total
volume lifted (Σ weightKg × reps across all completed sets in the session).

Tiers (ID inside-joke themed):
| Total volume | Emoji | Label | Copy |
| --- | --- | --- | --- |
| < 100 kg | 🎒 | Beban Hidup | "Baru ngangkat beban hidup. Yang penting udah mulai, sisanya nyusul." |
| ≥ 100 kg | 🦘 | Legacy Arc | "Setara ngangkat Chris pas masih gendut..." |
| ≥ 250 kg | 🧸 | Trio Tangguh | "Setara ngangkat Okta, Nadhifa, dan Albert sekaligus..." |
| ≥ 500 kg | 🦏 | Sekawan Lengkap | "Setara ngangkat DD, Reyn, Fio, Vinka, dan Yono sekaligus..." |
| ≥ 1000 kg | ⛴️ | Kapal Tongkang | "Kamu baru aja ngangkat kapal tongkang!..." |

- Files changed: `src/app/workout/[sessionId]/page.tsx` — added `allSessionSets` live query +
  `totalVolumeKg` computation, `getVolumeAchievement()` tier helper, achievement block in the
  complete dialog (emoji, label, copy, total kg shown only when ≥ 100 kg).
- Verified via Playwright: seeded sessions at 50/100/200/250/500/3000 kg → correct tier shown
  (3000 kg → Kapal Tongkang; 200 kg → Legacy Arc; boundary rounding caveat: 100/30 kg distrib
  rounds to 99.9 → Beban Hidup, expected).

## Previous Fix: Residual Mobile Horizontal Overflow (2026-08-06)

### Root Cause
`<main>` is a flex item inside the app shell (`flex flex-col lg:flex-row`). By default a flex
item has `min-width: auto`, so `<main>` could never shrink below its min-content width
(448px) — regardless of viewport. The flex children with intrinsic widths (e.g. the
`min-w-max` heatmap grid, focus-selector buttons, category chips) blew the page out to
448px at 320/360/375/393px viewports. `documentElement` looked fine only because
`overflow-x: hidden` was masking it, clipping content.

### Fixes Applied
| File | Change |
| --- | --- |
| `src/app/layout.tsx` | `<main>` now `w-full min-w-0 max-w-full overflow-x-clip flex-1 lg:ml-64`; inner container `w-full min-w-0 min-h-dvh max-w-2xl mx-auto lg:max-w-3xl` |
| `src/components/ui/card.tsx` | Base Card now `w-full min-w-0 max-w-full ...` |
| `src/app/history/page.tsx` | Heatmap scroll container `w-full min-w-0 overflow-x-auto overscroll-x-contain pb-1`; inner grid `flex flex-row-reverse gap-[3px] w-max min-w-full` with reversed weeks so the newest week is right-aligned/visible on load |
| `src/app/history/page.tsx` | Search input wrapper `relative w-full min-w-0 max-w-full` |

### Verified
Empirical Playwright/Chromium audit (`node audit2.js`) against a production build on all
routes × 6 mobile widths (320/360/375/393/412/430px):

- Routes tested: `/today`, `/history`, `/coach`, `/progress`, `/profile`, `/gyms`,
  `/exercises`, `/workout/seed-active`
- Result: `document.body.scrollWidth == clientWidth` for every route at every width —
  **zero document-level horizontal overflow**.
- Elements that still overflow the viewport are intentional, contained scroll areas
  (heatmap grid, category chips, focus-selector row, decorative blur) and scroll inside
  their own `overflow-x-auto` container.

### Checks
- `npx tsc --noEmit` — clean
- `npm run build` — clean
- `npm run lint` — 55 problems (33 errors, 22 warnings), identical before/after this fix
  (all pre-existing: `no-explicit-any`, setState-in-effect, impure-render, unescaped entities)
- Screenshots taken at 360×780 (deviceScaleFactor 3) for `/today`, `/history`,
  `/progress`, `/coach` — saved to `C:\Users\chris\AppData\Local\Temp\opencode\shots\`
