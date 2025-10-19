# ===========================
# NeurixAgent v2 – Drop-in bootstrap
# Idempotent: safe to re-run
# ===========================
$ErrorActionPreference = "Stop"
$Root = "D:\NeurixAgent"
if (!(Test-Path $Root)) { throw "Path not found: $Root" }

function Write-File($Path, $Text) {
  New-Item (Split-Path $Path) -ItemType Directory -Force | Out-Null
  $enc = New-Object System.Text.UTF8Encoding($false)   # UTF-8 no BOM
  [System.IO.File]::WriteAllText($Path, $Text, $enc)
  Write-Host "Wrote $Path" -ForegroundColor Cyan
}

function Merge-PackageJson($pkgPath, $scripts, $devDeps) {
  $pkg = if (Test-Path $pkgPath) {
    Get-Content $pkgPath -Raw | ConvertFrom-Json -AsHashtable
  } else { @{} }

  if (-not $pkg.ContainsKey('name')) { $pkg['name'] = 'neurixagent' }
  if (-not $pkg.ContainsKey('private')) { $pkg['private'] = $true }
  if (-not $pkg.ContainsKey('version')) { $pkg['version'] = '0.1.0' }
  if (-not $pkg.ContainsKey('license')) { $pkg['license'] = 'UNLICENSED' }
  if (-not $pkg.ContainsKey('engines')) { $pkg['engines'] = @{ node=">=18.18 <21"; yarn=">=1.22 <2" } }
  if (-not $pkg.ContainsKey('scripts')) { $pkg['scripts'] = @{} }
  if (-not $pkg.ContainsKey('dependencies')) { $pkg['dependencies'] = @{} }
  if (-not $pkg.ContainsKey('devDependencies')) { $pkg['devDependencies'] = @{} }
  if (-not $pkg.ContainsKey('resolutions')) { $pkg['resolutions'] = @{ } }

  foreach ($k in $scripts.Keys)   { $pkg['scripts'][$k] = $scripts[$k] }
  foreach ($k in $devDeps.Keys)   { $pkg['devDependencies'][$k] = $devDeps[$k] }

  # Ensure openai lives ONLY in devDependencies (tsx runs TS files directly)
  if ($pkg['dependencies'].ContainsKey('openai')) { $null = $pkg['dependencies'].Remove('openai') }

  # Keep your existing rimraf pin
  $pkg['resolutions']['rimraf'] = '5.0.7'

  ($pkg | ConvertTo-Json -Depth 100) | Set-Content $pkgPath -Encoding UTF8
  Write-Host "Updated $pkgPath" -ForegroundColor Green
}

# --- .devcontainer (optional) ---
Write-File "$Root\.devcontainer\devcontainer.json" @'
{
  "name": "NeurixAgent v2",
  "image": "mcr.microsoft.com/devcontainers/typescript-node:18",
  "features": { "ghcr.io/devcontainers/features/github-cli:1": {} },
  "postCreateCommand": "corepack enable && (yarn --version || npm i -g yarn) && (yarn install || npm i)",
  "customizations": {
    "vscode": { "extensions": ["dbaeumer.vscode-eslint","esbenp.prettier-vscode","ms-vscode.vscode-typescript-next"] }
  }
}
'@

