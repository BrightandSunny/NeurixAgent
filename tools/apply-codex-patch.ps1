param(
  [string]$Repo  = ".",
  [string]$Patch = ".\.patches\codex-suggested.patch"
)

$ErrorActionPreference = "Stop"

$Repo  = Resolve-Path $Repo
$Patch = Resolve-Path $Patch

if (!(Test-Path $Patch)) { Write-Error "Patch not found: $Patch"; exit 1 }

# --- Normalize the patch into unified-0 (strip git headers; fix hunk headers) ---
$raw  = Get-Content $Patch -Raw
# Normalize EOLs to LF and ensure trailing newline
$norm = ($raw -replace "`r`n","`n")
if (-not $norm.EndsWith("`n")) { $norm += "`n" }

# Remove git-diff boilerplate that confuses git apply on Windows:
# diff --git, index, new/deleted file mode, similarity/rename lines
$lines = $norm -split "`n"
$kept  = New-Object System.Collections.Generic.List[string]
foreach($line in $lines){
  if ($line -match '^(diff --git|index [0-9a-f]{7,}\.\.[0-9a-f]{7,}|new file mode|deleted file mode|similarity index|rename (from|to))') { continue }
  $kept.Add($line)
}
$norm = ($kept -join "`n")

# Convert any hunk header to unified-0:
# @@ -a,b +c,d @@  ->  @@ -a +c @@
$norm = [regex]::Replace($norm, '@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@', '@@ -$1 +$2 @@')

# Write normalized patch (BOM-less) next to the original
$work = Join-Path ([System.IO.Path]::GetDirectoryName($Patch)) 'codex-suggested.normalized.patch'
$enc  = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($work, $norm, $enc)

# --- Apply to repo ---
Push-Location $Repo
try {
  git config core.autocrlf false | Out-Null

  # Preflight: --unidiff-zero matches our header transform
  git apply --check --unidiff-zero -p1 "$work" 2>$null
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "git apply --check failed; dumping first 20 lines:"
    Get-Content $work -TotalCount 20 | ForEach-Object { '  ' + $_ }
    throw "git apply --check failed"
  }

  git add -u | Out-Null

  # Try with index first; then 3-way
  git apply --unidiff-zero -p1 --index --reject --ignore-space-change --ignore-whitespace "$work"
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "Apply with --index failed. Trying 3-way…"
    git apply --unidiff-zero -p1 --3way --reject --ignore-space-change --ignore-whitespace "$work"
    if ($LASTEXITCODE -ne 0) {
      Write-Warning "Status:"
      git status --porcelain
      Write-Warning "Patch head:"
      Get-Content $work -TotalCount 20 | ForEach-Object { '  ' + $_ }
      throw "git apply failed (even after 3-way)"
    }
  }

  git add -u
  git commit -m "chore(codex): apply suggested patch (normalized)" | Out-Null
  Write-Host "Applied and committed patch." -ForegroundColor Green
}
finally { Pop-Location }
