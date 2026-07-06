# Brand System Studio — UX/UI Audit & Plan Audit

- **Date:** 2026-07-03
- **Auditor:** Claude (acting as senior product/UX designer for an internal enterprise tool)
- **Subject:** Brand System Studio ("Creative Brand Lab" workbench rebuild of 2026-07-02), the plan
  documents governing it, and its generated deliverables (styleguide, slides).
- **Method:** The full app (FastAPI backend + React/Vite workbench) was mirrored from the Drive
  working copy, built, and **run live**. Evidence was collected with Playwright (screenshots of all
  six canvas views at 4 viewport widths, 40-stop keyboard traversal, axe-core WCAG 2.2 AA scans per
  view) plus scripted interaction probes (error flows, destructive actions, toast geometry, brand
  switching, artifact generation). All findings below are either observed live or verified in
  source. File references point at the app working copy (`Brand Builder/` in Drive), which is not
  in this git repository.

---

## 1. Executive summary

The workbench rebuild is a real improvement over the old cockpit in visual calm, structure, and
progressive disclosure. The three-pane model (inputs → canvas → review/editor) is the right shape
for this product, the six-stage canvas is coherent, deterministic extraction works offline, undo
exists and works for source deletion, and the "estimated vs proven" validation honesty is genuinely
good design. The seed data is at version 234+ — the tool is being used in anger, which is the best
signal there is.

But measured as an internal enterprise app, the current build fails three fundamentals:

1. **Feedback is invisible.** All success/error messages render in a "Session" panel that sits
   ~1,400 px from the top of a 900 px viewport. A failed action looks identical to a successful
   one unless the user scrolls the right rail to its very bottom. Stale success messages persist
   forever and appear *alongside* later errors. This one defect degrades every flow in the app.
2. **Destructive actions are unguarded.** Brand deletion is one click, has no confirmation, and is
   unrecoverable (version history lives inside the deleted folder). Source deletion also has no
   confirmation (undo happens to cover it, but nothing tells the user that).
3. **Keyboard and assistive-tech users are locked out of core flows.** Selection of components,
   packs, and validation rows is bound to non-focusable `<article onClick>` cards; the three file
   inputs are invisible 1×1 px tab stops with no accessible names; the provider `<select>` has no
   label (axe: critical); there is no skip mechanism past the source rail.

A fourth, structural finding explains much of the above: **the intended three-pane independent
scrolling never actually works.** The shell uses `min-height` on grid children, so the grid row
stretches to the tallest pane and the whole page scrolls as one tall document
(measured: dock `scrollHeight == clientHeight == 1541px` in a 900 px viewport). The layout the CSS
promises is not the layout users get.

The rebuild also silently **lost three capabilities** the cockpit had: rule creation
(`createBlankRule` is now dead code), drag-and-drop upload, and the AI edit-command flow
(`proposeEdit`/`applyPatch` are exported and never called).

**The plan** (knowledge doc + operator rules) is strong on architecture boundaries and honest about
validation limits, but as a UX plan it is thin: no user goals, no acceptance criteria for the
review flow, no accessibility bar for the app itself (ironically, the product ships a WCAG-AA
*rule for its outputs* — `R-text-contrast-aa` — while its own UI fails AA), no state inventory
(empty/error/loading), and no content style guide. The project's own definition of done (design
auditor pass for UI work, no unresolved BLOCK findings) was not met: the 2026-07-02 self-audit
finished **BLOCK** (broken substrate in the working copy, doc drift, no git repo) the same hour
the rebuild landed.

### Scorecard

| Dimension | Grade | One-line reason |
|---|---|---|
| Information architecture | **B** | Three panes + six stages is right; review queue placement and duplicate disclosure systems blur it |
| Visual design | **B−** | Calm, consistent card language; but 10–11 px text, unloaded brand/UI fonts, magic weights, no spacing tokens |
| Interaction design | **C** | Core loop works; review moment is JSON-grade, chip affordances inconsistent, dead controls mixed with live ones |
| Feedback & system status | **F** | Toasts render below the fold, never expire, success and error coexist |
| Error handling & safety | **D** | Good error copy wasted: input wiped on failure, destructive ops unguarded, raw `str(exc)`/`[object Object]` paths |
| Accessibility (WCAG 2.2 AA) | **F** | Click-only cards, unnamed/invisible file inputs, unlabeled select, contrast failure, no skip links |
| Responsiveness | **B** | No horizontal overflow at 375–1440; but dock drops below the entire page at ≤1260 |
| Generated deliverables | **C−** | Provenance line is great; raw `source_NN` color soup, truncated slide copy, empty components section, non-portable logo |
| Plan / process | **C−** | Architecture-first doc is good; UX/a11y criteria absent; own DoD violated (BLOCK audit, NO_GIT) |

