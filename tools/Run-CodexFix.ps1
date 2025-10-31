
Param(
  [string]$Model = "gpt-5-codex"
)
$ErrorActionPreference = "Stop"
if (-not $env:OPENAI_API_KEY) {
  Write-Error "OPENAI_API_KEY env var is not set."
}
node --version
yarn --version
if (-not (Test-Path "tools/codex-fix.ts")) { Write-Error "tools/codex-fix.ts not found"; }
$env:MODEL_CODEX = $Model
node tools/codex-fix.ts
