import {
  CheckCircle2,
  ClipboardList,
  FilePlus2,
  Globe2,
  ImagePlus,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { AiProposal, Brand, BrandMetadata, ProviderStatus, SourceRecord } from "../types";
import { AssetImage } from "../components/AssetImage";
import { Chip, Disclosure, Panel } from "./primitives";

type BrandIntakeProps = {
  brands: BrandMetadata[];
  brand: Brand | null;
  selectedSourceId: string | null;
  busy: string | null;
  providers: ProviderStatus[];
  provider: string;
  proposal: AiProposal | null;
  onSelectBrand: (slug: string) => void;
  onCreateBrand: (slug: string, name: string) => Promise<unknown>;
  onDeleteBrand: (slug: string) => void;
  onSelectSource: (sourceId: string) => void;
  onUploadFiles: (files: FileList) => void;
  onUploadAssets: (files: FileList, role: "image" | "logo") => void;
  onAddUrl: (url: string) => Promise<unknown>;
  onDeleteSource: (sourceId: string) => void;
  onAnalyzeSource: (sourceId: string) => void;
  onProviderChange: (provider: string) => void;
  onApplyProposal: () => void;
  onRejectProposal: () => void;
};

export function BrandIntake({
  brands,
  brand,
  selectedSourceId,
  busy,
  providers,
  provider,
  proposal,
  onSelectBrand,
  onCreateBrand,
  onDeleteBrand,
  onSelectSource,
  onUploadFiles,
  onUploadAssets,
  onAddUrl,
  onDeleteSource,
  onAnalyzeSource,
  onProviderChange,
  onApplyProposal,
  onRejectProposal,
}: BrandIntakeProps) {
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [url, setUrl] = useState("");
  const sources = brand?.sources ?? [];
  const activeSource = useMemo(
    () => sources.find((source) => source.id === selectedSourceId) ?? sources[0],
    [selectedSourceId, sources],
  );

  async function handleCreate() {
    const name = newName.trim();
    const slug = (newSlug.trim() || slugify(name)).toLowerCase();
    if (!name || !slug) {
      return;
    }
    const result = await onCreateBrand(slug, name);
    if (result !== undefined) {
      setNewName("");
      setNewSlug("");
    }
  }

  async function handleUrlAdd() {
    const nextUrl = url.trim();
    if (!nextUrl) {
      return;
    }
    const result = await onAddUrl(nextUrl);
    if (result !== undefined) {
      setUrl("");
    }
  }

  return (
    <div className="stage-grid intake-grid" data-workbench-stage="Add your brand">
      <Panel title="Your brands" eyebrow="Pick one or start fresh">
        <div className="brand-switcher">
          {brands.map((item) => (
            <button
              aria-current={item.slug === brand?.metadata.slug ? "true" : undefined}
              aria-label={`${item.name}, version ${item.version}`}
              className={`brand-pill${item.slug === brand?.metadata.slug ? " is-active" : ""}`}
              key={item.slug}
              type="button"
              onClick={() => onSelectBrand(item.slug)}
            >
              <span>{item.name}</span>
              <small>v{item.version}</small>
            </button>
          ))}
        </div>

        <Disclosure title="Create brand">
          <p className="panel-hint">
            A new brand starts complete: every standard rule and component is filled in from day one.
          </p>
          <form
            className="inline-fields"
            onSubmit={(event) => {
              event.preventDefault();
              void handleCreate();
            }}
          >
            <label>
              <span>Name</span>
              <input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Acme Studio" />
            </label>
            <label>
              <span>Slug (lowercase letters, numbers, hyphens)</span>
              <input value={newSlug} onChange={(event) => setNewSlug(event.target.value)} placeholder="acme-studio" />
            </label>
            <button className="primary-action" type="submit" disabled={busy !== null || !newName.trim()}>
              <Plus size={16} />
              Create
            </button>
          </form>
        </Disclosure>

        {brand && brand.metadata.slug !== "seed" ? (
          <button className="subtle-danger-action" type="button" onClick={() => onDeleteBrand(brand.metadata.slug)}>
            <Trash2 size={15} />
            Delete brand
          </button>
        ) : null}
      </Panel>

      <Panel title="Add anything you have" eyebrow="Files, pictures, links, notes">
        <div className="upload-grid" data-source-upload-area>
          <label className="upload-tile">
            <FilePlus2 size={18} />
            <span>Guidelines</span>
            <small>PDF, text, markdown, docs</small>
            <input
              aria-label="Upload brand guideline files (PDF, text, markdown, docs)"
              multiple
              type="file"
              onChange={(event) => {
                if (event.target.files) onUploadFiles(event.target.files);
                event.currentTarget.value = "";
              }}
            />
          </label>
          <label className="upload-tile">
            <ImagePlus size={18} />
            <span>Pictures</span>
            <small>We read the colors out of them</small>
            <input
              aria-label="Upload brand pictures (PNG, JPG, SVG, WebP)"
              multiple
              type="file"
              accept="image/*,.svg"
              onChange={(event) => {
                if (event.target.files) onUploadAssets(event.target.files, "image");
                event.currentTarget.value = "";
              }}
            />
          </label>
          <label className="upload-tile">
            <UploadCloud size={18} />
            <span>Logo</span>
            <small>Becomes your brand mark</small>
            <input
              aria-label="Upload the brand logo"
              multiple
              type="file"
              accept="image/*,.svg"
              onChange={(event) => {
                if (event.target.files) onUploadAssets(event.target.files, "logo");
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>

        <form
          className="url-ingest"
          onSubmit={(event) => {
            event.preventDefault();
            void handleUrlAdd();
          }}
        >
          <Globe2 size={16} />
          <input
            aria-label="Brand guide URL"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://brand.example/guidelines"
          />
          <button className="ghost-action" type="submit" disabled={busy !== null || !url.trim()}>
            Add
          </button>
        </form>
      </Panel>

      <Panel title="What you've added" eyebrow={`${sources.length} loaded`}>
        <div className="source-stack intake-sources">
          {sources.map((source) => (
            <SourceCard
              busy={busy}
              key={source.id}
              source={source}
              selected={source.id === activeSource?.id}
              onAnalyze={() => onAnalyzeSource(source.id)}
              onDelete={() => onDeleteSource(source.id)}
              onSelect={() => onSelectSource(source.id)}
            />
          ))}
        </div>
      </Panel>

      <Panel title="Turn sources into your system" eyebrow="Nothing changes until you approve">
        <div className="review-queue-panel" data-review-queue>
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

          {activeSource ? (
            <div className="review-source">
              <strong>{activeSource.name}</strong>
              <small>{activeSource.kind}</small>
              <button
                className="primary-action"
                type="button"
                onClick={() => onAnalyzeSource(activeSource.id)}
                disabled={busy === `analyze:${activeSource.id}`}
              >
                {busy === `analyze:${activeSource.id}` ? <Loader2 className="spin" size={15} /> : <Sparkles size={15} />}
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
              <span>Pick a source above and press “Extract proposals” — we'll suggest colors, type, and rules for you to approve.</span>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}

type SourceCardProps = {
  source: SourceRecord;
  selected: boolean;
  busy: string | null;
  onSelect: () => void;
  onDelete: () => void;
  onAnalyze: () => void;
};

function SourceCard({ source, selected, busy, onSelect, onDelete, onAnalyze }: SourceCardProps) {
  const assetUrl = typeof source.metadata?.asset_url === "string" ? source.metadata.asset_url : undefined;
  const isWorking = busy === `analyze:${source.id}`;
  const understoodColors = extractedColors(source);
  return (
    <article className={`source-card${selected ? " is-selected" : ""}`} data-source-card>
      <button aria-label={`Select source ${source.name}`} className="source-card-main" type="button" onClick={onSelect}>
        {assetUrl ? <AssetImage className="source-thumb" src={assetUrl} alt={source.name} /> : <span className="source-thumb">{kindInitial(source.kind)}</span>}
        <span>
          <strong>{source.name}</strong>
          <small>{source.kind}</small>
        </span>
      </button>
      <div className="source-card-actions">
        <Chip>{source.kind}</Chip>
        <button className="icon-action" type="button" onClick={onAnalyze} aria-label={`Analyze ${source.name}`} disabled={isWorking}>
          {isWorking ? <Loader2 className="spin" size={15} /> : <Sparkles size={15} />}
        </button>
        {source.kind !== "seed" ? (
          <button className="icon-action" type="button" onClick={onDelete} aria-label={`Delete ${source.name}`}>
            <Trash2 size={15} />
          </button>
        ) : null}
      </div>
      {understoodColors.length ? (
        <div className="understood-row">
          <span>We found these colors:</span>
          <span className="understood-swatches" aria-hidden="true">
            {understoodColors.slice(0, 6).map((hex) => (
              <span key={hex} style={{ background: hex }} title={hex} />
            ))}
          </span>
        </div>
      ) : null}
      <Disclosure title="Details">
        <p className="source-detail-text">{source.text || "Image asset metadata only."}</p>
      </Disclosure>
    </article>
  );
}

export function extractedColors(source: SourceRecord): string[] {
  const raw = source.metadata?.extracted_colors;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((item): item is string => typeof item === "string" && /^#[0-9A-Fa-f]{6}$/.test(item));
}

function pluralize(count: number, singular: string, plural?: string): string {
  return `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function kindInitial(kind: string): string {
  return kind.slice(0, 1).toUpperCase() || "S";
}
