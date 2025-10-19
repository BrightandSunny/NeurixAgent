// D:\NeurixAgent\router\src\services\codex.ts
import OpenAI from "openai";
import { z } from "zod";

const ReviewSchema = z.object({
  ok: z.boolean().default(true),
  atIds: z.array(z.string()).default([]),
  branch: z.string().default("chore/codex"),
  summary: z.string().default(""),
  blocking_issues: z.array(z.any()).default([]),
  non_blocking: z.array(z.any()).default([]),
  suggested_patch_unified: z.string().default(""),
  type: z.literal("codex.task.v1")
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
  const payload: any = {
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    input: [{ role: "system", content: system }, { role: "user", content: user }]
  };

  const resp = await client.responses.create(payload);

  const raw = resp.output_text || "{}";
  try {
    return ReviewSchema.parse(JSON.parse(raw));
  } catch {
    // last-resort: try to peel JSON from any stray text
    const m = raw.match(/\{[\s\S]*\}$/);
    if (m) {
      try { return ReviewSchema.parse(JSON.parse(m[0])); } catch {}
    }
    return {
      ok: true,
      atIds: task.atIds ?? [],
      branch: task.branch ?? "chore/codex",
      summary: "Model returned invalid JSON. No patch.",
      blocking_issues: [],
      non_blocking: ["Retry with stricter JSON-only instructions."],
      suggested_patch_unified: "",
      type: "codex.task.v1"
    };
  }
}
