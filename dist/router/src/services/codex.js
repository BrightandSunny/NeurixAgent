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
    blocking_issues: zod_1.z.array(zod_1.z.string()).default([]),
    non_blocking: zod_1.z.array(zod_1.z.string()).default([]),
    suggested_patch_unified: zod_1.z.string().default(""),
    type: zod_1.z.literal("codex.task.v1"),
});
async function codexReview(task) {
    var _a, _b, _c;
    const client = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY });
    const system = [
        "You are a code review agent.",
        "Return JSON ONLY that matches the provided JSON Schema (no markdown, no extra text).",
        "If proposing edits, include a unified diff in 'suggested_patch_unified'.",
    ].join("\n");
    const user = [
        `INSTRUCTIONS:\n${task.instructions}`,
        "",
        "DIFF_OR_FILES (unified-0 diff or file blobs below):",
        task.diffOrFiles,
    ].join("\n");
    // JSON Schema that the Responses API will validate BEFORE returning output.
    const reviewJsonSchema = {
        type: "object",
        additionalProperties: false,
        required: [
            "ok",
            "atIds",
            "branch",
            "summary",
            "blocking_issues",
            "non_blocking",
            "suggested_patch_unified",
            "type",
        ],
        properties: {
            ok: { type: "boolean", default: true },
            atIds: { type: "array", items: { type: "string" }, default: [] },
            branch: { type: "string", default: "chore/codex" },
            summary: { type: "string", default: "" },
            blocking_issues: { type: "array", items: { type: "string" }, default: [] },
            non_blocking: { type: "array", items: { type: "string" }, default: [] },
            suggested_patch_unified: { type: "string", default: "" },
            // IMPORTANT: this is the field named "type" in your result, and it itself must
            // have a JSON-Schema "type" (string) plus an enum to restrict its value.
            type: { type: "string", enum: ["codex.task.v1"] },
        },
    };
    const response = await client.responses.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        // Responses API content parts must use input_* types.
        input: [
            { role: "system", content: [{ type: "input_text", text: system }] },
            { role: "user", content: [{ type: "input_text", text: user }] },
        ],
        text: {
            format: {
                type: "json_schema",
                name: "codex_review_v1",
                schema: reviewJsonSchema,
                strict: true,
            },
        },
        temperature: 0.2,
    });
    // Prefer the convenience field; fall back to stitching output parts.
    const raw = (_a = response.output_text) !== null && _a !== void 0 ? _a : (() => {
        var _a, _b;
        try {
            const parts = (_b = (_a = response.output) === null || _a === void 0 ? void 0 : _a.flatMap((m) => { var _a; return (_a = m === null || m === void 0 ? void 0 : m.content) !== null && _a !== void 0 ? _a : []; })) !== null && _b !== void 0 ? _b : [];
            const text = parts
                .filter((p) => (p === null || p === void 0 ? void 0 : p.type) === "output_text")
                .map((p) => { var _a; return (_a = p === null || p === void 0 ? void 0 : p.text) !== null && _a !== void 0 ? _a : ""; })
                .join("");
            return text || "{}";
        }
        catch {
            return "{}";
        }
    })();
    // Parse and validate against our local Zod schema for safety.
    try {
        return ReviewSchema.parse(JSON.parse(raw));
    }
    catch {
        // Last resort: try to peel JSON if any stray characters slipped in.
        const m = raw.match(/\{[\s\S]*\}$/);
        if (m) {
            try {
                return ReviewSchema.parse(JSON.parse(m[0]));
            }
            catch {
                /* fall through */
            }
        }
        return {
            ok: true,
            atIds: (_b = task.atIds) !== null && _b !== void 0 ? _b : [],
            branch: (_c = task.branch) !== null && _c !== void 0 ? _c : "chore/codex",
            summary: "Model output could not be validated. Returning empty patch and notes.",
            blocking_issues: [],
            non_blocking: ["Retry with stricter JSON-only instructions."],
            suggested_patch_unified: "",
            type: "codex.task.v1",
        };
    }
}
