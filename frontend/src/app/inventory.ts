import type {
  Artifacts,
  Brand,
  CompletenessLeaf,
  DesignComponent,
  DesignInventory,
  DesignOutput,
  EvidenceRef,
  Rule,
  SurfacePack,
} from "../types";

export const SURFACE_PACK_ORDER = [
  "slides",
  "documents",
  "reports",
  "dashboards",
  "web",
  "marketing",
] as const;

const DEFAULT_SURFACE_PACKS: SurfacePack[] = [
  {
    id: "slides",
    label: "Slides",
    description: "Deck layouts, charts, callouts, and narrative structure.",
    surfaces: ["slides", "presentation"],
    outputs: ["slides"],
    status: "draft",
    required: true,
  },
  {
    id: "documents",
    label: "Documents / PDF",
    description: "Long-form pages, PDF reports, cover sheets, and text systems.",
    surfaces: ["documents", "pdf", "print"],
    outputs: ["styleguide", "pdf"],
    status: "partial",
    required: true,
  },
  {
    id: "reports",
    label: "Reports",
    description: "Executive summaries, evidence tables, and insight modules.",
    surfaces: ["reports", "analytics"],
    outputs: ["report"],
    status: "partial",
  },
  {
    id: "dashboards",
    label: "Dashboards",
    description: "Product shells, filters, cards, tables, and dense data views.",
    surfaces: ["dashboard", "product"],
    outputs: ["dashboard"],
    status: "partial",
  },
  {
    id: "web",
    label: "Web",
    description: "Responsive navigation, hero sections, proof, and CTA blocks.",
    surfaces: ["web", "responsive"],
    outputs: ["styleguide"],
    status: "draft",
    required: true,
  },
  {
    id: "marketing",
    label: "Marketing",
    description: "Campaign modules, social/email blocks, and branded promos.",
    surfaces: ["marketing", "campaigns"],
    outputs: ["marketing"],
    status: "partial",
  },
];

const DEFAULT_COMPONENTS: DesignComponent[] = [
  {
    id: "foundation-color-system",
    name: "Color System",
    category: "foundation",
    surfaces: [...SURFACE_PACK_ORDER],
    purpose: "Translate brand colors into reusable semantic roles.",
    anatomy: ["background", "surface", "text", "muted", "border", "accent"],
    states: ["default", "success", "warning", "danger"],
    variants: ["light"],
    token_refs: ["tokens.colors"],
    rules: ["color"],
    examples: ["Palette swatches"],
    status: "draft",
    evidence_refs: [],
  },
  {
    id: "foundation-typography-system",
    name: "Typography System",
    category: "foundation",
    surfaces: [...SURFACE_PACK_ORDER],
    purpose: "Define readable type roles for headings, body, captions, and UI.",
    anatomy: ["family", "scale", "weights", "line heights"],
    states: ["display", "heading", "body", "caption"],
    variants: ["editorial", "interface"],
    token_refs: ["tokens.typography"],
    rules: ["typography"],
    examples: ["Type specimens"],
    status: "draft",
    evidence_refs: [],
  },
  {
    id: "component-cards",
    name: "Content Cards",
    category: "component",
    surfaces: [...SURFACE_PACK_ORDER],
    purpose: "Frame summaries, stats, sources, previews, and editor modules.",
    anatomy: ["surface", "title", "supporting text", "metadata", "actions"],
    states: ["default", "selected", "warning"],
    variants: ["metric", "source", "preview", "editor"],
    token_refs: ["tokens.colors.surface", "tokens.spacing.card_padding", "tokens.radii.card"],
    rules: ["component", "spacing"],
    examples: ["Metric card", "source card"],
    status: "partial",
    evidence_refs: [],
  },
  {
    id: "surface-slide-layouts",
    name: "Slide Layouts",
    category: "surface",
    surfaces: ["slides"],
    purpose: "Generate deck-ready title, section, content, comparison, and closing layouts.",
    anatomy: ["safe zone", "headline", "body", "media", "footer"],
    states: ["title", "section", "content", "comparison"],
    variants: ["editorial", "data-heavy"],
    token_refs: ["tokens.colors", "tokens.typography", "tokens.spacing.slide_safe_zone"],
    rules: ["slide"],
    examples: ["Title slide", "content slide"],
    status: "draft",
    evidence_refs: [],
  },
];

const DEFAULT_OUTPUTS: DesignOutput[] = [
  {
    id: "slides",
    label: "Slide Deck",
    type: "slides",
    surface_pack_id: "slides",
    status: "available",
    artifact_key: "slides",
    description: "Generated deck HTML supported today.",
  },
  {
    id: "styleguide",
    label: "Styleguide",
    type: "web",
    surface_pack_id: "web",
    status: "available",
    artifact_key: "styleguide",
    description: "Generated visual styleguide supported today.",
  },
  {
    id: "landing",
    label: "Landing Page",
    type: "web",
    surface_pack_id: "web",
    status: "available",
    artifact_key: "landing",
    description: "Generated landing page assembled from your components.",
  },
  {
    id: "computed",
    label: "Computed Tokens",
    type: "data",
    surface_pack_id: "web",
    status: "available",
    artifact_key: "computed",
    description: "Machine-readable token payload.",
  },
  {
    id: "validation-report",
    label: "Validation Report",
    type: "data",
    surface_pack_id: "reports",
    status: "available",
    artifact_key: "report",
    description: "Machine-readable rule report.",
  },
  {
    id: "pdf-report",
    label: "PDF / Report",
    type: "pdf",
    surface_pack_id: "reports",
    status: "planned",
    description: "Prepared for future PDF/report generation.",
  },
  {
    id: "dashboard-ui",
    label: "Dashboard UI",
    type: "dashboard",
    surface_pack_id: "dashboards",
    status: "planned",
    description: "Prepared for generated dashboard surfaces.",
  },
  {
    id: "marketing-kit",
    label: "Marketing Kit",
    type: "marketing",
    surface_pack_id: "marketing",
    status: "planned",
    description: "Prepared for campaign surfaces.",
  },
];

