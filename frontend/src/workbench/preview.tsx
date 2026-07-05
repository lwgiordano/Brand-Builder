import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { Brand, ComponentSpec, DesignComponent, SpecPropValue } from "../types";

/**
 * Live component previews for the Component Lab canvas.
 *
 * Every renderer draws a static, non-interactive example styled purely from
 * the brand tokens plus the component's editable spec, so spec edits repaint
 * the example immediately. Previews are exposed to assistive tech as a single
 * labelled image (`role="img"`), never as fake interactive controls.
 */

export function roleColor(brand: Brand, role: SpecPropValue | undefined, fallbackRole: string): string {
  const colors = brand.tokens.colors;
  if (typeof role === "string" && typeof colors[role] === "string") {
    return colors[role];
  }
  return colors[fallbackRole] ?? "#1f2a27";
}

export function semanticRoles(brand: Brand): string[] {
  return Object.keys(brand.tokens.colors)
    .filter((name) => !name.startsWith("source_"))
    .sort();
}

const PROP_LABELS: Record<string, string> = {
  height: "Height",
  field_height: "Field height",
  row_height: "Row height",
  item_height: "Item height",
  header_height: "Header height",
  toolbar_height: "Toolbar height",
  padding: "Space inside",
  padding_x: "Space inside (sides)",
  padding_y: "Space inside (top/bottom)",
  margin: "Page margin",
  gap: "Gap between items",
  radius: "Corner roundness",
  font_size: "Text size",
  label_size: "Label text size",
  title_size: "Title text size",
  header_size: "Header text size",
  value_size: "Number size",
  body_size: "Body text size",
  font_weight: "Text thickness",
  hit_halo: "Extra tap area",
  box_size: "Size",
  icon_size: "Icon size",
  thumb_size: "Handle size",
  track_width: "Track width",
  track_height: "Track height",
  bar_height: "Bar height",
  bar_width: "Bar width",
  marker_size: "Marker thickness",
  width: "Width",
  nav_width: "Sidebar width",
  safe_zone: "Safe margin",
  clear_space: "Breathing room",
  logo_height: "Logo height",
  fill: "Fill color",
  text: "Text color",
  border: "Border color",
  label_color: "Label color",
  track: "Track color",
  active: "Highlight color",
  header_color: "Header text color",
};

export function propLabel(key: string): string {
  return PROP_LABELS[key] ?? key.replaceAll("_", " ");
}

const HEIGHT_STEPS = [24, 28, 32, 36, 40, 44, 48, 56, 64];
const RADIUS_STEPS = [0, 2, 4, 6, 8, 10, 12, 16, 20, 24];
const THIN_STEPS = [1, 2, 3, 4, 6, 8, 10, 12];

export function propOptions(brand: Brand, key: string): number[] {
  const spacing = [...new Set([0, ...brand.tokens.spacing.scale])].sort((a, b) => a - b);
  const sizes = [
    ...new Set([...Object.values(brand.tokens.typography.sizes), 12, 13, 14, 16, 18, 20, 24, 28, 32, 40]),
  ].sort((a, b) => a - b);
  if (/(^|_)(height)$/.test(key)) return HEIGHT_STEPS;
  if (key === "radius") return RADIUS_STEPS;
  if (key === "font_weight") {
    return [...new Set([...Object.values(brand.tokens.typography.weights), 400, 500, 600, 700])].sort(
      (a, b) => a - b,
    );
  }
  if (/(font|label|title|header|value|body)_size$/.test(key)) return sizes;
  if (key === "hit_halo") return [0, 2, 4, 6, 8, 10];
  if (key === "box_size") return [16, 20, 24, 28, 32, 40, 48, 56];
  if (key === "icon_size" || key === "thumb_size") return [12, 16, 20, 24, 32, 40, 48];
  if (key === "track_width") return [36, 40, 44, 52, 60];
  if (key === "track_height" || key === "bar_height" || key === "bar_width" || key === "marker_size") {
    return THIN_STEPS;
  }
  if (key === "width" || key === "nav_width") return [160, 200, 240, 280, 320, 360, 400];
  if (key === "logo_height") return [16, 20, 24, 26, 32, 40, 48, 56];
  if (key === "padding" || key === "padding_x" || key === "padding_y" || key === "gap" || key === "margin" || key === "clear_space" || key === "safe_zone") {
    return spacing.filter((value) => value <= 128);
  }
  return [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64];
}

type PreviewContext = {
  brand: Brand;
  n: (key: string, fallback: number) => number;
  c: (key: string, fallbackRole: string) => string;
  font: string;
};

function makeContext(brand: Brand, spec: ComponentSpec | undefined): PreviewContext {
  const props = spec?.props ?? {};
  return {
    brand,
    n: (key, fallback) => {
      const value = props[key];
      return typeof value === "number" && Number.isFinite(value) ? value : fallback;
    },
    c: (key, fallbackRole) => roleColor(brand, props[key], fallbackRole),
    font: brand.tokens.typography.font_family,
  };
}

export function ComponentPreview({ component, brand }: { component: DesignComponent; brand: Brand }) {
  const spec = component.spec;
  const kind = spec?.preview ?? "generic";
  const ctx = makeContext(brand, spec);
  const renderer = RENDERERS[kind] ?? renderGeneric;
  return (
    <figure
      aria-label={`Live example of ${component.name}, drawn from your brand tokens`}
      className="component-preview"
      role="img"
    >
      <div aria-hidden="true" className="preview-body" style={{ fontFamily: ctx.font }}>
        {renderer(ctx, component)}
      </div>
    </figure>
  );
}

