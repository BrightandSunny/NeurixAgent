
  // tools/codex-fix.ts
  // Node 18.19.x, Yarn 1.22.x
  // Minimal-diff autofix: collects typecheck/test failures, asks GPT-5-Codex for the smallest patch that makes the suite green,
  // applies with git 3-way (fallback to your tools/apply-chat-diff.ps1), re-runs gates, pushes branch.
  import OpenAI from "openai";
  import { execSync } from "node:child_process";
  import { writeFileSync, existsSync } from "node:fs";
  import path from "node:path";

  const MODEL = process.env.MODEL_CODEX || "gpt-5-codex";
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  function sh(cmd: string, cwd?: string) {
    return execSync(cmd, { stdio: "pipe", cwd }).toString();
  }

  function nowStamp() {
    const d = new Date();
    const pad = (n: number)=> String(n).padStart(2,"0");
    return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  }

  async function main() {
    // Ensure git is clean enough for a branch
    try { sh("git rev-parse --is-inside-work-tree"); } 
    catch { console.error("Not a git repo."); process.exit(2); }

    // 1) Capture failure context (do not fail pipeline here)
    const typecheck = sh("yarn -s tsc || true");
    const tests     = sh("yarn -s test --reporter=line || true");

    // 2) Ask Codex for a minimal unified diff
    const prompt = `
Repo: NeurixPlay (strict ADR/SSOT)
Constraints: Node 18.19.x, Yarn 1.22.x, no drift. Respect ADR-0001 contracts.
Task: Produce a MINIMAL unified diff to make "yarn tsc" and "yarn test" pass.
Rules:
- Change only what's necessary.
- Keep public APIs and ADR-0001 contracts intact.
- If needed, add/update tests.
- Output ONLY a valid unified diff (no prose, no fences).
Typecheck errors:
${typecheck.slice(0, 12000)}

Test errors:
${tests.slice(0, 12000)}
`;

    const resp = await openai.responses.create({
      model: MODEL,
      input: [{ role: "user", content: prompt }],
    });

    const patch = (resp.output_text || "").trim();
    if (!patch.startsWith("---") && !patch.includes("\n---")) {
      console.error("Model did not return a unified diff. Aborting.\nFirst 400 chars:\n", patch.slice(0,400));
      process.exit(3);
    }
    const patchPath = path.resolve("codex.patch");
    writeFileSync(patchPath, patch, "utf8");

    // 3) Apply (3-way) with fallback
    const branch = `chore/codex-fix-${nowStamp()}`;
    try {
      sh(`git checkout -b ${branch}`);
      sh(`git apply --3way ${patchPath}`);
    } catch (e) {
      console.warn("git apply --3way failed, trying PowerShell fallback if available...");
      const ps = "tools/apply-chat-diff.ps1";
      if (existsSync(ps)) {
        try {
          sh(f'powershell -NoProfile -ExecutionPolicy Bypass -File "{ps}" -Path "{patchPath}"');
        } catch (e2) {
          console.error("Fallback patcher failed.", String(e2).slice(0, 4000));
          process.exit(4);
        }
      } else {
        console.error("No fallback patcher found at tools/apply-chat-diff.ps1");
        process.exit(4);
      }
    }

    // 4) Re-run gates
    sh("yarn -s tsc");
    sh("yarn -s test");

    // 5) Commit & push
    sh('git add -A');
    sh('git commit -m "fix: codex minimal patch (green tests)"');
    try { sh("git push -u origin HEAD"); } catch {}

    console.log(`OK: patch applied & committed on ${branch}`);
  }

  main().catch((e)=>{
    console.error("codex-fix failed:", e);
    process.exit(1);
  });
