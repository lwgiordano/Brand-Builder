import { Loader2, PanelRight, Play, ShieldCheck } from "lucide-react";
import type { ComponentProps } from "react";
import type { Brand } from "../types";
import { BrandIntake } from "./BrandIntake";
import { ComponentReview, type ComponentReviewProps } from "./ComponentReview";
import { CreationStudio } from "./CreationStudio";
import { STEPS, type StepId } from "./model";
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
  lab: ComponentReviewProps | null;
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

      <section className="stage-heading">
        <h2>{selectedStep.label}</h2>
        <p>{selectedStep.description}</p>
      </section>

      {activeStep === "brand" ? <BrandIntake {...intake} /> : null}
      {activeStep === "style" && styleSettings ? <StyleSettings {...styleSettings} /> : null}
      {activeStep === "components" && lab ? <ComponentReview {...lab} /> : null}
      {activeStep === "make" && studio ? <CreationStudio {...studio} /> : null}
    </main>
  );
}
