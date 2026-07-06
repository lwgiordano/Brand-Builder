import { ChevronLeft, ChevronRight, Loader2, Sparkles, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { AiProposal, Brand, DesignComponent, DesignInventory, Rule } from "../types";
import { rulesForComponent } from "../app/inventory";
import { SpecStepper, SwatchSelect, TextField } from "./controls";
import {
  COMPONENT_CATEGORY_LABELS,
  COMPONENT_CATEGORY_ORDER,
  ComponentListField,
  REVIEW_STATUSES,
} from "./model";
import {
  ComponentPreview,
  hasStateRow,
  propLabel,
  propOptions,
  ReferenceScenes,
  referenceScenes,
  semanticRoles,
  StatesRow,
} from "./preview";
import { Chip, Disclosure, Panel, statusTone } from "./primitives";
import type { SpecSaveState } from "./WorkbenchApp";

/**
 * Step 3 — the guided component walkthrough. One component at a time on the
 * dotted canvas with its editor docked right beside it (never a modal, never
 * a drawer). The "Component 12 of 38" counter is the accessible progress
 * signal; the segment bar is decorative. Previous/Next just browse — status
 * only changes through the explicit picker.
 */

export type ComponentReviewProps = {
  brand: Brand;
  inventory: DesignInventory;
  components: DesignComponent[];
  rules: Rule[];
  selectedComponentId: string | null;
  busy: string | null;
  specSaveState: SpecSaveState;
  reviseProposal: AiProposal | null;
  onProposeRevise: (componentId: string, command: string) => void;
  onApplyRevise: () => void;
  onSkipRevise: () => void;
  onSelectComponent: (componentId: string) => void;
  onSelectRule: (ruleId: string) => void;
  onCompleteSystem: () => void;
  onUpdateComponent: (componentId: string, patch: Partial<DesignComponent>) => void;
  onUpdateComponentSpec: (componentId: string, prop: string, value: number | string | boolean) => void;
  onToggleComponentValue: (componentId: string, field: ComponentListField, value: string) => void;
};

type CategoryGroup = { category: string; label: string; items: DesignComponent[] };

export function orderedComponentGroups(components: DesignComponent[]): CategoryGroup[] {
  const knownCategories: readonly string[] = COMPONENT_CATEGORY_ORDER;
  const groups: CategoryGroup[] = COMPONENT_CATEGORY_ORDER.map((category) => ({
    category: category as string,
    label: COMPONENT_CATEGORY_LABELS[category] ?? category,
    items: components.filter((component) => component.category === category),
  })).filter((group) => group.items.length > 0);
  const ungrouped = components.filter((component) => !knownCategories.includes(component.category));
  if (ungrouped.length) {
    groups.push({ category: "other", label: "More", items: ungrouped });
  }
  return groups;
}

export function ComponentReview({
  brand,
  inventory,
  components,
  rules,
  selectedComponentId,
  busy,
  specSaveState,
  reviseProposal,
  onProposeRevise,
  onApplyRevise,
  onSkipRevise,
  onSelectComponent,
  onSelectRule,
  onCompleteSystem,
  onUpdateComponent,
  onUpdateComponentSpec,
  onToggleComponentValue,
}: ComponentReviewProps) {
  const groups = useMemo(() => orderedComponentGroups(components), [components]);
  // Next/Previous and the jump list share this one flattened order.
  const ordered = useMemo(() => groups.flatMap((group) => group.items), [groups]);
  const index = Math.max(
    0,
    ordered.findIndex((component) => component.id === selectedComponentId),
  );
  const selected = ordered[index] ?? null;
  const total = ordered.length;
  const approvedCount = ordered.filter((component) => component.status === "approved").length;
  const linkedRules = selected ? rulesForComponent(selected, rules) : [];
  const specProps = selected?.spec?.props ?? {};

  // One-tap revise chips: each press makes one snapped step on a prop this
  // component actually has, through the same save path as the steppers.
  function stepPreset(key: string, direction: 1 | -1) {
    if (!selected) return;
    const current = specProps[key];
    if (typeof current !== "number") return;
    const sorted = [...new Set([...propOptions(brand, key), current])].sort((a, b) => a - b);
    const next = sorted[sorted.indexOf(current) + direction];
    if (next !== undefined) onUpdateComponentSpec(selected.id, key, next);
  }
  const firstNumericKey = (...keys: string[]) =>
    keys.find((key) => typeof specProps[key] === "number") ?? null;
  const weightKey = firstNumericKey("font_weight");
  const radiusKey = firstNumericKey("radius");
  const sizeKey = firstNumericKey("height", "padding", "padding_y", "padding_x");
  const fillKey = ["fill", "background"].find((key) => typeof specProps[key] === "string") ?? null;
  const reviseChips = [
    weightKey ? { id: "bolder", label: "Bolder", run: () => stepPreset(weightKey, 1) } : null,
    weightKey ? { id: "lighter", label: "Lighter", run: () => stepPreset(weightKey, -1) } : null,
    radiusKey ? { id: "rounder", label: "Rounder", run: () => stepPreset(radiusKey, 1) } : null,
    radiusKey ? { id: "sharper", label: "Sharper", run: () => stepPreset(radiusKey, -1) } : null,
    sizeKey ? { id: "compact", label: "More compact", run: () => stepPreset(sizeKey, -1) } : null,
    sizeKey ? { id: "roomier", label: "Roomier", run: () => stepPreset(sizeKey, 1) } : null,
    fillKey && selected
      ? { id: "stronger", label: "Stronger color", run: () => onUpdateComponentSpec(selected.id, fillKey, "accent") }
      : null,
    fillKey && selected
      ? { id: "calmer", label: "Calmer color", run: () => onUpdateComponentSpec(selected.id, fillKey, "muted") }
      : null,
  ].filter((chip): chip is { id: string; label: string; run: () => void } => chip !== null);
  const scenes = selected ? referenceScenes(selected) : [];

  function step(direction: -1 | 1) {
    const target = ordered[index + direction];
    if (target) onSelectComponent(target.id);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    const target = event.target as HTMLElement;
    const tag = target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    // Arrow-stepping only from the canvas/nav areas — never while focus is
    // inside the editor or the jump list, where arrows would surprise.
    if (target.closest(".review-inspector, .jump-list")) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      step(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      step(1);
    }
  }

  if (!selected) {
    return (
      <div className="component-lab stage-grid component-review" data-workbench-stage="Your components" data-component-review>
        <div className="empty-hint">
          <Sparkles size={18} />
          <span>No components yet. Press “Complete my system” to fill them in.</span>
        </div>
        <button className="ghost-action" type="button" onClick={onCompleteSystem} disabled={busy === "complete-system"}>
          {busy === "complete-system" ? <Loader2 className="spin" size={15} /> : <Sparkles size={15} />}
          Complete my system
        </button>
      </div>
    );
  }

  return (
    <div
      className="component-lab stage-grid component-review"
      data-compact-editor-marker
      data-component-review
      data-workbench-stage="Your components"
      onKeyDown={onKeyDown}
    >
      <header className="review-topbar" data-review-progress>
        <div className="review-counter">
          <strong aria-live="polite">
            Component {index + 1} of {total}
          </strong>
          <span className="muted-note">· {approvedCount} approved</span>
        </div>
        <div aria-hidden="true" className="review-progress">
          {ordered.map((component, segmentIndex) => (
            <span
              className={`seg${segmentIndex < index ? " is-done" : ""}${segmentIndex === index ? " is-current" : ""}`}
              key={component.id}
            />
          ))}
        </div>
        <div className="review-nav">
          <button className="ghost-action" disabled={index === 0} type="button" onClick={() => step(-1)}>
            <ChevronLeft size={15} />
            Previous
          </button>
          <button className="ghost-action" disabled={index === total - 1} type="button" onClick={() => step(1)}>
            Next
            <ChevronRight size={15} />
          </button>
          <button
            className="ghost-action"
            type="button"
            onClick={onCompleteSystem}
            disabled={busy === "complete-system"}
          >
            {busy === "complete-system" ? <Loader2 className="spin" size={15} /> : <Sparkles size={15} />}
            Complete my system
          </button>
        </div>
      </header>

      <Disclosure title="Jump to a piece">
        <nav aria-label="All components" className="jump-list">
          {groups.map((group) => (
            <section className="rail-group" key={group.category}>
              <h3>{group.label}</h3>
              {group.items.map((component) => (
                <button
                  aria-current={component.id === selected.id ? "true" : undefined}
                  className={`rail-item${component.id === selected.id ? " is-selected" : ""}`}
                  key={component.id}
                  type="button"
                  onClick={() => onSelectComponent(component.id)}
                >
                  <span className={`status-dot status-${component.status}`} />
                  {component.name}
                </button>
              ))}
            </section>
          ))}
        </nav>
      </Disclosure>

      <div className="review-body">
        <section aria-label={`${selected.name} preview`} className="lab-canvas-region">
          <header className="lab-canvas-head">
            <div>
              <h3>{selected.name}</h3>
              <p>{selected.purpose}</p>
            </div>
            <Chip tone={statusTone(selected.status)}>{selected.status}</Chip>
          </header>
          <div className="lab-canvas" data-component-canvas>
            <ComponentPreview brand={brand} component={selected} />
          </div>
          {scenes.length || hasStateRow(selected) ? (
            <div className="reference-strip" data-reference-strip>
              {scenes.length ? (
                <>
                  <h4>See it in use</h4>
                  <ReferenceScenes brand={brand} component={selected} />
                </>
              ) : null}
              {hasStateRow(selected) ? (
                <>
                  <h4>How it behaves</h4>
                  <StatesRow brand={brand} component={selected} />
                </>
              ) : null}
            </div>
          ) : null}
          <div className="lab-canvas-meta">
            <div className="chip-row">
              {selected.surfaces.map((surface) => (
                <Chip key={surface}>{surface}</Chip>
              ))}
            </div>
            {linkedRules.length ? (
              <div className="component-rule-strip">
                <span className="rule-strip-label">
                  {linkedRules.length === 1 ? "1 check watches this" : `${linkedRules.length} checks watch this`}
                </span>
                {linkedRules.slice(0, 6).map((rule) => (
                  <button key={rule.id} type="button" onClick={() => onSelectRule(rule.id)}>
                    {rule.label || rule.id}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <aside aria-label={`Edit ${selected.name}`} className="review-inspector">
          <Panel title="Make it feel…" eyebrow="One tap — saved instantly">
            <div className="revise-panel" data-revise-panel>
              {reviseChips.length ? (
                <div className="revise-chips">
                  {reviseChips.map((chip) => (
                    <Chip key={chip.id} onClick={chip.run}>
                      {chip.label}
                    </Chip>
                  ))}
                </div>
              ) : (
                <p className="panel-hint">This piece has no quick presets — use the controls below.</p>
              )}
              <Disclosure title="Describe a change">
                <ReviseBox
                  busy={busy}
                  componentId={selected.id}
                  key={selected.id}
                  proposal={reviseProposal}
                  onApply={onApplyRevise}
                  onPropose={onProposeRevise}
                  onSkip={onSkipRevise}
                />
              </Disclosure>
            </div>
          </Panel>

          {selected.spec ? (
            <Panel title="Design" eyebrow={specSaveLabel(specSaveState, selected.name)}>
              <div className="design-controls" data-design-controls>
                <p className="panel-hint">Changes show in the example right away and save on their own.</p>
                {Object.entries(selected.spec.props)
                  .filter(([, value]) => typeof value === "number")
                  .map(([key, value]) => (
                    <SpecStepper
                      key={key}
                      label={propLabel(key)}
                      options={propOptions(brand, key)}
                      unit={key === "font_weight" ? "" : "px"}
                      value={value as number}
                      onChange={(next) => onUpdateComponentSpec(selected.id, key, next)}
                    />
                  ))}
                {Object.entries(selected.spec.props)
                  .filter(([, value]) => typeof value === "string")
                  .map(([key, value]) => (
                    <SwatchSelect
                      colors={brand.tokens.colors}
                      key={key}
                      label={propLabel(key)}
                      roles={semanticRoles(brand)}
                      value={value as string}
                      onChange={(role) => onUpdateComponentSpec(selected.id, key, role)}
                    />
                  ))}
              </div>
            </Panel>
          ) : null}

          <Panel title="Details" eyebrow="Status and depth">
            <div className="component-editor" data-component-compact-editor>
              <div className="status-picker">
                {REVIEW_STATUSES.map((status) => (
                  <Chip
                    active={selected.status === status}
                    key={status}
                    tone={statusTone(status)}
                    onClick={() => onUpdateComponent(selected.id, { status })}
                  >
                    {status}
                  </Chip>
                ))}
              </div>

              <ChipEditor
                label="Surfaces"
                values={selected.surfaces}
                suggestions={inventory.surface_packs.map((pack) => pack.id)}
                onToggle={(value) => onToggleComponentValue(selected.id, "surfaces", value)}
              />
              <Disclosure title="States and variants">
                <ChipEditor
                  label="States"
                  values={selected.states ?? []}
                  suggestions={["default", "hover", "focus", "disabled", "empty", "loading", "selected"]}
                  onToggle={(value) => onToggleComponentValue(selected.id, "states", value)}
                />
                <ChipEditor
                  label="Variants"
                  values={selected.variants ?? []}
                  suggestions={["primary", "secondary", "compact", "editorial", "data-heavy", "marketing"]}
                  onToggle={(value) => onToggleComponentValue(selected.id, "variants", value)}
                />
              </Disclosure>

              <Disclosure title="Tokens and checks">
                <ChipEditor
                  label="Token refs"
                  values={selected.token_refs ?? []}
                  suggestions={["tokens.colors", "tokens.typography", "tokens.spacing", "tokens.radii", "tokens.logo"]}
                  onToggle={(value) => onToggleComponentValue(selected.id, "token_refs", value)}
                />
                {linkedRules.length ? (
                  <div className="linked-rules">
                    <strong>Checks on this piece</strong>
                    {linkedRules.map((rule) => (
                      <div className="sentence-rule" key={rule.id}>
                        <strong>{rule.label || rule.id}</strong>
                        <span>{rule.description || rule.rationale}</span>
                        <Chip tone={statusTone(rule.status)}>{rule.status}</Chip>
                      </div>
                    ))}
                  </div>
                ) : null}
              </Disclosure>

              <Disclosure title="Advanced component object">
                <pre>{JSON.stringify(selected, null, 2)}</pre>
              </Disclosure>
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

export function specSaveLabel(state: SpecSaveState, componentName: string): string {
  if (state === "pending" || state === "saving") return `${componentName} — saving…`;
  if (state === "saved") return `${componentName} — saved`;
  if (state === "error") return `${componentName} — couldn't save`;
  return componentName;
}

function ReviseBox({
  componentId,
  busy,
  proposal,
  onPropose,
  onApply,
  onSkip,
}: {
  componentId: string;
  busy: string | null;
  proposal: AiProposal | null;
  onPropose: (componentId: string, command: string) => void;
  onApply: () => void;
  onSkip: () => void;
}) {
  const [text, setText] = useState("");
  const patchCount = proposal?.patch?.length ?? 0;
  return (
    <div className="revise-box" data-revise-box>
      <TextField
        label="What should change?"
        multiline
        placeholder="e.g. rounder corners and a bit bolder"
        value={text}
        onChange={setText}
      />
      <div className="revise-actions">
        <button
          className="ghost-action"
          disabled={!text.trim() || busy === "revise-propose"}
          type="button"
          onClick={() => onPropose(componentId, text)}
        >
          {busy === "revise-propose" ? <Loader2 className="spin" size={15} /> : <Wand2 size={15} />}
          Suggest it
        </button>
      </div>
      {proposal ? (
        <article className="proposal-card" data-revise-proposal>
          <header>
            <strong>{proposal.summary}</strong>
          </header>
          <div className="proposal-counts">
            <span>{proposal.mode === "heuristic" ? "Instant suggestion — no AI needed" : "AI suggestion"}</span>
            {typeof proposal.confidence === "number" ? <span>{Math.round(proposal.confidence * 100)}% sure</span> : null}
            <span>
              {patchCount} change{patchCount === 1 ? "" : "s"}
            </span>
          </div>
          <div className="revise-actions">
            <button className="primary-action" disabled={busy === "revise-apply"} type="button" onClick={onApply}>
              {busy === "revise-apply" ? <Loader2 className="spin" size={15} /> : null}
              Make this change
            </button>
            <button className="ghost-action" type="button" onClick={onSkip}>
              Skip
            </button>
          </div>
        </article>
      ) : null}
    </div>
  );
}

export function ChipEditor({
  label,
  values,
  suggestions,
  onToggle,
}: {
  label: string;
  values: string[];
  suggestions: string[];
  onToggle: (value: string) => void;
}) {
  const options = [...new Set([...values, ...suggestions])];
  return (
    <div className="chip-editor">
      <strong>{label}</strong>
      <div className="chip-row">
        {options.map((value) => (
          <Chip active={values.includes(value)} key={value} onClick={() => onToggle(value)}>
            {value}
          </Chip>
        ))}
      </div>
    </div>
  );
}
