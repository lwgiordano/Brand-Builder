import { CheckCircle2, XCircle } from "lucide-react";
import type { Brand, Rule, SourceRecord, ValidationReport } from "../types";
import { extractedColors } from "./BrandIntake";
import { ChoiceChips, ColorField, SpecStepper, TextField } from "./controls";
import { propOptions } from "./preview";
import { Chip, Panel, statusTone } from "./primitives";

/**
 * Step 2 — the brand's foundations as *editable settings*. Every control
 * writes straight into brand.tokens through the optimistic, debounced save,
 * so components and finished designs restyle as you type. Rules are listed
 * beneath in plain words with live pass/fail state.
 */

type StyleSettingsProps = {
  brand: Brand;
  report: ValidationReport;
  saveStateLabel: string;
  onUpdateToken: (path: string[], value: unknown) => void;
  onSetRuleStatus: (ruleId: string, status: Rule["status"]) => void;
  onSelectRule: (ruleId: string) => void;
};

const PLACEMENT_CHOICES = ["top-left", "top-right", "bottom-left", "bottom-right"];
const ROLE_HELP: Record<string, string> = {
  background: "the page behind everything",
  surface: "cards and panels",
  text: "main words",
  muted: "quieter words",
  border: "thin lines",
  accent: "your main brand color",
  success: "good news",
  warning: "needs attention",
  danger: "problems",
};

