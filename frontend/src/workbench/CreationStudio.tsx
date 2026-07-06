import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpRight,
  Download,
  FileOutput,
  Loader2,
  Plus,
  Printer,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import type {
  Artifacts,
  Brand,
  Creation,
  CreationMeta,
  CreationType,
  TemplateDefinition,
  TemplateLibrary,
} from "../types";
import { ChoiceChips, TextField } from "./controls";
import { Chip, Disclosure, Panel } from "./primitives";

/**
 * Step 4 — "Make things". Pick a proven skeleton, pour your content in, and
 * edit each part with the same simple controls as everywhere else. The big
 * preview is the real generated file and refreshes after every saved edit.
 */

type CreationStudioProps = {
  brand: Brand;
  library: TemplateLibrary | null;
  creations: CreationMeta[];
  activeCreation: Creation | null;
  artifactUrl: string | null;
  previewNonce: number;
  selectedSectionId: string | null;
  busy: string | null;
  saveStateLabel: string;
  artifacts: Artifacts;
  onNewCreation: (name: string, templateId: string, pasteText: string) => Promise<unknown>;
  onOpenCreation: (creationId: string) => void;
  onCloseCreation: () => void;
  onDeleteCreation: (creationId: string) => void;
  onRenameCreation: (name: string) => void;
  onSelectSection: (sectionId: string) => void;
  onAddSection: (skeletonId: string) => void;
  onRemoveSection: (sectionId: string) => void;
  onMoveSection: (sectionId: string, direction: -1 | 1) => void;
  onUndoCreation: () => void;
  onExportPptx: () => void;
  onOpenDock: () => void;
};

const TYPE_LABELS: Record<CreationType, string> = {
  deck: "Slide deck",
  report: "Report",
  landing: "Landing page",
};

export function CreationStudio(props: CreationStudioProps) {
  const { activeCreation } = props;
  return (
    <div className="stage-grid make-grid" data-workbench-stage="Make things">
      {activeCreation ? <CreationEditor {...props} creation={activeCreation} /> : <CreationHome {...props} />}
    </div>
  );
}

