import { CheckCircle2, ClipboardList, Loader2, RotateCcw, SlidersHorizontal, Sparkles, XCircle } from "lucide-react";
import type {
  AiProposal,
  Brand,
  DesignComponent,
  DesignInventory,
  ProviderStatus,
  Rule,
  SourceRecord,
  SurfacePack,
} from "../types";
import { rulesForComponent } from "../app/inventory";
import { ComponentListField, REVIEW_STATUSES } from "./model";
import { Chip, Disclosure, Panel, statusTone } from "./primitives";

type EditorDockProps = {
  brand: Brand | null;
  inventory: DesignInventory | null;
  sources: SourceRecord[];
  selectedSource: SourceRecord | null;
  selectedPack: SurfacePack | null;
  selectedComponent: DesignComponent | null;
  selectedRule: Rule | null;
  proposal: AiProposal | null;
  providers: ProviderStatus[];
  provider: string;
  busy: string | null;
  open: boolean;
  onProviderChange: (provider: string) => void;
  onAnalyzeSource: (sourceId: string) => void;
  onApplyProposal: () => void;
  onRejectProposal: () => void;
  onUndo: () => void;
  onUpdateComponent: (componentId: string, patch: Partial<DesignComponent>) => void;
  onToggleComponentValue: (componentId: string, field: ComponentListField, value: string) => void;
  onSetRuleStatus: (ruleId: string, status: Rule["status"]) => void;
};

export function EditorDock({
  brand,
  inventory,
  sources,
  selectedSource,
  selectedPack,
  selectedComponent,
  selectedRule,
  proposal,
  providers,
  provider,
  busy,
  open,
  onProviderChange,
  onAnalyzeSource,
  onApplyProposal,
  onRejectProposal,
  onUndo,
  onUpdateComponent,
  onToggleComponentValue,
  onSetRuleStatus,
}: EditorDockProps) {
  const linkedRules = brand && selectedComponent ? rulesForComponent(selectedComponent, brand.rules) : [];
  return (
    <aside className={`editor-dock${open ? " is-open" : ""}`} aria-label="Review and editor dock">
      <Panel title="Review Queue" eyebrow="Nothing canonical until approved">
        <label className="provider-label">
          <span>AI provider</span>
          <select aria-label="AI provider" value={provider} onChange={(event) => onProviderChange(event.target.value)}>
            {providers.map((item) => (
              <option disabled={!item.available || !item.authenticated} key={item.id} value={item.id}>
                {item.label}
                {!item.available || !item.authenticated ? " — unavailable" : ""}
              </option>
            ))}
          </select>
        </label>

        {selectedSource ? (
          <div className="review-source" data-review-queue>
            <strong>{selectedSource.name}</strong>
            <small>{selectedSource.kind}</small>
            <button
              className="primary-action"
              type="button"
              onClick={() => onAnalyzeSource(selectedSource.id)}
              disabled={busy === `analyze:${selectedSource.id}`}
            >
              {busy === `analyze:${selectedSource.id}` ? <Loader2 className="spin" size={15} /> : <Sparkles size={15} />}
              Extract proposals
            </button>
          </div>
        ) : null}

        {proposal ? (
          <article className="proposal-card">
            <header>
              <Chip tone="warn">pending</Chip>
              <strong>{proposal.summary}</strong>
            </header>
            <div className="proposal-counts">
              <span>{pluralize(proposal.rules?.length ?? 0, "rule")}</span>
              <span>{pluralize(proposal.patch?.length ?? 0, "patch", "patches")}</span>
              <span>
                {typeof proposal.confidence === "number"
                  ? `${Math.round(proposal.confidence * 100)}% confidence`
                  : proposal.mode === "heuristic"
                    ? "deterministic"
                    : "unscored"}
              </span>
            </div>
            {proposal.validation_impact ? <p>{proposal.validation_impact}</p> : null}
            <div className="review-actions">
              <button className="primary-action" type="button" onClick={onApplyProposal} disabled={busy === "apply-proposal"}>
                <CheckCircle2 size={15} />
                Approve
              </button>
              <button className="ghost-action" type="button" onClick={onRejectProposal}>
                <XCircle size={15} />
                Reject
              </button>
            </div>
            <Disclosure title="Advanced proposal JSON">
              <pre>{JSON.stringify(proposal, null, 2)}</pre>
            </Disclosure>
          </article>
        ) : (
          <div className="empty-hint">
            <ClipboardList size={18} />
            <span>Select a source and extract proposals to build the queue.</span>
          </div>
        )}
      </Panel>

      {selectedPack ? (
        <Panel title="Surface Pack" eyebrow={selectedPack.label}>
          <div className="pack-editor">
            <p>{selectedPack.description}</p>
            <div className="chip-row">
              {REVIEW_STATUSES.map((status) => (
                <Chip active={selectedPack.status === status} key={status} tone={statusTone(status)}>
                  {status}
                </Chip>
              ))}
            </div>
            <Disclosure title={`${selectedPack.surfaces.length} surfaces`}>
              <div className="chip-row">
                {selectedPack.surfaces.map((surface) => (
                  <Chip key={surface}>{surface}</Chip>
                ))}
              </div>
            </Disclosure>
          </div>
        </Panel>
      ) : null}

      {selectedComponent ? (
        <Panel title="Compact Editor" eyebrow={selectedComponent.name}>
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
          <button className="ghost-action" type="button" onClick={onUndo} disabled={busy === "undo"}>
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

function pluralize(count: number, singular: string, plural?: string): string {
  return `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;
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
