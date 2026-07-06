# Brand System Studio — UI/UX Restructuring Plan

- **Date:** 2026-07-04
- **Basis:** the 2026-07-03 UX/UI audit (28 findings, BSS-001…028) plus a second live deep-dive
  (this document, findings BSS-029…035 and two corrections). Evidence for round 2 is committed at
  `docs/audits/evidence/2026-07-04/`.
- **Scope:** the "Creative Brand Lab" workbench frontend (`frontend/src/workbench/*`,
  `workbench.css`) with the minimal backend touches the UX requires (error envelope, empty-brands
  boot, provider preflight). Everything here is sequenced, testable, and mapped to findings.

---

## 1. Round-2 audit additions

The second pass ran the app with a stressed dataset (16 sources), exercised the real AI path, the
apply-proposal loop, and concurrency, and mined the legacy `App.tsx` (152,510 bytes, 3,845 lines,
~45 inline components) that the workbench replaced.

**BSS-029 · The AI path hangs the UI for 45 s, then lies about what happened — High.**
`POST /ai/extract` with `provider: "claude"` (reported by `/api/status` as available **and**
authenticated) took **45.1 s**, failed inside the CLI, silently fell back to deterministic
extraction, and returned a proposal whose summary embeds the raw failed command line
("…model was unavailable: Command '['/opt/node22/bin/claude', '-p', …"). During those 45 s the UI
shows only one disabled button; there is no progress, no elapsed-time signal, no cancel, no
timeout communication. *(Evidence: `probe3-api-results.json`.)*

**BSS-030 · Provider "available" status is not a usability check — Medium.** The status endpoint
checks that the CLI exists and is logged in, not that a round trip works; the UI presents that as
a working engine. A preflight ping (or an "untested" badge until first success) is required for
the picker to be truthful.

**BSS-031 · Proposal provenance exists in the payload and is discarded by the UI — Medium
(upgrade of BSS-005).** Round 2 confirmed proposals carry `mode: "heuristic"` and
`confidence: null`; the card renders neither — instead `Math.round((null ?? 0) * 100)` produces
the misleading "0% confidence". The fix is display-only: the data is already there.

**BSS-032 · Keyboard cost scales linearly with data — measured — High (quantifies BSS-003).**
With 4 sources, the Generate button was ~22 tab stops deep; with 16 sources it is **70**. Every
source adds 3 stops ahead of the entire canvas. *(Evidence: `probe4-notes.json`.)*

**BSS-033 · Evidence panel misstates the corpus at scale — measured (confirms BSS-016).** With
16 sources the panel eyebrow reads "16 references" while the list renders exactly 6 rows, no
affordance to see the rest.

**BSS-034 · Concurrent actions erase all busy signalling — measured (confirms the BSS-006 race).**
Firing Generate and then a rule-status change 60 ms later left `generateDisabled: false` and
**zero spinners** in every sample while work was still in flight. The single-string `busy` model
cannot represent two operations; the second op's completion clears the first op's indication.

**BSS-035 · Version semantics are opaque to the user — Low.** One apply action moved the brand
from v247 to v249 (multiple internal saves each archive a version). Undo steps therefore do not
map 1:1 to user actions, and nothing in the UI explains what one "Undo" will unwind.

**Correction 1 — drag-and-drop (amends BSS-009).** The legacy cockpit **never implemented**
drag-and-drop: its "Drop or choose files to analyze" label sat on a plain file input with no
drop handlers. The workbench did not lose the capability; the old copy over-promised it. The
restructure should either build it or not promise it.

**Correction 2 — full-brand save latency (amends a §4 flow note).** `saveRaw` round trips
measured 44–47 ms at 16 sources / 78 KB brand JSON — per-toggle saving is currently fine.
The concern is architectural (payload grows with sources), not present-day latency.

