import {
  CheckCircle2,
  FileOutput,
  FlaskConical,
  FolderOpen,
  type LucideIcon,
  Palette,
} from "lucide-react";

export type StepId = "brand" | "style" | "components" | "make";

export type StepDefinition = {
  id: StepId;
  label: string;
  description: string;
  Icon: LucideIcon;
};

// The whole app is one pipeline: add what you have, set your style,
// shape your components, then make finished things with them.
export const STEPS: StepDefinition[] = [
  {
    id: "brand",
    label: "Add your brand",
    description: "Drop in anything you have — files, pictures, links, or notes. We'll read what we can.",
    Icon: FolderOpen,
  },
  {
    id: "style",
    label: "Set your style",
    description: "Your colors, type, and spacing — plus the rules that keep everything on brand.",
    Icon: Palette,
  },
  {
    id: "components",
    label: "Your components",
    description: "Every piece of your system with a live example you can shape with simple controls.",
    Icon: FlaskConical,
  },
  {
    id: "make",
    label: "Make things",
    description: "Turn your system into slide decks, reports, and landing pages — ready to share.",
    Icon: FileOutput,
  },
];

export const REVIEW_STATUSES = ["missing", "partial", "draft", "approved"] as const;

export const COMPONENT_LIST_FIELDS = ["surfaces", "states", "variants", "anatomy", "token_refs", "rules"] as const;

export type ComponentListField = (typeof COMPONENT_LIST_FIELDS)[number];

export const SOURCE_ACTIONS = [
  { id: "spec", label: "Specs", Icon: FolderOpen },
  { id: "logo", label: "Logo", Icon: CheckCircle2 },
] as const;

export const COMPONENT_CATEGORY_ORDER = [
  "foundation",
  "identity",
  "control",
  "navigation",
  "feedback",
  "containment",
  "component",
  "data",
  "content",
  "surface",
] as const;

export const COMPONENT_CATEGORY_LABELS: Record<string, string> = {
  foundation: "Foundations",
  identity: "Identity",
  control: "Controls",
  navigation: "Navigation",
  feedback: "Feedback",
  containment: "Containers",
  component: "Building blocks",
  data: "Data",
  content: "Content blocks",
  surface: "Full surfaces",
};
