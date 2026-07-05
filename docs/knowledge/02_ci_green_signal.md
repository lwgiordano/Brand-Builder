---
covers:
  - .github/workflows/ci.yml
last_human_reviewed: 2026-07-05
purpose: subsystem-ci-green-signal
---

# CI-green closure signal — event-laundering for the PR watcher

## What this subsystem guarantees

The `checks` job in `.github/workflows/ci.yml` ends with a `Signal CI-green`
step that, on a **same-repo pull request whose checks all passed**, posts a
machine-authored comment on the PR carrying the marker `<!-- ci-green-signal -->`
and the head commit's short SHA. It **deletes any prior marker comment first**,
so exactly one green-signal comment exists at a time and every green run emits a
fresh `issue_comment.created` event. This converts a terminal state that is
otherwise invisible to this repo's watcher into an event the watcher receives.

## Why it exists (the mechanism)

The Claude Code PR watcher is woken by a fixed set of forwarded webhook classes —
**comments, reviews, and CI *failures*** — but **not** CI *success*, new pushes,
or merge-conflict transitions. So a run going green is silent, and "silence" is
ambiguous between *still running* and *passed*. That ambiguity is the only reason
a watcher would fall back to polling on a timer (expensive: each wake re-reads the
whole conversation uncached).

The fix **launders a dropped event-class into a kept one**: re-emit CI-success as
a comment, because comments are forwarded. Failure already wakes the watcher
natively; adding the success signal restores symmetry, so every terminal CI state
emits exactly once and silence again means "nothing happened." This is the
substrate's core move — convention ("remember to check if CI passed") turned into
mechanism ("CI announces that it passed").

### Design choice: delete-then-create, not edit-in-place

An edit-in-place ("sticky comment") would keep the thread cleaner, but it only
preserves the wake if the harness forwards `issue_comment.edited` — an unverified
assumption. **Delete-then-create sidesteps that unknown**: it always produces a
`created` event (certain wake) *and* keeps the thread to one visible comment.
The cost is two API calls instead of one. If a future probe confirms `edited` is
forwarded, an edit variant becomes a safe micro-optimization; until then this
design depends on nothing unproven.

## The watcher guard (prevents the metronome)

The watcher is subscribed to comment events, and this mechanism makes CI *post*
comments — so without a guard you get `wake → act → push → CI → comment → wake`,
a loop with a period rather than a control system. A watching agent MUST:

1. **Recognize its own closure signal** — a comment from a `Bot` user containing
   `<!-- ci-green-signal -->` is not a human request. Never treat it as an
   actionable instruction.
2. **Key on the head SHA** — the signal's job is "CI concluded green for commit
   X." Dedupe on X; a repeat signal for an already-seen SHA (CI re-run, flaky
   retry) is a no-op.
3. **Only act on the transition**, i.e. green for a SHA you were waiting on and
   haven't yet reconciled — then do the closure work (report, auto-merge,
   whatever the task is) and stop.

Because the marker is machine-recognizable and the dedupe key is the SHA, the
signal drives the loop to a terminal state instead of oscillating.

## What's in / what's out

Covers the `Signal CI-green` step in `.github/workflows/ci.yml` and the watcher
contract above. It does **not** change what CI validates (that's the rest of the
`checks` job) and does **not** apply to `agent-config-audit.yml` or
`scheduled-audit.yml`. Fork PRs are intentionally skipped — their `GITHUB_TOKEN`
is read-only, so the step is guarded by
`head.repo.full_name == github.repository`.

## Operator-facing rules

1. The step needs `permissions: pull-requests: write` on the job; it is set at
   job scope in `ci.yml`. Don't remove it or the step fails closed (red CI).
2. Keep the comment **body text neutral** — `.github/workflows/**` is scanned by
   `check_agent_harness.py`; imperative agent-directed phrasing risks tripping the
   injection heuristics. The behavioral contract for agents lives here in
   `docs/knowledge/`, not in the workflow.
3. This generalizes: any terminal state a watcher can't see natively (a deploy
   finishing, a batch draining) can be re-emitted to a channel the watcher already
   subscribes to. The comment thread is just the cheapest such topic GitHub hands
   you.

## Pointers to related docs

- Frontend subsystem: `docs/knowledge/01_brand_system_studio_frontend.md`
- Substrate overview: `docs/knowledge/00_substrate.md`
