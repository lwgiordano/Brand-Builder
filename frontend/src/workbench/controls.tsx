import { Minus, Plus } from "lucide-react";

/**
 * The shared control widgets for visual editing: snapped steppers, color-role
 * swatches, single-choice chips, and labelled text/color fields. Every label
 * is plain words; every control keeps a 44px-effective hit area (documented
 * dense-picker exception: swatches).
 */

export function SpecStepper({
  label,
  value,
  options,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  options: number[];
  unit: string;
  onChange: (value: number) => void;
}) {
  const sorted = [...options].sort((a, b) => a - b);
  const step = (direction: 1 | -1) => {
    if (direction > 0) {
      const next = sorted.find((option) => option > value);
      if (next !== undefined) onChange(next);
      return;
    }
    const lower = sorted.filter((option) => option < value);
    if (lower.length) onChange(lower[lower.length - 1]);
  };
  const atMin = value <= sorted[0];
  const atMax = value >= sorted[sorted.length - 1];
  return (
    <div className="spec-stepper">
      <span className="stepper-label">{label}</span>
      <div className="stepper-controls">
        <button
          aria-label={`Make ${label.toLowerCase()} smaller`}
          className="stepper-button"
          disabled={atMin}
          type="button"
          onClick={() => step(-1)}
        >
          <Minus size={14} />
        </button>
        <output className="stepper-value">
          {value}
          {unit}
        </output>
        <button
          aria-label={`Make ${label.toLowerCase()} bigger`}
          className="stepper-button"
          disabled={atMax}
          type="button"
          onClick={() => step(1)}
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

export function SwatchSelect({
  label,
  value,
  roles,
  colors,
  onChange,
}: {
  label: string;
  value: string;
  roles: string[];
  colors: Record<string, string>;
  onChange: (role: string) => void;
}) {
  return (
    <div className="swatch-select">
      <span className="stepper-label">{label}</span>
      <div aria-label={label} className="swatch-row" role="group">
        {roles.map((role) => (
          <button
            aria-label={`${label}: use the ${role} color`}
            aria-pressed={role === value}
            className={`swatch-button${role === value ? " is-selected" : ""}`}
            key={role}
            style={{ background: colors[role] }}
            title={role}
            type="button"
            onClick={() => onChange(role)}
          />
        ))}
      </div>
      <span className="swatch-current">{value}</span>
    </div>
  );
}

export function ChoiceChips({
  label,
  value,
  options,
  optionLabels,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  optionLabels?: Record<string, string>;
  onChange: (option: string) => void;
}) {
  return (
    <div className="choice-chips">
      <span className="stepper-label">{label}</span>
      <div aria-label={label} className="chip-row" role="group">
        {options.map((option) => (
          <button
            aria-pressed={option === value}
            className={`choice-chip${option === value ? " is-selected" : ""}`}
            key={option}
            type="button"
            onClick={() => onChange(option)}
          >
            {optionLabels?.[option] ?? option}
          </button>
        ))}
      </div>
    </div>
  );
}

export function TextField({
  label,
  value,
  multiline,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-field">
      <span>{label}</span>
      {multiline ? (
        <textarea rows={3} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

export function ColorField({
  label,
  value,
  suggestions,
  onChange,
}: {
  label: string;
  value: string;
  suggestions: string[];
  onChange: (hex: string) => void;
}) {
  const safeValue = /^#[0-9A-Fa-f]{6}$/.test(value) ? value : "#000000";
  return (
    <div className="color-field">
      <label>
        <span className="stepper-label">{label}</span>
        <span className="color-input-wrap">
          <input
            aria-label={`${label} color`}
            type="color"
            value={safeValue}
            onChange={(event) => onChange(event.target.value.toUpperCase())}
          />
          <code>{value}</code>
        </span>
      </label>
      {suggestions.length ? (
        <div aria-label={`Colors from your sources for ${label}`} className="swatch-row" role="group">
          {suggestions.slice(0, 8).map((hex) => (
            <button
              aria-label={`Use ${hex} for ${label}`}
              aria-pressed={hex.toUpperCase() === value.toUpperCase()}
              className={`swatch-button${hex.toUpperCase() === value.toUpperCase() ? " is-selected" : ""}`}
              key={hex}
              style={{ background: hex }}
              title={hex}
              type="button"
              onClick={() => onChange(hex.toUpperCase())}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
