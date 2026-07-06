import { CheckCircle2, RotateCcw, ShieldCheck, SlidersHorizontal, Trash2 } from "lucide-react";
import type {
  Brand,
  Creation,
  CreationSection,
  DesignComponent,
  DesignInventory,
  Rule,
  SkeletonDefinition,
  SourceRecord,
  ValidationReport,
} from "../types";
import { rulesForComponent } from "../app/inventory";
import { ChoiceChips, SpecStepper, SwatchSelect, TextField } from "./controls";
import { ComponentListField, REVIEW_STATUSES } from "./model";
import { propLabel, propOptions, semanticRoles } from "./preview";
import { Chip, Disclosure, Panel, statusTone } from "./primitives";
import type { SpecSaveState } from "./WorkbenchApp";

/**
 * The right-hand inspector. Contextual panels: machine checks, the Design
 * controls for the selected component, the "This part" editor for the
 * selected section of a creation, rule details, evidence, and undo.
 */

type EditorDockProps = {
  brand: Brand | null;
  inventory: DesignInventory | null;
  sources: SourceRecord[];
  report: ValidationReport | null;
  selectedComponent: DesignComponent | null;
  selectedRule: Rule | null;
  creation: Creation | null;
  selectedSection: CreationSection | null;
  sectionSkeleton: SkeletonDefinition | null;
  overrideChoices: Record<string, string[]>;
  busy: string | null;
  open: boolean;
  specSaveState: SpecSaveState;
  creationSaveLabel: string;
  onUndo: () => void;
  onUpdateComponent: (componentId: string, patch: Partial<DesignComponent>) => void;
  onUpdateComponentSpec: (componentId: string, prop: string, value: number | string | boolean) => void;
  onToggleComponentValue: (componentId: string, field: ComponentListField, value: string) => void;
  onSetRuleStatus: (ruleId: string, status: Rule["status"]) => void;
  onSelectRule: (ruleId: string) => void;
  onUpdateSectionContent: (sectionId: string, slot: string, value: unknown) => void;
  onUpdateSectionOverride: (sectionId: string, key: string, value: string) => void;
};

const OVERRIDE_LABELS: Record<string, string> = {
  align: "Line things up",
  tone: "Background mood",
  density: "Breathing room",
};

const OVERRIDE_OPTION_LABELS: Record<string, Record<string, string>> = {
  align: { start: "Left", center: "Center" },
  tone: { default: "Page", brand: "Brand color", contrast: "Dark" },
  density: { cozy: "Cozy", comfortable: "Comfortable", spacious: "Spacious" },
};

