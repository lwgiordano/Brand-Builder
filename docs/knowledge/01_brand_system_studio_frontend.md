---
purpose: brand-system-studio-frontend
last_human_reviewed: 2026-07-04
covers:
  - frontend/src/api.ts
  - frontend/src/app/inventory.ts
  - frontend/src/app/rules.ts
  - frontend/src/app/validation.ts
  - frontend/src/components/AssetImage.tsx
  - frontend/src/main.tsx
  - frontend/src/types.ts
  - frontend/src/workbench/EditorDock.tsx
  - frontend/src/workbench/InputLibrary.tsx
  - frontend/src/workbench/SystemCanvas.tsx
  - frontend/src/workbench/WorkbenchApp.tsx
  - frontend/src/workbench/model.ts
  - frontend/src/workbench/primitives.tsx
  - frontend/src/workbench.css
  - vite.config.ts
---

# Brand System Studio — workbench frontend

This repo tracks the **frontend** of Brand System Studio: the React 19/Vite "Creative Brand
Lab" workbench. The FastAPI backend (`src/brandkit/`) and brand data (`brands/`) currently live
in the Drive working copy and are not yet imported here; `vite.config.ts` proxies `/api` and
`/artifacts` to that backend on `127.0.0.1:8000` in dev, and `npm run build` emits `dist/` for
the backend to serve. The legacy cockpit (`App.tsx`) and its split CSS are deliberately **not**
imported — they are unmounted dead code in the working copy.

## What the workbench guarantees (2026-07-04 rebuild)

The UI follows the dashboard design contract (`dashboard-design-patterns` agent edition):

- **Tokens only.** `workbench.css` defines the app's space scale (4–32), type scale (12-px
  floor), radius scale, semantic color roles, one focus-ring token, and 200 ms ease-out motion
  behind a `prefers-reduced-motion` guard. Components reference tokens, not raw values.
- **Fixed shell, independent scroll.** The three regions (Input Library · System Canvas ·
  Editor Dock) each scroll independently inside a `100dvh` grid; the page body never scrolls at
  ≥900 px. At ≤1260 px the dock becomes a right slide-over drawer (backdrop, ✕ via toggle, Esc);
  at ≤900 px the layout stacks and the page scrolls normally.
- **Feedback is a corner toast layer**, not a buried panel: `role="status"` successes
  auto-dismiss (~6 s, hover pauses), `role="alert"` failures persist until dismissed, starting a
  new action clears stale failures, and destructive-but-undoable actions (source delete) carry
  an Undo action wired to the version-snapshot undo.
- **Destruction is guarded.** Brand deletion opens a typed-confirm dialog (`DeleteBrandDialog`
  in `WorkbenchApp.tsx`) — the confirm button arms only when the slug is typed. Source deletion
  is act-plus-Undo.
- **Keyboard/AT contract.** Skip link to `#canvas`; cards use the stretched-button pattern
  (real `<button class="card-hit">` in the card title, no `role` on containers, nested controls
  stack above the hit overlay); all file inputs, the provider select, meters
  (`role="meter"` + value), and icon buttons carry accessible names; verified **axe-core clean
  (0 violations)** across all six stages at the 2026-07-04 rebuild.
- **Honest data details.** Provider select defaults to the first *available+authenticated*
  provider and survives brand switches (boot effect runs once; brand loads go through
  `selectBrand`); proposal counts pluralize; `confidence: null` renders as provenance
  ("deterministic") instead of "0%"; the Evidence panel lists every source in a focusable
  scroll region; Foundations type specimens render sorted, at true size, in the brand's font;
  the spacing ruler is proportional to the largest step; output cards downgrade to a warn tone
  with "N checks failing" when validation fails; metric supporting text derives from data.

## Known deferred work

The 2026-07-04 restructuring plan (`docs/audits/2026-07-04-workbench-restructuring-plan.md`)
Phase 3 items are not yet implemented: operation-queue status cell (busy is still a single
string), review-sheet change list, provider preflight ping, AI composer, rule creation, and the
segmented workflow control (the component status picker still offers coverage words as manual
choices). `model.ts` still exports the unused `SOURCE_ACTIONS`, and `app/rules.ts`
(`createBlankRule`) remains uncalled until rule creation lands.

## Operator rules

1. Frontend checks: `npx tsc -b && npx vite build` must pass; run the Playwright + axe harness
   against a live backend before shipping UI changes (0 axe violations is the bar).
2. The Drive working copy's knowledge doc (`01_brand_system_studio.md`) still describes the
   pre-rebuild UI (buried toasts, unconfirmed deletes); this doc supersedes it for the frontend
   until the working copy is re-synced from this branch.