**Severity counts:** 3 Blocker · 6 High · 9 Medium · 10 Low/Polish.

---

## 2. What works well (keep these)

- **Three-pane mental model** — sources on the left, system in the middle, judgment on the right.
  This matches the product's "review-first" philosophy and should survive any redesign.
- **Six-stage canvas** with per-stage hero descriptions; stage persistence while switching panes.
- **Progressive disclosure discipline** — raw JSON consistently behind "Advanced" `<details>`
  (WorkbenchApp honors Operator Rule 5 at the container level).
- **"Estimated vs proven" honesty** in validation (`validate/runner.py:110-112` writes messages
  like "Needs render validation for a true green check") — rare and valuable rigor.
- **Deterministic extraction fallback works offline** — the extract → proposal → approve loop
  functioned in a container with no Codex CLI. The *mechanics* of review-first are real.
- **Undo actually restores** (verified: deleted source, undo → source back).
- **Actionable error copy at the source**: "Invalid brand slug. Use lowercase letters, numbers,
  and hyphens." / "Blocked URL: localhost is not allowed" — the words are good; the delivery
  channel (see BSS-001) squanders them.
- **Chip primitive** correctly renders as `<button>` only when interactive, with a check icon on
  active (not color-only). Native `<details>` for disclosures. Sound primitive instincts.
- **Artifact provenance** — "Generated from canonical brand-system.json version 235" on the
  styleguide is exactly right for an evidence-driven tool.

---

## 3. Findings

Severity scale: **Blocker** = unacceptable for daily enterprise use; **High** = materially degrades
core flows; **Medium** = friction/trust damage; **Low/Polish** = quality bar.
Each finding: evidence → impact → recommendation. Heuristic refs: Nielsen N1–N10; WCAG 2.2 SC.

### 3.1 Blockers

**BSS-001 · Feedback is rendered outside the viewport, never expires, and self-contradicts**
*Evidence:* `EditorDock.tsx:272-273` places `.toast-message`/`.toast-error` inside the last panel
("Session") of the right dock. Measured live: after any action, the toast's top edge sat at
**y = 1424 px in a 900 px viewport**. `WorkbenchApp.tsx:47,126` sets `message` on success and never
clears it (no timeout, no dismiss); a later failure sets `error` while the stale success remains —
probes captured `message: "Proposal ready for review"` displayed together with
`error: "Invalid brand slug…"`. *(N1 Visibility of system status; WCAG 4.1.3 Status Messages —
no `aria-live` either.)*
*Impact:* Users cannot tell whether anything worked. Every other flow inherits this defect. For an
app whose whole premise is "review before commit," silent failure is fatal.
*Recommendation:* A single fixed-position status region at the top of the canvas (or floating
toast stack, bottom-center), `role="status"`/`aria-live="polite"` for successes and
`role="alert"` for errors; auto-dismiss successes (4–6 s), keep errors until dismissed or
superseded; clear `message` on the next action (`runBusy` should reset both). Never show success
and error simultaneously.

**BSS-002 · Brand deletion: one click, no confirmation, unrecoverable**
*Evidence:* `InputLibrary.tsx:110-115` — `onClick={() => onDeleteBrand(...)}` directly; probe
confirmed no native or custom dialog fires. `store.py:129` deletes the brand directory; version
snapshots live *inside* it (`store.py:177-181`), so undo cannot restore a deleted brand. Source
deletion (`InputLibrary.tsx:218`) is likewise unconfirmed (undo does cover it, unadvertised).
*(N5 Error prevention; enterprise data-safety baseline.)*
*Impact:* One misclick destroys 200+ versions of curated brand work with sources.
*Recommendation:* Type-to-confirm dialog for brand deletion ("Type *seed* to delete…") listing
what is lost (N versions, M sources); trash/archive semantics instead of hard delete if feasible.
For sources: an undo-toast pattern ("Source removed — Undo") is enough *once BSS-001 is fixed*.