export function EditorDock({
  brand,
  inventory,
  sources,
  report,
  selectedComponent,
  selectedRule,
  creation,
  selectedSection,
  sectionSkeleton,
  overrideChoices,
  busy,
  open,
  specSaveState,
  creationSaveLabel,
  onUndo,
  onUpdateComponent,
  onUpdateComponentSpec,
  onToggleComponentValue,
  onSetRuleStatus,
  onSelectRule,
  onUpdateSectionContent,
  onUpdateSectionOverride,
}: EditorDockProps) {
  const linkedRules = brand && selectedComponent ? rulesForComponent(selectedComponent, brand.rules) : [];
  const failing = report ? report.results.filter((result) => result.status === "failed") : [];

  return (
    <aside className={`editor-dock${open ? " is-open" : ""}`} aria-label="Inspector dock">
      {report ? (
        <Panel
          title="Checks"
          eyebrow={failing.length ? `${failing.length} failing` : "All good"}
          actions={<ShieldCheck size={15} />}
        >
          <div className="checks-panel" data-checks-panel>
            <div className="proposal-counts">
              <span>{report.summary.passed} passing</span>
              <span>{report.summary.failed} failing</span>
              <span>{report.summary.estimated} estimated</span>
            </div>
            {failing.slice(0, 6).map((result) => (
              <button
                className="check-row"
                key={`${result.rule_id}-${JSON.stringify(result.scope)}`}
                type="button"
                onClick={() => onSelectRule(result.rule_id)}
              >
                <Chip tone="danger">failed</Chip>
                <span>{result.message}</span>
              </button>
            ))}
            {!failing.length ? (
              <p className="panel-hint">Everything you've made passes your brand rules today.</p>
            ) : null}
          </div>
        </Panel>
      ) : null}

      {creation && selectedSection && sectionSkeleton ? (
        <Panel title="This part" eyebrow={`${sectionSkeleton.label} — ${creationSaveLabel}`}>
          <div className="section-editor" data-section-editor>
            <p className="panel-hint">{sectionSkeleton.description}</p>
            {Object.entries(sectionSkeleton.slots).map(([slot, kind]) => (
              <SlotEditor
                key={slot}
                kind={kind}
                slot={slot}
                value={selectedSection.content[slot]}
                onChange={(value) => onUpdateSectionContent(selectedSection.id, slot, value)}
              />
            ))}
            {(["align", "tone", "density"] as const).map((key) => (
              <ChoiceChips
                key={key}
                label={OVERRIDE_LABELS[key]}
                optionLabels={OVERRIDE_OPTION_LABELS[key]}
                options={overrideChoices[key] ?? []}
                value={String(selectedSection.overrides[key] ?? "")}
                onChange={(value) => onUpdateSectionOverride(selectedSection.id, key, value)}
              />
            ))}
            {brand ? (
              <SwatchSelect
                colors={brand.tokens.colors}
                label="Highlight color"
                roles={semanticRoles(brand)}
                value={String(selectedSection.overrides.accent_role ?? "accent")}
                onChange={(role) => onUpdateSectionOverride(selectedSection.id, "accent_role", role)}
              />
            ) : null}
          </div>
        </Panel>
      ) : null}

      {brand && selectedComponent?.spec ? (
        <Panel title="Design" eyebrow={specSaveLabel(specSaveState, selectedComponent.name)}>
          <div className="design-controls" data-design-controls>
            <p className="panel-hint">Changes show in the example right away and save on their own.</p>
            {Object.entries(selectedComponent.spec.props)
              .filter(([, value]) => typeof value === "number")
              .map(([key, value]) => (
                <SpecStepper
                  key={key}
                  label={propLabel(key)}
                  options={propOptions(brand, key)}
                  unit={key === "font_weight" ? "" : "px"}
                  value={value as number}
                  onChange={(next) => onUpdateComponentSpec(selectedComponent.id, key, next)}
                />
              ))}
            {Object.entries(selectedComponent.spec.props)
              .filter(([, value]) => typeof value === "string")
              .map(([key, value]) => (
                <SwatchSelect
                  colors={brand.tokens.colors}
                  key={key}
                  label={propLabel(key)}
                  roles={semanticRoles(brand)}
                  value={value as string}
                  onChange={(role) => onUpdateComponentSpec(selectedComponent.id, key, role)}
                />
              ))}
          </div>
        </Panel>
      ) : null}

      {selectedComponent ? (
        <Panel title="Component Details" eyebrow={selectedComponent.name}>
          <div className="component-editor" data-component-compact-editor>
            <div className="status-picker">
              {REVIEW_STATUSES.map((status) => (
                <Chip
                  active={selectedComponent.status === status}
                  key={status}
                  tone={statusTone(status)}
                  onClick={() => onUpdateComponent(selectedComponent.id, { status })}
                >
                  {status}
                </Chip>
              ))}
            </div>

            <p>{selectedComponent.purpose}</p>

            <ChipEditor
              label="Surfaces"
              values={selectedComponent.surfaces}
              suggestions={inventory?.surface_packs.map((pack) => pack.id) ?? []}
              onToggle={(value) => onToggleComponentValue(selectedComponent.id, "surfaces", value)}
            />
            <Disclosure title="States and variants">
              <ChipEditor
                label="States"
                values={selectedComponent.states ?? []}
                suggestions={["default", "hover", "focus", "disabled", "empty", "loading", "selected"]}
                onToggle={(value) => onToggleComponentValue(selectedComponent.id, "states", value)}
              />
              <ChipEditor
                label="Variants"
                values={selectedComponent.variants ?? []}
                suggestions={["primary", "secondary", "compact", "editorial", "data-heavy", "marketing"]}
                onToggle={(value) => onToggleComponentValue(selectedComponent.id, "variants", value)}
              />
            </Disclosure>

            <Disclosure title="Tokens and rules">
              <ChipEditor
                label="Token refs"
                values={selectedComponent.token_refs ?? []}
                suggestions={["tokens.colors", "tokens.typography", "tokens.spacing", "tokens.radii", "tokens.logo"]}
                onToggle={(value) => onToggleComponentValue(selectedComponent.id, "token_refs", value)}
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
              <pre>{JSON.stringify(selectedComponent, null, 2)}</pre>
            </Disclosure>
          </div>
        </Panel>
      ) : null}

      {selectedRule ? (
        <Panel title="Rule Editor" eyebrow={selectedRule.label || selectedRule.id}>
          <div className="rule-sentence-editor" data-rule-sentence-editor>
            <div className="sentence-rule is-large">
              <span>{selectedRule.category}</span>
              <strong>{selectedRule.metric}</strong>
              <span>{selectedRule.assertion}</span>
              <Chip tone={statusTone(selectedRule.status)}>{selectedRule.status}</Chip>
            </div>
            <p>{selectedRule.rationale}</p>
            <div className="scope-chip-grid">
              {Object.entries(selectedRule.scope).map(([key, value]) => (
                <Chip key={key}>
                  {key}: {String(value)}
                </Chip>
              ))}
            </div>
            <div className="review-actions">
              <button className="primary-action" type="button" onClick={() => onSetRuleStatus(selectedRule.id, "approved")}>
                <CheckCircle2 size={15} />
                Approve
              </button>
              <button className="ghost-action" type="button" onClick={() => onSetRuleStatus(selectedRule.id, "draft")}>
                Draft
              </button>
              <button className="ghost-action" type="button" onClick={() => onSetRuleStatus(selectedRule.id, "rejected")}>
                Reject
              </button>
            </div>
          </div>
        </Panel>
      ) : null}

      <Panel title="Evidence" eyebrow={pluralize(sources.length, "reference")}>
        <div aria-label="Evidence references" className="evidence-list evidence-scroll" role="group" tabIndex={0}>
          {sources.map((source) => (
            <div className="evidence-row" key={source.id}>
              <span>{source.kind}</span>
              <strong>{source.name}</strong>
            </div>
          ))}
        </div>
      </Panel>

      <Panel
        title="Session"
        eyebrow="Undo and advanced"
        actions={
          <button
            aria-label="Undo brand change"
            className="ghost-action"
            type="button"
            onClick={onUndo}
            disabled={busy === "undo"}
          >
            <RotateCcw size={15} />
            Undo
          </button>
        }
      >
        {brand ? (
          <Disclosure title="Advanced brand JSON">
            <pre>{JSON.stringify(brand, null, 2)}</pre>
          </Disclosure>
        ) : null}
        <div className="advanced-note">
          <SlidersHorizontal size={15} />
          Raw logic stays here so the default path remains visual.
        </div>
      </Panel>
    </aside>
  );
}

