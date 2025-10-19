// router/src/providers/index.ts

// ---------- Shared types consumed by orchestrators ----------
export interface WorkItem {
  file: string;              // used by parallel orchestrator for locking
  payload?: unknown;
  [key: string]: unknown;
}

export interface ReviewResult {
  ok: boolean;               // REQUIRED by orchestrator
  patch?: string;            // optional accumulated patch text
  [key: string]: unknown;    // keep everything else for debugging/metrics
}

export interface Provider {
  review(item: WorkItem): Promise<ReviewResult>;
}

// ---------- Concrete provider wiring ----------
/**
 * Adjust the path below if your provider is elsewhere.
 * We import its runtime function and (optionally) its result type.
 */
import {
  openaiProvider,
  // If the module exports a result type, great—use it to help the adapter.
  // If it doesn't, you can delete the line below and it still works.
  type ProviderResult as OpenAIResult,
} from "./openaiProvider";

/** Normalize any OpenAI result into the shape the orchestrator expects. */
function toReviewResult(r: unknown): ReviewResult {
  const o = (r ?? {}) as Record<string, unknown>;

  // Be permissive: accept any of these flags as success.
  const ok =
    typeof o.ok === "boolean"
      ? (o.ok as boolean)
      : typeof o.success === "boolean"
        ? (o.success as boolean)
        : Boolean(o.patch); // if it produced a patch, consider it ok

  const patch =
    typeof o.patch === "string" ? (o.patch as string) : undefined;

  return { ok, patch, ...o };
}

/** Adapter to expose OpenAI provider with the expected interface. */
const openaiAdapter: Provider = {
  review: async (item) => {
    // If you kept the OpenAIResult import above, this line helps TS inference.
    const raw = (await openaiProvider(item as any)) as OpenAIResult | unknown;
    return toReviewResult(raw);
  },
};

// ---------- Registry & selection helpers ----------
export const providers = {
  openai: openaiAdapter,
} as const;

export type ProviderName = keyof typeof providers;

export function pickProviders(
  names?: ProviderName | ProviderName[] | "all" | string
): Provider[] {
  if (!names || names === "all") return Object.values(providers);
  const list = Array.isArray(names) ? names : [names];
  return list
    .map((n) => String(n).trim())
    .filter((n): n is ProviderName => n in providers)
    .map((n) => providers[n]);
}

export default providers;