**BSS-003 · Core selection and upload are keyboard/AT-inaccessible**
*Evidence:*
- `SystemCanvas.tsx:304-307` (component cards), `:571` (pack cards), `:419-423` (validation rows)
  are `<article onClick>` — not focusable, no role, no key handling. *(WCAG 2.1.1 Keyboard.)*
- Keyboard traversal recorded three 1×1 px tab stops with empty accessible names — the hidden
  file inputs (`workbench.css:415-421` keeps them focusable but invisible; `.upload-tile` has no
  `:focus-within` style). *(2.4.7 Focus Visible; 4.1.2 Name, Role, Value; 3.3.2 Labels.)*
- Provider `<select>` has no label — axe **critical**, every view (`EditorDock.tsx:69`).
- Accessible names concatenate: "Sdashboard design pattern catalogseed",
  "Seed Brand Systemv234" (initial + name + kind chip in one button with no separators).
- No skip link/landmark shortcut: canvas is 20+ tab stops away and grows ~3 stops per source.
  *(2.4.1 Bypass Blocks.)*
- `.lab-meter` is a styled `<div>` with `aria-label` but no role — coverage bars are invisible
  to AT (`primitives.tsx:57-63`).
*Impact:* The primary editing loop (pick component → edit in dock; pick rule → approve) cannot be
completed without a mouse. For an internal tool this blocks employees using AT outright.
*Recommendation:* Make cards real `<button>`s (or add `role="button"` + `tabIndex=0` + Enter/Space)
with `aria-pressed`/`aria-current` for selection; visible `:focus-visible` ring token across all
interactive elements incl. `.upload-tile:focus-within`; `aria-label` the three file inputs
("Upload spec files…") and the provider select ("AI provider"); put names in separate
`aria-label`s so chips/initials don't concatenate; add a skip link ("Skip to canvas"); give meters
`role="meter"` + `aria-valuenow`.

### 3.2 High

**BSS-004 · The three-pane scroll architecture silently fails; everything becomes one tall page**
*Evidence:* `workbench.css:90-110` gives panes `overflow:auto` but `min-height: calc(100vh - 24px)`
inside a stretching grid row — panes grow instead of scrolling. Measured: dock
`scrollHeight == clientHeight == 1541` (viewport 900) — i.e., `overflow:auto` never engages; the
*page* scrolls. Consequences: toasts land off-screen (BSS-001), left-rail context scrolls away
with the page, and at ≤1260 px the dock (`workbench.css:1199-1215`) reflows *below the entire
page* — review queue and errors end up several screens down. *(N1; layout integrity.)*
*Recommendation:* `height: calc(100vh - 24px)` (or `position: sticky; top` rails + scrolling
canvas). At ≤1260, the dock needs a slide-over/drawer or column order that keeps the review queue
adjacent to the canvas, not appended to the document end.

