import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addUrl,
  applyDrafts,
  applyPatch,
  completeInventory,
  createBrand,
  createCreation,
  deleteBrand,
  deleteCreation,
  deleteSource,
  exportCreation,
  extractFromSource,
  generate,
  getBrand,
  getCreation,
  getStatus,
  getTemplates,
  listBrands,
  listCreations,
  proposeEdit,
  saveCreation,
  saveRaw,
  setRuleStatus,
  undo,
  undoCreation,
  uploadAssets,
  uploadFiles,
} from "../api";
import { cloneBrandWithInventory, getDesignInventory } from "../app/inventory";
import type {
  AiProposal,
  Brand,
  BrandMetadata,
  BrandPayload,
  CompletionSummary,
  Creation,
  CreationMeta,
  DesignComponent,
  ProviderStatus,
  Rule,
  SpecPropValue,
  TemplateLibrary,
} from "../types";
import { EditorDock } from "./EditorDock";
import { ComponentListField, type StepId } from "./model";
import { SystemCanvas } from "./SystemCanvas";

type Toast = {
  id: number;
  kind: "success" | "failure";
  text: string;
  actionLabel?: string;
  onAction?: () => void;
};

const SUCCESS_TOAST_MS = 6000;
const SAVE_DEBOUNCE_MS = 700;

export type SpecSaveState = "idle" | "pending" | "saving" | "saved" | "error";