function Scale({ w, h, s, children, style }: { w: number; h: number; s: number; children: ReactNode; style?: CSSProperties }) {
  // Fit-to-container: on narrow canvases the mock shrinks instead of cropping.
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(s);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setScale(Math.min(s, width / w));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [w, s]);
  return (
    <div className="preview-scale" ref={ref} style={{ width: "100%", maxWidth: w * s, height: h * scale }}>
      <div style={{ width: w, height: h, transform: `scale(${scale})`, transformOrigin: "top left", ...style }}>
        {children}
      </div>
    </div>
  );
}

function Lines({ color, count, width }: { color: string; count: number; width: number }) {
  return (
    <span style={{ display: "grid", gap: 6 }}>
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          style={{
            display: "block",
            height: 8,
            borderRadius: 4,
            background: color,
            opacity: 0.35,
            width: `${index === count - 1 ? width * 0.6 : width}%`,
          }}
        />
      ))}
    </span>
  );
}

type Renderer = (ctx: PreviewContext, component: DesignComponent) => ReactNode;

function buttonStyle(ctx: PreviewContext): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: ctx.n("height", 40),
    padding: `0 ${ctx.n("padding_x", 16)}px`,
    gap: ctx.n("gap", 8),
    borderRadius: ctx.n("radius", 6),
    fontSize: ctx.n("font_size", 14),
    fontWeight: ctx.n("font_weight", 600),
    background: ctx.c("fill", "accent"),
    color: ctx.c("text", "surface"),
    border: `1px solid ${ctx.c("border", "accent")}`,
  };
}

