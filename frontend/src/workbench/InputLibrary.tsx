import {
  FilePlus2,
  Globe2,
  ImagePlus,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { Brand, BrandMetadata, SourceRecord } from "../types";
import { AssetImage } from "../components/AssetImage";
import { Chip, Disclosure, Panel } from "./primitives";

type InputLibraryProps = {
  brands: BrandMetadata[];
  brand: Brand | null;
  selectedSourceId: string | null;
  busy: string | null;
  onSelectBrand: (slug: string) => void;
  onCreateBrand: (slug: string, name: string) => Promise<unknown>;
  onDeleteBrand: (slug: string) => void;
  onSelectSource: (sourceId: string) => void;
  onUploadFiles: (files: FileList) => void;
  onUploadAssets: (files: FileList, role: "image" | "logo") => void;
  onAddUrl: (url: string) => Promise<unknown>;
  onDeleteSource: (sourceId: string) => void;
  onAnalyzeSource: (sourceId: string) => void;
};

export function InputLibrary({
  brands,
  brand,
  selectedSourceId,
  busy,
  onSelectBrand,
  onCreateBrand,
  onDeleteBrand,
  onSelectSource,
  onUploadFiles,
  onUploadAssets,
  onAddUrl,
  onDeleteSource,
  onAnalyzeSource,
}: InputLibraryProps) {
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
    <aside className="input-library" aria-label="Input Library">
      <Panel title="Input Library" eyebrow="Brand sources">
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

      <Panel title="Load Assets" eyebrow="Specs, logos, images">
        <div className="upload-grid" data-source-upload-area>
          <label className="upload-tile">
            <FilePlus2 size={18} />
            <span>Specs</span>
            <small>PDF, text, markdown, docs</small>
            <input
              aria-label="Upload spec files (PDF, text, markdown, docs)"
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
            <span>Images</span>
            <small>PNG, JPG, SVG, WebP</small>
            <input
              aria-label="Upload brand images (PNG, JPG, SVG, WebP)"
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
            <small>Sets brand mark token</small>
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

      <Panel title="Source Stack" eyebrow={`${sources.length} loaded`}>
        <div className="source-stack">
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
    </aside>
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
      <Disclosure title="Details">
        <p className="source-detail-text">{source.text || "Image asset metadata only."}</p>
      </Disclosure>
    </article>
  );
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
