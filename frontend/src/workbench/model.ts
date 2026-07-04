import {
  CheckCircle2,
  ClipboardCheck,
  FileOutput,
  FlaskConical,
  FolderOpen,
  Grid3X3,
  Layers3,
  type LucideIcon,
  Palette,
} from "lucide-react";

export type StageId = "overview" | "foundations" | "surface-packs" | "component-lab" | "outputs" | "validation";

export type StageDefinition = {
  id: StageId;
  label: string;
  description: string;
  Icon: LucideIcon;
};

export const STAGES: StageDefinition[] = [
  {
    id: "overview",
    label: "Overview",
    description: "Coverage, rule health, source readiness, and next actions.",
    Icon: Grid3X3,
  },
  {
    id: "foundations",
    label: "Foundations",
    description: "Color, type, spacing, shape, and logo controls.",
    Icon: Palette,
  },
  {
    id: "surface-packs",
    label: "Surface Packs",
    description: "Slides, documents, reports, dashboards, web, and marketing coverage.",
    Icon: Layers3,
  },
  {
    id: "component-lab",
    label: "Component Lab",
    description: "Reusable design elements with states, variants, rules, and evidence.",
    Icon: FlaskConical,
  },
  {
    id: "outputs",
    label: "Outputs",
    description: "Preview and export generated artifacts.",
    Icon: FileOutput,
  },
  {
    id: "validation",
    label: "Validation",
    description: "Rule results, estimates, failures, and remediation targets.",
    Icon: ClipboardCheck,
  },
];

export const REVIEW_STATUSES = ["missing", "partial", "draft", "approved"] as const;

export const COMPONENT_LIST_FIELDS = ["surfaces", "states", "variants", "anatomy", "token_refs", "rules"] as const;

export type ComponentListField = (typeof COMPONENT_LIST_FIELDS)[number];

export const SOURCE_ACTIONS = [
  { id: "spec", label: "Specs", Icon: FolderOpen },
  { id: "logo", label: "Logo", Icon: CheckCircle2 },
] as const;
