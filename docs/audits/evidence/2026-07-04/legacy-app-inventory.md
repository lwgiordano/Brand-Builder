# Legacy cockpit (App.tsx) capability inventory

Source: `frontend/src/App.tsx` in the Drive working copy — 152,510 bytes, 3,845 lines, single
mega-file (~45 inline components, ~50 helpers). Mined 2026-07-04 to identify proven patterns the
workbench rebuild dropped. Line numbers refer to that file.

## Capabilities present in the cockpit, absent from the workbench

- **Proposal diff-queue with Apply/Reject** (L3201–3225): summary + validation-impact line, then
  per-change rows — JSON-patch `op path → value`, flattened token/component patches, draft rules.
- **Full rule editing** (L1616–1734): "sentence builder" — *For [category] check [metric] is
  [assertion] [target]* — via inline select/text controls; plus label, status, severity, unit,
  token_ref, scope-as-JSON behind disclosures.
- **Rule creation** (L324, buttons at L744/L1765/L1890): `createBlankRule` → unshift → auto-open
  inspector editor.
- **Per-rule evidence editing** (L1735–1761): source_id / locator / confidence fields.
- **AI composer** (L3162): bottom bar, provider status pill, "Ask AI to change this system…"
  input → `proposeEdit`; result flows into the same diff-queue; `applyPatch`/`applyDrafts` on
  accept (L525–536).
- **Armed two-step brand delete** (Topbar): first click arms, second confirms — the workbench
  regressed this to a single unguarded click.
- **Raw JSON editor with "Validate and save JSON"** (L1777–1780).
- **Export links** for Brand JSON / Styleguide / Slides / computed.json / Validation report
  (L2648–2654).
- **Mock preview surfaces** with tabs — Slide / Product UI / Website / Report (L2646+), rule
  thumbnails and visual examples; color-editor popover with HSL lightness tools.
- **Component-coverage checklist** across ~24 UI categories (L2131).

## Corrections this inventory forces on the 2026-07-03 audit

1. **Drag-and-drop was never implemented** — "Drop or choose files to analyze" (L659) is a label
   over a hidden file input; no onDrop/onDragOver anywhere. BSS-009's drag-drop item is an
   over-promise in the old copy, not a lost capability.
2. **BSS-002 strengthens**: brand deletion regressed from armed two-step (cockpit) to one click
   (workbench).

## Structure note

Everything lived in one 3,845-line file — the rebuild's decomposition into
workbench/{WorkbenchApp,SystemCanvas,EditorDock,InputLibrary,primitives,model} is a genuine
architectural improvement worth keeping; the restructuring plan restores the cockpit's
*capabilities* into that better structure, not its monolith.