**BSS-005 · The "review-first" moment is the weakest screen in the product**
*Evidence:* The proposal card (`EditorDock.tsx:94-119`) shows: summary sentence, "1 rules /
0 patches / 0% confidence", optional impact line, Approve/Reject, and raw JSON behind "Advanced".
Live capture showed: **"0% confidence"** on a *successful deterministic* extraction; the summary
reading "Analyzed source with deterministic extraction because the model was unavailable: codex
CLI is not installed" (an apology-error hybrid presented as a reviewable proposal); the "pending"
chip collapsing into a **vertical one-letter-per-line strip** (flex squeeze +
`overflow-wrap:anywhere`, `workbench.css:215-235`); and "1 rules" (pluralization). The only way to
see *what would actually change* is to read RFC-6902 JSON. *(N2 Match with real world; N6
Recognition over recall; Operator Rule 5's "visual first" promise.)*
*Impact:* The single decision the product exists to support — "should I approve this change?" —
is made blind or in JSON. Confidence "0%" on the happy path teaches users to ignore confidence.
*Recommendation:* Render the proposal as a human-readable change list: rule sentences
(category · metric · assertion, the `sentence-rule` component already exists), token changes as
before→after swatch/value chips, counts with correct plurals. Confidence: show provenance instead
("Deterministic, evidence-gated" vs "AI-proposed, 72%"). Provider fallback must be a *warning
state on the card*, not folded into the summary sentence.

**BSS-006 · Provider control: unavailable default, silent fallback, resets on every brand switch**
*Evidence:* Default is `"codex"` (`WorkbenchApp.tsx:44,99`) even when `/api/status` reports Codex
unavailable — the select displays a provider that cannot run; its options are disabled with no
explanation (`EditorDock.tsx:71`). Extraction silently swaps engines (BSS-005). Switching brands
re-runs the boot effect (`WorkbenchApp.tsx:88-118` depends on `activeSlug`), which **re-fetches
status + brand list + the brand payload a second time** (probe: 4 API calls per switch, payload
fetched twice) and **resets the provider selection** (probe: claude → codex). *(N3 User control;
N4 Consistency; wasted I/O.)*
*Recommendation:* Default to the first *available+authenticated* provider; annotate disabled
options ("Codex — CLI not installed"); split boot (status/list, once) from brand loading; never
reset user choices on navigation.

**BSS-007 · Two status vocabularies collide and look identical**
*Evidence:* Workflow statuses (draft/approved/rejected — rules) and coverage statuses
(missing/partial — packs/components) share the same chip visual. The component status picker
offers **missing/partial/draft/approved as manual choices** (`model.ts` REVIEW_STATUSES;
`EditorDock.tsx:153-164`) — a user can hand-set "missing". Tone-colored chips make the red
"missing" *option* read as an alert while the actual current status is only marked by a small
check. The identical chip row in the Surface Pack panel (`EditorDock.tsx:133-138`) is *inert*
(no onClick) — same look, different behavior. Validation rows show result status ("passed") next
to Approve/Draft buttons with **no indication of the rule's current workflow status** and a
stateless "Approve" that's shown even when already approved (`SystemCanvas.tsx:431-444`). *(N4
Consistency & standards; N2.)*
*Recommendation:* Separate the vocabularies visually and semantically: coverage = read-only badge
(derived), workflow = segmented control with a clear selected state. In validation rows, show the
rule's workflow status and swap Approve/Draft for a single toggle reflecting current state.
Editable vs read-only chips must not share identical styling.

**BSS-008 · Errors destroy user input**
*Evidence:* `InputLibrary.tsx:56-74` — `onCreateBrand(...)` / `onAddUrl(...)` are fire-and-forget;
`setNewName("")`/`setNewSlug("")`/`setUrl("")` run immediately, so a validation failure (e.g. "Bad
Slug!") clears the form *and* buries the explanation off-screen (BSS-001). Verified live: after
the invalid-slug error, both fields were empty. Also: no `<form>`/Enter submission; Create is
enabled with empty name but silently no-ops (`InputLibrary.tsx:59-61`); slug rules aren't stated
until violated. *(N5; N9 Help users recover; 3.3.1/3.3.3.)*
*Recommendation:* Clear inputs only on success; inline field-level errors adjacent to the form;
disable Create until valid with helper text stating slug rules up front; wrap in `<form>` for
Enter.

**BSS-009 · The rebuild silently lost cockpit capabilities**
*Evidence:* Rule creation: `app/rules.ts` `createBlankRule` has **zero call sites** — no "add
rule" affordance exists anywhere in the workbench (the old cockpit had "+ Add"). AI edit-command:
`api.ts` `proposeEdit`/`applyPatch` unused. Drag-and-drop upload: `data-source-upload-area` has no
drop handlers (old UI said "Drop or choose files to analyze"). *(Capability regression; the plan
claims the workbench provides "rule coverage review" and CLI-backed AI edits.)*
*Impact:* Users can only re-status the 39 seed rules; they cannot encode a new brand behavior —
arguably the product's core value — nor use the AI edit loop the backend still supports.
*Recommendation:* Restore all three: "New rule" in the Rule Editor panel (the sentence-rule
builder is the natural home), an AI command box behind the provider row, and drop-zone handlers
on the existing tiles.

### 3.3 Medium

**BSS-010 · First-run/empty states are missing or broken**
Empty brands dir ⇒ `GET /api/brands` **HTTP 500** (`store.py:35` raises `FileNotFoundError`);
UI shows an infinite "Loading brand lab" spinner with the real error buried per BSS-001. No empty
states exist for zero components/outputs/validation results (fresh brands get defaults, so lists
render, but genuinely empty views render blank panels). The review queue shows the contradictory
"Select a source and extract proposals…" hint *below an already-selected source*
(`EditorDock.tsx:78-125` renders both blocks simultaneously).

**BSS-011 · Trust-eroding micro-data**
"0% confidence" (BSS-005); **"1 rules"**; "6 target families" hardcoded regardless of data
(`SystemCanvas.tsx:175`); coverage % is an unexplained 65/35 weighted blend
(`app/inventory.ts` `coverageForPack`) shown as a bare percent — "33% · missing" reads
contradictory; kind chips color every non-seed source amber-warn permanently
(`InputLibrary.tsx:213` — `statusTone(kind === "seed" ? "approved" : "partial")`). *(N2; data-viz
integrity.)* Fix: real plurals, derive the families count, tooltip/legend the coverage formula,
neutral kind chips.

**BSS-012 · Dead logic: validation failures never reach the Outputs gallery**
`SystemCanvas.tsx:604` — `output.status === "available" && report.summary.failed ? "available" :
output.status` is a no-op (both branches yield "available"); artifacts stay green-chipped even
with failing checks. Clearly intended to downgrade status. Fix the ternary (e.g. → "warn") and add
a "N checks failing" line on affected output cards.

**BSS-013 · Foundations misrepresent the brand**
Type specimens clamp render size to 12–32 px while labeling true values ("40px" renders at 32 —
`SystemCanvas.tsx:225`); specimens render in the *app* font, never the brand's Mulish (no
`@font-face`/loading of brand fonts); spacing ruler caps at 100 px so 24/32 look near-identical
(`:236`); color grid mixes semantic roles with `source_01…source_12` extraction debris incl.
unflagged duplicates (accent ≡ source_01, background ≡ source_08…). For a brand tool, specimen
fidelity *is* the product. Fix: uncapped-but-scaled specimen canvas, load brand font for
specimens, group semantic vs source colors, badge duplicates ("= accent").