**Legacy-cockpit inventory (what the rebuild dropped that worked).** The old `App.tsx` contained
proven implementations of exactly the things the workbench now lacks: a **proposal diff-queue**
(op → path → value rows with Apply/Reject), a **rule sentence-builder** ("For [category] check
[metric] is [assertion] [target]") with full label/severity/scope/evidence editing and a
validate-and-save raw-JSON mode, an **AI composer bar** ("Ask AI to change this system…"), an
**armed two-step brand delete** (the rebuild regressed this to one unguarded click — strengthens
BSS-002), per-rule **evidence editing** (source/locator/confidence), and export links. The
restructure below deliberately **restores these patterns inside the workbench's calmer shell**
rather than inventing new ones.

---

## 2. North star and design principles

**North star:** *an operator reviews evidence, approves changes, and ships brand artifacts —
without ever wondering "did that work?", losing work to a misclick, or leaving the keyboard.*

Five principles, each traceable to failures:

1. **Feedback is adjacent and ambient.** Every action acknowledges within 100 ms, in a fixed
   place the eye already knows, and long work shows elapsed progress and a cancel. (BSS-001,
   029, 034.)
2. **Nothing destructive without an exit.** Confirm-or-undo for every loss of data; deletion
   never one click. (BSS-002; legacy armed-delete restored.)
3. **The keyboard is a first-class path.** Every selection, edit, and approval reachable and
   visible at ≤15 tab stops from load, regardless of data size. (BSS-003, 032.)
4. **One vocabulary per concept.** Derived facts look derived; editable controls look editable;
   a status word appears in exactly one visual form. (BSS-007, 011.)
5. **The tool passes its own validation.** The app meets the same AA bar it enforces on
   artifacts, and its own CSS uses tokens the way it asks brands to. (BSS-014, 021–025.)

---

## 3. The restructured shell

The workbench keeps its three-region mental model — **Library → Canvas → Judgment** — and fixes
the mechanics around it.

### 3.1 Fixed viewport grid (kills BSS-004)

```
┌──────────────────────────────────────────────────────────────┐
│ App bar: brand switcher · stage tabs · Generate · status cell │ 56px fixed
├────────────┬────────────────────────────────┬────────────────┤
│ Library    │ Canvas (scrolls)               │ Dock (drawer,  │
│ (scrolls)  │                                │ scrolls)       │
│ 264px      │ flexible                       │ 320–360px      │
└────────────┴────────────────────────────────┴────────────────┘
height: 100dvh; each column: overflow-y auto; no page scroll.
```

- `height: 100dvh` on the shell, `height` (not `min-height`) on columns; the page body never
  scrolls. Rails scroll independently — as the current CSS always intended.
- ≤1260 px: the Dock becomes an **overlay drawer** (right side, toggle in the app bar with an
  attention dot when the queue is non-empty). It never reflows below the document.
- ≤760 px: Library also collapses to a drawer; Canvas is the page.

### 3.2 The status cell + toast layer (kills BSS-001, 034)

- A **persistent status cell** in the app bar (right of Generate): idle shows last action +
  relative time ("Approved R-slide-safe-zone · 12 s ago"); busy shows a spinner + verb + elapsed
  seconds + Cancel when the op is cancellable. Backed by an **operation queue**, not a string:
  `{id, verb, startedAt, status}[]` — two concurrent ops render "2 running…" with a popover list.
  React: replace `busy: string|null` with a `useOperations()` reducer; each `runBusy` call
  registers an operation and resolves/fails it.
- **Toasts** stack bottom-center above the canvas: success auto-dismisses in 5 s, error persists
  with a Dismiss and never coexists with a stale success (starting an action clears the previous
  outcome). `role="status"` for success, `role="alert"` for errors. Errors carry the mapped
  message plus a "Details" disclosure holding the raw payload (kills raw-`str(exc)` walls and
  `[object Object]`, with the backend envelope from §8).
- Undo moves next to the status cell: "Undo last change (v249 → v248)" — labelled with what it
  will unwind (BSS-035).

### 3.3 The Dock becomes tabs, not a stack

Five stacked panels become four tabs — **Queue · Inspector · Evidence · Session** — with the tab
strip pinned at the dock top:

- **Queue** — proposals awaiting review (§4). Badge with count; auto-switches here when an
  extraction completes.
- **Inspector** — the selected pack/component/rule editor (§6). Selecting anything in the canvas
  focuses this tab.
- **Evidence** — full scrollable source list ("16 references" shows 16 rows, virtualized), each
  row expandable to its text; count is honest (BSS-033).
- **Session** — provider settings, version list (last 10 snapshots with per-entry restore),
  advanced brand JSON.

---

## 4. The review moment, redesigned (kills BSS-005, 029, 030, 031)

The proposal card becomes a **review sheet** in the Queue tab, restoring the cockpit's diff-queue
with the workbench's visual language:

```
┌ Review sheet ──────────────────────────────────────────────┐
│ ● Deterministic, evidence-gated        source: stress-00   │  ← provenance chip (mode field),
│ "4 spacing and typography rules found in brand guide"      │    never a fake percentage
│ ────────────────────────────────────────────────────────── │
│ CHANGES (4 rules · 0 token edits)                          │
│ + Rule  spacing   spacing_values equals [4,8,12,…]  warn   │  ← sentence-rule rows, one per
│ + Rule  type      body_size_px ≥ 16                 warn   │    change; token edits render
│ ~ Token colors.accent  #00205B → #0A2E6E  [swatches]       │    before → after with swatches
│ ────────────────────────────────────────────────────────── │
│ Evidence: "Body text minimum 16px…" (view in source)       │
│ [ Approve all ]  [ Approve selected ]  [ Reject ]          │
│ ▸ Advanced proposal JSON                                   │
└────────────────────────────────────────────────────────────┘
```

- **Provenance replaces confidence-as-percent.** `mode: "heuristic"` → "Deterministic,
  evidence-gated"; an AI mode with a real confidence renders "AI-proposed · 72%". `null` never
  becomes "0%" (BSS-031).
- **Provider fallback is a warning banner on the sheet** ("Claude CLI failed — showing
  deterministic extraction instead. [Details]"), not a clause inside the summary sentence
  (BSS-029). The raw command/error lives behind Details.
- **Async contract:** extraction shows elapsed time after 2 s, a determinate hint where possible,
  Cancel always (AbortController on the fetch; backend kills the CLI subprocess), and a soft
  timeout at 60 s with "Still working — keep waiting or cancel?". A finished extraction arriving
  while another proposal is open queues instead of replacing it (fixes the silent-replacement
  flow note).
- **Provider picker truth:** options show state dots (● works — last success 2 m ago / ○ found,
  untested / ✕ unavailable: CLI not installed). First selection triggers a background preflight
  ping (BSS-030). Default = first proven-working, falling back to deterministic-only mode with
  the picker hidden entirely if nothing works.
- **Approve** requires the sheet (no blind approve); per-row checkboxes enable partial approval —
  the backend already applies rule lists, so partial approval is a client-side filter.

---

## 5. One status system (kills BSS-007, 011)

Two visually distinct systems, used everywhere without exception:

- **Coverage badges (derived, read-only):** `missing / partial / draft-ready` render as small
  dot-prefixed text labels (○ ◐ ●), never pill-shaped, never clickable, always with a tooltip
  explaining the formula. The coverage percentage gets a legend: "65% components defined ·
  35% rules defined" (surfacing the weighting in `coverageForPack`, BSS-011).
- **Workflow controls (editable):** rule/component status becomes a **segmented control**
  (Draft | Approved | Rejected) with the current segment filled — a control that looks like a
  control, shows exactly one selected state, and drops "missing/partial" as manual options
  (they're derived facts, not decisions).
- Validation rows show **both**, separately: the check result chip (passed/failed/estimated) and
  the rule's workflow segment, so "passed but still draft" is a visible, actionable state.
- Source kind chips become neutral monochrome tags (`seed`, `file`, `url`) — no warn tint on
  user content (BSS-011).
- Pluralization helper (`n === 1 ? "rule" : "rules"`) applied across counts; "6 target families"
  becomes `${surface_packs.length} target families`.

---

## 6. One editing model (kills BSS-017; restores BSS-009 capabilities)

- **Canvas cards are buttons.** Click/Enter selects the object and focuses the Dock's Inspector
  tab. The in-card "Details" disclosure is deleted — one object, one editing surface. Cards get
  `aria-current="true"` when selected and a single selection treatment (2 px accent outline +
  soft fill) used identically for tabs, pills, cards, and rows (BSS-025).
- **Inspector = the cockpit's editors, re-skinned:** the rule **sentence builder** ("For
  [category] check [metric] is [assertion] [target]") with label, severity, scope chips, and the
  evidence fields (source/locator/confidence); the component chip editor as today; "＋ New rule"
  in the Inspector header and in the Validation stage (wires the orphaned `createBlankRule`).
  Chip-editor no-ops become explanations ("A component needs at least one surface").
- **AI composer returns** as a command input at the top of the Queue tab ("Ask for a change —
  e.g. 'make the accent darker'"), wiring the orphaned `proposeEdit`/`applyPatch` through the
  same review sheet as extraction. One review pipeline for every mutation source.
- **Generate is one verb.** The topbar button is the only generator; the Outputs stage shows
  freshness ("Generated 2 m ago · v249") instead of a second button. Output cards reflect
  validation (fix the BSS-012 no-op: `failed > 0` → warn badge + "N checks failing").
- **Uploads:** either implement real drag-drop on the tiles (drop handlers + drag-over highlight
  + keyboard/file-picker parity) or drop the metaphor; tiles gain `:focus-within` rings and
  proper labels either way (Correction 1, BSS-003).

---

## 7. Design tokens for the app itself (kills BSS-014, 019–026)

```css
:root {
  /* spacing — 4px base, no off-scale values */
  --s-1: 4px; --s-2: 8px; --s-3: 12px; --s-4: 16px; --s-5: 24px; --s-6: 32px;
  /* type — 12px floor; weights that exist in system fonts */
  --t-xs: 12px; --t-sm: 13px; --t-md: 15px; --t-lg: 17px; --t-xl: 20px; --t-num: 28px;
  --w-regular: 400; --w-semibold: 600; --w-bold: 700;
  /* focus — one ring everywhere, incl. .upload-tile:focus-within */
  --focus-ring: 0 0 0 2px var(--lab-bg), 0 0 0 4px var(--lab-accent);
  /* motion */
  --ease: 150ms ease; /* wrapped in prefers-reduced-motion guard */
}
```

- Every current 10–11 px use maps to `--t-xs` (12 px) or larger; uppercase micro-labels keep
  ≥12 px + 0.06 em tracking. The `v234` badge and muted-on-tinted combinations are re-checked to
  ≥4.5:1 (adjust `--lab-muted` to #55645f on tinted surfaces).
- Word-breaking: `overflow-wrap: break-word` + `hyphens: auto` for prose; `white-space: nowrap`
  for chips and status words (no more vertical "pending", no "backgroun d").
- Fonts: either ship Inter (variable, self-hosted, `font-display: swap`) or declare
  `system-ui` honestly; the seven 720–850 weights collapse to the three tokens above.
- Content style guide (one page, committed next to this plan): Title Case for stage names only;
  sentence case for panels, buttons, and messages; no internal jargon in user-facing copy
  ("Schema ready" → "Planned — not generated yet"; "matrix" chip deleted); plural rules; the
  error-message pattern ("What happened. Why. What to do.").

---

## 8. States, errors, and the backend contract (kills BSS-010, 015)

- **UI-state inventory** (acceptance criteria per view): every stage defines empty / loading /
  error / stressed (≥16 sources, ≥50 rules) renders. Empty states teach the next action
  ("No validation results yet — approve rules, then Generate.").
- **Seedless boot:** `list_brands` returns `{brands: []}` instead of 500; the UI renders a
  first-run state ("Create your first brand") — the 500-spinner deadlock disappears.
- **Error envelope:** backend returns `{code, message, hint?, details?}`; the client maps codes
  to copy and never renders `[object Object]` (422s get field-level mapping into forms).
- **Forms:** inputs clear on success only; field-level inline errors; Enter submits; Create
  disabled until valid with the slug rule stated up front.

---

## 9. Accessibility contract (kills BSS-003; verifies §2 P3)

- Cards/rows → buttons with visible focus; skip link ("Skip to canvas"); landmark roles
  (`nav` Library, `main` Canvas, `complementary` Dock) — with the drawer model, reaching the
  canvas from load is ≤6 tab stops at any source count (vs 70 measured).
- Names: file inputs ("Upload spec files"), provider select ("AI provider"), meters
  (`role="meter"`, `aria-valuenow`), composed card labels via `aria-label` (no concatenation).
- Live regions: status cell `aria-live="polite"`, error toasts `role="alert"`.
- Targets ≥24 px (chips 26 px min-height; summaries padded to 24 px).
- CI: axe smoke + keyboard-path test (`load → select component → change status → approve rule`)
  must pass in `npm run check` (§11 phase 0).

---

## 10. Artifacts v2 (kills BSS-013, 018)

- **Self-contained exports:** inline the logo and any brand font as data URIs; a styleguide or
  deck must survive being emailed as a single file (portability test in CI: open artifact from
  `file://`, zero failed requests).
- **Inventory-driven styleguide:** the Components section renders from
  `components.inventory` — per component: name, purpose, surfaces, states, linked rules — not a
  hardcoded sentence. Colors split "Semantic roles" from "Source extractions", deduped with
  "= accent" badges; typography specimens render in the brand's actual font at true size (load
  the font in the app's Foundations stage too).
- Slide copy uses sentence-safe extraction (cut at sentence boundary + ellipsis + source ref).
- "Open export" → "Open preview"; a real "Download" action delivers the self-contained file.

---

## 11. Migration plan

Four phases; each independently shippable, each with acceptance criteria (AC) and the findings it
closes. Estimates assume the current two-file-a-day cadence visible in HISTORY.

**Phase 0 — Safety net (½ day).** Add vitest + @testing-library/react; Playwright + axe smoke
(`npm run check` gains `check:ui`); screenshot baseline of all six stages. *AC: red build on any
axe violation or keyboard-path break. Closes: plan-gap 9.*

**Phase 1 — Trust (1–2 days).** Operation queue + status cell + toast layer; confirm-or-undo for
all deletes (armed delete for brands); form input preservation + inline errors; fixed-height
shell; error envelope + client mapping; seedless-boot fix.
*AC: an invalid slug shows an adjacent inline error with input intact; deleting a brand requires
typing its slug; two concurrent ops both visibly tracked; no page scroll at any width ≥760;
empty brands dir renders onboarding, not a spinner. Closes: BSS-001, 002, 004, 008, 010, 015,
034.*

**Phase 2 — Access & vocabulary (1–2 days).** Cards→buttons + focus tokens + skip link +
landmarks + names; segmented workflow control + derived badges + honest counts; dock tabs
(Queue/Inspector/Evidence/Session); drawer at ≤1260.
*AC: keyboard-only completion of "select component → change status → approve rule" in ≤20
strokes at 16 sources; axe clean; evidence tab shows all sources; validation rows show workflow
state. Closes: BSS-003, 007, 011, 016, 017 (partial), 032, 033.*

**Phase 3 — The review moment (2–3 days).** Review sheet with provenance chip, change list,
partial approval, fallback banner; async contract (elapsed/cancel/timeout, AbortController +
subprocess kill); provider preflight + truthful picker; AI composer; rule sentence-builder +
"New rule"; proposal queueing.
*AC: a deterministic extraction never shows a percentage; a failed CLI shows a warning banner
with details, not a mutated summary; extraction is cancellable at any time; a new rule can be
created, edited, and approved entirely in the Inspector. Closes: BSS-005, 006, 009, 029, 030,
031, 035 (undo labelling).*

**Phase 4 — Fidelity & deliverables (2 days).** App token pass (spacing/type/focus/motion,
12 px floor, contrast fixes); Foundations true-size brand-font specimens + color grouping;
artifacts v2 (self-contained, inventory-driven, sentence-safe); content-guide copyedit sweep;
outputs↔validation link (BSS-012 fix).
*AC: axe contrast clean; styleguide opens from file:// with zero failed requests and renders the
component inventory; specimen font-family equals the brand's font. Closes: BSS-012, 013, 014,
018, 019–026.*

Deliberately deferred: dark mode, URL routing (BSS-022/027 — worthwhile, not load-bearing).

## 12. Success metrics

1. **Zero silent failures** — every mutation ends in a visible, placed outcome (auditable via the
   operation queue log).
2. **Keyboard task cost** — the §11-P2 path in ≤20 strokes at any dataset size (was: 70 stops to
   reach one button).
3. **Time-to-approve** — extract→review→approve for a 5-rule proposal under 60 s with full
   understanding of what changed (was: unbounded, JSON-only comprehension).
4. **axe + keyboard CI green** on every commit.
5. **Artifact portability** — styleguide/slides open standalone with zero broken resources.

## 13. Evidence index (round 2)

`docs/audits/evidence/2026-07-04/`: `probe3-api-results.json` (upload/save/extract/apply timings
incl. the 45.1 s Claude-CLI hang), `probe4-notes.json` (70-tab-stop measurement, evidence
truncation at 16 sources, busy-race samples), `s1-16-sources-rail.jpg` (stressed rail),
`legacy-app-inventory.md` (cockpit capability analysis: diff-queue, sentence builder, armed
delete, AI composer — the restored patterns' provenance).
