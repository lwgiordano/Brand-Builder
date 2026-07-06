---
purpose: brand-system-studio-frontend
last_human_reviewed: 2026-07-06
covers:
  - frontend/src/api.ts
  - frontend/src/app/inventory.ts
  - frontend/src/app/rules.ts
  - frontend/src/app/validation.ts
  - frontend/src/components/AssetImage.tsx
  - frontend/src/main.tsx
  - frontend/src/types.ts
  - frontend/src/workbench/BrandIntake.tsx
  - frontend/src/workbench/ComponentReview.tsx
  - frontend/src/workbench/CreationStudio.tsx
  - frontend/src/workbench/EditorDock.tsx
  - frontend/src/workbench/StyleSettings.tsx
  - frontend/src/workbench/SystemCanvas.tsx
  - frontend/src/workbench/WorkbenchApp.tsx
  - frontend/src/workbench/controls.tsx
  - frontend/src/workbench/model.ts
  - frontend/src/workbench/preview.tsx
  - frontend/src/workbench/primitives.tsx
  - frontend/src/workbench.css
  - vite.config.ts
---

# Brand System Studio — pipeline frontend

This repo tracks the **frontend** of Brand System Studio: a React 19/Vite app structured as one
linear pipeline — *add your brand → set your style → your components → make things*. The FastAPI
backend (`src/brandkit/`) and brand data (`brands/`) live in the Drive working copy and ship via
the merged bundle; `vite.config.ts` proxies `/api` and `/artifacts` to it in dev, and
`npm run build` emits `dist/` for the backend to serve.

## The pipeline IA (2026-07-06 restructure — "forget the old way")

The six stage tabs are gone. `model.ts` defines four `STEPS` rendered as a numbered step nav
(`data-step-nav`, `aria-current="step"`) in `SystemCanvas.tsx`, plus a persistent **Checks chip**
(`data-checks-chip`) showing the failing-check count and opening the inspector dock. The old
left rail is gone too — the shell is now canvas + dock (`.lab-shell` two columns; dock becomes
the 1260px drawer as before; everything stacks at 900px).

1. **Add your brand** (`BrandIntake.tsx`) — full-width intake: brand picker/create/typed-delete,
   upload tiles (guidelines / pictures / logo), URL ingest, source cards with a plain-language
   "We found these colors" summary (reads `metadata.extracted_colors`, which the backend now
   fills from image pixels via Pillow and from SVG fills), and the **Review Queue** (provider
   select, Extract proposals, Approve/Reject, advanced JSON) folded in from the old dock.
2. **Set your style** (`StyleSettings.tsx`) — foundations as *editable settings*: per-role color
   fields (`ColorField`: native color input + hex + suggestion swatches drawn from `source_*`
   tokens and extracted image colors), type-size steppers + font field, spacing/radius steppers,
   logo wordmark/height/placement — all persisted through the same optimistic debounced
   whole-brand save as spec edits (`handleUpdateToken` shares the sequence-guarded pipeline).
   Below: every rule as a plain sentence with live pass/fail chips, failures first.
3. **Your components** (`ComponentReview.tsx`) — a **guided one-at-a-time walkthrough**: the
   "Component N of M" counter (aria-live) is the accessible progress signal over an aria-hidden
   segment bar; Previous/Next browse (they never change status — approval stays the explicit
   chip picker); "Jump to a piece" is a disclosure listing every component by category; the
   editor is **docked beside the dotted canvas inside the step** (reference pattern #206 — never
   a modal, never the drawer): Design steppers/swatches, status chips, then detail disclosures.
   Component editing no longer lives in the EditorDock. ←/→ arrows step when focus is in the
   walkthrough. "Complete my system" sits in the walkthrough header.
4. **Make things** (`CreationStudio.tsx`) — the creation system. "New design" wizard: type
   (deck/report/landing) → proven skeleton template (`GET /api/templates`) → optional pasted
   content (backend structurer maps headings→titles, dashes→bullets, "label: 42%"→numbers).
   The editor shows a numbered **section rail** (`data-section-rail`; select, move up/down,
   remove, "Add a part") beside a **full live preview iframe** of the real generated HTML,
   cache-busted by `brandVersion-creationVersion-previewNonce`. Editing happens in the dock's
   **"This part"** panel: per-slot fields (text/paragraph/one-per-line lists/number pairs/table
   rows) plus plain-word layout choices (Line things up, Background mood, Breathing room,
   Highlight color). Exports: **Download PowerPoint** (real .pptx, decks), **Print to PDF**
   (reports carry A4 print CSS), Open full size. The home view lists designs
   (`data-creation-list`) and a "Your brand kit" row of the auto-generated artifacts.