export function StyleSettings({
  brand,
  report,
  saveStateLabel,
  onUpdateToken,
  onSetRuleStatus,
  onSelectRule,
}: StyleSettingsProps) {
  const colors = brand.tokens.colors;
  const roleNames = Object.keys(colors)
    .filter((name) => !name.startsWith("source_"))
    .sort((a, b) => rolePriority(a) - rolePriority(b));
  const suggestions = colorSuggestions(brand);
  const sizes = Object.entries(brand.tokens.typography.sizes).sort(([, a], [, b]) => a - b);
  const radii = Object.entries(brand.tokens.radii);
  const sizeOptions = propOptions(brand, "font_size");
  const spacingOptions = propOptions(brand, "padding");

  return (
    <div className="stage-grid style-grid" data-workbench-stage="Set your style">
      <Panel title="Your colors" eyebrow={saveStateLabel}>
        <p className="panel-hint">
          Pick a swatch or use a color from your sources. Everything downstream recolors instantly.
        </p>
        <div className="role-grid">
          {roleNames.map((role) => (
            <div className="role-row" key={role}>
              <ColorField
                label={roleLabel(role)}
                suggestions={suggestions}
                value={colors[role] ?? "#000000"}
                onChange={(hex) => onUpdateToken(["colors", role], hex)}
              />
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Your type" eyebrow={brand.tokens.typography.font_family}>
        <TextField
          label="Font"
          placeholder="Inter, Arial, sans-serif"
          value={brand.tokens.typography.font_family}
          onChange={(value) => onUpdateToken(["typography", "font_family"], value)}
        />
        <div className="design-controls">
          {sizes.map(([name, size]) => (
            <SpecStepper
              key={name}
              label={`${sizeLabel(name)} size`}
              options={sizeOptions}
              unit="px"
              value={size}
              onChange={(value) => onUpdateToken(["typography", "sizes", name], value)}
            />
          ))}
        </div>
      </Panel>

      <Panel title="Your spacing + shape" eyebrow={`${brand.tokens.spacing.grid}px grid`}>
        <div className="design-controls">
          <SpecStepper
            label="Grid unit"
            options={[4, 8]}
            unit="px"
            value={brand.tokens.spacing.grid}
            onChange={(value) => onUpdateToken(["spacing", "grid"], value)}
          />
          <SpecStepper
            label="Space inside cards"
            options={spacingOptions}
            unit="px"
            value={brand.tokens.spacing.card_padding ?? 24}
            onChange={(value) => onUpdateToken(["spacing", "card_padding"], value)}
          />
          <SpecStepper
            label="Slide safe margin"
            options={spacingOptions}
            unit="px"
            value={brand.tokens.spacing.slide_safe_zone}
            onChange={(value) => onUpdateToken(["spacing", "slide_safe_zone"], value)}
          />
          <SpecStepper
            label="Gap under headings"
            options={spacingOptions}
            unit="px"
            value={brand.tokens.spacing.header_subtext_gap}
            onChange={(value) => onUpdateToken(["spacing", "header_subtext_gap"], value)}
          />
          {radii.map(([name, value]) => (
            <SpecStepper
              key={name}
              label={`Corner roundness — ${radiusLabel(name)}`}
              options={propOptions(brand, "radius")}
              unit="px"
              value={value}
              onChange={(next) => onUpdateToken(["radii", name], next)}
            />
          ))}
        </div>
      </Panel>

      <Panel title="Your logo" eyebrow={brand.tokens.logo.wordmark}>
        <TextField
          label="Wordmark"
          value={brand.tokens.logo.wordmark}
          onChange={(value) => onUpdateToken(["logo", "wordmark"], value)}
        />
        <div className="design-controls">
          <SpecStepper
            label="Logo height"
            options={propOptions(brand, "logo_height")}
            unit="px"
            value={brand.tokens.logo.height}
            onChange={(value) => onUpdateToken(["logo", "height"], value)}
          />
          <ChoiceChips
            label="Where the logo sits"
            options={PLACEMENT_CHOICES}
            value={brand.tokens.logo.placement}
            onChange={(value) => onUpdateToken(["logo", "placement"], value)}
          />
        </div>
        <p className="panel-hint">Upload a logo file on the “Add your brand” step to replace the wordmark.</p>
      </Panel>

      <Panel title="The rules" eyebrow="What keeps everything on brand">
        <p className="panel-hint">
          Machine checks run on everything you make. Green means it passes today.
        </p>
        <div className="rules-plain-list">
          {sortedRules(brand.rules, report).map(({ rule, result }) => (
            <article className="rule-plain-row sentence-rule" key={rule.id}>
              {result ? (
                <Chip tone={statusTone(result.status)}>
                  {result.status === "passed" ? (
                    <CheckCircle2 size={13} />
                  ) : result.status === "failed" ? (
                    <XCircle size={13} />
                  ) : null}
                  {result.status}
                </Chip>
              ) : (
                <Chip tone={statusTone(rule.status)}>{rule.status}</Chip>
              )}
              <button className="rule-plain-name" type="button" onClick={() => onSelectRule(rule.id)}>
                {rule.label || rule.id}
              </button>
              <small>{rule.rationale}</small>
              {rule.status === "draft" ? (
                <button
                  className="ghost-action"
                  type="button"
                  onClick={() => onSetRuleStatus(rule.id, "approved")}
                >
                  Approve
                </button>
              ) : null}
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function sortedRules(rules: Rule[], report: ValidationReport) {
  const resultById = new Map(report.results.map((result) => [result.rule_id, result]));
  return rules
    .filter((rule) => rule.status !== "rejected")
    .map((rule) => ({ rule, result: resultById.get(rule.id) ?? null }))
    .sort((a, b) => rankRule(a.result?.status) - rankRule(b.result?.status));
}

function rankRule(status: string | undefined): number {
  if (status === "failed") return 0;
  if (status === "warn") return 1;
  if (status === "estimated") return 2;
  if (status === "passed") return 3;
  return 4;
}

function rolePriority(role: string): number {
  const order = Object.keys(ROLE_HELP);
  const index = order.indexOf(role);
  return index === -1 ? order.length : index;
}

function roleLabel(role: string): string {
  const help = ROLE_HELP[role];
  const pretty = role.replaceAll("_", " ");
  return help ? `${pretty} — ${help}` : pretty;
}

function sizeLabel(name: string): string {
  return name.replaceAll("_", " ");
}

function radiusLabel(name: string): string {
  if (name === "control") return "buttons + inputs";
  if (name === "card") return "cards";
  if (name === "panel") return "panels";
  return name;
}

function colorSuggestions(brand: Brand): string[] {
  const seen = new Set<string>();
  const suggestions: string[] = [];
  const push = (hex: string) => {
    const upper = hex.toUpperCase();
    if (/^#[0-9A-F]{6}$/.test(upper) && !seen.has(upper)) {
      seen.add(upper);
      suggestions.push(upper);
    }
  };
  for (const [name, value] of Object.entries(brand.tokens.colors)) {
    if (name.startsWith("source_")) push(value);
  }
  for (const source of brand.sources) {
    for (const hex of extractedColors(source as SourceRecord)) push(hex);
  }
  return suggestions;
}