**BSS-014 · Contrast and legibility**
axe (every view): `.brand-pill > small` "v234" = **4.23:1** on the active pill (10 pt) — AA fail.
Pervasive 10–11 px muted text (`--lab-muted #61706a`) on tinted surfaces sits at 4.2–4.7:1 —
technically passing on white, borderline on `--lab-subtle`/`--lab-accent-soft`; uppercase
750–780-weight 10 px labels (card stats, upload hints) are strain-level small for daily use.
*(1.4.3.)* Fix: version badge ≥4.5:1, floor UI text at 12 px, reserve 10–11 px for true captions
on white.

**BSS-015 · Raw exception strings are the error contract**
`api/app.py` maps every failure to `detail=str(exc)` (30+ sites); FastAPI 422s send arrays that
the client renders as **"[object Object]"** (`api.ts:9-11`, verified). jsonschema failures will
dump multi-line validator text into a 12 px toast. Fix: error envelope (code + human message +
optional details), client-side mapping, truncation with "details" disclosure.

**BSS-016 · Evidence panel silently truncates**
`EditorDock.tsx:253` — `sources.slice(0, 6)` with no "+N more". At 7+ sources the Evidence panel
lies about corpus size. Fix: show count ("6 of 11"), expandable.

**BSS-017 · Duplicate affordances and split editing surfaces**
Two artifact-generation buttons ("Generate" topbar, "Refresh" in Outputs — same action, different
icon/label); two per-item disclosure systems (card "Details" in canvas vs Compact Editor in dock)
with no signpost for which to use; selection changes stage (`onSelectComponent` forces
`component-lab`) which can yank the user out of Overview context. Fix: one verb for generation;
make card-click = select+edit (single model) and card "Details" a peek only if kept.

**BSS-018 · Artifacts are not portable or presentation-ready**
Styleguide/slides embed app-relative asset URLs (`/brand-assets/seed/...`) — logos break the
moment the HTML file is shared or opened outside the server (broken-image icon rendered top-right
of the styleguide, bottom-left of every slide). Slide 1 subtext is a raw evidence fragment
truncated mid-clause ("…our employees, their"). The Components section of the styleguide is one
sentence + one sample button while the app maintains a 12-component inventory — the deliverable
ignores the inventory. "Open export" opens a preview (nothing is exported). Jargon in deliverable:
"v1 reports this from declared boxes", "Table State", "Schema ready". Fix: inline assets as data
URIs (self-contained single file), sentence-complete extractive copy or ellipsis + source ref,
render component sections from the inventory, rename to "Open preview", copyedit.

### 3.4 Low / Polish

**BSS-019 · Content style is inconsistent** — Title Case panels ("Surface-Pack Coverage") vs
sentence-case buttons ("Extract proposals") vs lowercase chips ("approved"); "Component Lab" vs
"Surface Packs" casing in tabs vs panel titles; jargon surfaces uncurated ("Schema ready",
"matrix", "Lanes by category"). Adopt a one-page content guide (casing, vocabulary, plurals).

