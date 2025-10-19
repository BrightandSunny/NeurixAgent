import fs from "node:fs";
import path from "node:path";

// Minimal stitcher: concatenates unified diffs; relies on `git apply --check`.
export function stitchAndWrite(repoPath: string, phaseName: string, patches: string[]) {
  const combined = patches.map((p) => p.replace(/\r\n/g, "\n")).join("\n");
  const outPath = path.join(repoPath, ".patches", `phase-${phaseName}.patch`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, combined, "utf8");
  return outPath;
}
