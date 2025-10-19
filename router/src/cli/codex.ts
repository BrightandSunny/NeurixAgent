import fs from "node:fs";
import path from "node:path";
import { codexReview } from "../services/codex";

(async () => {
  const taskPath = process.argv[2] || "np-task.json";
  if (!fs.existsSync(taskPath)) { console.error(`Task not found: ${taskPath}`); process.exit(1); }
  const task = JSON.parse(fs.readFileSync(taskPath, "utf8"));
  const res = await codexReview(task);
  fs.writeFileSync("codex.result.json", JSON.stringify(res, null, 2), "utf8");
  console.log(JSON.stringify(res, null, 2));
  if (res.suggested_patch_unified && task.repoPath) {
    const patchPath = path.join(task.repoPath, ".patches", "codex-suggested.patch");
    fs.mkdirSync(path.dirname(patchPath), { recursive: true });
    fs.writeFileSync(patchPath, res.suggested_patch_unified.replace(/\r\n/g, "\n"), "utf8");
    console.log(`[Codex] wrote patch: ${patchPath}`);
  }
})();