**BSS-020 · Word-break butchery** — `overflow-wrap: anywhere` on headings/chips
(`workbench.css:137,229`) yields "backgroun d", "accent_sof t" (visible in Foundations) and
enables the vertical "pending" chip (BSS-005). Prefer `overflow-wrap: break-word` +
`hyphens: auto`, and `white-space: nowrap` for status chips.

**BSS-021 · Focus styling is default-only** — no `:focus-visible` tokens; default rings vary by
element and disappear entirely for upload tiles (BSS-003). Design one focus ring token.

**BSS-022 · Motion & modes** — `.spin` has no `prefers-reduced-motion` guard; `color-scheme:
light` hardcoded (no dark mode for a creative-evaluation tool); no transitions anywhere (hover
states snap).

**BSS-023 · Font stack fiction** — `Inter` is declared but never loaded; seven magic weights
(720/750/760/780/800/820/850) synthesize to 700/800 in system fonts. Either ship the variable
font or write honest weights.

**BSS-024 · No spacing/type tokens in the app's own CSS** — 3/4/5/6/7/8/9/10/12/14/16/18 px
ad-hoc paddings; the design-token tool doesn't practice token discipline on itself. Define
`--space-1…6`, `--text-xs…xl`.

**BSS-025 · Selection styling is four different languages** — active tab (fill+border), brand
pill (fill+border), source card (inset left bar), cards/rows (1 px inset ring). Consolidate to
one selected-state treatment (+ `aria-current`).

**BSS-026 · Small-target and misc.** — disclosure summaries ≈23 px tall (2.5.8 minimum is 24);
URL field's only label is its placeholder; `SOURCE_ACTIONS` in `model.ts` is dead code with a
check-circle icon for "Logo"; `compactNumber` doesn't compact; stat-tile "6 SURFACES" uppercase
10 px; `.lab-meter` gradient ends in an off-palette lime `#75a947`.

**BSS-027 · No URL state** — stage/brand selection lost on refresh (acceptable single-user MVP,
still an enterprise-tool expectation).

**BSS-028 · Boot effect double-invokes under StrictMode** (dev-only flicker; symptom of the same
effect-shape problem as BSS-006).

---

## 4. Flow walkthroughs (condensed)

- **Intake:** Tiles are clear; no drag-drop (BSS-009); no file-type/size guidance beyond tile
  captions; failures wipe input + hide errors (BSS-008/001). URL field label = placeholder only.
- **Analyze → Review → Apply:** Works, fast, offline-capable (credit). But the decision surface
  is counts + JSON with misleading confidence (BSS-005) and provider opacity (BSS-006). Approving
  a proposal that was extracted from the *previous* source is possible: analyzing a new source
  silently replaces a pending proposal without warning (`WorkbenchApp.tsx:218-229` sets proposal
  unconditionally; no dirty-state guard).
- **Edit inventory:** Chip toggling is pleasant *when you find it*; every toggle is a full-brand
  `saveRaw` round-trip that re-normalizes the payload (`WorkbenchApp.tsx:309-320`) — latency will
  grow with brand size; removing the last surface silently no-ops with no explanation
  (`:300-302`).
- **Rules:** Approve/Draft/Reject status changes only; "Rule Editor" edits nothing else
  (label/assertion/scope are read-only); no rule creation (BSS-009).
- **Generate → Outputs:** Generation is fast and gives a (buried) toast; gallery mixes 4 real and
  3 permanently-"planned" cards — aspirational placeholders styled like product ("Schema ready");
  validation state never touches output cards (BSS-012).
- **Validation:** Summary tiles + readable per-rule messages (good); result vs workflow status
  ambiguity (BSS-007); rule IDs (`R-slide-safe-zone`) shown where labels are missing.

## 5. Accessibility (WCAG 2.2 AA) summary

