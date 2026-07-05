import type {
  AiProposal,
  BrandMetadata,
  BrandPayload,
  CompletionSummary,
  JsonPatchOp,
  ProviderStatus,
  SourceRecord,
} from "./types";

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: init?.body instanceof FormData ? init.headers : { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(String(error.detail || response.statusText));
  }
  return response.json() as Promise<T>;
}

export function getStatus(): Promise<{ providers: ProviderStatus[]; default_provider: string; mode: string }> {
  return requestJson("/api/status");
}

export function listBrands(): Promise<{ brands: BrandMetadata[] }> {
  return requestJson("/api/brands");
}

export function createBrand(slug: string, name: string): Promise<{ brand: BrandPayload["brand"] }> {
  return requestJson("/api/brands", {
    method: "POST",
    body: JSON.stringify({ slug, name }),
  });
}

export function deleteBrand(slug: string): Promise<{ brands: BrandMetadata[] }> {
  return requestJson(`/api/brands/${slug}`, { method: "DELETE" });
}

export function getBrand(slug: string): Promise<BrandPayload> {
  return requestJson(`/api/brands/${slug}`);
}

export function saveRaw(slug: string, brand: unknown): Promise<BrandPayload> {
  return requestJson(`/api/brands/${slug}/raw`, {
    method: "POST",
    body: JSON.stringify({ brand }),
  });
}

export function generate(slug: string): Promise<Omit<BrandPayload, "brand" | "completeness">> {
  return requestJson(`/api/brands/${slug}/generate`, { method: "POST" });
}

export function completeInventory(slug: string): Promise<BrandPayload & { completion: CompletionSummary }> {
  return requestJson(`/api/brands/${slug}/inventory/complete`, { method: "POST" });
}

export function setRuleStatus(slug: string, ruleId: string, status: string): Promise<BrandPayload> {
  return requestJson(`/api/brands/${slug}/rules/${encodeURIComponent(ruleId)}/status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

export function uploadFiles(slug: string, files: FileList): Promise<{ brand: BrandPayload["brand"]; sources: SourceRecord[] }> {
  const body = new FormData();
  Array.from(files).forEach((file) => body.append("files", file));
  return requestJson(`/api/brands/${slug}/intake/upload`, { method: "POST", body });
}

export function uploadAssets(
  slug: string,
  files: FileList,
  role: "image" | "logo",
): Promise<{ brand: BrandPayload["brand"]; sources: SourceRecord[] }> {
  const body = new FormData();
  body.append("role", role);
  Array.from(files).forEach((file) => body.append("files", file));
  return requestJson(`/api/brands/${slug}/intake/assets`, { method: "POST", body });
}

export function addUrl(slug: string, url: string): Promise<{ brand: BrandPayload["brand"]; source: SourceRecord }> {
  return requestJson(`/api/brands/${slug}/intake/url`, {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}

export function deleteSource(slug: string, sourceId: string): Promise<BrandPayload> {
  return requestJson(`/api/brands/${slug}/sources/${encodeURIComponent(sourceId)}`, { method: "DELETE" });
}

export function extractFromSource(slug: string, sourceId: string, provider: string): Promise<{ proposal: AiProposal }> {
  return requestJson(`/api/brands/${slug}/ai/extract`, {
    method: "POST",
    body: JSON.stringify({ source_id: sourceId, provider }),
  });
}

export function applyDrafts(slug: string, proposal: AiProposal): Promise<BrandPayload> {
  return requestJson(`/api/brands/${slug}/drafts/apply`, {
    method: "POST",
    body: JSON.stringify({ proposal }),
  });
}

export function proposeEdit(slug: string, command: string, provider: string): Promise<{ proposal: AiProposal }> {
  return requestJson(`/api/brands/${slug}/ai/edit`, {
    method: "POST",
    body: JSON.stringify({ command, provider }),
  });
}

export function applyPatch(slug: string, patch: JsonPatchOp[], summary: string): Promise<BrandPayload> {
  return requestJson(`/api/brands/${slug}/patch/apply`, {
    method: "POST",
    body: JSON.stringify({ patch, summary }),
  });
}

export function undo(slug: string): Promise<BrandPayload> {
  return requestJson(`/api/brands/${slug}/undo`, { method: "POST" });
}
