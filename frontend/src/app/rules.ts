import type { Brand, Rule } from "../types";

export function createBlankRule(brand: Brand): Rule {
  const category = "component";
  const id = nextRuleId(brand, category);
  return {
    id,
    label: "Draft component behavior",
    description: "Define the exact component behavior this brand system should verify.",
    category,
    scope: { surface: "ui", element: "component" },
    assertion: "equals",
    target: true,
    metric: "active_nav_signals",
    rationale: "Drafted in the visual rule editor for review.",
    status: "draft",
    severity: "warn",
  };
}

function nextRuleId(brand: Brand, category: string): string {
  const existing = new Set(brand.rules.map((rule) => rule.id));
  let index = brand.rules.length + 1;
  let id = `R-custom-${category}-${String(index).padStart(2, "0")}`;
  while (existing.has(id)) {
    index += 1;
    id = `R-custom-${category}-${String(index).padStart(2, "0")}`;
  }
  return id;
}
