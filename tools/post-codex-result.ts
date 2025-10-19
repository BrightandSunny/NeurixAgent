import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
const taskPath = process.argv[2] || "np-task.json";
const resPath = "codex.result.json";
function post(title:string, body:string){
  execSync(`yarn -s tsx console/post.ts ${JSON.stringify(title)} ${JSON.stringify(body)}`, { stdio:"inherit" });
}
const assistant = process.env.NEURIX_ASSISTANT_ID;
const thread = process.env.NEURIX_THREAD_ID;
if (!assistant || !thread) { console.warn("NEURIX_ASSISTANT_ID/NEURIX_THREAD_ID not set; skipping post."); process.exit(0); }
if (!fs.existsSync(resPath)) { post("[Codex] run","No result file found."); process.exit(0); }
const res = JSON.parse(fs.readFileSync(resPath,"utf8"));
const task = fs.existsSync(taskPath) ? JSON.parse(fs.readFileSync(taskPath,"utf8")) : {};
const patchPath = task.repoPath ? path.join(task.repoPath,".patches","codex-suggested.patch") : null;
const summary = [
  `Branch: ${res.branch || "(n/a)"}`,
  `AT-IDs: ${(res.atIds || []).join(", ") || "(none)"}`,
  `Blocking: ${res.blocking_issues?.length ?? 0}`,
  `Patch: ${patchPath && fs.existsSync(patchPath) ? patchPath : "(none)"}`
].join("\n");
post("[Codex] review summary", `Summary: ${res.summary || "(none)"}\n\n${summary}`);