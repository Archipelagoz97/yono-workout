# Yono Workout — Project Status

## Latest: Weight-Unit Precision Fix (2026-08-07)

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