| SC | Status | Evidence |
|---|---|---|
| 1.4.3 Contrast (minimum) | **Fail** | v234 badge 4.23:1 (axe, every view); borderline muted-on-tinted text |
| 1.4.10 Reflow | Pass | No horizontal overflow at 375–1440 (measured) |
| 1.4.11 Non-text contrast | Risk | 1 px selection rings on white; meter track vs panel |
| 2.1.1 Keyboard | **Fail** | Click-only cards/rows for core selection |
| 2.4.1 Bypass blocks | **Fail** | No skip link; rail grows 3 stops per source |
| 2.4.7 Focus visible | **Fail** | Invisible focused file inputs; no focus style on tiles |
| 2.5.8 Target size (min) | Risk | 23 px summaries; 24 px chips as primary editors |
| 3.3.1/3.3.3 Error id/suggestion | **Fail** | Errors off-screen, inputs cleared (BSS-001/008) |
| 4.1.2 Name, role, value | **Fail** | Unlabeled select (axe critical), unnamed file inputs, concatenated names, div meters |
| 4.1.3 Status messages | **Fail** | No `aria-live` anywhere |

Axe-core (wcag2a/aa + 21aa/22aa + best-practice): 2 recurring violations per view (1 critical,
1 serious) — the *automated* surface is small because most failures here are semantic/manual
(cards, names, live regions). Do not read "2 violations" as near-compliance.

## 6. The generated deliverables

The styleguide and slides are the product's public face; today they undercut it (BSS-013/018):
extraction debris presented as brand tokens, brand typography never demonstrated in the brand's
own font, a components section that ignores the component inventory, truncated evidence text as
slide copy, and non-portable asset references that render broken-image icons in both artifacts.
The provenance line and rule listing are the right instincts — the artifacts need one design pass
each with "would a brand director forward this?" as the bar.

## 7. Plan audit

**Sources reviewed:** `docs/knowledge/01_brand_system_studio.md` (last_human_reviewed 2026-07-02),
Operator Rules 1–5, `docs/HISTORY.md` entries (2026-07-01/02), `ai/audits/2026-07-02T004730Z/`,
`docs/CURRENT_SESSION.md`, repo `AGENTS.md` contract.

**Strengths**
- Clear subsystem guarantees and boundary ownership (backend vs frontend responsibilities).
- Security posture for intake (SSRF guards, byte caps) specified and implemented.
- Operator Rule 3 (review-first) and Rule 4 (estimated stays estimated until render validation)
  are unusually honest and are *visible in the UI* (credit).
- Rule 5 names a real design principle (visual-first, JSON behind Advanced).

**Gaps as a UX plan**
1. **No user model.** No persona/JTBD, no success criteria for the core loop (time-to-approve,
   error rate). "Compact visual workbench" is a form-factor, not a goal.
2. **No acceptance criteria for the review moment** — the flow the plan calls the product's
   center has no definition of what a reviewer must be able to *see* (diff, provenance,
   confidence semantics). BSS-005 is the direct consequence.
3. **No accessibility bar for the app.** The product enforces `R-text-contrast-aa` on generated
   outputs while the plan is silent on the app's own WCAG target — and the app fails AA today.
   The tool holds its artifacts to a standard it doesn't hold itself.
4. **No UI-state inventory.** Empty, loading, error, offline-provider, zero-brands — none
   specified; BSS-010's 500-on-empty is what "unspecified" looks like in production.
5. **No content guide** (casing, vocabulary, plural rules, jargon list) — BSS-019's root cause.
6. **No app design tokens.** The plan governs *brand* tokens meticulously and says nothing about
   the workbench's own type/spacing/color system (BSS-023/024).
7. **Coverage semantics ungoverned.** The 65/35 weighting in `coverageForPack` exists only in
   code; the plan never defines what "coverage %" means, so the UI can't explain it (BSS-011).
8. **Capability parity unlisted.** The rebuild intent ("replace the confusing cockpit UI") has no
   feature-parity checklist — how rule creation, AI edit, and drag-drop were lost without notice
   (BSS-009).
9. **Verification is build-only.** Operator Rule 1's gate is `npm run build`, `pytest`, `ruff`,
   `npm audit` — nothing exercises the UI (no e2e smoke, no axe pass, no screenshot diff). This
   audit's entire finding set was invisible to the plan's own checks. Rule 4 even names
   Playwright as the *future* render validator — the harness belongs in the app's own DoD.
10. **Process contract broken.** Repo `AGENTS.md` requires a design-auditor pass for UI changes
    and "no BLOCK findings unresolved"; the 2026-07-02 self-audit at 00:47 ended **BLOCK**
    (substrate files missing in the working copy, doc drift on `App.tsx`, `check_history_sha`
    failing because the working copy has **no git repo**) and the workbench landed anyway; both
    HISTORY entries are `NO_GIT`. Separately, `AGENTS.md` still says "UI enabled for this
    install: `no`" and `design-system/MASTER.md` doesn't exist — the substrate's model of the
    project contradicts the product. Restore git in the working copy, flip the UI flag + create
    the design-system doc, and make the design-auditor pass real for UI diffs.