function SlotEditor({
  slot,
  kind,
  value,
  onChange,
}: {
  slot: string;
  kind: string;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const label = slotLabel(slot);
  if (kind === "text") {
    return <TextField label={label} value={typeof value === "string" ? value : ""} onChange={onChange} />;
  }
  if (kind === "long") {
    return <TextField label={label} multiline value={typeof value === "string" ? value : ""} onChange={onChange} />;
  }
  if (kind === "bullets" || kind === "links" || kind === "columns") {
    const lines = Array.isArray(value) ? (value as string[]).join("\n") : "";
    return (
      <TextField
        label={`${label} — one per line`}
        multiline
        value={lines}
        onChange={(next) => onChange(String(next).split("\n"))}
      />
    );
  }
  if (kind === "rows") {
    const lines = Array.isArray(value)
      ? (value as string[][]).map((row) => (Array.isArray(row) ? row.join(" | ") : String(row))).join("\n")
      : "";
    return (
      <TextField
        label={`${label} — one row per line, cells split by |`}
        multiline
        value={lines}
        onChange={(next) =>
          onChange(
            String(next)
              .split("\n")
              .map((line) => line.split("|").map((cell) => cell.trim())),
          )
        }
      />
    );
  }
  if (kind === "kpis") {
    const items = Array.isArray(value) ? (value as { label?: string; value?: string }[]) : [];
    return (
      <div className="kpi-editor">
        <span className="stepper-label">{label}</span>
        {items.map((item, index) => (
          <div className="kpi-editor-row" key={index}>
            <TextField
              label={`Number ${index + 1}`}
              value={String(item.value ?? "")}
              onChange={(next) => {
                const updated = items.map((entry, i) => (i === index ? { ...entry, value: next } : entry));
                onChange(updated);
              }}
            />
            <TextField
              label="Label"
              value={String(item.label ?? "")}
              onChange={(next) => {
                const updated = items.map((entry, i) => (i === index ? { ...entry, label: next } : entry));
                onChange(updated);
              }}
            />
            <button
              aria-label={`Remove number ${index + 1}`}
              className="icon-action"
              type="button"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        {items.length < 6 ? (
          <button
            className="ghost-action"
            type="button"
            onClick={() => onChange([...items, { label: "", value: "" }])}
          >
            Add a number
          </button>
        ) : null}
      </div>
    );
  }
  return null;
}

function slotLabel(slot: string): string {
  const labels: Record<string, string> = {
    title: "Title",
    subtitle: "Supporting line",
    kicker: "Small line above",
    body: "Text",
    bullets: "Points",
    kpis: "Numbers",
    quote: "Quote",
    attribution: "Who said it",
    cta_label: "Button words",
    links: "Links",
    items: "Items",
    fineprint: "Fine print",
    dateline: "Date line",
    columns: "Column headers",
    rows: "Rows",
  };
  return labels[slot] ?? slot.replaceAll("_", " ");
}

function pluralize(count: number, singular: string, plural?: string): string {
  return `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;
}

function specSaveLabel(state: SpecSaveState, componentName: string): string {
  if (state === "pending" || state === "saving") return `${componentName} — saving…`;
  if (state === "saved") return `${componentName} — saved`;
  if (state === "error") return `${componentName} — couldn't save`;
  return componentName;
}

function ChipEditor({
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