export function WorkbenchApp() {
  const [brands, setBrands] = useState<BrandMetadata[]>([]);
  const [payload, setPayload] = useState<BrandPayload | null>(null);
  const [activeStep, setActiveStep] = useState<StepId>("brand");
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [provider, setProvider] = useState("codex");
  const [proposal, setProposal] = useState<AiProposal | null>(null);
  const [revise, setRevise] = useState<AiProposal | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dockOpen, setDockOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<BrandMetadata | null>(null);
  const [specSaveState, setSpecSaveState] = useState<SpecSaveState>("idle");
  const [library, setLibrary] = useState<TemplateLibrary | null>(null);
  const [creations, setCreations] = useState<CreationMeta[]>([]);
  const [activeCreation, setActiveCreation] = useState<Creation | null>(null);
  const [creationArtifactUrl, setCreationArtifactUrl] = useState<string | null>(null);
  const [previewNonce, setPreviewNonce] = useState(0);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [creationSaveState, setCreationSaveState] = useState<SpecSaveState>("idle");
  const toastId = useRef(0);
  const toastTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const payloadRef = useRef<BrandPayload | null>(null);
  const specSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const specEditSeq = useRef(0);
  const creationRef = useRef<Creation | null>(null);
  const creationSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const creationEditSeq = useRef(0);
  payloadRef.current = payload;
  creationRef.current = activeCreation;

  const brand = payload?.brand ?? null;
  const inventory = useMemo(
    () => (payload ? getDesignInventory(payload.brand, payload.completeness) : null),
    [payload],
  );
  const artifacts = payload?.artifacts ?? null;
  const report = payload?.report ?? null;
  const sources = brand?.sources ?? [];

  const selectedComponent = useMemo(
    () => inventory?.components.find((component) => component.id === selectedComponentId) ?? inventory?.components[0] ?? null,
    [inventory, selectedComponentId],
  );
  const selectedRule = useMemo(
    () => brand?.rules.find((rule) => rule.id === selectedRuleId) ?? null,
    [brand, selectedRuleId],
  );
  const selectedSection = useMemo(
    () => activeCreation?.sections.find((section) => section.id === selectedSectionId) ?? null,
    [activeCreation, selectedSectionId],
  );
  const sectionSkeleton = useMemo(() => {
    if (!activeCreation || !selectedSection || !library) return null;
    return (
      library.skeletons[activeCreation.type]?.find((skeleton) => skeleton.id === selectedSection.skeleton) ?? null
    );
  }, [activeCreation, selectedSection, library]);

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
    const [nextPayload, creationList] = await Promise.all([getBrand(slug), listCreations(slug)]);
    setPayload(nextPayload);
    setSelectedSourceId(nextPayload.brand.sources[0]?.id ?? null);
    const nextInventory = getDesignInventory(nextPayload.brand, nextPayload.completeness);
    setSelectedComponentId(nextInventory.components[0]?.id ?? null);
    setSelectedRuleId(null);
    setCreations(creationList.creations);
    setActiveCreation(null);
    setCreationArtifactUrl(null);
    setSelectedSectionId(null);
    setCreationSaveState("idle");
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setBusy("boot");
      try {
        const [status, brandList, templates] = await Promise.all([getStatus(), listBrands(), getTemplates()]);
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
        setLibrary(templates);
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

  useEffect(
    () => () => {
      if (specSaveTimer.current) clearTimeout(specSaveTimer.current);
      if (creationSaveTimer.current) clearTimeout(creationSaveTimer.current);
    },
    [],
  );

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
    void runBusy(`brand:${slug}`, async () => {
      await flushPendingSpecSave();
      await flushPendingCreationSave();
      await loadBrandPayload(slug);
    });
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
      "Brand created — every standard rule and component is already in place",
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
      files.length === 1 ? "Added — check what we understood below" : `${files.length} sources added`,
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
      role === "logo" ? "Logo loaded" : "Pictures added — we read the colors out of them",
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
      "Link added",
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
      "Proposal ready — approve it to make it part of your brand",
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
      "Approved — your brand just learned something new",
    );
  }

  function handleProposeRevise(componentId: string, command: string) {
    if (!brand) return;
    void runBusy(
      "revise-propose",
      async () => {
        const result = await proposeEdit(brand.metadata.slug, command, provider, componentId);
        setRevise(result.proposal);
      },
      "Suggestion ready — apply it if you like it",
    );
  }

  function handleApplyRevise() {
    if (!brand || !revise) return;
    void runBusy(
      "revise-apply",
      async () => {
        const nextPayload = await applyPatch(
          brand.metadata.slug,
          revise.patch ?? [],
          revise.summary ?? "Component change",
        );
        setPayload(nextPayload);
        setRevise(null);
      },
      "Done — the change is in",
      { label: "Undo", run: handleUndo },
    );
  }

  function handleGenerate() {
    if (!brand || !payload) return;
    void runBusy(
      "generate",
      async () => {
        const result = await generate(brand.metadata.slug);
        setPayload({ ...payload, ...result });
        setPreviewNonce((nonce) => nonce + 1);
      },
      "Everything regenerated",
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

  function handleCompleteSystem() {
    if (!brand) return;
    void runBusy("complete-system", async () => {
      const result = await completeInventory(brand.metadata.slug);
      setPayload(result);
      pushToast({ kind: "success", text: completionMessage(result.completion) });
    });
  }

  function handleUpdateComponent(componentId: string, patch: Partial<DesignComponent>) {
    saveInventoryEdit((draftBrand) => {
      const nextInventory = getDesignInventory(draftBrand, payload?.completeness ?? []);
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
      const nextInventory = getDesignInventory(draftBrand, payload?.completeness ?? []);
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

  // ——— Debounced whole-brand saves (component specs AND style tokens) ———
  // Optimistic: the UI repaints immediately, the save happens quietly, and a
  // sequence counter drops stale responses so fast edits never get clobbered.

  function scheduleBrandSave() {
    if (specSaveTimer.current) clearTimeout(specSaveTimer.current);
    specSaveTimer.current = setTimeout(() => {
      specSaveTimer.current = null;
      void flushSpecSave();
    }, SAVE_DEBOUNCE_MS);
  }

  function handleUpdateComponentSpec(componentId: string, prop: string, value: SpecPropValue) {
    specEditSeq.current += 1;
    setSpecSaveState("pending");
    setPayload((current) => {
      if (!current) return current;
      const nextInventory = getDesignInventory(current.brand, current.completeness);
      nextInventory.components = nextInventory.components.map((component) =>
        component.id === componentId
          ? {
              ...component,
              spec: {
                preview: component.spec?.preview ?? "generic",
                props: { ...(component.spec?.props ?? {}), [prop]: value },
              },
            }
          : component,
      );
      return { ...current, brand: cloneBrandWithInventory(current.brand, nextInventory) };
    });
    scheduleBrandSave();
  }

  function handleUpdateToken(path: string[], value: unknown) {
    specEditSeq.current += 1;
    setSpecSaveState("pending");
    setPayload((current) => {
      if (!current) return current;
      const nextBrand = structuredClone(current.brand);
      let cursor: Record<string, unknown> = nextBrand.tokens as unknown as Record<string, unknown>;
      for (const part of path.slice(0, -1)) {
        const next = cursor[part];
        if (!next || typeof next !== "object") return current;
        cursor = next as Record<string, unknown>;
      }
      cursor[path[path.length - 1]] = value;
      return { ...current, brand: nextBrand };
    });
    scheduleBrandSave();
  }

  async function flushSpecSave(): Promise<void> {
    const current = payloadRef.current;
    if (!current) return;
    const seq = specEditSeq.current;
    setSpecSaveState("saving");
    try {
      const next = await saveRaw(current.brand.metadata.slug, current.brand);
      if (specEditSeq.current === seq) {
        setPayload(next);
        setSpecSaveState("saved");
        setPreviewNonce((nonce) => nonce + 1);
      } else if (!specSaveTimer.current) {
        scheduleBrandSave();
      }
    } catch (err) {
      setSpecSaveState("error");
      pushToast({ kind: "failure", text: errorMessage(err) });
    }
  }

  async function flushPendingSpecSave(): Promise<void> {
    if (specSaveTimer.current) {
      clearTimeout(specSaveTimer.current);
      specSaveTimer.current = null;
      await flushSpecSave();
    }
  }

  // ——— Creations: same optimistic + debounced pattern, separate pipeline ———

  function editCreation(mutator: (draft: Creation) => Creation) {
    creationEditSeq.current += 1;
    setCreationSaveState("pending");
    setActiveCreation((current) => (current ? mutator(structuredClone(current)) : current));
    if (creationSaveTimer.current) clearTimeout(creationSaveTimer.current);
    creationSaveTimer.current = setTimeout(() => {
      creationSaveTimer.current = null;
      void flushCreationSave();
    }, SAVE_DEBOUNCE_MS);
  }

  async function flushCreationSave(): Promise<void> {
    const current = creationRef.current;
    const slug = payloadRef.current?.brand.metadata.slug;
    if (!current || !slug) return;
    const seq = creationEditSeq.current;
    setCreationSaveState("saving");
    try {
      const result = await saveCreation(slug, current);
      if (creationEditSeq.current === seq) {
        setActiveCreation(result.creation);
        setCreationArtifactUrl(result.artifact_url);
        setPreviewNonce((nonce) => nonce + 1);
        setCreationSaveState("saved");
        setCreations((list) =>
          list.map((meta) =>
            meta.id === result.creation.id
              ? {
                  ...meta,
                  name: result.creation.name,
                  version: result.creation.version,
                  updated_at: result.creation.updated_at,
                  section_count: result.creation.sections.length,
                }
              : meta,
          ),
        );
      } else if (!creationSaveTimer.current) {
        creationSaveTimer.current = setTimeout(() => {
          creationSaveTimer.current = null;
          void flushCreationSave();
        }, SAVE_DEBOUNCE_MS);
      }
    } catch (err) {
      setCreationSaveState("error");
      pushToast({ kind: "failure", text: errorMessage(err) });
    }
  }

  async function flushPendingCreationSave(): Promise<void> {
    if (creationSaveTimer.current) {
      clearTimeout(creationSaveTimer.current);
      creationSaveTimer.current = null;
      await flushCreationSave();
    }
  }

  function handleNewCreation(name: string, templateId: string, pasteText: string) {
    if (!brand) return Promise.resolve(undefined);
    return runBusy(
      "new-creation",
      async () => {
        const result = await createCreation(brand.metadata.slug, name, templateId, pasteText);
        setActiveCreation(result.creation);
        setCreationArtifactUrl(result.artifact_url);
        setPreviewNonce((nonce) => nonce + 1);
        setSelectedSectionId(result.creation.sections[0]?.id ?? null);
        setCreationSaveState("idle");
        setCreations((list) => [
          {
            id: result.creation.id,
            name: result.creation.name,
            type: result.creation.type,
            template_id: result.creation.template_id,
            version: result.creation.version,
            updated_at: result.creation.updated_at,
            section_count: result.creation.sections.length,
          },
          ...list,
        ]);
        return true;
      },
      "Made it — edit any part on the right",
    );
  }

  function handleOpenCreation(creationId: string) {
    if (!brand) return;
    void runBusy(`open-creation:${creationId}`, async () => {
      const result = await getCreation(brand.metadata.slug, creationId);
      setActiveCreation(result.creation);
      setCreationArtifactUrl(result.artifact_url);
      setPreviewNonce((nonce) => nonce + 1);
      setSelectedSectionId(result.creation.sections[0]?.id ?? null);
      setCreationSaveState("idle");
    });
  }

  function handleCloseCreation() {
    void (async () => {
      await flushPendingCreationSave();
      setActiveCreation(null);
      setCreationArtifactUrl(null);
      setSelectedSectionId(null);
      setCreationSaveState("idle");
    })();
  }

  function handleDeleteCreation(creationId: string) {
    if (!brand) return;
    const meta = creations.find((item) => item.id === creationId);
    void runBusy(
      `delete-creation:${creationId}`,
      async () => {
        const result = await deleteCreation(brand.metadata.slug, creationId);
        setCreations(result.creations);
        if (activeCreation?.id === creationId) {
          setActiveCreation(null);
          setCreationArtifactUrl(null);
          setSelectedSectionId(null);
        }
      },
      meta ? `Deleted "${meta.name}"` : "Design deleted",
    );
  }

  function handleUndoCreation() {
    if (!brand || !activeCreation) return;
    void runBusy(
      "creation-undo",
      async () => {
        await flushPendingCreationSave();
        const result = await undoCreation(brand.metadata.slug, activeCreation.id);
        creationEditSeq.current += 1;
        setActiveCreation(result.creation);
        setCreationArtifactUrl(result.artifact_url);
        setPreviewNonce((nonce) => nonce + 1);
        setCreationSaveState("idle");
      },
      "Went back one step",
    );
  }

  function handleExportPptx() {
    if (!brand || !activeCreation) return;
    void runBusy(
      "export-pptx",
      async () => {
        await flushPendingCreationSave();
        const result = await exportCreation(brand.metadata.slug, activeCreation.id);
        window.open(result.url, "_blank", "noreferrer");
      },
      "PowerPoint ready — it's downloading now",
    );
  }

  function handleAddSection(skeletonId: string) {
    if (!activeCreation || !library) return;
    const skeleton = library.skeletons[activeCreation.type]?.find((item) => item.id === skeletonId);
    if (!skeleton) return;
    const sectionId = `s-${randomSuffix(6)}`;
    editCreation((draft) => ({
      ...draft,
      sections: [
        ...draft.sections,
        {
          id: sectionId,
          skeleton: skeletonId,
          content: structuredClone(skeleton.defaults) as Record<string, unknown>,
          overrides: { ...skeleton.overrides },
        },
      ],
    }));
    setSelectedSectionId(sectionId);
  }

  function handleRemoveSection(sectionId: string) {
    if (!activeCreation || activeCreation.sections.length <= 1) return;
    editCreation((draft) => ({
      ...draft,
      sections: draft.sections.filter((section) => section.id !== sectionId),
    }));
    if (selectedSectionId === sectionId) {
      setSelectedSectionId(null);
    }
  }

  function handleMoveSection(sectionId: string, direction: -1 | 1) {
    editCreation((draft) => {
      const index = draft.sections.findIndex((section) => section.id === sectionId);
      const target = index + direction;
      if (index === -1 || target < 0 || target >= draft.sections.length) return draft;
      const sections = [...draft.sections];
      const [moved] = sections.splice(index, 1);
      sections.splice(target, 0, moved);
      return { ...draft, sections };
    });
  }

  function handleUpdateSectionContent(sectionId: string, slot: string, value: unknown) {
    editCreation((draft) => ({
      ...draft,
      sections: draft.sections.map((section) =>
        section.id === sectionId ? { ...section, content: { ...section.content, [slot]: value } } : section,
      ),
    }));
  }

  function handleUpdateSectionOverride(sectionId: string, key: string, value: string) {
    editCreation((draft) => ({
      ...draft,
      sections: draft.sections.map((section) =>
        section.id === sectionId ? { ...section, overrides: { ...section.overrides, [key]: value } } : section,
      ),
    }));
  }

  function handleRenameCreation(name: string) {
    editCreation((draft) => ({ ...draft, name }));
  }

  // "Just this design": a whole-design exception keyed "<component_id>.<prop>".
  // Passing null removes the exception (back to the system value).
  function handleSetCreationException(componentId: string, prop: string, value: SpecPropValue | null) {
    editCreation((draft) => {
      const exceptions = { ...(draft.exceptions ?? {}) };
      const key = `${componentId}.${prop}`;
      if (value === null) {
        delete exceptions[key];
      } else {
        exceptions[key] = value;
      }
      return { ...draft, exceptions };
    });
  }

  const saveStateLabel = saveLabel(specSaveState);
  const creationSaveLabel = saveLabel(creationSaveState);

  return (
    <div className="lab-shell" data-creative-brand-lab>
      <a className="skip-link" href="#canvas">
        Skip to canvas
      </a>
      <SystemCanvas
        activeStep={activeStep}
        brand={brand}
        busy={busy}
        checksFailing={report?.summary.failed ?? 0}
        dockOpen={dockOpen}
        intake={{
          brands,
          brand,
          selectedSourceId: selectedSourceId,
          busy,
          providers,
          provider,
          proposal,
          onSelectBrand: selectBrand,
          onCreateBrand: handleCreateBrand,
          onDeleteBrand: handleRequestDeleteBrand,
          onSelectSource: setSelectedSourceId,
          onUploadFiles: handleUploadFiles,
          onUploadAssets: handleUploadAssets,
          onAddUrl: handleAddUrl,
          onDeleteSource: handleDeleteSource,
          onAnalyzeSource: handleAnalyzeSource,
          onProviderChange: setProvider,
          onApplyProposal: handleApplyProposal,
          onRejectProposal: () => {
            setProposal(null);
            pushToast({ kind: "success", text: "Proposal rejected — nothing changed" });
          },
        }}
        lab={
          brand && inventory
            ? {
                brand,
                inventory,
                components: inventory.components,
                rules: brand.rules,
                selectedComponentId: selectedComponent?.id ?? null,
                busy,
                specSaveState,
                reviseProposal: revise,
                onProposeRevise: handleProposeRevise,
                onApplyRevise: handleApplyRevise,
                onSkipRevise: () => setRevise(null),
                onSelectComponent: (componentId: string) => {
                  // A pending suggestion always targets the component it was
                  // written for — never carry it across a selection change.
                  setRevise(null);
                  setSelectedComponentId(componentId);
                },
                onSelectRule: (ruleId) => {
                  setSelectedRuleId(ruleId);
                  setDockOpen(true);
                },
                onCompleteSystem: handleCompleteSystem,
                onUpdateComponent: handleUpdateComponent,
                onUpdateComponentSpec: handleUpdateComponentSpec,
                onToggleComponentValue: handleToggleComponentValue,
              }
            : null
        }
        ready={Boolean(payload && inventory && artifacts && report)}
        studio={
          brand && artifacts
            ? {
                brand,
                library,
                creations,
                activeCreation,
                artifactUrl: creationArtifactUrl,
                previewNonce,
                selectedSectionId,
                busy,
                saveStateLabel: creationSaveLabel,
                artifacts,
                onNewCreation: handleNewCreation,
                onOpenCreation: handleOpenCreation,
                onCloseCreation: handleCloseCreation,
                onDeleteCreation: handleDeleteCreation,
                onRenameCreation: handleRenameCreation,
                onSelectSection: setSelectedSectionId,
                onAddSection: handleAddSection,
                onRemoveSection: handleRemoveSection,
                onMoveSection: handleMoveSection,
                onUndoCreation: handleUndoCreation,
                onExportPptx: handleExportPptx,
                onOpenDock: () => setDockOpen(true),
              }
            : null
        }
        styleSettings={
          brand && report
            ? {
                brand,
                report,
                saveStateLabel,
                onUpdateToken: handleUpdateToken,
                onSetRuleStatus: handleSetRuleStatus,
                onSelectRule: (ruleId) => {
                  setSelectedRuleId(ruleId);
                  setDockOpen(true);
                },
              }
            : null
        }
        onGenerate={handleGenerate}
        onStepChange={(step) => setActiveStep(step)}
        onToggleDock={() => setDockOpen((open) => !open)}
      />
      <button
        aria-label="Close inspector dock"
        className={`dock-backdrop${dockOpen ? " is-open" : ""}`}
        tabIndex={dockOpen ? 0 : -1}
        type="button"
        onClick={() => setDockOpen(false)}
      />
      <EditorDock
        brand={brand}
        brandSaveLabel={saveStateLabel}
        busy={busy}
        creation={activeStep === "make" ? activeCreation : null}
        creationSaveLabel={creationSaveLabel}
        inventory={inventory}
        open={dockOpen}
        overrideChoices={library?.override_choices ?? {}}
        report={report}
        sectionSkeleton={activeStep === "make" ? sectionSkeleton : null}
        selectedRule={selectedRule}
        selectedSection={activeStep === "make" ? selectedSection : null}
        sources={sources}
        onSelectRule={setSelectedRuleId}
        onSetCreationException={handleSetCreationException}
        onSetRuleStatus={handleSetRuleStatus}
        onUndo={handleUndo}
        onUpdateComponentSpec={handleUpdateComponentSpec}
        onUpdateSectionContent={handleUpdateSectionContent}
        onUpdateSectionOverride={handleUpdateSectionOverride}
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

function saveLabel(state: SpecSaveState): string {
  if (state === "pending" || state === "saving") return "Saving…";
  if (state === "saved") return "All changes saved";
  if (state === "error") return "Couldn't save — try again";
  return "Edits save on their own";
}

function completionMessage(completion: CompletionSummary): string {
  const parts: string[] = [];
  if (completion.components_added) {
    parts.push(`${completion.components_added} new component${completion.components_added === 1 ? "" : "s"}`);
  }
  if (completion.rules_added) {
    parts.push(`${completion.rules_added} new rule${completion.rules_added === 1 ? "" : "s"}`);
  }
  if (!parts.length) {
    return "Your system is already complete — nothing was missing.";
  }
  return `Added ${parts.join(" and ")}. Everything a full design system needs is now in place.`;
}

function randomSuffix(length: number): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let index = 0; index < length; index += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}
