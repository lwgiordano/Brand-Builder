import { CheckCircle2, ChevronDown, XCircle } from "lucide-react";
import { type CSSProperties, type ReactNode, useState } from "react";
import type { Brand, Rule, SourceRecord, ValidationReport, ValidationResult } from "../types";
import { extractedColors } from "./BrandIntake";
import { ChoiceChips, ColorField, SpecStepper, TextField } from "./controls";
import { propOptions } from "./preview";
import { Chip, Disclosure, Panel, statusTone } from "./primitives";

/**
 * Step 2 — the brand's foundations as *visual* settings. Every color is a
 * card showing how it's really used; type is the standard web ladder shown
 * as live specimens; the checks read as plain-English sentences grouped by
 * what they govern. Component checks live on the components step, not here.
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
const PLACEMENT_LABELS: Record<string, string> = {
  "top-left": "Top left",
  "top-right": "Top right",
  "bottom-left": "Bottom left",
  "bottom-right": "Bottom right",
};
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

// The standard web type scale, shown as live specimens.
const TYPE_LADDER = [
  { key: "h1", name: "Heading 1", sample: "The big page headline", weight: "bold", leading: "display" },
  { key: "h2", name: "Heading 2", sample: "A clear section title", weight: "bold", leading: "heading" },
  { key: "h3", name: "Heading 3", sample: "A smaller subheading", weight: "semibold", leading: "heading" },
  {
    key: "body",
    name: "Body text",
    sample: "Body text stays comfortable to read, even across a few lines.",
    weight: "regular",
    leading: "body",
  },
  { key: "caption", name: "Small print", sample: "A caption, hint, or footnote", weight: "regular", leading: "body" },
] as const;

// Step 2 shows foundation checks only; component/data checks live with each
// component on the "Your components" step.
const STEP3_CATEGORIES = new Set(["component", "data"]);
const CHECK_GROUP_DEFS = [
  { id: "colors", label: "Colors", categories: ["color"] },
  { id: "readability", label: "Easy to read & use", categories: ["accessibility"] },
  { id: "type", label: "Type", categories: ["typography"] },
  { id: "layout", label: "Spacing & shape", categories: ["spacing", "radius", "grid"] },
  { id: "logo", label: "Logo", categories: ["logo"] },
  { id: "slides", label: "Slides", categories: ["slide"] },
];

const STATUS_WORDS: Record<string, string> = {
  passed: "passing",
  failed: "needs a fix",
  warn: "nothing to check yet",
  estimated: "looks right",
  draft: "new",
  approved: "on",
  rejected: "off",
};

export function StyleSettings({
  brand,
  report,
  saveStateLabel,
  onUpdateToken,
  onSetRuleStatus,
  onSelectRule,
}: StyleSettingsProps) {
  const [openRole, setOpenRole] = useState<string | null>(null);
  const colors = brand.tokens.colors;
  const roleNames = Object.keys(colors)
    .filter((name) => !name.startsWith("source_"))
    .sort((a, b) => rolePriority(a) - rolePriority(b));
  const coreRoles = roleNames.filter((role) => ROLE_HELP[role]);
  const extraRoles = roleNames.filter((role) => !ROLE_HELP[role]);
  const suggestions = colorSuggestions(brand);
  const typography = brand.tokens.typography;
  const sizes = typography.sizes;
  const ladderKeys = new Set<string>(TYPE_LADDER.map((row) => row.key));
  const extraSizes = Object.entries(sizes)
    .filter(([name]) => !ladderKeys.has(name))
    .sort(([, a], [, b]) => a - b);
  const ladderOptions = [...new Set([...propOptions(brand, "font_size"), 36, 44, 48, 54, 60])].sort(
    (a, b) => a - b,
  );
  const radii = Object.entries(brand.tokens.radii);
  const spacingOptions = propOptions(brand, "padding");
  const groups = checkGroups(brand.rules, report);
  const checkTotal = groups.reduce((sum, group) => sum + group.rows.length, 0);
  const needsTotal = groups.reduce(
    (sum, group) => sum + group.rows.filter((row) => row.result?.status !== "passed").length,
    0,
  );

  return (
    <div className="stage-grid style-grid" data-workbench-stage="Set your style">
      <Panel title="Your colors" eyebrow={saveStateLabel}>
        <p className="panel-hint">
          Each color card shows how that color is really used. Press “Change” to pick a new one —
          everything restyles instantly.
        </p>
        <div className="color-card-grid" data-color-cards>
          {coreRoles.map((role) => (
            <ColorCard
              colors={colors}
              isOpen={openRole === role}
              key={role}
              role={role}
              suggestions={suggestions}
              onChange={(hex) => onUpdateToken(["colors", role], hex)}
              onToggle={() => setOpenRole(openRole === role ? null : role)}
            />
          ))}
        </div>
        {extraRoles.length ? (
          <Disclosure title={`More colors (${extraRoles.length})`}>
            <div className="role-list">
              {extraRoles.map((role) => (
                <ColorField
                  key={role}
                  label={prettyRole(role)}
                  suggestions={suggestions}
                  value={colors[role] ?? "#000000"}
                  onChange={(hex) => onUpdateToken(["colors", role], hex)}
                />
              ))}
            </div>
          </Disclosure>
        ) : null}
      </Panel>

      <Panel title="Your type" eyebrow={primaryFont(typography.font_family)}>
        <TextField
          label="Font"
          placeholder="Inter, Arial, sans-serif"
          value={typography.font_family}
          onChange={(value) => onUpdateToken(["typography", "font_family"], value)}
        />
        <div className="type-ladder" data-type-ladder>
          {TYPE_LADDER.map((row) => {
            const size = sizes[row.key];
            if (typeof size !== "number") return null;
            return (
              <div className="type-ladder-row" key={row.key}>
                <div className="type-specimen">
                  <span className="type-specimen-meta">
                    {row.name} · {size}px
                  </span>
                  <p
                    style={{
                      fontFamily: typography.font_family,
                      fontSize: size,
                      fontWeight: typography.weights[row.weight] ?? (row.weight === "regular" ? 400 : 700),
                      lineHeight:
                        typography.line_heights[row.leading] ?? (row.leading === "body" ? 1.5 : 1.15),
                    }}
                  >
                    {row.sample}
                  </p>
                </div>
                <SpecStepper
                  label={`${row.name} size`}
                  options={ladderOptions}
                  unit="px"
                  value={size}
                  onChange={(value) => onUpdateToken(["typography", "sizes", row.key], value)}
                />
              </div>
            );
          })}
        </div>
        {extraSizes.length ? (
          <Disclosure title={`Slide & special sizes (${extraSizes.length})`}>
            <div className="design-controls">
              {extraSizes.map(([name, size]) => (
                <SpecStepper
                  key={name}
                  label={`${sizeLabel(name)} size`}
                  options={ladderOptions}
                  unit="px"
                  value={size}
                  onChange={(value) => onUpdateToken(["typography", "sizes", name], value)}
                />
              ))}
            </div>
          </Disclosure>
        ) : null}
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
            optionLabels={PLACEMENT_LABELS}
            options={PLACEMENT_CHOICES}
            value={brand.tokens.logo.placement}
            onChange={(value) => onUpdateToken(["logo", "placement"], value)}
          />
        </div>
        <p className="panel-hint">Upload a logo file on the “Add your brand” step to replace the wordmark.</p>
      </Panel>

      <Panel title="Automatic checks" eyebrow="Your brand, kept on track">
        <p className="panel-hint">
          {`Every design you make is checked against these ${checkTotal} rules automatically — `}
          {needsTotal
            ? `${needsTotal} ${needsTotal === 1 ? "needs" : "need"} a look.`
            : "all passing."}{" "}
          Component checks live with each piece on the “Your components” step.
        </p>
        <div className="check-groups" data-check-groups>
          {groups.map((group) => (
            <CheckGroup group={group} key={group.id} onSelectRule={onSelectRule} onSetRuleStatus={onSetRuleStatus} />
          ))}
        </div>
      </Panel>
    </div>
  );
}

type RuleRowData = { rule: Rule; result: ValidationResult | null };
type GroupData = { id: string; label: string; rows: RuleRowData[] };

function sortedRules(rules: Rule[], report: ValidationReport): RuleRowData[] {
  const resultById = new Map(report.results.map((result) => [result.rule_id, result]));
  return rules
    .filter((rule) => rule.status !== "rejected")
    .map((rule) => ({ rule, result: resultById.get(rule.id) ?? null }))
    .sort((a, b) => rankRule(a.result?.status) - rankRule(b.result?.status));
}

function checkGroups(rules: Rule[], report: ValidationReport): GroupData[] {
  const rows = sortedRules(rules, report).filter((row) => !STEP3_CATEGORIES.has(row.rule.category));
  const groups: GroupData[] = [];
  const claimed = new Set<string>();
  for (const def of CHECK_GROUP_DEFS) {
    for (const category of def.categories) claimed.add(category);
    const matched = rows.filter((row) => def.categories.includes(row.rule.category));
    if (matched.length) groups.push({ id: def.id, label: def.label, rows: matched });
  }
  const leftover = rows.filter((row) => !claimed.has(row.rule.category));
  if (leftover.length) groups.push({ id: "more", label: "More checks", rows: leftover });
  return groups;
}

function CheckGroup({
  group,
  onSelectRule,
  onSetRuleStatus,
}: {
  group: GroupData;
  onSelectRule: (ruleId: string) => void;
  onSetRuleStatus: (ruleId: string, status: Rule["status"]) => void;
}) {
  const needs = group.rows.filter((row) => row.result?.status !== "passed").length;
  // Frozen on mount so a live fix never snaps the group shut mid-read.
  const [initiallyOpen] = useState(needs > 0);
  return (
    <details className="check-group" open={initiallyOpen || undefined}>
      <summary>
        <span className="check-group-title">{group.label}</span>
        <span className={`check-rollup${needs ? " has-needs" : ""}`}>
          {needs
            ? `${needs} of ${group.rows.length} ${needs === 1 ? "needs" : "need"} a look`
            : `${group.rows.length} ${group.rows.length === 1 ? "check" : "checks"} · all passing`}
        </span>
        <ChevronDown aria-hidden="true" size={15} />
      </summary>
      <div className="check-group-body">
        {group.rows.map((row) => (
          <RuleSentence key={row.rule.id} row={row} onSelectRule={onSelectRule} onSetRuleStatus={onSetRuleStatus} />
        ))}
      </div>
    </details>
  );
}

function RuleSentence({
  row,
  onSelectRule,
  onSetRuleStatus,
}: {
  row: RuleRowData;
  onSelectRule: (ruleId: string) => void;
  onSetRuleStatus: (ruleId: string, status: Rule["status"]) => void;
}) {
  const { rule, result } = row;
  const status = result?.status ?? rule.status;
  return (
    <article className="rule-plain-row sentence-rule">
      <Chip tone={statusTone(status)}>
        {status === "passed" ? (
          <CheckCircle2 size={13} />
        ) : status === "failed" ? (
          <XCircle size={13} />
        ) : null}
        {STATUS_WORDS[status] ?? status}
      </Chip>
      <button className="rule-plain-name" type="button" onClick={() => onSelectRule(rule.id)}>
        {rule.label || rule.id}
      </button>
      <small>{rule.description || rule.rationale}</small>
      {rule.status === "draft" ? (
        <button className="ghost-action" type="button" onClick={() => onSetRuleStatus(rule.id, "approved")}>
          Turn on
        </button>
      ) : null}
    </article>
  );
}

function ColorCard({
  role,
  colors,
  suggestions,
  isOpen,
  onToggle,
  onChange,
}: {
  role: string;
  colors: Record<string, string>;
  suggestions: string[];
  isOpen: boolean;
  onToggle: () => void;
  onChange: (hex: string) => void;
}) {
  const value = colors[role] ?? "#000000";
  const note = contrastNote(role, colors);
  return (
    <article className={`color-card${isOpen ? " is-open" : ""}`}>
      <ColorExample colors={colors} role={role} />
      <div className="color-card-meta">
        <strong>{prettyRole(role)}</strong>
        <span>{ROLE_HELP[role] ?? "an extra brand color"}</span>
      </div>
      <div className="color-card-foot">
        <code>{value}</code>
        {note ? (
          <span
            className={`contrast-note ${note.good ? "is-good" : "is-bad"}`}
            title={`Contrast ${note.ratio.toFixed(1)}:1`}
          >
            <span aria-hidden="true">●</span> {note.good ? "Easy to read" : "Hard to read"}
          </span>
        ) : null}
        <button aria-expanded={isOpen} className="ghost-action change-color" type="button" onClick={onToggle}>
          {isOpen ? "Done" : "Change"}
        </button>
      </div>
      {isOpen ? (
        <div className="color-card-editor">
          <ColorField label={`${prettyRole(role)} color`} suggestions={suggestions} value={value} onChange={onChange} />
        </div>
      ) : null}
    </article>
  );
}

function ColorExample({ role, colors }: { role: string; colors: Record<string, string> }) {
  const background = colors.background ?? "#F6F8F7";
  const surface = colors.surface ?? "#FFFFFF";
  const text = colors.text ?? "#15201C";
  const border = colors.border ?? "#D7DED9";
  const value = colors[role] ?? "#000000";
  const style: CSSProperties = { background };
  let content: ReactNode;
  if (role === "background") {
    style.background = value;
    content = (
      <>
        <span className="ex-text" style={{ color: text }}>
          Aa
        </span>
        <span className="ex-card" style={{ background: surface, borderColor: border }} />
      </>
    );
  } else if (role === "surface") {
    content = (
      <span className="ex-card ex-card-labeled" style={{ background: value, borderColor: border, color: text }}>
        Card
      </span>
    );
  } else if (role === "text") {
    content = (
      <span className="ex-text" style={{ color: value }}>
        Aa words
      </span>
    );
  } else if (role === "muted") {
    content = (
      <span className="ex-text" style={{ color: value }}>
        Aa quieter
      </span>
    );
  } else if (role === "border") {
    content = <span className="ex-card" style={{ background: surface, borderColor: value, borderWidth: 2 }} />;
  } else if (role === "accent") {
    content = (
      <span className="ex-button" style={{ background: value, color: readableOn(value, surface) }}>
        Save
      </span>
    );
  } else if (role === "success" || role === "warning" || role === "danger") {
    const label = role === "success" ? "Saved" : role === "warning" ? "Check this" : "Fix this";
    content = (
      <span className="ex-chip" style={{ color: readableOn(value), background: value, borderColor: value }}>
        {label}
      </span>
    );
  } else {
    content = <span className="ex-swatch" style={{ background: value }} />;
  }
  return (
    <div aria-hidden="true" className="color-example" style={style}>
      {content}
    </div>
  );
}

function rankRule(status: string | undefined): number {
  if (status === "failed") return 0;
  if (status === "warn") return 1;
  if (status === undefined) return 2;
  if (status === "estimated") return 3;
  return 4;
}

function rolePriority(role: string): number {
  const order = Object.keys(ROLE_HELP);
  const index = order.indexOf(role);
  return index === -1 ? order.length : index;
}

function prettyRole(role: string): string {
  const pretty = role.replaceAll("_", " ");
  return pretty.charAt(0).toUpperCase() + pretty.slice(1);
}

function primaryFont(fontFamily: string): string {
  return fontFamily.split(",")[0]?.replaceAll('"', "").trim() || fontFamily;
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

function luminance(hex: string): number {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) return 0;
  const [r, g, b] = [0, 2, 4]
    .map((offset) => Number.parseInt(match[1].slice(offset, offset + 2), 16) / 255)
    .map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [bright, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (bright + 0.05) / (dark + 0.05);
}

function readableOn(background: string, ...candidates: string[]): string {
  let best = "#FFFFFF";
  let bestRatio = 0;
  for (const candidate of [...candidates, "#FFFFFF", "#111111"]) {
    const ratio = contrastRatio(background, candidate);
    if (ratio > bestRatio) {
      bestRatio = ratio;
      best = candidate;
    }
  }
  return best;
}

function contrastNote(role: string, colors: Record<string, string>): { good: boolean; ratio: number } | null {
  const background = colors.background;
  const value = colors[role];
  if (!background || !value) return null;
  if (role === "text" || role === "muted") {
    const ratio = contrastRatio(value, background);
    return { good: ratio >= 4.5, ratio };
  }
  if (role === "accent") {
    const ratio = contrastRatio(value, readableOn(value, colors.surface ?? "#FFFFFF"));
    return { good: ratio >= 4.5, ratio };
  }
  return null;
}
