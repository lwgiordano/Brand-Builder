import { ChevronLeft, ChevronRight, Loader2, Sparkles } from "lucide-react";
import { useMemo } from "react";
import type { Brand, DesignComponent, DesignInventory, Rule } from "../types";
import { rulesForComponent } from "../app/inventory";
import { SpecStepper, SwatchSelect } from "./controls";
import {
  COMPONENT_CATEGORY_LABELS,
  COMPONENT_CATEGORY_ORDER,
  ComponentListField,
  REVIEW_STATUSES,
} from "./model";
import { ComponentPreview, propLabel, propOptions, semanticRoles } from "./preview";
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

  function step(direction: -1 | 1) {
    const target = ordered[index + direction];
    if (target) onSelectComponent(target.id);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    const tag = (event.target as HTMLElement).tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
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
          <div className="lab-canvas-meta">
            <div className="chip-row">
              {selected.surfaces.map((surface) => (
                <Chip key={surface}>{surface}</Chip>
              ))}
            </div>
            {linkedRules.length ? (
              <div className="component-rule-strip">
                <span className="rule-strip-label">
                  {linkedRules.length === 1 ? "1 rule watches this" : `${linkedRules.length} rules watch this`}
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

              <Disclosure title="Tokens and rules">
                <ChipEditor
                  label="Token refs"
                  values={selected.token_refs ?? []}
                  suggestions={["tokens.colors", "tokens.typography", "tokens.spacing", "tokens.radii", "tokens.logo"]}
                  onToggle={(value) => onToggleComponentValue(selected.id, "token_refs", value)}
                />
                {linkedRules.length ? (
                  <div className="linked-rules">
                    <strong>Linked rules</strong>
                    {linkedRules.map((rule) => (
                      <div className="sentence-rule" key={rule.id}>
                        <span>{rule.category}</span>
                        <strong>{rule.metric}</strong>
                        <span>{rule.assertion}</span>
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
