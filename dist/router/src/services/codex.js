"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.codexReview = codexReview;
// D:\NeurixAgent\router\src\services\codex.ts
const openai_1 = __importDefault(require("openai"));
const zod_1 = require("zod");
const ReviewSchema = zod_1.z.object({
    ok: zod_1.z.boolean().default(true),
    atIds: zod_1.z.array(zod_1.z.string()).default([]),
    branch: zod_1.z.string().default("chore/codex"),
    summary: zod_1.z.string().default(""),
    blocking_issues: zod_1.z.array(zod_1.z.any()).default([]),
    non_blocking: zod_1.z.array(zod_1.z.any()).default([]),
    suggested_patch_unified: zod_1.z.string().default(""),
    type: zod_1.z.literal("codex.task.v1")
});
async function codexReview(task) {
    var _a, _b;
    const client = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY });
    const system = [
        "You are a code review agent.",
        "Return JSON only, matching the Review schema.",
        "If proposing edits, include a unified diff in 'suggested_patch_unified'.",
        "No prose outside JSON."
    ].join("\n");
    const user = [
        `INSTRUCTIONS:\n${task.instructions}`,
        "",
        "DIFF_OR_FILES (unified-0 diff or file blobs below):",
        task.diffOrFiles
    ].join("\n");
    // Type-safe at runtime, but tell TS to stop complaining about response_format.
    const payload = {
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        input: [{ role: "system", content: system }, { role: "user", content: user }]
    };
    const resp = await client.responses.create(payload);
    const raw = resp.output_text || "{}";
    try {
        return ReviewSchema.parse(JSON.parse(raw));
    }
    catch {
        // last-resort: try to peel JSON from any stray text
        const m = raw.match(/\{[\s\S]*\}$/);
        if (m) {
            try {
                return ReviewSchema.parse(JSON.parse(m[0]));
            }
            catch { }
        }
        return {
            ok: true,
            atIds: (_a = task.atIds) !== null && _a !== void 0 ? _a : [],
            branch: (_b = task.branch) !== null && _b !== void 0 ? _b : "chore/codex",
            summary: "Model returned invalid JSON. No patch.",
            blocking_issues: [],
            non_blocking: ["Retry with stricter JSON-only instructions."],
            suggested_patch_unified: "",
            type: "codex.task.v1"
        };
    }
}