5. **Whole-design exceptions.** A creation may carry `exceptions`
   (`"<component_id>.<prop>" → value`, schema-guarded key pattern). The dock's **"The pieces on
   this design"** panel (`data-pieces-panel`) edits the system pieces the outputs are built from
   (Buttons, Cards, KPI tiles) with a scope toggle **Everywhere | Just this design** (#108):
   Everywhere rides the brand save (all artifacts + designs re-render); Just-this-design writes
   an exception via the creation save (only that design re-renders). Exceptions are always
   visible (#215/#109): a "● Customized here" badge per piece, a per-control "differs from your
   system — Back to your system" reset, and an "N exceptions" chip on the editor header. The
   backend merges exceptions over `_spec_props` in `creation_html` (byte-stable) and the pptx
   export honors the KPI-tile subset (the only piece with a deck-shape counterpart).

## State/save machinery (`WorkbenchApp.tsx`)

Two parallel optimistic pipelines, both 700 ms debounced with sequence guards against stale
responses and both flushed before brand switches: whole-brand saves (`saveRaw` — component specs
AND style tokens; server re-renders all artifacts *and every creation* on each save, so token
edits restyle finished designs) and creation saves (`PUT /creations/{id}` — server re-renders
that creation's HTML; the preview iframe swaps src only after the save resolves). Creations keep
their own undo (`POST …/undo`, snapshot files server-side); the two Undo buttons are explicitly
labelled "Undo design edit" vs "Undo brand change". Toasts, typed-confirm brand delete, skip
link, Esc-to-close drawer all unchanged.

## Controls (`controls.tsx`)

Shared visual-editing widgets: `SpecStepper` (snapped ± stepper), `SwatchSelect` (color-role
picker; 24px + 4px halo documented dense-picker exception), `ChoiceChips` (single-choice,
`aria-pressed`), `TextField`, `ColorField`. All labels are plain words (`propLabel`,
`OVERRIDE_LABELS`) — no CSS vocabulary reaches the user.

## Progressive disclosure

Essentials visible, depth on demand (#144): the stage heading is a compact line (one eye-winner
goes to the canvas), passing checks collapse behind "Show N passing checks" in Set your style,
advanced JSON/evidence stay behind disclosures, and each design piece's controls sit behind an
"Edit …" disclosure under its badge row.

## Quality bar (verified 2026-07-06)

axe-core **0 violations** across all four steps, the walkthrough, the pieces panel, the creation
editor, and 375px mobile; 0px horizontal overflow at 1440/768/375; proven in-browser: walkthrough
nav + jump list + in-step edit repaint, exception isolation between two designs, Everywhere
propagation to sibling designs, reset-to-system, a rapid scope-toggled edit burst with zero
failures, and pasted-content → deck → edit → undo → PowerPoint export; backend suite 63 passing
(adds exception round-trip/isolation/undo/schema guards + pptx exception read-back).

## Known deferred work

Drag-reorder (buttons only today), image slots inside creations, AI-assisted content
structuring (deterministic only), per-variant component spec overrides, native pptx charts
(bars are shapes), server-side PDF rendering (reports use browser print), rule creation, and the
provider preflight ping. `app/validation.ts` helpers and `app/rules.ts` `createBlankRule` are
currently uncalled (kept for the rule-creation phase).

## Operator rules

1. Frontend checks: `npx tsc -b && npx vite build` must pass; run the Playwright + axe harness
   against a live backend before shipping UI changes (0 axe violations is the bar).
2. The backend layout-contract test (working copy `tests/test_frontend_layout_contract.py`)
   asserts the pipeline IA: the four step labels as `data-workbench-stage` values, step-nav and
   checks-chip markers, creation-studio markers, the 100dvh shell, 1260/900 breakpoints, and
   reduced-motion. Update it in the same change as any IA/breakpoint change.
3. Creation artifacts are whitelisted by regex (`creation-c-[a-z0-9]{8}.(html|pptx)`) in the
   backend's `paths.py`; new artifact filenames must be added there deliberately.
