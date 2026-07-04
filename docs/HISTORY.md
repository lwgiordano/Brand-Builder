# HISTORY.md — Append-only project changelog

**DO NOT EDIT prior entries.** Update only via `scripts/append_history.py`.
This file is `merge=union` in `.gitattributes` so concurrent branch entries combine.

## 2026-06-29T16:26:55Z — NO_SESSION — 20a9ca4
**Summary:** Bootstrap substrate v3
**Files:** AGENTS.md,scripts/,docs/
**Intent:** Establish substrate before Brand Builder product work.
**Knowledge:** Substrate v3 installed at profile standard, lang python. Hooks handle lint/todo/handoff automatically. Evals: 20/20 malicious blocked, 0 FP.

## 2026-07-03T15:06:21Z — NO_SESSION — 7b6b470
**Summary:** UX/UI audit of Brand System Studio workbench + plan audit
**Files:** docs/audits/2026-07-03-brand-system-studio-ux-ui-audit.md
**Intent:** Deliver professional enterprise UX/UI audit of the Creative Brand Lab workbench, its generated artifacts, and the governing plan docs, with severity-ranked evidence-backed findings.
**Knowledge:** App audited live via Playwright+axe from a Drive mirror: 3 blockers (buried toasts, unguarded brand delete, keyboard lockout), broken pane-scroll architecture, 3 lost cockpit capabilities; plan lacks UX acceptance criteria; 2026-07-02 self-audit was BLOCK and working copy has no git.

## 2026-07-04T12:32:14Z — NO_SESSION — d5c805e
**Summary:** UI/UX restructuring plan + round-2 deep-dive audit for Brand System Studio workbench
**Files:** docs/audits/2026-07-04-workbench-restructuring-plan.md,docs/audits/evidence/2026-07-04/
**Intent:** Deepen the 2026-07-03 audit with live stress/AI/concurrency probes and the mined legacy cockpit, then turn all findings into a phased, testable restructuring plan with a live mockup.
**Knowledge:** Round 2 found 7 new issues (BSS-029..035): 45s AI-CLI hang with silent fallback, 70 tab-stops to Generate at 16 sources, busy-flag can't represent concurrency, 0%-confidence is null rendered. Two corrections: drag-drop was never implemented (not lost); brand delete regressed from armed two-step to one click. Plan restores cockpit capabilities (diff-queue, sentence builder, AI composer) into the workbench shell in 5 phases with axe/keyboard CI.

## 2026-07-04T14:44:40Z — NO_SESSION — a7efb74
**Summary:** Rebuilt workbench UI to dashboard design contract; frontend imported to repo
**Files:** frontend/,package.json,vite.config.ts,tsconfig.json,tsconfig.app.json,docs/knowledge/01_brand_system_studio_frontend.md
**Intent:** Make the workbench responsive and clean per the operator's dashboard-design-patterns contract: token-based CSS, fixed shell with independent scroll, drawer dock, corner toasts with undo, typed-confirm brand delete, full keyboard/AT pass.
**Knowledge:** Frontend now lives in-repo with knowledge-doc coverage. Verified live: axe 0 violations on all 6 stages (was 2/view incl 1 critical), no overflow 375-1440, undo-toast/typed-confirm/drawer probe-tested. Backend and brands remain in the Drive working copy. Phase-3 plan items (op queue, review sheet, AI composer, rule creation) still open.

