import { Loader2, PanelRight, Play, ShieldCheck, Sparkles } from "lucide-react";
import type { ComponentProps } from "react";
import type { Brand, DesignComponent, Rule } from "../types";
import { rulesForComponent } from "../app/inventory";
import { BrandIntake } from "./BrandIntake";
import { CreationStudio } from "./CreationStudio";
import { COMPONENT_CATEGORY_LABELS, COMPONENT_CATEGORY_ORDER, STEPS, type StepId } from "./model";
import { ComponentPreview } from "./preview";
import { Chip, statusTone } from "./primitives";
import { StyleSettings } from "./StyleSettings";

/**
 * The main region: one pipeline, four steps. The step rail is the app's
 * primary navigation; each step renders its own full-width canvas.
 */

type SystemCanvasProps = {
  brand: Brand | null;
  ready: boolean;
  activeStep: StepId;
  busy: string | null;
  dockOpen: boolean;
  checksFailing: number;
  intake: ComponentProps<typeof BrandIntake>;
  styleSettings: ComponentProps<typeof StyleSettings> | null;
  lab: ComponentLabStageProps | null;
  studio: ComponentProps<typeof CreationStudio> | null;
  onStepChange: (step: StepId) => void;
  onGenerate: () => void;
  onToggleDock: () => void;
};

export function SystemCanvas({
  brand,
  ready,
  activeStep,
  busy,
  dockOpen,
  checksFailing,
  intake,
  styleSettings,
  lab,
  studio,
  onStepChange,
  onGenerate,
  onToggleDock,
}: SystemCanvasProps) {
  if (!brand || !ready) {
    return (
      <main className="system-canvas" aria-label="Brand pipeline" id="canvas" tabIndex={-1}>
        <div className="loading-state" role="status">
          <Loader2 className="spin" size={20} />
          Loading brand lab
        </div>
      </main>
    );
  }

  const selectedStep = STEPS.find((step) => step.id === activeStep) ?? STEPS[0];

  return (
    <main className="system-canvas" aria-label="Brand pipeline" id="canvas" tabIndex={-1}>
      <header className="canvas-topbar">
        <div>
          <p className="lab-eyebrow">Creative Brand Lab</p>
          <h1>{brand.metadata.name}</h1>
          <span className="canvas-subtitle">From whatever you have to finished, on-brand designs.</span>
        </div>
        <div className="topbar-actions">
          <button
            aria-label={checksFailing ? `${checksFailing} checks failing — open the inspector` : "All checks passing — open the inspector"}
            className={`ghost-action checks-chip${checksFailing ? " has-failures" : ""}`}
            data-checks-chip
            type="button"
            onClick={onToggleDock}
          >
            <ShieldCheck size={15} />
            {checksFailing ? `${checksFailing} to fix` : "All checks pass"}
          </button>
          <button className="primary-action" type="button" onClick={onGenerate} disabled={busy === "generate"}>
            {busy === "generate" ? <Loader2 className="spin" size={16} /> : <Play size={16} />}
            Generate
          </button>
          <button
            aria-expanded={dockOpen}
            aria-label="Toggle inspector dock"
            className="icon-action dock-toggle"
            type="button"
            onClick={onToggleDock}
          >
            <PanelRight size={16} />
          </button>
        </div>
      </header>

      <nav className="stage-tabs step-nav" aria-label="Pipeline steps" data-step-nav>
        {STEPS.map(({ id, label, Icon }, index) => (
          <button
            aria-current={id === activeStep ? "step" : undefined}
            className={`stage-tab${id === activeStep ? " is-active" : ""}`}
            key={id}
            type="button"
            onClick={() => onStepChange(id)}
          >
            <span className="step-number" aria-hidden="true">
              {index + 1}
            </span>
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <section className="stage-hero">
        <selectedStep.Icon size={20} />
        <div>
          <h2>{selectedStep.label}</h2>
          <p>{selectedStep.description}</p>
        </div>
      </section>

      {activeStep === "brand" ? <BrandIntake {...intake} /> : null}
      {activeStep === "style" && styleSettings ? <StyleSettings {...styleSettings} /> : null}
      {activeStep === "components" && lab ? <ComponentLabStage {...lab} /> : null}
      {activeStep === "make" && studio ? <CreationStudio {...studio} /> : null}
    </main>
  );
}

export type ComponentLabStageProps = {
  brand: Brand;
  components: DesignComponent[];
  rules: Rule[];
  selectedComponentId: string | null;
  busy: string | null;
  onOpenDock: () => void;
  onSelectComponent: (componentId: string) => void;
  onSelectRule: (ruleId: string) => void;
  onCompleteSystem: () => void;
};

function ComponentLabStage({
  brand,
  components,
  rules,
  selectedComponentId,
  busy,
  onOpenDock,
  onSelectComponent,
  onSelectRule,
  onCompleteSystem,
}: ComponentLabStageProps) {
  const selected =
    components.find((component) => component.id === selectedComponentId) ?? components[0] ?? null;
  const knownCategories: readonly string[] = COMPONENT_CATEGORY_ORDER;
  const groups: { category: string; label: string; items: DesignComponent[] }[] =
    COMPONENT_CATEGORY_ORDER.map((category) => ({
      category: category as string,
      label: COMPONENT_CATEGORY_LABELS[category] ?? category,
      items: components.filter((component) => component.category === category),
    })).filter((group) => group.items.length > 0);
  const ungrouped = components.filter((component) => !knownCategories.includes(component.category));
  if (ungrouped.length) {
    groups.push({ category: "other", label: "More", items: ungrouped });
  }
  const linkedRules = selected ? rulesForComponent(selected, rules) : [];
  return (
    <div className="component-lab stage-grid" data-workbench-stage="Your components" data-compact-editor-marker>
      <div className="lab-layout">
        <nav aria-label="Components in this system" className="component-rail">
          <button
            className="ghost-action complete-system"
            type="button"
            onClick={onCompleteSystem}
            disabled={busy === "complete-system"}
          >
            {busy === "complete-system" ? <Loader2 className="spin" size={15} /> : <Sparkles size={15} />}
            Complete my system
          </button>
          <p className="rail-hint">Pick a piece. The example updates as you edit.</p>
          {groups.map((group) => (
            <section className="rail-group" key={group.category}>
              <h3>{group.label}</h3>
              {group.items.map((component) => (
                <button
                  aria-current={selected?.id === component.id ? "true" : undefined}
                  className={`rail-item${selected?.id === component.id ? " is-selected" : ""}`}
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

        {selected ? (
          <section aria-label={`${selected.name} preview and details`} className="lab-canvas-region">
            <header className="lab-canvas-head">
              <div>
                <h3>{selected.name}</h3>
                <p>{selected.purpose}</p>
              </div>
              <div className="lab-canvas-actions">
                <Chip tone={statusTone(selected.status)}>{selected.status}</Chip>
                <button className="ghost-action lab-open-dock" type="button" onClick={onOpenDock}>
                  Edit this
                </button>
              </div>
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
        ) : (
          <section className="lab-canvas-region">
            <div className="empty-hint">No components yet. Press “Complete my system” to fill them in.</div>
          </section>
        )}
      </div>
    </div>
  );
}
