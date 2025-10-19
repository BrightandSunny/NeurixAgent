"use strict";
// router/src/providers/index.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.providers = void 0;
exports.pickProviders = pickProviders;
// ---------- Concrete provider wiring ----------
/**
 * Adjust the path below if your provider is elsewhere.
 * We import its runtime function and (optionally) its result type.
 */
const openaiProvider_1 = require("./openaiProvider");
/** Normalize any OpenAI result into the shape the orchestrator expects. */
function toReviewResult(r) {
    const o = (r !== null && r !== void 0 ? r : {});
    // Be permissive: accept any of these flags as success.
    const ok = typeof o.ok === "boolean"
        ? o.ok
        : typeof o.success === "boolean"
            ? o.success
            : Boolean(o.patch); // if it produced a patch, consider it ok
    const patch = typeof o.patch === "string" ? o.patch : undefined;
    return { ok, patch, ...o };
}
/** Adapter to expose OpenAI provider with the expected interface. */
const openaiAdapter = {
    review: async (item) => {
        // If you kept the OpenAIResult import above, this line helps TS inference.
        const raw = (await (0, openaiProvider_1.openaiProvider)(item));
        return toReviewResult(raw);
    },
};
// ---------- Registry & selection helpers ----------
exports.providers = {
    openai: openaiAdapter,
};
function pickProviders(names) {
    if (!names || names === "all")
        return Object.values(exports.providers);
    const list = Array.isArray(names) ? names : [names];
    return list
        .map((n) => String(n).trim())
        .filter((n) => n in exports.providers)
        .map((n) => exports.providers[n]);
}
exports.default = exports.providers;
