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