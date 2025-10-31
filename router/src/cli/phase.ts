import fs from "node:fs";
import { runParallel } from "../orchestrator/parallel";
import { stitchAndWrite } from "../orchestrator/stitcher";
import { execSync } from "node:child_process";

function run(cmd: string) {
  execSync(cmd, { stdio: "inherit" });
}

(async () => {
  const planPath = process.argv[2] || "phase.plan.json";
  if (!fs.existsSync(planPath)) {
    console.error(`Plan not found: ${planPath}`);
    process.exit(1);
  }
  const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
  const items = plan.items; // [{id,file,instructions,context}]
  const repo = plan.repoPath;
  const phase = plan.phase || "1";

  const { patches, failures } = await runParallel(
    items,
    plan.lang || "ts",
    plan.maxConcurrency || 4,
  );
  if (!patches.length) {
    console.error("No patches generated.", failures);
    process.exit(1);
  }
  const patchPath = stitchAndWrite(repo, phase, patches);

  // Validate + apply
  run(`git -C "${repo}" config core.autocrlf false`);
  try {
    run(`git -C "${repo}" apply --check "${patchPath}"`);
  } catch {
    console.error("Patch failed --check");
    process.exit(1);
  }

  try {
    run(
      `git -C "${repo}" apply -p1 --index --reject --ignore-space-change --ignore-whitespace "${patchPath}"`,
    );
  } catch {
    run(
      `git -C "${repo}" apply -p1 --3way --reject --ignore-space-change --ignore-whitespace "${patchPath}"`,
    );
  }
  run(`git -C "${repo}" add -u`);
  run(`git -C "${repo}" commit -m "orchestrator: apply phase ${phase} patch"`);

  // Verify
  try {
    run(`yarn verify`);
  } catch {
    console.error("Verifier failed. Please inspect and re-run.");
    process.exit(1);
  }

  console.log(`[Phase] Applied & verified: ${patchPath}`);
})();