export type PackCoverage = {
  id: string;
  percent: number;
  defined: number;
  total: number;
  status: SurfacePack["status"];
};

export function getDesignInventory(brand: Brand, completeness: CompletenessLeaf[] = []): DesignInventory {
  const candidate = brand.components.inventory;
  const stored = isInventory(candidate) ? candidate : undefined;
  const inventory: DesignInventory = {
    version: stored?.version ?? 1,
    surface_packs: mergeById(DEFAULT_SURFACE_PACKS, stored?.surface_packs ?? []),
    components: mergeById(inferComponents(brand), stored?.components ?? []),
    outputs: mergeById(DEFAULT_OUTPUTS, stored?.outputs ?? []),
    evidence: mergeById(sourceEvidence(brand), stored?.evidence ?? []),
  };

  return {
    ...inventory,
    surface_packs: inventory.surface_packs.map((pack) => ({
      ...pack,
      status: pack.status === "approved" ? pack.status : coverageStatus(pack, inventory.components, completeness),
    })),
  };
}

export function cloneBrandWithInventory(brand: Brand, inventory: DesignInventory): Brand {
  return {
    ...brand,
    components: {
      ...brand.components,
      inventory,
    },
  };
}

export function coverageForPack(
  pack: SurfacePack,
  components: DesignComponent[],
  completeness: CompletenessLeaf[],
): PackCoverage {
  const linked = components.filter((component) => component.surfaces.some((surface) => surfaceMatchesPack(surface, pack)));
  const total = Math.max(1, linked.length);
  const defined = linked.filter((component) => component.status === "approved" || component.status === "draft").length;
  const ruleDefined = completeness.filter(
    (leaf) => leaf.surfaces.some((surface) => surfaceMatchesPack(surface, pack)) && leaf.status !== "missing",
  ).length;
  const ruleTotal = completeness.filter((leaf) => leaf.surfaces.some((surface) => surfaceMatchesPack(surface, pack))).length;
  const componentScore = defined / total;
  const ruleScore = ruleTotal ? ruleDefined / ruleTotal : componentScore;
  return {
    id: pack.id,
    percent: Math.round(((componentScore * 0.65 + ruleScore * 0.35) || 0) * 100),
    defined,
    total,
    status: pack.status,
  };
}

export function artifactUrl(output: DesignOutput, artifacts: Artifacts): string | undefined {
  const key = output.artifact_key as keyof Artifacts | undefined;
  if (!key || typeof artifacts[key] !== "string") {
    return output.url;
  }
  return artifacts[key];
}

export function rulesForComponent(component: DesignComponent, rules: Rule[]): Rule[] {
  const explicit = new Set(component.rules ?? []);
  return rules.filter((rule) => explicit.has(rule.id) || explicit.has(rule.category));
}

function inferComponents(brand: Brand): DesignComponent[] {
  const byCategory = new Map<string, string[]>();
  for (const rule of brand.rules) {
    const ids = byCategory.get(rule.category) ?? [];
    ids.push(rule.id);
    byCategory.set(rule.category, ids);
  }
  return DEFAULT_COMPONENTS.map((component) => {
    const linkedRules = new Set<string>();
    for (const ruleKey of component.rules ?? []) {
      for (const ruleId of byCategory.get(ruleKey) ?? []) {
        linkedRules.add(ruleId);
      }
    }
    return {
      ...component,
      rules: linkedRules.size ? [...linkedRules] : component.rules,
    };
  });
}

function sourceEvidence(brand: Brand): EvidenceRef[] {
  return brand.sources.map((source) => ({
    id: source.id,
    source_id: source.id,
    label: source.name,
    kind: source.kind,
    confidence: source.kind === "seed" ? 1 : 0.7,
  }));
}

function coverageStatus(
  pack: SurfacePack,
  components: DesignComponent[],
  completeness: CompletenessLeaf[],
): SurfacePack["status"] {
  const coverage = coverageForPack(pack, components, completeness);
  if (coverage.percent >= 85) {
    return "draft";
  }
  if (coverage.percent >= 40) {
    return "partial";
  }
  return "missing";
}

function surfaceMatchesPack(surface: string, pack: SurfacePack): boolean {
  return surface === pack.id || pack.surfaces.includes(surface);
}

function mergeById<T extends { id: string }>(defaults: T[], stored: T[]): T[] {
  const byId = new Map(defaults.map((item) => [item.id, item]));
  for (const item of stored) {
    byId.set(item.id, { ...(byId.get(item.id) ?? item), ...item });
  }
  return [...byId.values()];
}

function isInventory(value: unknown): value is DesignInventory {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<DesignInventory>;
  return (
    typeof candidate.version === "number" &&
    Array.isArray(candidate.surface_packs) &&
    Array.isArray(candidate.components) &&
    Array.isArray(candidate.outputs) &&
    Array.isArray(candidate.evidence)
  );
}
