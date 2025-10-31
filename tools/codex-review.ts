
  // tools/codex-review.ts
  import OpenAI from "openai";
  import { execSync } from "node:child_process";
  import { writeFileSync } from "node:fs";

  const MODEL = process.env.MODEL_REVIEW || "gpt-5";
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  function sh(cmd: string) { return execSync(cmd, { stdio: "pipe" }).toString(); }

  async function main() {
    const diff = sh("git diff --staged || true");
    const tests = sh("yarn -s test --listTests || true");
    const prompt = `Review the staged diff with strict SSOT/ADR rules.
- Flag drift vs ADR-0001/Tooling v1 (Node 18.19.x, Yarn 1.22.22)
- Identify missing tests by mapping to AT-IDs
- Output a concise markdown checklist only.

DIFF:
${diff.slice(0, 15000)}

KNOWN TESTS:
${tests.slice(0, 12000)}
`;
    const resp = await openai.responses.create({
      model: MODEL,
      input: [{ role: "user", content: prompt }]
    });
    writeFileSync("codex-review.md", (resp.output_text || ""), "utf8");
    console.log("WROTE codex-review.md");
  }
  main();
