param(
  [string]$Root = "D:\NeurixAgent",
  [switch]$WithStarterFiles
)

$base = Join-Path $Root ""
$dirs = @(
  "", "agents","agents\router\src","agents\prompt-critic\src","agents\researcher\src",
  "agents\code-surgeon\src","agents\testsmith\src","agents\doc-ranger\src","agents\shared\schemas",
  "api\src","console\src","console\public",
  "evals\datasets","evals\graders","evals\reports",
  "vector\source","vector\stores",
  "docs\adr","docs\governance","docs\schemas",
  "logs\agents","logs\evals",
  "ops\scripts","ops\ci","ops\backups"
)

Write-Host "Scaffolding NeurixAgent at $Root" -ForegroundColor Cyan
$dirs | ForEach-Object {
  $p = if ($_ -eq "") { $Root } else { Join-Path $Root $_ }
  if (-not (Test-Path $p)) { New-Item -ItemType Directory -Force -Path $p | Out-Null; Write-Host "  + $p" } else { Write-Host "  = (exists) $p" }
}

if ($WithStarterFiles) {
  @"
OPENAI_API_KEY=
NEURIX_VECTOR_STORE_DIR=$Root\vector\stores
NEURIX_LOG_DIR=$Root\logs
"@ | Set-Content -Encoding UTF8 (Join-Path $Root ".env.example")

  @"
# NeurixAgent
Brains for NeurixPlay — separate project at $Root. No shared folders with NeurixPlay.
"@ | Set-Content -Encoding UTF8 (Join-Path $Root "README.md")

  @"
{
  "name": "neurixagent",
  "private": true,
  "scripts": {
    "dev:api": "tsx api/src/index.ts",
    "dev:console": "vite --config console/vite.config.ts",
    "evals:run": "tsx ops/scripts/runEvals.ts",
    "vector:sync": "tsx ops/scripts/syncVector.ts"
  },
  "engines": { "node": ">=18.18 <21" },
  "dependencies": {
    "@openai/agents": "latest",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "typescript": "^5.4.0"
  }
}
"@ | Set-Content -Encoding UTF8 (Join-Path $Root "package.json")

  @"
root = true
[*]
end_of_line = lf
insert_final_newline = true
charset = utf-8
indent_style = space
indent_size = 2
"@ | Set-Content -Encoding UTF8 (Join-Path $Root ".editorconfig")

  "node_modules`n.env`nlogs`nvector/stores`n" | Set-Content -Encoding UTF8 (Join-Path $Root ".gitignore")
  Write-Host "Starter files created (.env.example, README.md, package.json, .editorconfig, .gitignore)" -ForegroundColor Green
}

Write-Host "Done."
