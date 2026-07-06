import { CheckCircle2, RotateCcw, ShieldCheck, SlidersHorizontal, Trash2, Undo2 } from "lucide-react";
import { useState } from "react";
import type {
  Brand,
  Creation,
  CreationSection,
  DesignInventory,
  Rule,
  SkeletonDefinition,
  SourceRecord,
  SpecPropValue,
  ValidationReport,
} from "../types";
import { ChoiceChips, SpecStepper, SwatchSelect, TextField } from "./controls";
import { propLabel, propOptions, semanticRoles } from "./preview";
import { Chip, Disclosure, Panel, statusTone } from "./primitives";

/**
 * The right-hand inspector. Component editing now lives beside the canvas in
 * the walkthrough (step 3); the dock holds the cross-cutting panels — machine
 * checks, the open design's part editor and system pieces (with whole-design
 * exceptions), rule details, evidence, and undo.
 */

type EditorDockProps = {
  brand: Brand | null;
  inventory: DesignInventory | null;
  sources: SourceRecord[];
  report: ValidationReport | null;
  selectedRule: Rule | null;
  creation: Creation | null;
  selectedSection: CreationSection | null;
  sectionSkeleton: SkeletonDefinition | null;
  overrideChoices: Record<string, string[]>;
  busy: string | null;
  open: boolean;
  brandSaveLabel: string;
  creationSaveLabel: string;
  onUndo: () => void;
  onSetRuleStatus: (ruleId: string, status: Rule["status"]) => void;
  onSelectRule: (ruleId: string) => void;
  onUpdateComponentSpec: (componentId: string, prop: string, value: SpecPropValue) => void;
  onSetCreationException: (componentId: string, prop: string, value: SpecPropValue | null) => void;
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

// The system pieces every generated design is built from (the only components
// with a direct counterpart in the rendered outputs).
const DESIGN_PIECES: { id: string; label: string }[] = [
  { id: "component-actions", label: "Buttons" },
  { id: "component-cards", label: "Cards" },
  { id: "data-kpi", label: "KPI tiles" },
];

export function EditorDock({
  brand,
  inventory,
  sources,
  report,
  selectedRule,
  creation,
  selectedSection,
  sectionSkeleton,
  overrideChoices,
  busy,
  open,
  brandSaveLabel,
  creationSaveLabel,
  onUndo,
  onSetRuleStatus,
  onSelectRule,
  onUpdateComponentSpec,
  onSetCreationException,
  onUpdateSectionContent,
  onUpdateSectionOverride,
}: EditorDockProps) {
  const failing = report ? report.results.filter((result) => result.status === "failed") : [];
  const ruleLabel = (ruleId: string) =>
    brand?.rules.find((rule) => rule.id === ruleId)?.label || ruleId;

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
              <span>
                {report.summary.failed} {report.summary.failed === 1 ? "needs" : "need"} a fix
              </span>
              <span>
                {report.summary.estimated} {report.summary.estimated === 1 ? "looks" : "look"} right
              </span>
            </div>
            {failing.slice(0, 6).map((result) => (
              <button
                className="check-row"
                key={`${result.rule_id}-${JSON.stringify(result.scope)}`}
                type="button"
                onClick={() => onSelectRule(result.rule_id)}
              >
                <Chip tone="danger">needs a fix</Chip>
                <span>
                  <strong>{ruleLabel(result.rule_id)}.</strong> {result.message}
                </span>
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

      {brand && inventory && creation ? (
        <PiecesPanel
          brand={brand}
          brandSaveLabel={brandSaveLabel}
          creation={creation}
          creationSaveLabel={creationSaveLabel}
          inventory={inventory}
          onSetCreationException={onSetCreationException}
          onUpdateComponentSpec={onUpdateComponentSpec}
        />
      ) : null}

      {selectedRule ? (
        <Panel title="This check" eyebrow={prettyCategory(selectedRule.category)}>
          <div className="rule-sentence-editor" data-rule-sentence-editor>
            <strong className="rule-headline">{selectedRule.label || selectedRule.id}</strong>
            <p>{selectedRule.description || selectedRule.rationale}</p>
            {selectedRule.description && selectedRule.rationale ? (
              <p className="panel-hint">{selectedRule.rationale}</p>
            ) : null}
            <div className="scope-chip-grid">
              <Chip tone={statusTone(selectedRule.status)}>
                {RULE_STATUS_WORDS[selectedRule.status] ?? selectedRule.status}
              </Chip>
              {Object.entries(selectedRule.scope).map(([key, value]) => (
                <Chip key={key}>{scopeChipLabel(key, value)}</Chip>
              ))}
            </div>
            <div className="review-actions">
              <button className="primary-action" type="button" onClick={() => onSetRuleStatus(selectedRule.id, "approved")}>
                <CheckCircle2 size={15} />
                Turn on
              </button>
              <button className="ghost-action" type="button" onClick={() => onSetRuleStatus(selectedRule.id, "draft")}>
                Needs review
              </button>
              <button className="ghost-action" type="button" onClick={() => onSetRuleStatus(selectedRule.id, "rejected")}>
                Turn off
              </button>
            </div>
            <Disclosure title="Advanced — how it's measured">
              <div className="sentence-rule">
                <span>{selectedRule.category}</span>
                <strong>{selectedRule.metric}</strong>
                <span>{selectedRule.assertion}</span>
                <span>
                  {selectedRule.target === undefined ? "" : String(selectedRule.target)}
                  {selectedRule.unit ?? ""}
                </span>
              </div>
            </Disclosure>
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

function PiecesPanel({
  brand,
  inventory,
  creation,
  brandSaveLabel,
  creationSaveLabel,
  onUpdateComponentSpec,
  onSetCreationException,
}: {
  brand: Brand;
  inventory: DesignInventory;
  creation: Creation;
  brandSaveLabel: string;
  creationSaveLabel: string;
  onUpdateComponentSpec: (componentId: string, prop: string, value: SpecPropValue) => void;
  onSetCreationException: (componentId: string, prop: string, value: SpecPropValue | null) => void;
}) {
  const [scope, setScope] = useState<"everywhere" | "design">("everywhere");
  const exceptions = creation.exceptions ?? {};
  const exceptionCount = Object.keys(exceptions).length;

  return (
    <Panel
      title="The pieces on this design"
      eyebrow={scope === "design" ? creationSaveLabel : brandSaveLabel}
    >
      <div className="pieces-panel" data-pieces-panel>
        <p className="panel-hint">
          These come from your design system. Edit them for every design, or make an exception just here.
        </p>
        <ChoiceChips
          label="Apply changes"
          optionLabels={{ everywhere: "Everywhere", design: "Just this design" }}
          options={["everywhere", "design"]}
          value={scope}
          onChange={(value) => setScope(value as "everywhere" | "design")}
        />
        {exceptionCount ? (
          <p className="panel-hint">
            {exceptionCount === 1 ? "1 exception" : `${exceptionCount} exceptions`} in this design —
            marked below, one click to undo.
          </p>
        ) : null}

        {DESIGN_PIECES.map((piece) => {
          const component = inventory.components.find((item) => item.id === piece.id);
          if (!component?.spec) return null;
          const pieceHasExceptions = Object.keys(exceptions).some((key) => key.startsWith(`${piece.id}.`));
          return (
            <section className="piece-group" key={piece.id}>
              <header className="piece-group-head">
                <strong>{piece.label}</strong>
                {pieceHasExceptions ? (
                  <span data-exception-badge>
                    <Chip title="Some settings differ from your system in this design" tone="warn">
                      <span aria-hidden="true">●</span> Customized here
                    </Chip>
                  </span>
                ) : null}
              </header>
              <Disclosure title={`Edit ${piece.label.toLowerCase()}`}>
                <div className="design-controls">
                  {Object.entries(component.spec.props).map(([prop, systemValue]) => {
                    const key = `${piece.id}.${prop}`;
                    const hasException = key in exceptions;
                    const shown = hasException ? exceptions[key] : systemValue;
                    const apply = (next: SpecPropValue) =>
                      scope === "everywhere"
                        ? onUpdateComponentSpec(piece.id, prop, next)
                        : onSetCreationException(piece.id, prop, next);
                    return (
                      <div className={`piece-control${hasException ? " has-exception" : ""}`} key={prop}>
                        {typeof shown === "number" ? (
                          <SpecStepper
                            label={propLabel(prop)}
                            options={propOptions(brand, prop)}
                            unit={prop === "font_weight" ? "" : "px"}
                            value={shown}
                            onChange={apply}
                          />
                        ) : typeof shown === "string" ? (
                          <SwatchSelect
                            colors={brand.tokens.colors}
                            label={propLabel(prop)}
                            roles={semanticRoles(brand)}
                            value={shown}
                            onChange={apply}
                          />
                        ) : null}
                        {hasException ? (
                          <div className="exception-note">
                            <span>differs from your system</span>
                            <button
                              className="reset-link"
                              type="button"
                              onClick={() => onSetCreationException(piece.id, prop, null)}
                            >
                              <Undo2 size={12} />
                              Back to your system
                            </button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </Disclosure>
            </section>
          );
        })}
      </div>
    </Panel>
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

const RULE_STATUS_WORDS: Record<string, string> = {
  approved: "on",
  draft: "needs review",
  rejected: "off",
};

function prettyCategory(category: string): string {
  const labels: Record<string, string> = {
    accessibility: "Easy to read",
    color: "Colors",
    component: "Components",
    data: "Data",
    grid: "Layout",
    logo: "Logo",
    radius: "Corners",
    slide: "Slides",
    spacing: "Spacing",
    typography: "Type",
  };
  return labels[category] ?? category;
}

function scopeChipLabel(key: string, value: string | number | boolean): string {
  if (value === "*" || value === "") return "everywhere";
  if (key === "surface") return `on ${value}`;
  if (key === "token") return `for the ${value} color`;
  return `${key}: ${String(value)}`;
}
