import {
  AlertTriangle,
  ArrowUpRight,
  FileOutput,
  Loader2,
  PanelRight,
  Play,
  ShieldCheck,
} from "lucide-react";
import type {
  Artifacts,
  Brand,
  CompletenessLeaf,
  DesignComponent,
  DesignInventory,
  DesignOutput,
  Rule,
  SurfacePack,
  ValidationReport,
} from "../types";
import { artifactUrl, coverageForPack, rulesForComponent } from "../app/inventory";
import { validationResultKey, validationScopeLabel } from "../app/validation";
import { STAGES, type StageId } from "./model";
import { Chip, Disclosure, Meter, Panel, compactNumber, statusTone } from "./primitives";

type SystemCanvasProps = {
  brand: Brand | null;
  inventory: DesignInventory | null;
  completeness: CompletenessLeaf[];
  artifacts: Artifacts | null;
  report: ValidationReport | null;
  activeStage: StageId;
  selectedPackId: string | null;
  selectedComponentId: string | null;
  selectedRuleId: string | null;
  busy: string | null;
  dockOpen: boolean;
  onStageChange: (stage: StageId) => void;
  onSelectPack: (packId: string) => void;
  onSelectComponent: (componentId: string) => void;
  onSelectRule: (ruleId: string) => void;
  onGenerate: () => void;
  onSetRuleStatus: (ruleId: string, status: Rule["status"]) => void;
  onToggleDock: () => void;
};

