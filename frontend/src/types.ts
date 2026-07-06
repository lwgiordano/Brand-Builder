export type ProviderStatus = {
  id: "codex" | "claude" | string;
  label: string;
  available: boolean;
  authenticated: boolean;
  detail: string;
};

export type Brand = {
  metadata: {
    slug: string;
    name: string;
    version: number;
    updated_at: string;
    description?: string;
  };
  tokens: {
    colors: Record<string, string>;
    typography: {
      font_family: string;
      scale_ratio: number;
      sizes: Record<string, number>;
      line_heights: Record<string, number>;
      weights: Record<string, number>;
    };
    spacing: {
      grid: number;
      scale: number[];
      slide_safe_zone: number;
      header_subtext_gap: number;
      card_padding: number;
    };
    radii: Record<string, number>;
    logo: {
      wordmark: string;
      placement: string;
      height: number;
      image_url?: string;
      asset_source_id?: string;
    };
  };
  rules: Rule[];
  components: Record<string, unknown>;
  sources: SourceRecord[];
};

export type BrandMetadata = Brand["metadata"];

export type SourceRecord = {
  id: string;
  kind: string;
  name: string;
  url?: string;
  text: string;
  created_at: string;
  metadata?: {
    asset_type?: string;
    asset_url?: string;
    asset_path?: string;
    filename?: string;
    mime_type?: string;
    role?: string;
    size?: number;
    suffix?: string;
    [key: string]: unknown;
  };
};

export type InventoryStatus = "missing" | "partial" | "draft" | "approved" | string;

export type DesignInventory = {
  version: number;
  surface_packs: SurfacePack[];
  components: DesignComponent[];
  outputs: DesignOutput[];
  evidence: EvidenceRef[];
};

export type SurfacePack = {
  id: string;
  label: string;
  description?: string;
  surfaces: string[];
  outputs?: string[];
  status: InventoryStatus;
  required?: boolean;
};

export type SpecPropValue = number | string | boolean;

export type ComponentSpec = {
  preview: string;
  props: Record<string, SpecPropValue>;
};

export type DesignComponent = {
  id: string;
  name: string;
  category: string;
  surfaces: string[];
  purpose: string;
  anatomy?: string[];
  states?: string[];
  variants?: string[];
  token_refs?: string[];
  rules?: string[];
  examples?: string[];
  status: InventoryStatus;
  evidence_refs?: string[];
  spec?: ComponentSpec;
};

export type CompletionSummary = {
  components_added: number;
  specs_filled: number;
  rules_added: number;
  components_total: number;
  rules_total: number;
};

export type DesignOutput = {
  id: string;
  label: string;
  type: string;
  surface_pack_id: string;
  status: "planned" | "available" | "generated" | "failed" | string;
  artifact_key?: keyof Artifacts | string;
  description?: string;
  url?: string;
};

export type EvidenceRef = {
  id: string;
  source_id: string;
  label: string;
  kind: string;
  confidence?: number;
};

export type InventoryProposal = {
  id: string;
  kind: "token" | "rule" | "component" | "state" | "surface_pack";
  label: string;
  summary: string;
  status: "pending" | "approved" | "rejected";
  evidence_refs: string[];
};

export type Rule = {
  id: string;
  label?: string;
  description?: string;
  category: string;
  scope: Record<string, string | number | boolean>;
  assertion: string;
  target?: unknown;
  unit?: string;
  metric: string;
  token_ref?: string;
  rationale: string;
  evidence?: {
    source_id?: string;
    locator?: string;
    confidence?: number;
  };
  status: "draft" | "approved" | "rejected";
  severity: "error" | "warn" | "info";
};

export type CompletenessLeaf = {
  id: string;
  label: string;
  category: string;
  surfaces: string[];
  required: boolean;
  status: "defined" | "partial" | "missing";
  rule_count: number;
  token_count: number;
};

export type ValidationReport = {
  summary: {
    passed: number;
    failed: number;
    warn: number;
    estimated: number;
    total: number;
  };
  results: ValidationResult[];
};

export type ValidationResult = {
  rule_id: string;
  status: "passed" | "failed" | "warn" | "estimated";
  severity: string;
  matched: number;
  proven: boolean;
  metric: string;
  scope: Record<string, string | number | boolean>;
  value?: unknown;
  target?: unknown;
  message: string;
};

export type Artifacts = {
  slides: string;
  styleguide: string;
  landing?: string;
  computed: string;
  report: string;
};

export type BrandPayload = {
  brand: Brand;
  completeness: CompletenessLeaf[];
  artifacts: Artifacts;
  computed: unknown;
  report: ValidationReport;
};

export type CreationType = "deck" | "report" | "landing";

export type CreationSection = {
  id: string;
  skeleton: string;
  content: Record<string, unknown>;
  overrides: Record<string, string | number | boolean>;
};

export type Creation = {
  id: string;
  name: string;
  type: CreationType;
  template_id: string;
  version: number;
  sections: CreationSection[];
  created_at: string;
  updated_at: string;
};

export type CreationMeta = {
  id: string;
  name: string;
  type: CreationType;
  template_id: string;
  version: number;
  updated_at: string;
  section_count: number;
};

export type SkeletonDefinition = {
  id: string;
  label: string;
  description: string;
  slots: Record<string, "text" | "long" | "bullets" | "kpis" | "links" | "columns" | "rows" | string>;
  defaults: Record<string, unknown>;
  overrides: Record<string, string | number | boolean>;
};

export type TemplateDefinition = {
  id: string;
  type: CreationType;
  label: string;
  description: string;
  sections: string[];
};

export type TemplateLibrary = {
  types: CreationType[];
  templates: TemplateDefinition[];
  skeletons: Record<CreationType, SkeletonDefinition[]>;
  override_choices: Record<string, string[]>;
};

export type CreationPayload = {
  creation: Creation;
  artifact_url: string;
};

export type AiProposal = {
  mode?: string;
  summary: string;
  patch?: JsonPatchOp[];
  tokens_patch?: Record<string, unknown>;
  components_patch?: Record<string, unknown>;
  rules?: Rule[];
  confidence?: number;
  evidence?: string;
  validation_impact?: string;
};

export type JsonPatchOp = {
  op: "add" | "replace" | "remove";
  path: string;
  value?: unknown;
};