11. **Doc hygiene nits.** `01_brand_system_studio.md` `covers:` lists `frontend/src/App.tsx`
    (dead code it elsewhere calls legacy) yet the drift gate flagged exactly that file;
    knowledge-doc claims ("compact visual inventory editing… undo, and advanced disclosures")
    now overstate the shipped UI (no rule editing/creation). Docs/code parity contract says to
    record the discrepancy — recorded here.

**Plan verdict:** Sound engineering plan, absent UX plan. Adopt the roadmap below into
`01_brand_system_studio.md` (or a sibling `02_workbench_ux.md`) with explicit acceptance criteria,
and make the app's own a11y/e2e checks part of Operator Rule 1.

## 8. Prioritized roadmap

**Now (unblock daily use — ~1 short sprint)**
1. Status system: fixed `aria-live` toast region, auto-expire success, exclusive error display
   (BSS-001). *This single fix upgrades every flow.*
2. Guard destruction: typed confirm for brand delete; undo-toast for source delete (BSS-002).
3. Keyboard pass 1: cards→buttons with focus ring + `aria-current`; label select + file inputs;
   skip link; fix concatenated names (BSS-003).
4. Pane heights: `height` not `min-height` so rails/canvas actually scroll (BSS-004).
5. Provider sanity: default to available; explain disabled; stop reset + double-fetch on switch
   (BSS-006). Preserve form input on error (BSS-008).

**Next (make review-first feel first-class)**
6. Proposal card v2: human-readable change list, provenance-based confidence, fallback as
   explicit warning, pending-proposal replacement guard (BSS-005, flow note).
7. Status-vocabulary split: derived badges vs workflow controls; validation rows show current
   rule status (BSS-007).
8. Restore lost capabilities: rule creation, AI edit command, drag-drop (BSS-009).
9. Outputs honesty: fix dead ternary; failing-check counts on cards; separate "planned" section
   (BSS-012). Empty/first-run states incl. seedless boot (BSS-010).
10. Error envelope + client mapping; kill `[object Object]` (BSS-015).

**Later (quality bar & deliverables)**
11. Foundations fidelity: brand-font specimens, true-size type rendering, semantic/source color
    grouping with duplicate badges (BSS-013).
12. Artifact v2: self-contained HTML (inlined assets), inventory-driven components section,
    sentence-safe extractive copy (BSS-018).
13. App token pass: spacing/type/focus tokens, 12 px floor, load or drop Inter, one selection
    language (BSS-014/021/023/024/025).
14. a11y/e2e in CI: axe smoke + keyboard script in `npm run check` (plan gap #9).
15. Content guide + copyedit sweep (BSS-019); reduced-motion + dark mode (BSS-022); URL state
    (BSS-027).

## 9. Evidence index

A compact, re-checkable evidence bundle is committed at `docs/audits/evidence/2026-07-03/`:
`playwright-axe-keyboard.json` (axe violations, 40-stop keyboard traversal with computed focus
styles, reflow measurements), `probe-notes.json` / `probe2-notes.json` (error-flow toasts, toast
geometry, brand-switch API traces, delete-dialog probes), and six annotated captures
(workbench 1440, review-queue fallback state, foundations, validation, generated styleguide,
generated slides). Full-resolution captures listed below lived in the audit session's scratchpad:
`01-initial-1440`,
`10-view-{overview,foundations,surface-packs,component-lab,outputs,validation}`,
`20-focus-after-40-tabs`, `30-1280`/`31-1024`/`32-768`/`33-375-mobile` (reflow),
`p1-extract-error-*` (proposal fallback + vertical chip), `p2-invalid-slug` (wiped form),
`p3-url-blocked` (hidden error), `p4-rule-approved`, `p5-outputs-after-generate`,
`p6-after-delete-source`, `t2-two-brands`, `a1-styleguide`, `a2-slides`;
`audit-report.json` (axe + keyboard + overflow data), `probe-notes.json`, `probe2-notes.json`
(toast geometry, API-call traces, dialog probe). Measurements quoted in findings come from these
files.
