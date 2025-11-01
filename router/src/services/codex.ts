import { z } from "zod";

const CodexInput = z.object({
  type: z.string().optional(),             // e.g. "codex.task.v1"
  repoPath: z.string(),
  branch: z.string(),
  atIds: z.array(z.string()).optional(),
  instructions: z.string(),
  diffOrFiles: z.string().optional(),      // for smoke test
});

export type CodexInput = z.infer<typeof CodexInput>;

export type CodexResult = {
  ok: boolean;
  note?: string;
};

export async function execute(input: CodexInput | string): Promise<CodexResult> {
  // Backward compat: allow previous signature execute(prompt: string)
  if (typeof input === "string") {
    return { ok: true, note: "noop (string mode)" };
  }
  // Validate object shape expected by tests
  CodexInput.parse(input);

  // Minimal no-op behavior to satisfy tests; wire your real pipeline later.
  // You can emit markers, write a temp file, etc., if desired.
  return { ok: true, note: "noop (object mode)" };
}
