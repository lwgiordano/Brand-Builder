import { Check, ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

type ChipProps = {
  children: ReactNode;
  active?: boolean;
  tone?: "neutral" | "good" | "warn" | "danger";
  onClick?: () => void;
  title?: string;
};

export function Chip({ children, active = false, tone = "neutral", onClick, title }: ChipProps) {
  if (!onClick) {
    return (
      <span className={`lab-chip lab-chip-${tone}${active ? " is-active" : ""}`} title={title}>
        {children}
      </span>
    );
  }
  return (
    <button className={`lab-chip lab-chip-${tone}${active ? " is-active" : ""}`} type="button" onClick={onClick} title={title}>
      {active ? <Check size={13} /> : null}
      <span>{children}</span>
    </button>
  );
}

type PanelProps = {
  title: string;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function Panel({ title, eyebrow, actions, children }: PanelProps) {
  return (
    <section className="lab-panel">
      <header className="lab-panel-header">
        <div>
          {eyebrow ? <p className="lab-eyebrow">{eyebrow}</p> : null}
          <h2>{title}</h2>
        </div>
        {actions ? <div className="lab-panel-actions">{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}

type MeterProps = {
  value: number;
  label?: string;
};

export function Meter({ value, label }: MeterProps) {
  const boundedValue = Math.max(0, Math.min(100, value));
  return (
    <div
      aria-label={label}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={boundedValue}
      className="lab-meter"
      role="meter"
    >
      <span style={{ width: `${boundedValue}%` }} />
    </div>
  );
}

type DisclosureProps = {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
};

export function Disclosure({ title, children, defaultOpen = false }: DisclosureProps) {
  return (
    <details className="lab-disclosure" open={defaultOpen}>
      <summary>
        <span>{title}</span>
        <ChevronDown size={15} />
      </summary>
      <div className="lab-disclosure-body">{children}</div>
    </details>
  );
}

export function statusTone(status: string | undefined): "neutral" | "good" | "warn" | "danger" {
  if (status === "approved" || status === "available" || status === "generated" || status === "passed") {
    return "good";
  }
  if (status === "missing" || status === "failed" || status === "rejected") {
    return "danger";
  }
  if (status === "partial" || status === "warn" || status === "estimated") {
    return "warn";
  }
  return "neutral";
}

export function compactNumber(value: number): string {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(value);
}