const RENDERERS: Record<string, Renderer> = {
  button: (ctx) => {
    const halo = ctx.n("hit_halo", 2);
    return (
      <div className="preview-row">
        <span style={{ ...buttonStyle(ctx), position: "relative" }}>
          Get started
          {halo > 0 ? (
            <span
              style={{
                position: "absolute",
                inset: -halo,
                borderRadius: ctx.n("radius", 6) + halo,
                border: `1px dashed ${ctx.c("fill", "accent")}55`,
              }}
            />
          ) : null}
        </span>
        <span
          style={{
            ...buttonStyle(ctx),
            background: "transparent",
            color: ctx.c("fill", "accent"),
          }}
        >
          Secondary
        </span>
        <span
          style={{
            ...buttonStyle(ctx),
            background: "transparent",
            border: "1px solid transparent",
            color: ctx.brand.tokens.colors.text,
          }}
        >
          Quiet
        </span>
      </div>
    );
  },
  field: (ctx) => (
    <div style={{ display: "grid", gap: 6, width: "min(320px, 100%)" }}>
      <span style={{ fontSize: ctx.n("label_size", 13), color: ctx.c("label_color", "muted") }}>Work email</span>
      <span
        style={{
          display: "flex",
          alignItems: "center",
          minHeight: ctx.n("height", 40),
          padding: `0 ${ctx.n("padding_x", 12)}px`,
          borderRadius: ctx.n("radius", 6),
          background: ctx.c("fill", "surface"),
          color: ctx.c("text", "text"),
          border: `1px solid ${ctx.c("border", "border")}`,
          fontSize: ctx.n("font_size", 16),
        }}
      >
        alex@example.com
      </span>
      <span style={{ fontSize: ctx.n("label_size", 13), color: ctx.c("label_color", "muted") }}>
        We only use this to send the report.
      </span>
    </div>
  ),
  select: (ctx) => (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        width: "min(240px, 100%)",
        minHeight: ctx.n("height", 40),
        padding: `0 ${ctx.n("padding_x", 12)}px`,
        borderRadius: ctx.n("radius", 6),
        background: ctx.c("fill", "surface"),
        color: ctx.c("text", "text"),
        border: `1px solid ${ctx.c("border", "border")}`,
        fontSize: ctx.n("font_size", 14),
      }}
    >
      Newest first
      <span style={{ fontSize: 12 }}>▾</span>
    </span>
  ),
  choices: (ctx) => {
    const size = ctx.n("box_size", 20);
    const item = (label: string, round: boolean, on: boolean) => (
      <span style={{ display: "inline-flex", alignItems: "center", gap: ctx.n("gap", 8), fontSize: ctx.n("font_size", 14), color: ctx.c("text", "text") }}>
        <span
          style={{
            width: size,
            height: size,
            borderRadius: round ? size / 2 : ctx.n("radius", 4),
            border: `2px solid ${on ? ctx.c("fill", "accent") : ctx.c("border", "border")}`,
            background: on && !round ? ctx.c("fill", "accent") : "transparent",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: size * 0.62,
          }}
        >
          {on && !round ? "✓" : null}
          {on && round ? (
            <span style={{ width: size * 0.5, height: size * 0.5, borderRadius: size, background: ctx.c("fill", "accent") }} />
          ) : null}
        </span>
        {label}
      </span>
    );
    return (
      <div className="preview-col">
        {item("Email me a copy", false, true)}
        {item("Just show it on screen", false, false)}
        {item("Monthly plan", true, true)}
      </div>
    );
  },
  switch: (ctx) => {
    const width = ctx.n("track_width", 44);
    const height = ctx.n("track_height", 24);
    const knob = height - 6;
    const track = (on: boolean) => (
      <span
        style={{
          width,
          height,
          borderRadius: height,
          background: on ? ctx.c("fill", "accent") : ctx.c("track", "border"),
          display: "inline-flex",
          alignItems: "center",
          justifyContent: on ? "flex-end" : "flex-start",
          padding: 3,
        }}
      >
        <span style={{ width: knob, height: knob, borderRadius: knob, background: "#fff" }} />
      </span>
    );
    return (
      <div className="preview-col">
        <span style={{ display: "inline-flex", gap: ctx.n("gap", 8), alignItems: "center", fontSize: ctx.n("font_size", 14), color: ctx.c("text", "text") }}>
          {track(true)} Weekly summary on
        </span>
        <span style={{ display: "inline-flex", gap: ctx.n("gap", 8), alignItems: "center", fontSize: ctx.n("font_size", 14), color: ctx.c("text", "text") }}>
          {track(false)} Sounds off
        </span>
      </div>
    );
  },
  slider: (ctx) => {
    const trackHeight = ctx.n("track_height", 6);
    const thumb = ctx.n("thumb_size", 20);
    return (
      <div style={{ width: "min(320px, 100%)", display: "grid", gap: 8 }}>
        <span style={{ position: "relative", height: Math.max(thumb, trackHeight), display: "flex", alignItems: "center" }}>
          <span style={{ position: "absolute", inset: `auto 0`, height: trackHeight, borderRadius: trackHeight, background: ctx.c("track", "border") }} />
          <span style={{ position: "absolute", left: 0, width: "62%", height: trackHeight, borderRadius: trackHeight, background: ctx.c("fill", "accent") }} />
          <span style={{ position: "absolute", left: "62%", width: thumb, height: thumb, borderRadius: thumb, background: "#fff", border: `2px solid ${ctx.c("fill", "accent")}`, transform: "translateX(-50%)" }} />
        </span>
        <span style={{ fontSize: ctx.n("font_size", 13), color: ctx.c("text", "muted") }}>62 of 100</span>
      </div>
    );
  },
  chips: (ctx) => {
    const chip = (label: string, active: boolean) => (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          height: ctx.n("height", 28),
          padding: `0 ${ctx.n("padding_x", 12)}px`,
          borderRadius: ctx.n("radius", 14),
          fontSize: ctx.n("font_size", 13),
          background: active ? ctx.c("text", "text") : ctx.c("fill", "background"),
          color: active ? ctx.c("fill", "background") : ctx.c("text", "text"),
          border: `1px solid ${active ? ctx.c("text", "text") : ctx.c("border", "border")}`,
        }}
      >
        {label}
      </span>
    );
    return (
      <div className="preview-row" style={{ gap: ctx.n("gap", 8) }}>
        {chip("All", true)}
        {chip("Slides", false)}
        {chip("Reports", false)}
        {chip("Web", false)}
      </div>
    );
  },
  search: (ctx) => (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "min(320px, 100%)",
        minHeight: ctx.n("height", 40),
        padding: `0 ${ctx.n("padding_x", 12)}px`,
        borderRadius: ctx.n("radius", 6),
        background: ctx.c("fill", "surface"),
        border: `1px solid ${ctx.c("border", "border")}`,
        color: ctx.c("text", "text"),
        fontSize: ctx.n("font_size", 14),
      }}
    >
      <span style={{ opacity: 0.5 }}>⌕</span>
      Search brand assets…
    </span>
  ),
  form: (ctx) => {
    const field = (label: string) => (
      <span style={{ display: "grid", gap: 4 }}>
        <span style={{ fontSize: ctx.n("label_size", 13), color: ctx.brand.tokens.colors.muted }}>{label}</span>
        <span
          style={{
            height: ctx.n("field_height", 40),
            borderRadius: ctx.n("radius", 6),
            background: ctx.c("fill", "surface"),
            border: `1px solid ${ctx.c("border", "border")}`,
          }}
        />
      </span>
    );
    return (
      <div style={{ display: "grid", gap: ctx.n("gap", 16), width: "min(320px, 100%)" }}>
        {field("Full name")}
        {field("Company")}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifySelf: "start",
            minHeight: 40,
            padding: "0 16px",
            borderRadius: ctx.n("radius", 6),
            fontSize: 14,
            fontWeight: 600,
            background: ctx.brand.tokens.colors.accent,
            color: ctx.brand.tokens.colors.surface ?? "#fff",
          }}
        >
          Send request
        </span>
      </div>
    );
  },
  appbar: (ctx) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: ctx.n("gap", 16),
        height: ctx.n("height", 56),
        padding: `0 ${ctx.n("padding_x", 24)}px`,
        background: ctx.c("fill", "surface"),
        borderBottom: `1px solid ${ctx.c("border", "border")}`,
        color: ctx.c("text", "text"),
        fontSize: ctx.n("font_size", 14),
        width: "100%",
        maxWidth: 520,
        borderRadius: 8,
      }}
    >
      <strong>{ctx.brand.tokens.logo.wordmark}</strong>
      <span style={{ display: "flex", gap: 16, opacity: 0.75 }}>
        <span>Overview</span>
        <span>Reports</span>
        <span>Settings</span>
      </span>
      <span style={{ width: 28, height: 28, borderRadius: 14, background: ctx.brand.tokens.colors.accent }} />
    </div>
  ),
  tabs: (ctx) => {
    const tab = (label: string, active: boolean) => (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          height: ctx.n("height", 40),
          fontSize: ctx.n("font_size", 14),
          color: active ? ctx.c("active", "accent") : ctx.c("text", "muted"),
          boxShadow: active ? `inset 0 -${ctx.n("marker_size", 2)}px 0 ${ctx.c("active", "accent")}` : "none",
          fontWeight: active ? 600 : 400,
        }}
      >
        {label}
      </span>
    );
    return (
      <div style={{ display: "flex", gap: ctx.n("gap", 24), borderBottom: `1px solid ${ctx.brand.tokens.colors.border}` }}>
        {tab("Overview", true)}
        {tab("Rules", false)}
        {tab("Outputs", false)}
      </div>
    );
  },
  sidenav: (ctx) => {
    const item = (label: string, active: boolean) => (
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          height: ctx.n("item_height", 36),
          padding: "0 10px",
          borderRadius: ctx.n("radius", 6),
          fontSize: ctx.n("font_size", 14),
          background: active ? `${ctx.c("active", "accent")}14` : "transparent",
          color: active ? ctx.c("active", "accent") : ctx.c("text", "text"),
          boxShadow: active ? `inset 2px 0 0 ${ctx.c("active", "accent")}` : "none",
          fontWeight: active ? 600 : 400,
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: 4, background: "currentColor", opacity: 0.6 }} />
        {label}
      </span>
    );
    return (
      <div
        style={{
          width: Math.min(ctx.n("width", 240), 300),
          display: "grid",
          gap: ctx.n("gap", 4),
          padding: 8,
          background: ctx.c("fill", "surface"),
          border: `1px solid ${ctx.brand.tokens.colors.border}`,
          borderRadius: 10,
        }}
      >
        {item("Dashboard", true)}
        {item("Brand systems", false)}
        {item("Outputs", false)}
        {item("Settings", false)}
      </div>
    );
  },
  breadcrumbs: (ctx) => (
    <span style={{ display: "inline-flex", gap: ctx.n("gap", 8), fontSize: ctx.n("font_size", 13), color: ctx.c("text", "muted") }}>
      <span>Home</span>
      <span>/</span>
      <span>Reports</span>
      <span>/</span>
      <span style={{ color: ctx.c("active", "text"), fontWeight: 600 }}>Q3 summary</span>
    </span>
  ),
  pagination: (ctx) => {
    const size = ctx.n("box_size", 32);
    const page = (label: string, active: boolean) => (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: size,
          height: size,
          borderRadius: ctx.n("radius", 6),
          fontSize: ctx.n("font_size", 13),
          background: active ? ctx.c("active", "accent") : ctx.c("fill", "surface"),
          color: active ? "#fff" : ctx.c("text", "text"),
          border: `1px solid ${active ? ctx.c("active", "accent") : ctx.brand.tokens.colors.border}`,
        }}
      >
        {label}
      </span>
    );
    return (
      <div className="preview-row" style={{ gap: ctx.n("gap", 4) }}>
        {page("‹", false)}
        {page("1", true)}
        {page("2", false)}
        {page("3", false)}
        {page("›", false)}
      </div>
    );
  },
  menu: (ctx) => (
    <div
      style={{
        width: Math.min(ctx.n("width", 200), 280),
        padding: `${ctx.n("padding_y", 8)}px 0`,
        borderRadius: ctx.n("radius", 8),
        background: ctx.c("fill", "surface"),
        border: `1px solid ${ctx.c("border", "border")}`,
        boxShadow: "0 8px 24px rgba(15, 30, 25, 0.12)",
        display: "grid",
        fontSize: ctx.n("font_size", 14),
        color: ctx.c("text", "text"),
      }}
    >
      {["Rename", "Duplicate", "Share…"].map((label) => (
        <span key={label} style={{ display: "flex", alignItems: "center", height: ctx.n("item_height", 36), padding: "0 14px" }}>
          {label}
        </span>
      ))}
      <span style={{ height: 1, background: ctx.brand.tokens.colors.border, margin: "4px 0" }} />
      <span style={{ display: "flex", alignItems: "center", height: ctx.n("item_height", 36), padding: "0 14px", color: ctx.brand.tokens.colors.danger }}>
        Delete
      </span>
    </div>
  ),
  toast: (ctx) => (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: ctx.n("gap", 12),
        padding: `${ctx.n("padding_y", 12)}px ${ctx.n("padding_x", 16)}px`,
        borderRadius: ctx.n("radius", 8),
        background: ctx.c("fill", "text"),
        color: ctx.c("text", "surface"),
        fontSize: ctx.n("font_size", 14),
        boxShadow: "0 8px 24px rgba(15, 30, 25, 0.18)",
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 4, background: ctx.c("active", "success") }} />
      Saved. Everything is up to date.
      <span style={{ textDecoration: "underline", fontWeight: 600 }}>Undo</span>
    </span>
  ),
  banner: (ctx) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: `${ctx.n("padding_y", 12)}px ${ctx.n("padding_x", 16)}px`,
        borderRadius: ctx.n("radius", 8),
        background: ctx.c("fill", "background"),
        color: ctx.c("text", "text"),
        borderLeft: `4px solid ${ctx.c("border", "accent")}`,
        border: `1px solid ${ctx.brand.tokens.colors.border}`,
        fontSize: ctx.n("font_size", 14),
        width: "min(420px, 100%)",
      }}
    >
      <span style={{ fontWeight: 700, color: ctx.c("border", "accent") }}>ℹ</span>
      Your trial ends in 5 days. Pick a plan to keep generating.
    </div>
  ),
  progress: (ctx) => {
    const barHeight = ctx.n("bar_height", 8);
    return (
      <div style={{ width: "min(320px, 100%)", display: "grid", gap: 8 }}>
        <span style={{ height: barHeight, borderRadius: ctx.n("radius", 4), background: ctx.c("track", "border"), overflow: "hidden", display: "block" }}>
          <span style={{ display: "block", width: "68%", height: "100%", background: ctx.c("fill", "accent") }} />
        </span>
        <span style={{ fontSize: ctx.n("label_size", 13), color: ctx.c("text", "muted") }}>Generating… 68%</span>
      </div>
    );
  },
  empty: (ctx) => (
    <div
      style={{
        display: "grid",
        justifyItems: "center",
        gap: ctx.n("gap", 12),
        padding: `${ctx.n("padding_y", 32)}px 24px`,
        borderRadius: ctx.n("radius", 8),
        background: ctx.c("fill", "background"),
        border: `1px dashed ${ctx.c("border", "border")}`,
        width: "min(360px, 100%)",
        textAlign: "center",
      }}
    >
      <span style={{ width: ctx.n("icon_size", 40), height: ctx.n("icon_size", 40), borderRadius: 12, background: `${ctx.brand.tokens.colors.accent}22` }} />
      <strong style={{ color: ctx.brand.tokens.colors.text }}>No reports yet</strong>
      <span style={{ fontSize: ctx.n("font_size", 14), color: ctx.c("text", "muted") }}>
        Upload a brand source and we'll build the first one for you.
      </span>
    </div>
  ),
  tooltip: (ctx) => (
    <span style={{ display: "inline-grid", justifyItems: "center", gap: 4 }}>
      <span
        style={{
          padding: `${ctx.n("padding_y", 6)}px ${ctx.n("padding_x", 8)}px`,
          borderRadius: ctx.n("radius", 4),
          background: ctx.c("fill", "text"),
          color: ctx.c("text", "surface"),
          fontSize: ctx.n("font_size", 12),
        }}
      >
        Regenerate all outputs
      </span>
      <span style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: `5px solid ${ctx.c("fill", "text")}` }} />
      <span style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${ctx.brand.tokens.colors.border}`, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>↻</span>
    </span>
  ),
  badge: (ctx) => {
    const badge = (label: string, roleName: string) => (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          height: ctx.n("height", 20),
          padding: `0 ${ctx.n("padding_x", 8)}px`,
          borderRadius: ctx.n("radius", 10),
          fontSize: ctx.n("font_size", 12),
          fontWeight: ctx.n("font_weight", 600),
          background: roleColor(ctx.brand, roleName, "accent"),
          color: ctx.c("text", "surface"),
        }}
      >
        {label}
      </span>
    );
    return (
      <div className="preview-row">
        {badge("3 new", "accent")}
        {badge("Approved", "success")}
        {badge("Needs review", "warning")}
        {badge("Failing", "danger")}
      </div>
    );
  },
  dialog: (ctx) => (
    <div
      style={{
        width: Math.min(ctx.n("width", 360), 420),
        maxWidth: "100%",
        padding: ctx.n("padding", 24),
        borderRadius: ctx.n("radius", 8),
        background: ctx.c("fill", "surface"),
        border: `1px solid ${ctx.c("border", "border")}`,
        boxShadow: "0 16px 40px rgba(15, 30, 25, 0.18)",
        display: "grid",
        gap: ctx.n("gap", 16),
        color: ctx.c("text", "text"),
      }}
    >
      <strong style={{ fontSize: ctx.n("title_size", 18) }}>Delete this source?</strong>
      <span style={{ fontSize: ctx.n("font_size", 14), color: ctx.brand.tokens.colors.muted }}>
        You can undo this for a little while afterwards.
      </span>
      <span style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <span style={{ padding: "8px 14px", borderRadius: 6, border: `1px solid ${ctx.brand.tokens.colors.border}`, fontSize: 14 }}>Cancel</span>
        <span style={{ padding: "8px 14px", borderRadius: 6, background: ctx.brand.tokens.colors.danger, color: "#fff", fontSize: 14, fontWeight: 600 }}>Delete</span>
      </span>
    </div>
  ),
  drawer: (ctx) => (
    <Scale w={520} h={280} s={0.85}>
      <div style={{ display: "flex", width: 520, height: 280, background: "rgba(15, 30, 25, 0.28)", borderRadius: 12, overflow: "hidden" }}>
        <span style={{ flex: 1 }} />
        <div
          style={{
            width: Math.min(ctx.n("width", 320), 360),
            background: ctx.c("fill", "surface"),
            borderLeft: `1px solid ${ctx.c("border", "border")}`,
            padding: ctx.n("padding", 24),
            display: "grid",
            gap: ctx.n("gap", 16),
            alignContent: "start",
            color: ctx.c("text", "text"),
          }}
        >
          <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong>Source details</strong>
            <span style={{ opacity: 0.5 }}>✕</span>
          </span>
          <Lines color={ctx.c("text", "text")} count={3} width={92} />
          <Lines color={ctx.c("text", "text")} count={2} width={70} />
        </div>
      </div>
    </Scale>
  ),
  list: (ctx) => {
    const row = (title: string, meta: string, last: boolean) => (
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          height: ctx.n("item_height", 44),
          padding: `0 ${ctx.n("padding_x", 16)}px`,
          borderBottom: last ? "none" : `1px solid ${ctx.c("border", "border")}`,
          fontSize: ctx.n("font_size", 14),
          color: ctx.c("text", "text"),
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: 4, background: ctx.brand.tokens.colors.accent }} />
        <span style={{ flex: 1 }}>{title}</span>
        <span style={{ color: ctx.brand.tokens.colors.muted, fontSize: 12 }}>{meta}</span>
      </span>
    );
    return (
      <div style={{ width: "min(380px, 100%)", background: ctx.c("fill", "surface"), border: `1px solid ${ctx.c("border", "border")}`, borderRadius: 10, display: "grid" }}>
        {row("Brand guidelines.pdf", "2 MB", false)}
        {row("Logo pack", "6 files", false)}
        {row("Website capture", "yesterday", true)}
      </div>
    );
  },
  accordion: (ctx) => (
    <div style={{ width: "min(380px, 100%)", display: "grid", gap: 8 }}>
      <div style={{ borderRadius: ctx.n("radius", 8), border: `1px solid ${ctx.c("border", "border")}`, background: ctx.c("fill", "surface"), overflow: "hidden" }}>
        <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: ctx.n("header_height", 44), padding: `0 ${ctx.n("padding_x", 16)}px`, fontWeight: 600, fontSize: ctx.n("font_size", 14), color: ctx.c("text", "text") }}>
          What happens to my files? <span>▴</span>
        </span>
        <span style={{ display: "block", padding: `0 ${ctx.n("padding_x", 16)}px 14px`, fontSize: ctx.n("font_size", 14), color: ctx.brand.tokens.colors.muted }}>
          They stay in your brand library and only feed your own design system.
        </span>
      </div>
      <div style={{ borderRadius: ctx.n("radius", 8), border: `1px solid ${ctx.c("border", "border")}`, background: ctx.c("fill", "surface") }}>
        <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: ctx.n("header_height", 44), padding: `0 ${ctx.n("padding_x", 16)}px`, fontSize: ctx.n("font_size", 14), color: ctx.c("text", "text") }}>
          Can I edit the results? <span>▾</span>
        </span>
      </div>
    </div>
  ),
  card: (ctx) => (
    <div
      style={{
        width: "min(320px, 100%)",
        padding: ctx.n("padding", 24),
        borderRadius: ctx.n("radius", 8),
        background: ctx.c("fill", "surface"),
        border: `1px solid ${ctx.c("border", "border")}`,
        display: "grid",
        gap: ctx.n("gap", 12),
        color: ctx.c("text", "text"),
      }}
    >
      <span style={{ width: 32, height: 32, borderRadius: 8, background: `${ctx.brand.tokens.colors.accent}22` }} />
      <strong style={{ fontSize: ctx.n("title_size", 16) }}>Quarterly review deck</strong>
      <span style={{ fontSize: ctx.n("font_size", 14), color: ctx.brand.tokens.colors.muted }}>
        Generated 5 minutes ago from the approved brand rules.
      </span>
      <span style={{ fontSize: 13, fontWeight: 600, color: ctx.brand.tokens.colors.accent }}>Open preview →</span>
    </div>
  ),
  table: (ctx) => {
    const rowHeight = ctx.n("row_height", 44);
    const row = (cells: [string, string, string], last: boolean) => (
      <span style={{ display: "grid", gridTemplateColumns: "1fr 90px 70px", alignItems: "center", height: rowHeight, padding: `0 ${ctx.n("padding_x", 12)}px`, borderBottom: last ? "none" : `1px solid ${ctx.c("border", "border")}`, fontSize: ctx.n("font_size", 14), color: ctx.c("text", "text") }}>
        <span>{cells[0]}</span>
        <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{cells[1]}</span>
        <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{cells[2]}</span>
      </span>
    );
    return (
      <div style={{ width: "min(420px, 100%)", background: ctx.c("fill", "surface"), border: `1px solid ${ctx.c("border", "border")}`, borderRadius: 10, overflow: "hidden", display: "grid" }}>
        <span style={{ display: "grid", gridTemplateColumns: "1fr 90px 70px", padding: `10px ${ctx.n("padding_x", 12)}px`, fontSize: ctx.n("header_size", 12), letterSpacing: "0.04em", textTransform: "uppercase", color: ctx.c("header_color", "muted"), borderBottom: `1px solid ${ctx.c("border", "border")}` }}>
          <span>Check</span>
          <span style={{ textAlign: "right" }}>Target</span>
          <span style={{ textAlign: "right" }}>Result</span>
        </span>
        {row(["Text contrast", "4.5:1", "12.6"], false)}
        {row(["Tap area", "44px", "44"], false)}
        {row(["Type floor", "12px", "13"], true)}
      </div>
    );
  },
  chart: (ctx) => {
    const heights = [42, 68, 54, 88, 61, 74];
    return (
      <div style={{ width: "min(360px, 100%)", display: "grid", gap: 8 }}>
        <span style={{ display: "flex", alignItems: "flex-end", gap: ctx.n("gap", 8), height: ctx.n("height", 120), borderBottom: `1px solid ${ctx.c("track", "border")}` }}>
          {heights.map((height, index) => (
            <span
              key={index}
              style={{
                flex: 1,
                height: `${height}%`,
                borderRadius: `${ctx.n("radius", 4)}px ${ctx.n("radius", 4)}px 0 0`,
                background: index === 3 ? ctx.c("fill", "accent") : `${ctx.c("fill", "accent")}55`,
              }}
            />
          ))}
        </span>
        <span style={{ fontSize: ctx.n("label_size", 12), color: ctx.c("text", "muted") }}>Outputs generated per week</span>
      </div>
    );
  },
  kpi: (ctx) => (
    <div className="preview-row">
      {[
        ["128", "rules approved"],
        ["96%", "checks passing"],
      ].map(([value, label]) => (
        <div
          key={label}
          style={{
            padding: ctx.n("padding", 24),
            borderRadius: ctx.n("radius", 8),
            background: ctx.c("fill", "surface"),
            border: `1px solid ${ctx.c("border", "border")}`,
            display: "grid",
            gap: ctx.n("gap", 8),
            minWidth: 140,
          }}
        >
          <strong style={{ fontSize: ctx.n("value_size", 32), lineHeight: 1.05, color: ctx.c("active", "accent") }}>{value}</strong>
          <span style={{ fontSize: ctx.n("label_size", 13), color: ctx.c("text", "muted") }}>{label}</span>
        </div>
      ))}
    </div>
  ),
  avatar: (ctx) => {
    const size = ctx.n("box_size", 40);
    return (
      <div className="preview-row" style={{ alignItems: "center" }}>
        {["AL", "SR", "+3"].map((initials, index) => (
          <span
            key={initials}
            style={{
              width: size,
              height: size,
              borderRadius: size,
              background: index === 2 ? ctx.brand.tokens.colors.border : ctx.c("fill", "accent"),
              color: index === 2 ? ctx.brand.tokens.colors.text : ctx.c("text", "surface"),
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: ctx.n("font_size", 14),
              fontWeight: ctx.n("font_weight", 600),
              marginLeft: index ? -size * 0.25 : 0,
              border: "2px solid #fff",
            }}
          >
            {initials}
          </span>
        ))}
      </div>
    );
  },
  quote: (ctx) => (
    <div
      style={{
        width: "min(420px, 100%)",
        padding: ctx.n("padding", 24),
        borderLeft: `${ctx.n("bar_width", 4)}px solid ${ctx.c("active", "accent")}`,
        borderRadius: ctx.n("radius", 8),
        background: ctx.c("fill", "background"),
        color: ctx.c("text", "text"),
        display: "grid",
        gap: 8,
      }}
    >
      <span style={{ fontSize: ctx.n("font_size", 18), lineHeight: 1.4 }}>
        “One source of truth for the brand — everything we ship inherits it.”
      </span>
      <span style={{ fontSize: 13, color: ctx.brand.tokens.colors.muted }}>Head of Design</span>
    </div>
  ),
  footer: (ctx) => (
    <div
      style={{
        width: "min(520px, 100%)",
        padding: `${ctx.n("padding_y", 32)}px 24px`,
        background: ctx.c("fill", "text"),
        color: ctx.c("text", "surface"),
        borderRadius: 10,
        display: "grid",
        gap: ctx.n("gap", 16),
        fontSize: ctx.n("font_size", 13),
      }}
    >
      <strong>{ctx.brand.tokens.logo.wordmark}</strong>
      <span style={{ display: "flex", gap: 24, opacity: 0.8 }}>
        <span>About</span>
        <span>Careers</span>
        <span>Privacy</span>
        <span>Contact</span>
      </span>
      <span style={{ opacity: 0.55 }}>© {ctx.brand.metadata.name}. All rights reserved.</span>
    </div>
  ),
  slide: (ctx) => {
    const safeZone = ctx.n("safe_zone", 96);
    return (
      <Scale w={960} h={540} s={0.5}>
        <div style={{ width: 960, height: 540, background: ctx.c("fill", "background"), color: ctx.c("text", "text"), borderRadius: 16, border: `1px solid ${ctx.brand.tokens.colors.border}`, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: safeZone / 2, border: `1px dashed ${ctx.brand.tokens.colors.border}`, borderRadius: 8, pointerEvents: "none" }} />
          <div style={{ position: "absolute", inset: safeZone, display: "grid", alignContent: "center", gap: ctx.n("gap", 32) }}>
            <span style={{ fontSize: ctx.n("title_size", 40) * 1.4, fontWeight: 700, lineHeight: 1.08 }}>
              The quarterly story, already on brand.
            </span>
            <span style={{ fontSize: ctx.n("body_size", 22) * 1.2, color: ctx.brand.tokens.colors.muted, maxWidth: 640 }}>
              Every slide starts from the same approved tokens and rules.
            </span>
          </div>
          <span style={{ position: "absolute", left: safeZone, bottom: 28, fontSize: 18, fontWeight: 700, color: ctx.c("active", "accent") }}>
            {ctx.brand.tokens.logo.wordmark}
          </span>
        </div>
      </Scale>
    );
  },
  page: (ctx) => (
    <Scale w={760} h={520} s={0.55}>
      <div style={{ width: 760, height: 520, background: ctx.c("fill", "surface"), color: ctx.c("text", "text"), border: `1px solid ${ctx.brand.tokens.colors.border}`, borderRadius: 8, padding: ctx.n("margin", 64), display: "grid", gap: ctx.n("gap", 16), alignContent: "start" }}>
        <span style={{ fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: ctx.c("active", "accent"), fontWeight: 700 }}>
          {ctx.brand.metadata.name}
        </span>
        <span style={{ fontSize: ctx.n("title_size", 24) * 1.5, fontWeight: 700, lineHeight: 1.15 }}>Q3 Brand Health Report</span>
        <Lines color={ctx.c("text", "text")} count={4} width={100} />
        <span style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 8 }}>
          <span style={{ height: 96, borderRadius: 8, background: `${ctx.c("active", "accent")}12`, border: `1px solid ${ctx.brand.tokens.colors.border}` }} />
          <Lines color={ctx.c("text", "text")} count={4} width={100} />
        </span>
      </div>
    </Scale>
  ),
  shell: (ctx) => (
    <Scale w={960} h={560} s={0.5}>
      <div style={{ width: 960, height: 560, display: "grid", gridTemplateColumns: `${ctx.n("nav_width", 240)}px 1fr`, background: ctx.c("fill", "background"), border: `1px solid ${ctx.c("border", "border")}`, borderRadius: 16, overflow: "hidden", color: ctx.c("text", "text") }}>
        <div style={{ background: ctx.brand.tokens.colors.surface, borderRight: `1px solid ${ctx.c("border", "border")}`, padding: 20, display: "grid", gap: 10, alignContent: "start" }}>
          <strong style={{ fontSize: 16 }}>{ctx.brand.tokens.logo.wordmark}</strong>
          {["Overview", "Library", "Outputs", "Checks"].map((label, index) => (
            <span key={label} style={{ height: 34, borderRadius: 8, display: "flex", alignItems: "center", padding: "0 12px", fontSize: 14, background: index === 0 ? `${ctx.c("active", "accent")}14` : "transparent", color: index === 0 ? ctx.c("active", "accent") : "inherit", fontWeight: index === 0 ? 600 : 400 }}>
              {label}
            </span>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateRows: `${ctx.n("toolbar_height", 56)}px 1fr`, minWidth: 0 }}>
          <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: `0 ${ctx.n("padding", 24)}px`, borderBottom: `1px solid ${ctx.c("border", "border")}`, background: ctx.brand.tokens.colors.surface, fontSize: 15, fontWeight: 600 }}>
            Overview
            <span style={{ height: 32, padding: "0 14px", borderRadius: 6, background: ctx.c("active", "accent"), color: "#fff", display: "inline-flex", alignItems: "center", fontSize: 13 }}>Generate</span>
          </span>
          <div style={{ padding: ctx.n("padding", 24), display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: ctx.n("gap", 16), alignContent: "start" }}>
            {[0, 1, 2].map((index) => (
              <span key={index} style={{ height: 120, borderRadius: ctx.n("radius", 8), background: ctx.brand.tokens.colors.surface, border: `1px solid ${ctx.c("border", "border")}` }} />
            ))}
            <span style={{ gridColumn: "1 / -1", height: 180, borderRadius: ctx.n("radius", 8), background: ctx.brand.tokens.colors.surface, border: `1px solid ${ctx.c("border", "border")}` }} />
          </div>
        </div>
      </div>
    </Scale>
  ),
  hero: (ctx) => (
    <Scale w={960} h={420} s={0.5}>
      <div style={{ width: 960, height: 420, background: ctx.c("fill", "background"), color: ctx.c("text", "text"), border: `1px solid ${ctx.brand.tokens.colors.border}`, borderRadius: 16, padding: `${ctx.n("padding_y", 64)}px 72px`, display: "grid", alignContent: "center", gap: ctx.n("gap", 16) }}>
        <span style={{ fontSize: 15, letterSpacing: "0.08em", textTransform: "uppercase", color: ctx.brand.tokens.colors.muted }}>
          {ctx.brand.metadata.name}
        </span>
        <span style={{ fontSize: ctx.n("title_size", 40) * 1.3, fontWeight: 700, lineHeight: 1.1, maxWidth: 620 }}>
          Every page, deck, and report — already on brand.
        </span>
        <span style={{ fontSize: ctx.n("font_size", 18) * 1.1, color: ctx.brand.tokens.colors.muted, maxWidth: 560 }}>
          Generated straight from your design system.
        </span>
        <span style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <span style={{ height: 48, padding: "0 22px", borderRadius: 8, background: ctx.c("active", "accent"), color: "#fff", display: "inline-flex", alignItems: "center", fontSize: 17, fontWeight: 600 }}>
            Get started
          </span>
          <span style={{ height: 48, padding: "0 22px", borderRadius: 8, border: `1px solid ${ctx.brand.tokens.colors.border}`, display: "inline-flex", alignItems: "center", fontSize: 17 }}>
            See how it works
          </span>
        </span>
      </div>
    </Scale>
  ),
  swatches: (ctx) => {
    const roles = semanticRoles(ctx.brand).slice(0, 12);
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: ctx.n("gap", 8), width: "100%", maxWidth: 480 }}>
        {roles.map((name) => (
          <span key={name} style={{ display: "grid", gap: 4 }}>
            <span style={{ height: ctx.n("box_size", 48), borderRadius: ctx.n("radius", 8), background: ctx.brand.tokens.colors[name], border: `1px solid ${ctx.c("border", "border")}` }} />
            <span style={{ fontSize: 12, color: ctx.brand.tokens.colors.muted }}>{name}</span>
          </span>
        ))}
      </div>
    );
  },
  type: (ctx) => {
    const sizes = Object.entries(ctx.brand.tokens.typography.sizes).sort(([, a], [, b]) => a - b);
    return (
      <div style={{ display: "grid", gap: ctx.n("gap", 12), width: "100%", maxWidth: 460 }}>
        {sizes.map(([name, size]) => (
          <span key={name} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, borderBottom: `1px solid ${ctx.brand.tokens.colors.border}`, paddingBottom: 8 }}>
            <span style={{ fontSize: Math.min(size, 40), color: ctx.c("text", "text"), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              Brand voice
            </span>
            <span style={{ fontSize: 12, color: ctx.brand.tokens.colors.muted, whiteSpace: "nowrap" }}>
              {name} · {size}px
            </span>
          </span>
        ))}
      </div>
    );
  },
  spacing: (ctx) => {
    const steps = ctx.brand.tokens.spacing.scale.filter((value) => value <= 64);
    return (
      <div style={{ display: "grid", gap: ctx.n("gap", 8), width: "100%", maxWidth: 380 }}>
        {steps.map((value) => (
          <span key={value} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: value * 3, maxWidth: "70%", height: 12, borderRadius: 4, background: ctx.c("fill", "accent"), opacity: 0.75 }} />
            <span style={{ fontSize: 12, color: ctx.c("text", "muted"), fontVariantNumeric: "tabular-nums" }}>{value}px</span>
          </span>
        ))}
      </div>
    );
  },
  logo: (ctx) => {
    const clearSpace = ctx.n("clear_space", 16);
    return (
      <div style={{ display: "inline-block", padding: clearSpace, border: `1px dashed ${ctx.c("border", "border")}`, borderRadius: ctx.n("radius", 8), background: ctx.c("fill", "surface") }}>
        {ctx.brand.tokens.logo.image_url ? (
          <img alt="" src={ctx.brand.tokens.logo.image_url} style={{ display: "block", height: ctx.n("logo_height", 26), maxWidth: 220, objectFit: "contain" }} />
        ) : (
          <strong style={{ fontSize: ctx.n("logo_height", 26), color: ctx.c("text", "text") }}>{ctx.brand.tokens.logo.wordmark}</strong>
        )}
      </div>
    );
  },
};

function renderGeneric(ctx: PreviewContext, component: DesignComponent): ReactNode {
  const parts = component.anatomy?.length ? component.anatomy : ["container", "content"];
  return (
    <div
      style={{
        display: "grid",
        gap: ctx.n("gap", 8),
        padding: ctx.n("padding", 16),
        borderRadius: ctx.n("radius", 8),
        background: ctx.c("fill", "surface"),
        border: `1px solid ${ctx.c("border", "border")}`,
        width: "min(360px, 100%)",
      }}
    >
      {parts.slice(0, 5).map((part) => (
        <span
          key={part}
          style={{
            padding: "10px 12px",
            borderRadius: 6,
            border: `1px dashed ${ctx.c("border", "border")}`,
            fontSize: ctx.n("font_size", 14),
            color: ctx.c("text", "text"),
          }}
        >
          {part}
        </span>
      ))}
    </div>
  );
}
