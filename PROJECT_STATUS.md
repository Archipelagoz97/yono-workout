# Yono Workout — Project Status

## Latest Feature: Workout Volume Achievement (2026-08-06)

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
