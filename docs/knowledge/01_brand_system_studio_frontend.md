---
purpose: brand-system-studio-frontend
last_human_reviewed: 2026-07-05
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
  - frontend/src/workbench/preview.tsx
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
  (0 violations)** across all six stages at the 2026-07-04 rebuild and again across the
  2026-07-05 Component Lab v2 views.
- **Honest data details.** Provider select defaults to the first *available+authenticated*
  provider and survives brand switches (boot effect runs once; brand loads go through
  `selectBrand`); proposal counts pluralize; `confidence: null` renders as provenance
  ("deterministic") instead of "0%"; the Evidence panel lists every source in a focusable
  scroll region; Foundations type specimens render sorted, at true size, in the brand's font;
  the spacing ruler is proportional to the largest step; output cards downgrade to a warn tone
  with "N checks failing" when validation fails; metric supporting text derives from data.

## Design-system pipeline v1 (2026-07-05)

The workbench is now the front half of a settings → rules → components → end-products pipeline.
The backend contract it depends on (Drive working copy `src/brandkit/`): `catalog.py` defines
the full ~38-component catalog (Material-design breadth mapped to the six surface packs), a
parametric `spec` per component derived from brand tokens, and ~10 baseline contract rules;
`POST /api/brands/{slug}/inventory/complete` fills anything missing (idempotent — a no-op call
does not bump the version); brand creation auto-completes; `generate/landing.py` renders a
third HTML end product whose CTA/cards/KPIs are styled from the component specs; and
`computed.py` derives `control_height_px`, `hit_target_px`, and CTA-contrast metrics **from the
Buttons component spec**, so component edits flow directly into validation results.

Frontend guarantees on top of that contract:

- **Component Lab is a canvas, not a card grid.** A grouped component rail (categories in
  `COMPONENT_CATEGORY_ORDER`, stored user data always wins over catalog defaults) selects into
  a dotted canvas that renders a **live example** via `workbench/preview.tsx` — one renderer
  per spec `preview` kind (~26 kinds + generic anatomy fallback), all styled inline from brand
  tokens + spec props, exposed to AT as a single labelled `role="img"` figure with no fake
  interactive controls inside.
- **Figma-like editing with plain words.** The Editor Dock's "Design" panel renders a snapped
  stepper per numeric spec prop (scale lists per prop kind in `propOptions`) and a color-role
  swatch select per string prop (semantic roles only, `source_*` hidden). Labels come from
  `propLabel` ("Corner roundness", "Extra tap area") — no CSS vocabulary.
- **Optimistic, debounced persistence.** Spec edits repaint the preview immediately, then save
  via `saveRaw` after a 700 ms debounce; a sequence counter discards stale server responses so
  fast edits never get clobbered; pending edits flush before brand switches; save state is
  surfaced in the panel eyebrow ("saving… / saved / couldn't save").
- **Previews update with edits.** Output cards embed scaled, `inert` iframe thumbnails of every
  HTML artifact (slides, styleguide, landing), cache-busted by brand version, so each save
  visibly refreshes the end products; "Complete my system" (Overview) reports real counts from
  the completion endpoint or an honest "already complete".

## Known deferred work

The 2026-07-04 restructuring plan (`docs/audits/2026-07-04-workbench-restructuring-plan.md`)
Phase 3 items still open: operation-queue status cell (busy is still a single string),
review-sheet change list, provider preflight ping, AI composer, and rule creation
(`app/rules.ts` `createBlankRule` remains uncalled). `model.ts` still exports the unused
`SOURCE_ACTIONS`. Pipeline v1 defers: PPTX/PDF binary export, Mobbin API integration, freeform
drag-canvas editing, and per-variant/per-state spec overrides (one spec per component today).

## Operator rules

1. Frontend checks: `npx tsc -b && npx vite build` must pass; run the Playwright + axe harness
   against a live backend before shipping UI changes (0 axe violations is the bar).
2. The Drive working copy's knowledge doc (`01_brand_system_studio.md`) still describes the
   pre-rebuild UI (buried toasts, unconfirmed deletes); this doc supersedes it for the frontend
   until the working copy is re-synced from this branch.
3. The backend layout-contract test (`tests/test_frontend_layout_contract.py`, working copy)
   asserts the 2026-07 contract: `100dvh` shell, 1260/900 breakpoints, reduced-motion guard,
   canvas-first stacking. Update it in the same change as any breakpoint change.
