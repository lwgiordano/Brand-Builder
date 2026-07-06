import type { ValidationResult } from "../types";

export function validationResultKey(result: ValidationResult, index: number): string {
  return [
    result.rule_id,
    result.metric,
    result.status,
    scopeKey(result.scope),
    index,
  ].join("::");
}

export function validationScopeLabel(result: ValidationResult): string {
  const entries = Object.entries(result.scope ?? {});
  if (!entries.length) return "global";
  return entries
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" / ");
}

function scopeKey(scope: ValidationResult["scope"]): string {
  return Object.entries(scope ?? {})
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join("|");
}