function CreationHome({
  library,
  creations,
  artifacts,
  busy,
  onNewCreation,
  onOpenCreation,
  onDeleteCreation,
}: CreationStudioProps) {
  return (
    <>
      <NewDesignWizard busy={busy} library={library} onNewCreation={onNewCreation} />

      <Panel title="Your designs" eyebrow={creations.length ? `${creations.length} so far` : "Nothing yet"}>
        {creations.length ? (
          <div className="creation-list" data-creation-list>
            {creations.map((meta) => (
              <article className="creation-card" key={meta.id}>
                <header>
                  <FileOutput size={16} />
                  <Chip>{TYPE_LABELS[meta.type] ?? meta.type}</Chip>
                </header>
                <h3>
                  <button className="card-hit" type="button" onClick={() => onOpenCreation(meta.id)}>
                    {meta.name}
                  </button>
                </h3>
                <p className="card-summary">
                  {meta.section_count} parts · saved {meta.updated_at.slice(0, 10)}
                </p>
                <div className="row-actions">
                  <button
                    aria-label={`Delete ${meta.name}`}
                    className="icon-action"
                    type="button"
                    onClick={() => onDeleteCreation(meta.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-hint" data-creation-list>
            <FileOutput size={18} />
            <span>Nothing here yet. Make your first design above — it takes about a minute.</span>
          </div>
        )}
      </Panel>

      <Panel title="Your brand kit" eyebrow="Auto-generated from your system">
        <div className="kit-row">
          {[
            { key: "slides", label: "Sample deck" },
            { key: "styleguide", label: "Styleguide" },
            { key: "landing", label: "Sample landing page" },
          ].map(({ key, label }) => {
            const href = artifacts[key as keyof Artifacts];
            if (typeof href !== "string") return null;
            return (
              <a className="kit-card" href={href} key={key} rel="noreferrer" target="_blank">
                <span className="output-thumb" inert>
                  <iframe loading="lazy" src={href} tabIndex={-1} title={`${label} preview`} />
                </span>
                <span className="kit-card-label">
                  {label}
                  <ArrowUpRight size={14} />
                </span>
              </a>
            );
          })}
        </div>
      </Panel>
    </>
  );
}

function NewDesignWizard({
  library,
  busy,
  onNewCreation,
}: {
  library: TemplateLibrary | null;
  busy: string | null;
  onNewCreation: (name: string, templateId: string, pasteText: string) => Promise<unknown>;
}) {
  const [type, setType] = useState<CreationType>("deck");
  const [templateId, setTemplateId] = useState<string>("");
  const [name, setName] = useState("");
  const [pasteText, setPasteText] = useState("");
  const templates = useMemo(
    () => (library?.templates ?? []).filter((template) => template.type === type),
    [library, type],
  );
  const chosen = templates.find((template) => template.id === templateId) ?? templates[0] ?? null;

  async function handleCreate() {
    if (!chosen) return;
    const result = await onNewCreation(name.trim(), chosen.id, pasteText);
    if (result !== undefined) {
      setName("");
      setPasteText("");
    }
  }

  return (
    <Panel title="New design" eyebrow="From a proven skeleton">
      <div className="wizard" data-template-picker>
        <ChoiceChips
          label="What do you want to make?"
          optionLabels={TYPE_LABELS}
          options={["deck", "report", "landing"]}
          value={type}
          onChange={(value) => {
            setType(value as CreationType);
            setTemplateId("");
          }}
        />
        <div className="template-cards" role="group" aria-label="Starting skeleton">
          {templates.map((template) => (
            <button
              aria-pressed={template.id === chosen?.id}
              className={`template-card${template.id === chosen?.id ? " is-selected" : ""}`}
              key={template.id}
              type="button"
              onClick={() => setTemplateId(template.id)}
            >
              <TemplateThumb library={library} template={template} />
              <strong>{template.label}</strong>
              <small>{template.description}</small>
            </button>
          ))}
        </div>
        <TextField label="Name it (optional)" placeholder="Q3 review" value={name} onChange={setName} />
        <TextField
          label="Paste your content (optional) — headings, bullets, and numbers land in the right spots"
          multiline
          placeholder={"# Growth review\n- Expanded to 3 new markets\nRevenue: $4.2M"}
          value={pasteText}
          onChange={setPasteText}
        />
        <button
          className="primary-action"
          disabled={!chosen || busy === "new-creation"}
          type="button"
          onClick={() => void handleCreate()}
        >
          {busy === "new-creation" ? <Loader2 className="spin" size={15} /> : <Plus size={15} />}
          Make it
        </button>
      </div>
    </Panel>
  );
}

function TemplateThumb({ library, template }: { library: TemplateLibrary | null; template: TemplateDefinition }) {
  const skeletons = library?.skeletons[template.type] ?? [];
  const labelFor = (id: string) => skeletons.find((skeleton) => skeleton.id === id)?.label ?? id;
  return (
    <span aria-hidden="true" className="template-thumb">
      {template.sections.slice(0, 6).map((skeletonId, index) => (
        <span className="template-thumb-row" key={`${skeletonId}-${index}`}>
          {labelFor(skeletonId)}
        </span>
      ))}
      {template.sections.length > 6 ? <span className="template-thumb-row">…</span> : null}
    </span>
  );
}

type EditorProps = CreationStudioProps & { creation: Creation };

function CreationEditor({
  brand,
  creation,
  library,
  artifactUrl,
  previewNonce,
  selectedSectionId,
  busy,
  saveStateLabel,
  onCloseCreation,
  onRenameCreation,
  onSelectSection,
  onAddSection,
  onRemoveSection,
  onMoveSection,
  onUndoCreation,
  onExportPptx,
  onOpenDock,
}: EditorProps) {
  const skeletons = library?.skeletons[creation.type] ?? [];
  const labelFor = (id: string) => skeletons.find((skeleton) => skeleton.id === id)?.label ?? id;
  const previewSrc = artifactUrl
    ? `${artifactUrl}?v=${brand.metadata.version}-${creation.version}-${previewNonce}`
    : null;

  return (
    <div className="creation-editor" data-creation-editor>
      <header className="creation-editor-head">
        <button className="ghost-action" type="button" onClick={onCloseCreation}>
          <ArrowLeft size={15} />
          All designs
        </button>
        <div className="creation-name">
          <TextField label="Name" value={creation.name} onChange={onRenameCreation} />
          <small className="muted-note">{saveStateLabel}</small>
          {Object.keys(creation.exceptions ?? {}).length ? (
            <Chip
              title="Some pieces differ from your system in this design — see “The pieces on this design”"
              tone="warn"
            >
              {Object.keys(creation.exceptions ?? {}).length === 1
                ? "1 exception"
                : `${Object.keys(creation.exceptions ?? {}).length} exceptions`}
            </Chip>
          ) : null}
        </div>
        <div className="creation-editor-actions">
          <button
            aria-label="Undo design edit"
            className="ghost-action"
            type="button"
            onClick={onUndoCreation}
            disabled={busy === "creation-undo"}
          >
            <RotateCcw size={15} />
            Undo
          </button>
          {creation.type === "deck" ? (
            <button
              className="ghost-action"
              type="button"
              onClick={onExportPptx}
              disabled={busy === "export-pptx"}
            >
              {busy === "export-pptx" ? <Loader2 className="spin" size={15} /> : <Download size={15} />}
              PowerPoint
            </button>
          ) : null}
          {creation.type === "report" && previewSrc ? (
            <a className="ghost-action" href={previewSrc} rel="noreferrer" target="_blank">
              <Printer size={15} />
              Print to PDF
            </a>
          ) : null}
          {previewSrc ? (
            <a className="ghost-action" href={previewSrc} rel="noreferrer" target="_blank">
              Open full size
              <ArrowUpRight size={15} />
            </a>
          ) : null}
        </div>
      </header>

      <div className="creation-layout">
        <nav aria-label="Parts of this design" className="section-rail" data-section-rail>
          <p className="rail-hint">The parts, in order. Pick one to edit it.</p>
          {creation.sections.map((section, index) => (
            <div
              className={`section-rail-item${section.id === selectedSectionId ? " is-selected" : ""}`}
              key={section.id}
            >
              <button
                aria-current={section.id === selectedSectionId ? "true" : undefined}
                className="rail-item"
                type="button"
                onClick={() => {
                  onSelectSection(section.id);
                }}
              >
                <span className="section-index">{index + 1}</span>
                {labelFor(section.skeleton)}
              </button>
              <span className="section-rail-tools">
                <button
                  aria-label={`Move ${labelFor(section.skeleton)} up`}
                  className="icon-action"
                  disabled={index === 0}
                  type="button"
                  onClick={() => onMoveSection(section.id, -1)}
                >
                  <ArrowUp size={13} />
                </button>
                <button
                  aria-label={`Move ${labelFor(section.skeleton)} down`}
                  className="icon-action"
                  disabled={index === creation.sections.length - 1}
                  type="button"
                  onClick={() => onMoveSection(section.id, 1)}
                >
                  <ArrowDown size={13} />
                </button>
                <button
                  aria-label={`Remove ${labelFor(section.skeleton)}`}
                  className="icon-action"
                  disabled={creation.sections.length <= 1}
                  type="button"
                  onClick={() => onRemoveSection(section.id)}
                >
                  <Trash2 size={13} />
                </button>
              </span>
            </div>
          ))}
          <Disclosure title="Add a part">
            <div className="add-part-list">
              {skeletons.map((skeleton) => (
                <button className="rail-item" key={skeleton.id} type="button" onClick={() => onAddSection(skeleton.id)}>
                  <Plus size={13} />
                  {skeleton.label}
                </button>
              ))}
            </div>
          </Disclosure>
          <button className="ghost-action lab-open-dock" type="button" onClick={onOpenDock}>
            Edit this part
          </button>
        </nav>

        <div className="creation-preview">
          {previewSrc ? (
            <iframe className="creation-preview-frame" src={previewSrc} title={`Preview of ${creation.name}`} />
          ) : (
            <div className="empty-hint">Preview is on its way…</div>
          )}
        </div>
      </div>
    </div>
  );
}
