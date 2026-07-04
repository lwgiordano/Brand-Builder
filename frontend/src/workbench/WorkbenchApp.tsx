import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addUrl,
  applyDrafts,
  createBrand,
  deleteBrand,
  deleteSource,
  extractFromSource,
  generate,
  getBrand,
  getStatus,
  listBrands,
  saveRaw,
  setRuleStatus,
  undo,
  uploadAssets,
  uploadFiles,
} from "../api";
import { cloneBrandWithInventory, getDesignInventory } from "../app/inventory";
import type {
  AiProposal,
  Brand,
  BrandMetadata,
  BrandPayload,
  DesignComponent,
  ProviderStatus,
  Rule,
} from "../types";
import { EditorDock } from "./EditorDock";
import { InputLibrary } from "./InputLibrary";
import { ComponentListField, type StageId } from "./model";
import { SystemCanvas } from "./SystemCanvas";

type Toast = {
  id: number;
  kind: "success" | "failure";
  text: string;
  actionLabel?: string;
  onAction?: () => void;
};

const SUCCESS_TOAST_MS = 6000;

export function WorkbenchApp() {
  const [brands, setBrands] = useState<BrandMetadata[]>([]);
  const [payload, setPayload] = useState<BrandPayload | null>(null);
  const [activeSlug, setActiveSlug] = useState("seed");
  const [activeStage, setActiveStage] = useState<StageId>("overview");
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [provider, setProvider] = useState("codex");
  const [proposal, setProposal] = useState<AiProposal | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dockOpen, setDockOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<BrandMetadata | null>(null);
  const toastId = useRef(0);
  const toastTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const brand = payload?.brand ?? null;
  const inventory = useMemo(
    () => (payload ? getDesignInventory(payload.brand, payload.completeness) : null),
    [payload],
  );
  const artifacts = payload?.artifacts ?? null;
  const report = payload?.report ?? null;
  const completeness = payload?.completeness ?? [];
  const sources = brand?.sources ?? [];

  const selectedSource = useMemo(
    () => sources.find((source) => source.id === selectedSourceId) ?? sources[0] ?? null,
    [selectedSourceId, sources],
  );
  const selectedPack = useMemo(
    () => inventory?.surface_packs.find((pack) => pack.id === selectedPackId) ?? inventory?.surface_packs[0] ?? null,
    [inventory, selectedPackId],
  );
  const selectedComponent = useMemo(
    () => inventory?.components.find((component) => component.id === selectedComponentId) ?? inventory?.components[0] ?? null,
    [inventory, selectedComponentId],
  );
  const selectedRule = useMemo(
    () => brand?.rules.find((rule) => rule.id === selectedRuleId) ?? null,
    [brand, selectedRuleId],
  );

  const dismissToast = useCallback((id: number) => {
    const timer = toastTimers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      toastTimers.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = ++toastId.current;
      setToasts((current) => [...current.filter((item) => item.kind !== "failure" || toast.kind !== "failure"), { ...toast, id }]);
      if (toast.kind === "success") {
        toastTimers.current.set(
          id,
          setTimeout(() => dismissToast(id), SUCCESS_TOAST_MS),
        );
      }
    },
    [dismissToast],
  );

  const pauseToast = useCallback((id: number) => {
    const timer = toastTimers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      toastTimers.current.delete(id);
    }
  }, []);

  const resumeToast = useCallback(
    (id: number, kind: Toast["kind"]) => {
      if (kind !== "success") return;
      toastTimers.current.set(
        id,
        setTimeout(() => dismissToast(id), 2000),
      );
    },
    [dismissToast],
  );

  const loadBrandPayload = useCallback(async (slug: string) => {
    const nextPayload = await getBrand(slug);
    setPayload(nextPayload);
    setActiveSlug(slug);
    setSelectedSourceId(nextPayload.brand.sources[0]?.id ?? null);
    const nextInventory = getDesignInventory(nextPayload.brand, nextPayload.completeness);
    setSelectedPackId(nextInventory.surface_packs[0]?.id ?? null);
    setSelectedComponentId(nextInventory.components[0]?.id ?? null);
    setSelectedRuleId(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setBusy("boot");
      try {
        const [status, brandList] = await Promise.all([getStatus(), listBrands()]);
        if (cancelled) {
          return;
        }
        setProviders(status.providers);
        setProvider((current) => {
          const available = status.providers.find((item) => item.id === current && item.available && item.authenticated);
          if (available) return current;
          const firstUsable = status.providers.find((item) => item.available && item.authenticated);
          return firstUsable?.id ?? status.default_provider ?? status.providers[0]?.id ?? "codex";
        });
        setBrands(brandList.brands);
        const initialSlug = brandList.brands[0]?.slug ?? "seed";
        await loadBrandPayload(initialSlug);
      } catch (err) {
        if (!cancelled) {
          pushToast({ kind: "failure", text: errorMessage(err) });
        }
      } finally {
        if (!cancelled) {
          setBusy(null);
        }
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
    // boot runs once; brand switching goes through selectBrand → loadBrandPayload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!dockOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDockOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dockOpen]);

  async function runBusy<T>(
    key: string,
    action: () => Promise<T>,
    success?: string,
    successAction?: { label: string; run: () => void },
  ): Promise<T | undefined> {
    setBusy(key);
    setToasts((current) => current.filter((toast) => toast.kind !== "failure"));
    try {
      const result = await action();
      if (success) {
        pushToast({ kind: "success", text: success, actionLabel: successAction?.label, onAction: successAction?.run });
      }
      return result;
    } catch (err) {
      pushToast({ kind: "failure", text: errorMessage(err) });
      return undefined;
    } finally {
      setBusy(null);
    }
  }

  function refreshBrandList() {
    return listBrands().then((result) => setBrands(result.brands));
  }

  function selectBrand(slug: string) {
    void runBusy(`brand:${slug}`, () => loadBrandPayload(slug));
  }

  function handleCreateBrand(slug: string, name: string) {
    return runBusy(
      "create-brand",
      async () => {
        await createBrand(slug, name);
        await refreshBrandList();
        await loadBrandPayload(slug);
        return true;
      },
      "Brand created",
    );
  }

  function handleRequestDeleteBrand(slug: string) {
    const candidate = brands.find((item) => item.slug === slug);
    if (candidate) {
      setDeleteCandidate(candidate);
    }
  }

  function handleConfirmDeleteBrand() {
    const candidate = deleteCandidate;
    if (!candidate) return;
    setDeleteCandidate(null);
    void runBusy(
      "delete-brand",
      async () => {
        const result = await deleteBrand(candidate.slug);
        setBrands(result.brands);
        await loadBrandPayload(result.brands[0]?.slug ?? "seed");
      },
      `Deleted "${candidate.name}"`,
    );
  }

  function handleUploadFiles(files: FileList) {
    if (!brand) return;
    void runBusy(
      "upload-files",
      async () => {
        await uploadFiles(brand.metadata.slug, files);
        await loadBrandPayload(brand.metadata.slug);
      },
      files.length === 1 ? "1 spec added to the source stack" : `${files.length} specs added to the source stack`,
    );
  }

  function handleUploadAssets(files: FileList, role: "image" | "logo") {
    if (!brand) return;
    void runBusy(
      `upload-${role}`,
      async () => {
        await uploadAssets(brand.metadata.slug, files, role);
        await loadBrandPayload(brand.metadata.slug);
      },
      role === "logo" ? "Logo asset loaded" : "Image assets loaded",
    );
  }

  function handleAddUrl(url: string) {
    if (!brand) return Promise.resolve(undefined);
    return runBusy(
      "url",
      async () => {
        await addUrl(brand.metadata.slug, url);
        await loadBrandPayload(brand.metadata.slug);
        return true;
      },
      "URL source added",
    );
  }

  function handleDeleteSource(sourceId: string) {
    if (!brand) return;
    const source = brand.sources.find((item) => item.id === sourceId);
    void runBusy(
      `delete-source:${sourceId}`,
      async () => {
        const nextPayload = await deleteSource(brand.metadata.slug, sourceId);
        setPayload(nextPayload);
        setSelectedSourceId(nextPayload.brand.sources[0]?.id ?? null);
      },
      source ? `Removed "${source.name}"` : "Source removed",
      { label: "Undo", run: handleUndo },
    );
  }

  function handleAnalyzeSource(sourceId: string) {
    if (!brand) return;
    setSelectedSourceId(sourceId);
    void runBusy(
      `analyze:${sourceId}`,
      async () => {
        const result = await extractFromSource(brand.metadata.slug, sourceId, provider);
        setProposal(result.proposal);
      },
      "Proposal ready for review",
    );
  }

  function handleApplyProposal() {
    if (!brand || !proposal) return;
    void runBusy(
      "apply-proposal",
      async () => {
        const nextPayload = await applyDrafts(brand.metadata.slug, proposal);
        setPayload(nextPayload);
        setProposal(null);
      },
      "Proposal approved",
    );
  }

  function handleGenerate() {
    if (!brand || !payload) return;
    void runBusy(
      "generate",
      async () => {
        const result = await generate(brand.metadata.slug);
        setPayload({ ...payload, ...result });
      },
      "Artifacts regenerated",
    );
  }

  function handleUndo() {
    if (!brand) return;
    void runBusy(
      "undo",
      async () => {
        const nextPayload = await undo(brand.metadata.slug);
        setPayload(nextPayload);
      },
      "Restored previous version",
    );
  }

  function handleSetRuleStatus(ruleId: string, status: Rule["status"]) {
    if (!brand) return;
    setSelectedRuleId(ruleId);
    void runBusy(
      `rule:${ruleId}`,
      async () => {
        const nextPayload = await setRuleStatus(brand.metadata.slug, ruleId, status);
        setPayload(nextPayload);
      },
      `Rule moved to ${status}`,
    );
  }

  function handleUpdateComponent(componentId: string, patch: Partial<DesignComponent>) {
    saveInventoryEdit((draftBrand) => {
      const nextInventory = getDesignInventory(draftBrand, completeness);
      nextInventory.components = nextInventory.components.map((component) =>
        component.id === componentId ? { ...component, ...patch } : component,
      );
      return cloneBrandWithInventory(draftBrand, nextInventory);
    }, "Component updated");
  }

  function handleToggleComponentValue(componentId: string, field: ComponentListField, value: string) {
    if (!brand) return;
    if (field === "surfaces") {
      const component = inventory?.components.find((item) => item.id === componentId);
      const current = (component?.surfaces ?? []) as string[];
      if (current.length === 1 && current.includes(value)) {
        pushToast({ kind: "failure", text: "A component needs at least one surface." });
        return;
      }
    }
    saveInventoryEdit((draftBrand) => {
      const nextInventory = getDesignInventory(draftBrand, completeness);
      nextInventory.components = nextInventory.components.map((component) => {
        if (component.id !== componentId) {
          return component;
        }
        const current = (component[field] ?? []) as string[];
        const nextValues = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
        return { ...component, [field]: nextValues };
      });
      return cloneBrandWithInventory(draftBrand, nextInventory);
    }, "Component updated");
  }

  function saveInventoryEdit(mutator: (draftBrand: Brand) => Brand, success: string) {
    if (!brand) return;
    void runBusy(
      "save-inventory",
      async () => {
        const nextBrand = mutator(structuredClone(brand));
        const nextPayload = await saveRaw(brand.metadata.slug, nextBrand);
        setPayload(nextPayload);
      },
      success,
    );
  }

  return (
    <div className="lab-shell" data-creative-brand-lab>
      <a className="skip-link" href="#canvas">
        Skip to canvas
      </a>
      <InputLibrary
        brands={brands}
        brand={brand}
        busy={busy}
        selectedSourceId={selectedSource?.id ?? null}
        onAddUrl={handleAddUrl}
        onAnalyzeSource={handleAnalyzeSource}
        onCreateBrand={handleCreateBrand}
        onDeleteBrand={handleRequestDeleteBrand}
        onDeleteSource={handleDeleteSource}
        onSelectBrand={selectBrand}
        onSelectSource={setSelectedSourceId}
        onUploadAssets={handleUploadAssets}
        onUploadFiles={handleUploadFiles}
      />
      <SystemCanvas
        activeStage={activeStage}
        artifacts={artifacts}
        brand={brand}
        busy={busy}
        completeness={completeness}
        dockOpen={dockOpen}
        inventory={inventory}
        report={report}
        selectedComponentId={selectedComponent?.id ?? null}
        selectedPackId={selectedPack?.id ?? null}
        selectedRuleId={selectedRule?.id ?? null}
        onGenerate={handleGenerate}
        onSelectComponent={(componentId) => {
          setSelectedComponentId(componentId);
          setActiveStage("component-lab");
        }}
        onSelectPack={(packId) => {
          setSelectedPackId(packId);
          setActiveStage("surface-packs");
        }}
        onSelectRule={(ruleId) => setSelectedRuleId(ruleId)}
        onSetRuleStatus={handleSetRuleStatus}
        onStageChange={setActiveStage}
        onToggleDock={() => setDockOpen((open) => !open)}
      />
      <button
        aria-label="Close review dock"
        className={`dock-backdrop${dockOpen ? " is-open" : ""}`}
        tabIndex={dockOpen ? 0 : -1}
        type="button"
        onClick={() => setDockOpen(false)}
      />
      <EditorDock
        brand={brand}
        busy={busy}
        inventory={inventory}
        open={dockOpen}
        proposal={proposal}
        provider={provider}
        providers={providers}
        selectedComponent={selectedComponent}
        selectedPack={selectedPack}
        selectedRule={selectedRule}
        selectedSource={selectedSource}
        sources={sources}
        onAnalyzeSource={handleAnalyzeSource}
        onApplyProposal={handleApplyProposal}
        onProviderChange={setProvider}
        onRejectProposal={() => {
          setProposal(null);
          pushToast({ kind: "success", text: "Proposal rejected — nothing changed" });
        }}
        onSetRuleStatus={handleSetRuleStatus}
        onToggleComponentValue={handleToggleComponentValue}
        onUndo={handleUndo}
        onUpdateComponent={handleUpdateComponent}
      />

      <div className="toast-layer">
        {toasts.map((toast) => (
          <div
            className={`toast toast-${toast.kind}`}
            key={toast.id}
            role={toast.kind === "failure" ? "alert" : "status"}
            onMouseEnter={() => pauseToast(toast.id)}
            onMouseLeave={() => resumeToast(toast.id, toast.kind)}
          >
            <span>{toast.text}</span>
            {toast.onAction ? (
              <button
                className="toast-action"
                type="button"
                onClick={() => {
                  toast.onAction?.();
                  dismissToast(toast.id);
                }}
              >
                {toast.actionLabel ?? "Undo"}
              </button>
            ) : null}
            <button aria-label="Dismiss notification" className="toast-dismiss" type="button" onClick={() => dismissToast(toast.id)}>
              ×
            </button>
          </div>
        ))}
      </div>

      {deleteCandidate ? (
        <DeleteBrandDialog
          brand={deleteCandidate}
          onCancel={() => setDeleteCandidate(null)}
          onConfirm={handleConfirmDeleteBrand}
        />
      ) : null}
    </div>
  );
}

function DeleteBrandDialog({
  brand,
  onCancel,
  onConfirm,
}: {
  brand: BrandMetadata;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [typed, setTyped] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCancel();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  const armed = typed.trim() === brand.slug;

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onCancel}>
      <div
        aria-labelledby="delete-brand-title"
        className="confirm-dialog"
        role="alertdialog"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="delete-brand-title">Delete “{brand.name}”?</h2>
        <p>
          This permanently removes the brand, its version history, and its sources. It cannot be
          undone.
        </p>
        <p>
          Type <strong>{brand.slug}</strong> to confirm:
        </p>
        <input
          aria-label={`Type ${brand.slug} to confirm deletion`}
          ref={inputRef}
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
        />
        <div className="review-actions">
          <button className="ghost-action" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="danger-action" disabled={!armed} type="button" onClick={onConfirm}>
            Delete brand
          </button>
        </div>
      </div>
    </div>
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