# --- GH Actions (optional; safe to keep) ---
Write-File "$Root\.github\workflows\codex.yml" @'
name: NeurixAgent Codex
on:
  workflow_dispatch:
  pull_request: { branches: [ main, feat/** ] }
  push: { branches: [ feat/** ] }

jobs:
  codex:
    runs-on: ubuntu-latest
    env:
      OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
      NEURIX_ASSISTANT_ID: ${{ secrets.NEURIX_ASSISTANT_ID }}
      NEURIX_THREAD_ID: ${{ secrets.NEURIX_THREAD_ID }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 18 }
      - run: corepack enable
      - run: yarn install --frozen-lockfile || npm i
      - name: Build task from diff
        shell: pwsh
        run: pwsh tools/np-task.ps1 -Repo "${{ github.workspace }}"
      - name: Run Codex
        run: yarn tsx router/src/cli/codex.ts np-task.json
      - name: Post result to chat
        run: yarn tsx tools/post-codex-result.ts np-task.json
      - name: Dry-run apply
        shell: pwsh
        run: pwsh tools/apply-from-task.ps1 np-task.json
'@

# --- console (Assistant/Thread plumbing) ---
Write-File "$Root\console\bootstrap.ts" @'
import OpenAI from "openai";
(async () => {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const assistant = await client.beta.assistants.create({
    name: "NeurixAgent Console",
    model: "gpt-4o-mini",
    instructions: "You are the NeurixAgent console. Summarize results tersely and suggest the next action."
  });
  const thread = await client.beta.threads.create({});
  console.log(JSON.stringify({ assistant_id: assistant.id, thread_id: thread.id }, null, 2));
})();
'@

Write-File "$Root\console\post.ts" @'
import OpenAI from "openai";
(async () => {
  const title = process.argv[2] || "(no title)";
  const body = process.argv[3] || "(no body)";
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const assistant_id = process.env.NEURIX_ASSISTANT_ID!;
  const thread_id = process.env.NEURIX_THREAD_ID!;
  await client.beta.threads.messages.create(thread_id, { role: "user", content: [{ type: "text", text: `**${title}**\n\n${body}` }] });
  const run = await client.beta.threads.runs.create(thread_id, { assistant_id });
  console.log(`Posted to thread: ${thread_id} (run ${run.id})`);
})();
'@

# --- minimal grounding stubs (keep) ---
Write-File "$Root\grounding\indexer.ts" @'
import fs from "node:fs";
import path from "node:path";
export type Chunk = { file: string; from: number; to: number; text: string };
export function* walk(root: string): Generator<string> {
  const stack = [root];
  while (stack.length) {
    const cur = stack.pop()!;
    const st = fs.statSync(cur);
    if (st.isDirectory()) for (const n of fs.readdirSync(cur)) { if (!n.startsWith(".git")) stack.push(path.join(cur, n)); }
    else yield cur;
  }
}
export function indexFiles(paths: string[], maxLines = 80): Chunk[] {
  const out: Chunk[] = [];
  for (const p of paths) {
    if (!fs.existsSync(p)) continue;
    const text = fs.readFileSync(p, "utf8");
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += maxLines) {
      const slice = lines.slice(i, i + maxLines);
      out.push({ file: path.relative(process.cwd(), p), from: i + 1, to: i + slice.length, text: slice.join("\n") });
    }
  }
  return out;
}
'@

Write-File "$Root\grounding\retriever.ts" @'
import type { Chunk } from "./indexer";
let INDEX: Chunk[] = [];
export function loadIndex(chunks: Chunk[]) { INDEX = chunks; }
export function retrieve(query: string, k = 8): Chunk[] {
  const q = new Set(query.toLowerCase().split(/\W+/).filter(Boolean));
  return [...INDEX].map(ch => {
    const score = ch.text.toLowerCase().split(/\W+/).reduce((a,w)=>a+(q.has(w)?1:0),0);
    return { ch, score };
  }).sort((a,b)=>b.score-a.score).slice(0,k).map(x=>x.ch);
}
'@

# --- schemas (brief) ---
Write-File "$Root\router\src\schemas\taskSpec.ts" @'
import { z } from "zod";
export const TaskSpec = z.object({
  target_files: z.array(z.string()).min(1),
  acceptance_criteria: z.array(z.string()).min(1),
  risks: z.array(z.string()).default([]),
  test_plan: z.array(z.string()).default([])
});
export type TaskSpecT = z.infer<typeof TaskSpec>;
'@

Write-File "$Root\router\src\schemas\plan.ts" @'
import { z } from "zod";
export const Plan = z.object({
  steps: z.array(z.object({ action: z.string(), file: z.string(), rationale: z.string().max(400) })).min(1),
  tools: z.array(z.string()).default([])
});
export type PlanT = z.infer<typeof Plan>;
'@

Write-File "$Root\router\src\schemas\patchReview.ts" @'
import { z } from "zod";
export const Citation = z.object({ source: z.string(), from: z.number(), to: z.number() });
export const PatchReview = z.object({
  minimal: z.boolean().default(true),
  changed_files: z.array(z.string()).default([]),
  citations: z.array(Citation).default([])
});
export type PatchReviewT = z.infer<typeof PatchReview>;
'@

# --- Codex service with JSON Schema enforcement ---
Write-File "$Root\router\src\services\codex.ts" @'
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

export async function codexReview(task: { instructions: string; diffOrFiles: string; atIds?: string[]; branch?: string; }): Promise<ReviewResult> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  const system = [
    "You are a code review + patch agent.",
    "Return **only** JSON that matches the provided schema.",
    "If proposing edits, include a unified diff in 'suggested_patch_unified' with correct '--- a/..' and '+++ b/..' headers.",
    "No free text outside JSON."
  ].join("\n");

  const user = [
    `INSTRUCTIONS:\n${task.instructions}`,
    "",
    "DIFF_OR_FILES (unified-0 diff or file blobs below):",
    task.diffOrFiles
  ].join("\n");

  const schema = {
    name: "CodexReview",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        ok: { type: "boolean", default: true },
        atIds: { type: "array", items: { type: "string" }, default: [] },
        branch: { type: "string", default: "chore/codex" },
        summary: { type: "string", default: "" },
        blocking_issues: { type: "array", items: {}, default: [] },
        non_blocking: { type: "array", items: {}, default: [] },
        suggested_patch_unified: { type: "string", default: "" },
        type: { const: "codex.task.v1" }
      },
      required: ["ok","branch","summary","suggested_patch_unified","type"]
    }
  };

  const resp = await client.responses.create({
    model: "gpt-4o-mini",
    input: [{ role: "system", content: system }, { role: "user", content: user }],
    response_format: { type: "json_schema", json_schema: schema }
  });

  const raw = resp.output_text || "{}";
  try { return ReviewSchema.parse(JSON.parse(raw)); }
  catch {
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
'@

Write-File "$Root\router\src\cli\codex.ts" @'
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
'@

Write-File "$Root\router\src\pipelines\codexPipeline.ts" @'
import { execSync } from "node:child_process";
import fs from "node:fs";
export async function execute(taskPath = "np-task.json") {
  if (!fs.existsSync(taskPath)) throw new Error(`Task not found: ${taskPath}`);
  execSync(`node -e "require('tsx').tsxRequire && require('./router/src/cli/codex.ts')"`, { stdio: "inherit" });
}
export async function main() {
  try { await execute(process.argv[2]); } catch (e) { console.error(e); process.exit(1); }
}
'@

# --- verifier stub ---
Write-File "$Root\verifier\run.ts" @'
import { execSync } from "node:child_process";
function run(cmd: string){ try{ execSync(cmd,{stdio:"inherit"}); return true; } catch { return false; } }
export function verify(){
  const okTsc = run("yarn tsc -p tsconfig.json --noEmit") || run("npm run -s tsc -- --noEmit");
  const okLint = run("yarn eslint . --max-warnings=0") || run("npx eslint . --max-warnings=0");
  const okFmt  = run("yarn prettier -c .") || run("npx prettier -c .");
  const okTest = run("yarn test -i") || run("npm test -- -i");
  process.exit(okTsc && okLint && okFmt && okTest ? 0 : 1);
}
if (require.main === module) verify();
'@

# --- tools ---
Write-File "$Root\tools\np-task.ps1" @'
param(
  [string]$Repo = ".",
  [string]$Task = "np-task.json",
  [switch]$Staged,
  [int]$MaxKB = 200,
  [string[]]$Exclude = @("node_modules","dist","build",".next","out","coverage",".cache",".turbo",".yarn",".pnpm","*.lock","*.map",".patches")
)
$repoAbs = Resolve-Path $Repo
$ps = @("."); $Exclude | ForEach-Object { $ps += ":`(exclude`)$_" }
$diff = if ($Staged) { git -C $repoAbs diff --staged --no-color --unified=0 -- @ps } else { git -C $repoAbs diff --no-color --unified=0 -- @ps }
if (-not $diff) { Write-Error "No diff found in $($repoAbs.Path). Make some changes or use --Staged."; exit 1 }
$limit = $MaxKB * 1024; if ($diff.Length -gt $limit) { $diff = $diff.Substring(0,$limit) + "`n@@ TRUNCATED @@"; Write-Warning "Diff truncated to $MaxKB KB for Codex." }
$obj = [pscustomobject]@{
  type="codex.task.v1"; repoPath=$repoAbs.Path; branch=("chore/codex-"+(Get-Date -Format "yyyyMMdd-HHmmss"));
  instructions="You MUST return a unified diff patch in 'suggested_patch_unified' that fixes only the issues present in the diff. No refactors.";
  atIds=@("AT-NP-001"); diffOrFiles=$diff
}
$obj | ConvertTo-Json -Depth 50 | Set-Content $Task -Encoding UTF8
Write-Host "Updated $Task for repo $($repoAbs.Path) with diff length $($diff.Length)"
'@

Write-File "$Root\tools\apply-codex-patch.ps1" @'
param([string]$Repo=".", [string]$Patch=".\.patches\codex-suggested.patch")
$Repo = Resolve-Path $Repo; $Patch = Resolve-Path $Patch
if (-not (Test-Path $Patch)) { Write-Error "Patch not found: $Patch"; exit 1 }
Push-Location $Repo
try {
  git config core.autocrlf false | Out-Null
  git apply --check "$Patch"; if ($LASTEXITCODE -ne 0) { throw "Invalid patch file (not a unified diff)." }
  git add -u | Out-Null
  git apply -p1 --index --reject --ignore-space-change --ignore-whitespace "$Patch"
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "Apply with --index failed. Retrying with 3-way…"
    git apply -p1 --3way --reject --ignore-space-change --ignore-whitespace "$Patch"
    if ($LASTEXITCODE -ne 0) { Write-Warning "git apply still failed."; throw "git apply failed" }
  }
  git add -u; git commit -m "chore(codex): apply suggested patch" | Out-Null
  Write-Host "Applied and committed patch." -ForegroundColor Green
} finally { Pop-Location }
'@

Write-File "$Root\tools\apply-from-task.ps1" @'
param([string]$Task="np-task.json")
if (-not (Test-Path $Task)) { Write-Error "Task not found: $Task"; exit 1 }
$obj = Get-Content $Task -Raw | ConvertFrom-Json
$repo = $obj.repoPath; $patchPath = Join-Path $repo ".patches\codex-suggested.patch"
if (-not (Test-Path $patchPath) -and $obj.suggested_patch_unified) {
  New-Item (Split-Path $patchPath) -ItemType Directory -Force | Out-Null
  $enc = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($patchPath, $obj.suggested_patch_unified, $enc)
}
if (-not (Test-Path $patchPath)) { Write-Warning "No patch to apply."; exit 0 }
pwsh -File tools\apply-codex-patch.ps1 -Repo $repo -Patch $patchPath
'@

Write-File "$Root\tools\post-codex-result.ts" @'
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
'@

# --- package.json merge ---
$pkgPath = "$Root\package.json"
$AddScripts = @{
  "codex:run"      = "tsx router/src/cli/codex.ts np-task.json";
  "np:diff"        = "pwsh tools/np-task.ps1";
  "np:diff:staged" = "pwsh tools/np-task.ps1 -Staged";
  "np:run"         = "yarn codex:run && tsx tools/post-codex-result.ts np-task.json";
  "np:apply"       = "pwsh tools/apply-codex-patch.ps1";
  "np:apply:task"  = "pwsh tools/apply-from-task.ps1";
  "console:init"   = "tsx console/bootstrap.ts";
  "console:post"   = "tsx console/post.ts";
  "verify"         = "tsx verifier/run.ts"
  "build"          = "tsc -p tsconfig.json"
}
$AddDevDeps = @{
  "openai"      = "^4.60.0";
  "tsx"         = "^4.16.0";
  "zod"         = "^3.23.8";
  "eslint"      = "^8.57.0";
  "prettier"    = "^3.3.3";
  "typescript"  = "^5.6.2"
}
Merge-PackageJson $pkgPath $AddScripts $AddDevDeps

Write-Host "`nBootstrap complete." -ForegroundColor Yellow
