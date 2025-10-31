// D:\NeurixAgent\router\src\services\codex.ts
import OpenAI from "openai";
import { z } from "zod";

const ReviewSchema = z.object({
  ok: z.boolean().default(true),
  atIds: z.array(z.string()).default([]),
  branch: z.string().default("chore/codex"),
  summary: z.string().default(""),
  blocking_issues: z.array(z.string()).default([]),
  non_blocking: z.array(z.string()).default([]),
  suggested_patch_unified: z.string().default(""),
  type: z.literal("codex.task.v1"),
});
export type ReviewResult = z.infer<typeof ReviewSchema>;

export async function codexReview(task: {
  instructions: string;
  diffOrFiles: string;
  atIds?: string[];
  branch?: string;
}): Promise<ReviewResult> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

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
  } as const;

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
  const raw =
    response.output_text ??
    (() => {
      try {
        const parts =
          response.output?.flatMap((m: any) => m?.content ?? []) ?? [];
        const text = parts
          .filter((p: any) => p?.type === "output_text")
          .map((p: any) => p?.text ?? "")
          .join("");
        return text || "{}";
      } catch {
        return "{}";
      }
    })();

  // Parse and validate against our local Zod schema for safety.
  try {
    return ReviewSchema.parse(JSON.parse(raw));
  } catch {
    // Last resort: try to peel JSON if any stray characters slipped in.
    const m = raw.match(/\{[\s\S]*\}$/);
    if (m) {
      try {
        return ReviewSchema.parse(JSON.parse(m[0]));
      } catch {
        /* fall through */
      }
    }
    return {
      ok: true,
      atIds: task.atIds ?? [],
      branch: task.branch ?? "chore/codex",
      summary:
        "Model output could not be validated. Returning empty patch and notes.",
      blocking_issues: [],
      non_blocking: ["Retry with stricter JSON-only instructions."],
      suggested_patch_unified: "",
      type: "codex.task.v1",
    };
  }
}