export function SystemCanvas({
  brand,
  inventory,
  completeness,
  artifacts,
  report,
  activeStage,
  selectedPackId,
  selectedComponentId,
  selectedRuleId,
  busy,
  dockOpen,
  onStageChange,
  onSelectPack,
  onSelectComponent,
  onSelectRule,
  onGenerate,
  onSetRuleStatus,
  onToggleDock,
}: SystemCanvasProps) {
  if (!brand || !inventory || !artifacts || !report) {
    return (
      <main className="system-canvas" aria-label="System Canvas" id="canvas" tabIndex={-1}>
        <div className="loading-state" role="status">
          <Loader2 className="spin" size={20} />
          Loading brand lab
        </div>
      </main>
    );
  }

  const selectedStage = STAGES.find((stage) => stage.id === activeStage) ?? STAGES[0];

  return (
    <main className="system-canvas" aria-label="System Canvas" id="canvas" tabIndex={-1}>
      <header className="canvas-topbar">
        <div>
          <p className="lab-eyebrow">Creative Brand Lab</p>
          <h1>{brand.metadata.name}</h1>
          <span className="canvas-subtitle">Visually editable design-system inventory for generated brand surfaces.</span>
        </div>
        <div className="topbar-actions">
          <button className="primary-action" type="button" onClick={onGenerate} disabled={busy === "generate"}>
            {busy === "generate" ? <Loader2 className="spin" size={16} /> : <Play size={16} />}
            Generate
          </button>
          <button
            aria-expanded={dockOpen}
            aria-label="Toggle review dock"
            className="icon-action dock-toggle"
            type="button"
            onClick={onToggleDock}
          >
            <PanelRight size={16} />
          </button>
        </div>
      </header>

      <nav className="stage-tabs" aria-label="System canvas stages">
        {STAGES.map(({ id, label, Icon }) => (
          <button
            aria-current={id === activeStage ? "true" : undefined}
            className={`stage-tab${id === activeStage ? " is-active" : ""}`}
            key={id}
            type="button"
            onClick={() => onStageChange(id)}
          >
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <section className="stage-hero">
        <selectedStage.Icon size={20} />
        <div>
          <h2>{selectedStage.label}</h2>
          <p>{selectedStage.description}</p>
        </div>
      </section>

      {activeStage === "overview" ? (
        <OverviewStage
          brand={brand}
          completeness={completeness}
          inventory={inventory}
          report={report}
          selectedPackId={selectedPackId}
          onSelectPack={onSelectPack}
          onSelectRule={onSelectRule}
        />
      ) : null}
      {activeStage === "foundations" ? <FoundationsStage brand={brand} /> : null}
      {activeStage === "surface-packs" ? (
        <SurfacePacksStage
          completeness={completeness}
          inventory={inventory}
          selectedPackId={selectedPackId}
          onSelectPack={onSelectPack}
        />
      ) : null}
      {activeStage === "component-lab" ? (
        <ComponentLabStage
          components={inventory.components}
          selectedComponentId={selectedComponentId}
          rules={brand.rules}
          onSelectComponent={onSelectComponent}
          onSelectRule={onSelectRule}
        />
      ) : null}
      {activeStage === "outputs" ? (
        <OutputGalleryStage artifacts={artifacts} inventory={inventory} report={report} />
      ) : null}
      {activeStage === "validation" ? (
        <ValidationStage
          report={report}
          rules={brand.rules}
          selectedRuleId={selectedRuleId}
          onSelectRule={onSelectRule}
          onSetRuleStatus={onSetRuleStatus}
        />
      ) : null}
    </main>
  );
}

type OverviewStageProps = {
  brand: Brand;
  inventory: DesignInventory;
  completeness: CompletenessLeaf[];
  report: ValidationReport;
  selectedPackId: string | null;
  onSelectPack: (packId: string) => void;
  onSelectRule: (ruleId: string) => void;
};

function OverviewStage({ brand, inventory, completeness, report, selectedPackId, onSelectPack, onSelectRule }: OverviewStageProps) {
  const approvedRules = brand.rules.filter((rule) => rule.status === "approved").length;
  const draftRules = brand.rules.filter((rule) => rule.status === "draft").length;
  const approvedComponents = inventory.components.filter((component) => component.status === "approved").length;
  return (
    <div className="stage-grid overview-grid" data-workbench-stage="Overview">
      <Panel title="System Snapshot" eyebrow="Inventory health">
        <div className="metric-grid">
          <MetricCard
            label="Surface packs"
            value={inventory.surface_packs.length}
            supporting={`${inventory.surface_packs.filter((pack) => pack.required).length} required`}
          />
          <MetricCard label="Components" value={inventory.components.length} supporting={`${approvedComponents} approved`} />
          <MetricCard label="Rules" value={brand.rules.length} supporting={`${approvedRules} approved, ${draftRules} draft`} />
          <MetricCard label="Validation" value={report.summary.total} supporting={`${report.summary.failed} failed`} />
        </div>
      </Panel>

      <Panel title="Surface-Pack Coverage" eyebrow="Click a pack to review" actions={<Chip tone="good">matrix</Chip>}>
        <SurfacePackMap
          completeness={completeness}
          components={inventory.components}
          packs={inventory.surface_packs}
          selectedPackId={selectedPackId}
          onSelectPack={onSelectPack}
        />
      </Panel>

      <Panel title="Rule Health Overview" eyebrow="Lanes by category">
        <RuleHealthLanes rules={brand.rules} onSelectRule={onSelectRule} />
      </Panel>

      <Panel title="Brand Preview" eyebrow="Generated visual language">
        <BrandPreview brand={brand} />
      </Panel>
    </div>
  );
}

function FoundationsStage({ brand }: { brand: Brand }) {
  const colorEntries = Object.entries(brand.tokens.colors);
  const typeSizes = Object.entries(brand.tokens.typography.sizes);
  return (
    <div className="stage-grid foundations-grid" data-workbench-stage="Foundations">
      <Panel title="Color Roles" eyebrow="Swatches">
        <div className="swatch-grid">
          {colorEntries.map(([name, value]) => (
            <div className="swatch-card" key={name}>
              <span className="swatch" style={{ background: value }} />
              <strong>{name}</strong>
              <code>{value}</code>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Type Specimens" eyebrow={brand.tokens.typography.font_family}>
        <div className="type-specimens">
          {[...typeSizes]
            .sort(([, left], [, right]) => left - right)
            .map(([name, size]) => (
              <div className="type-row" key={name}>
                <span>{name}</span>
                <strong style={{ fontSize: `${size}px`, fontFamily: brand.tokens.typography.font_family }}>
                  Brand System
                </strong>
                <small>{size}px</small>
              </div>
            ))}
        </div>
      </Panel>

      <Panel title="Spacing Ruler" eyebrow={`${brand.tokens.spacing.grid}px grid`}>
        <div className="ruler-stack">
          {brand.tokens.spacing.scale.map((value) => (
            <div className="ruler-row" key={value}>
              <span style={{ width: `${Math.min(100, (value / Math.max(...brand.tokens.spacing.scale)) * 100)}%` }} />
              <strong>{value}px</strong>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Logo Clear Space" eyebrow={brand.tokens.logo.placement}>
        <div className="logo-clear-card">
          <span>{brand.tokens.logo.wordmark}</span>
          <small>{brand.tokens.logo.height}px nominal height</small>
        </div>
      </Panel>
    </div>
  );
}

type SurfacePacksStageProps = {
  inventory: DesignInventory;
  completeness: CompletenessLeaf[];
  selectedPackId: string | null;
  onSelectPack: (packId: string) => void;
};

function SurfacePacksStage({ inventory, completeness, selectedPackId, onSelectPack }: SurfacePacksStageProps) {
  return (
    <div className="stage-grid" data-workbench-stage="Surface Packs">
      <Panel title="Rule + Coverage Matrix" eyebrow="Surface readiness">
        <SurfacePackMap
          completeness={completeness}
          components={inventory.components}
          packs={inventory.surface_packs}
          selectedPackId={selectedPackId}
          onSelectPack={onSelectPack}
        />
      </Panel>
      <div className="surface-pack-grid">
        {inventory.surface_packs.map((pack) => (
          <SurfacePackCard
            completeness={completeness}
            components={inventory.components}
            key={pack.id}
            pack={pack}
            selected={pack.id === selectedPackId}
            onSelect={() => onSelectPack(pack.id)}
          />
        ))}
      </div>
    </div>
  );
}

type ComponentLabStageProps = {
  components: DesignComponent[];
  rules: Rule[];
  selectedComponentId: string | null;
  onSelectComponent: (componentId: string) => void;
  onSelectRule: (ruleId: string) => void;
};

function ComponentLabStage({ components, rules, selectedComponentId, onSelectComponent, onSelectRule }: ComponentLabStageProps) {
  return (
    <div className="component-lab stage-grid" data-workbench-stage="Component Lab" data-compact-editor-marker>
      <Panel title="Component Inventory" eyebrow="Summary cards with details on demand">
        <div className="component-card-grid">
          {components.map((component) => {
            const linkedRules = rulesForComponent(component, rules);
            return (
              <article
                className={`component-card${component.id === selectedComponentId ? " is-selected" : ""}`}
                key={component.id}
                onClick={() => onSelectComponent(component.id)}
              >
                <header>
                  <div>
                    <Chip tone={statusTone(component.status)}>{component.status}</Chip>
                    <h3>
                      <button
                        aria-current={component.id === selectedComponentId ? "true" : undefined}
                        className="card-hit"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onSelectComponent(component.id);
                        }}
                      >
                        {component.name}
                      </button>
                    </h3>
                  </div>
                  <span className="component-category">{component.category}</span>
                </header>
                <p className="card-summary">{component.purpose}</p>
                <div className="card-stat-row">
                  <span>
                    <strong>{component.surfaces.length}</strong>
                    surfaces
                  </span>
                  <span>
                    <strong>{component.states?.length ?? 0}</strong>
                    states
                  </span>
                  <span>
                    <strong>{linkedRules.length}</strong>
                    rules
                  </span>
                </div>
                <div className="card-disclosure" onClick={(event) => event.stopPropagation()}>
                  <Disclosure title="Details">
                    <div className="chip-row">
                      {component.surfaces.map((surface) => (
                        <Chip key={surface}>{surface}</Chip>
                      ))}
                    </div>
                    <div className="component-rule-strip">
                      {linkedRules.slice(0, 6).map((rule) => (
                        <button
                          key={rule.id}
                          type="button"
                          onClick={() => {
                            onSelectComponent(component.id);
                            onSelectRule(rule.id);
                          }}
                        >
                          {rule.label || rule.id}
                        </button>
                      ))}
                    </div>
                  </Disclosure>
                </div>
              </article>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

type OutputGalleryStageProps = {
  inventory: DesignInventory;
  artifacts: Artifacts;
  report: ValidationReport;
};

function OutputGalleryStage({ inventory, artifacts, report }: OutputGalleryStageProps) {
  return (
    <div className="stage-grid" data-workbench-stage="Outputs">
      <Panel title="Output Gallery" eyebrow="Generated and planned surfaces">
        <div className="output-gallery">
          {inventory.outputs.map((output) => (
            <OutputCard artifacts={artifacts} key={output.id} output={output} report={report} />
          ))}
        </div>
      </Panel>
    </div>
  );
}

type ValidationStageProps = {
  report: ValidationReport;
  rules: Rule[];
  selectedRuleId: string | null;
  onSelectRule: (ruleId: string) => void;
  onSetRuleStatus: (ruleId: string, status: Rule["status"]) => void;
};

function ValidationStage({ report, rules, selectedRuleId, onSelectRule, onSetRuleStatus }: ValidationStageProps) {
  return (
    <div className="stage-grid" data-workbench-stage="Validation">
      <Panel title="Validation Summary" eyebrow="Machine checks">
        <div className="metric-grid">
          <MetricCard label="Passed" value={report.summary.passed} supporting="approved checks" />
          <MetricCard label="Failed" value={report.summary.failed} supporting="needs attention" />
          <MetricCard label="Warnings" value={report.summary.warn} supporting="review recommended" />
          <MetricCard label="Estimated" value={report.summary.estimated} supporting="render-dependent" />
        </div>
      </Panel>

      <Panel title="Rule Results" eyebrow="Click rows to edit">
        <div className="validation-list">
          {report.results.map((result, index) => {
            const rule = rules.find((item) => item.id === result.rule_id);
            return (
              <article
                className={`validation-row${selectedRuleId === result.rule_id ? " is-selected" : ""}`}
                key={validationResultKey(result, index)}
                onClick={() => onSelectRule(result.rule_id)}
              >
                <div>
                  <Chip tone={statusTone(result.status)}>{result.status}</Chip>
                  <strong>
                    <button
                      aria-current={selectedRuleId === result.rule_id ? "true" : undefined}
                      className="card-hit"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectRule(result.rule_id);
                      }}
                    >
                      {rule?.label || result.rule_id}
                    </button>
                  </strong>
                  <small>{validationScopeLabel(result)}</small>
                </div>
                <p>{result.message}</p>
                {rule ? (
                  <div className="row-actions">
                    <button type="button" onClick={(event) => {
                      event.stopPropagation();
                      onSetRuleStatus(rule.id, "approved");
                    }}>
                      Approve
                    </button>
                    <button type="button" onClick={(event) => {
                      event.stopPropagation();
                      onSetRuleStatus(rule.id, "draft");
                    }}>
                      Draft
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

function MetricCard({ label, value, supporting }: { label: string; value: number; supporting: string }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{compactNumber(value)}</strong>
      <small>{supporting}</small>
    </div>
  );
}

function SurfacePackMap({
  packs,
  components,
  completeness,
  selectedPackId,
  onSelectPack,
}: {
  packs: SurfacePack[];
  components: DesignComponent[];
  completeness: CompletenessLeaf[];
  selectedPackId: string | null;
  onSelectPack: (packId: string) => void;
}) {
  return (
    <div className="coverage-matrix" data-surface-pack-coverage-map>
      {packs.map((pack) => {
        const coverage = coverageForPack(pack, components, completeness);
        return (
          <button
            className={`coverage-cell${selectedPackId === pack.id ? " is-selected" : ""}`}
            key={pack.id}
            type="button"
            onClick={() => onSelectPack(pack.id)}
          >
            <span>{pack.label}</span>
            <strong>{coverage.percent}%</strong>
            <Meter value={coverage.percent} label={`${pack.label} coverage`} />
            <small>{coverage.status}</small>
          </button>
        );
      })}
    </div>
  );
}

function RuleHealthLanes({ rules, onSelectRule }: { rules: Rule[]; onSelectRule: (ruleId: string) => void }) {
  const categories = [...new Set(rules.map((rule) => rule.category))].sort();
  return (
    <div className="rule-health-lanes">
      {categories.map((category) => {
        const categoryRules = rules.filter((rule) => rule.category === category);
        const approved = categoryRules.filter((rule) => rule.status === "approved").length;
        const draft = categoryRules.filter((rule) => rule.status === "draft").length;
        return (
          <section className="rule-lane" key={category}>
            <header>
              <strong>{category}</strong>
              <span>{categoryRules.length}</span>
            </header>
            <div className="lane-summary-row">
              <Chip tone="good">{approved} approved</Chip>
              <Chip tone="warn">{draft} draft</Chip>
            </div>
            <Disclosure title="Rules">
              <div className="rule-lane-list">
                {categoryRules.map((rule) => (
                  <button key={rule.id} type="button" onClick={() => onSelectRule(rule.id)}>
                    <span className={`status-dot status-${rule.status}`} />
                    {rule.label || rule.id}
                  </button>
                ))}
              </div>
            </Disclosure>
          </section>
        );
      })}
    </div>
  );
}

function BrandPreview({ brand }: { brand: Brand }) {
  const colors = brand.tokens.colors;
  return (
    <div className="brand-preview" style={{ background: colors.background, color: colors.text }}>
      <header>
        <span style={{ background: colors.accent }} />
        <strong>{brand.tokens.logo.wordmark}</strong>
      </header>
      <section>
        <h3>Generated Surface</h3>
        <p>Cards, rules, charts, and copy inherit the same tokens.</p>
      </section>
      <div className="preview-cards">
        <span style={{ background: colors.surface, borderColor: colors.border }}>Deck</span>
        <span style={{ background: colors.surface, borderColor: colors.border }}>Report</span>
        <span style={{ background: colors.surface, borderColor: colors.border }}>Dash</span>
      </div>
    </div>
  );
}

function SurfacePackCard({
  pack,
  components,
  completeness,
  selected,
  onSelect,
}: {
  pack: SurfacePack;
  components: DesignComponent[];
  completeness: CompletenessLeaf[];
  selected: boolean;
  onSelect: () => void;
}) {
  const coverage = coverageForPack(pack, components, completeness);
  return (
    <article className={`surface-pack-card${selected ? " is-selected" : ""}`} onClick={onSelect}>
      <header>
        <div>
          <Chip tone={statusTone(coverage.status)}>{coverage.status}</Chip>
          <h3>
            <button
              aria-current={selected ? "true" : undefined}
              className="card-hit"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onSelect();
              }}
            >
              {pack.label}
            </button>
          </h3>
        </div>
        <strong>{coverage.percent}%</strong>
      </header>
      <p className="card-summary">{pack.description}</p>
      <Meter value={coverage.percent} label={`${pack.label} coverage`} />
      <div className="card-stat-row">
        <span>
          <strong>{pack.surfaces.length}</strong>
          surfaces
        </span>
        <span>
          <strong>{pack.outputs?.length ?? 0}</strong>
          outputs
        </span>
      </div>
      <Disclosure title="Surface details">
        <div className="chip-row">
          {pack.surfaces.map((surface) => (
            <Chip key={surface}>{surface}</Chip>
          ))}
        </div>
      </Disclosure>
    </article>
  );
}

function OutputCard({ output, artifacts, report }: { output: DesignOutput; artifacts: Artifacts; report: ValidationReport }) {
  const href = artifactUrl(output, artifacts);
  const failing = output.status === "available" ? report.summary.failed : 0;
  return (
    <article className="output-card">
      <header>
        <FileOutput size={16} />
        <Chip tone={failing ? "warn" : statusTone(output.status)}>{output.status}</Chip>
      </header>
      <h3>{output.label}</h3>
      <p className="card-summary">{output.description}</p>
      {failing ? (
        <span className="output-warning">
          <AlertTriangle size={16} />
          {failing === 1 ? "1 check failing" : `${failing} checks failing`}
        </span>
      ) : null}
      {href ? (
        <a href={href} target="_blank" rel="noreferrer">
          Open preview
          <ArrowUpRight size={16} />
        </a>
      ) : (
        <span className="planned-output">
          <ShieldCheck size={16} />
          Planned — not generated yet
        </span>
      )}
    </article>
  );
}
