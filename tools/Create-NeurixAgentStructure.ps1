param(
  [string]$Root = "D:\NeurixAgent"
)

$folders = @(
  "",                          # root
  "agents",
  "agents\router\src",
  "agents\prompt-critic\src",
  "agents\researcher\src",
  "agents\code-surgeon\src",
  "agents\testsmith\src",
  "agents\doc-ranger\src",
  "agents\shared\schemas",
  "api\src",
  "console\src",
  "console\public",
  "evals\datasets",
  "evals\graders",
  "evals\reports",
  "vector\source",            # raw synced SSOT/ADRs copies
  "vector\stores",            # vector indices
  "docs\adr",
  "docs\governance",
  "docs\schemas",
  "logs\agents",
  "logs\evals",
  "ops\scripts",
  "ops\ci",
  "ops\backups"
)

Write-Host "Creating NeurixAgent structure at $Root" -ForegroundColor Cyan
foreach ($f in $folders) {
  $path = if ([string]::IsNullOrWhiteSpace($f)) { $Root } else { Join-Path $Root $f }
  if (-not (Test-Path $path)) {
    New-Item -ItemType Directory -Path $path -Force | Out-Null
    Write-Host "  + $path"
  } else {
    Write-Host "  = (exists) $path"
  }
}
Write-Host "Done."
