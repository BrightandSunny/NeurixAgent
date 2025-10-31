param([string]$Task="np-task.json")
$ErrorActionPreference = "Stop"

if (-not (Test-Path $Task)) { Write-Error "Task not found: $Task"; exit 1 }
$obj  = Get-Content $Task -Raw | ConvertFrom-Json
$repo = $obj.repoPath
if (-not $repo) { Write-Error "repoPath missing in task."; exit 1 }
if (-not (Test-Path $repo)) { Write-Error "repoPath not found: $repo"; exit 1 }

$patchPath = Join-Path $repo ".patches\codex-suggested.patch"
if (-not (Test-Path $patchPath) -and $obj.suggested_patch_unified) {
  New-Item (Split-Path $patchPath) -ItemType Directory -Force | Out-Null
  $enc = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($patchPath, $obj.suggested_patch_unified, $enc)
}
if (-not (Test-Path $patchPath)) { Write-Warning "No patch to apply."; exit 0 }

# --- normalize to LF and reduce to unified-0 (---/+++/@@/+/- only)
$raw  = Get-Content $patchPath -Raw
$norm = ($raw -replace "`r`n","`n")

if ($norm -match '(?m)^\s*diff --git ') {
  $out = New-Object System.Collections.Generic.List[string]
  foreach ($line in ($norm -split "`n")) {
    if ($line -match '^(--- |\+\+\+ |@@ )') { $out.Add($line); continue }
    if ($line -match '^(diff --git|index )') { continue }
    if ($line -match '^[\+\-]') { $out.Add($line); continue }
  }
  $norm = ($out -join "`n")
}
if (-not $norm.EndsWith("`n")) { $norm += "`n" }

$normalized = Join-Path $repo ".patches\codex-suggested.normalized.patch"
[IO.File]::WriteAllText($normalized, $norm, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "Normalized patch → $normalized" -ForegroundColor Cyan

Push-Location $repo
try {
  git config core.autocrlf false | Out-Null

  # Try a normal apply with zero context
  git apply --check --unidiff-zero "$normalized" 2>$null
  if ($LASTEXITCODE -eq 0) {
    git add -u | Out-Null
    git apply -p1 --index --reject --ignore-space-change --ignore-whitespace --unidiff-zero "$normalized"
    if ($LASTEXITCODE -ne 0) {
      Write-Warning "git apply (index) failed; retrying 3-way…"
      git apply -p1 --3way --reject --ignore-space-change --ignore-whitespace --unidiff-zero "$normalized"
      if ($LASTEXITCODE -ne 0) { throw "git apply failed" }
    }
    git add -u
    git commit -m "chore(codex): apply suggested patch (normalized)" | Out-Null
    Write-Host "Applied and committed patch." -ForegroundColor Green
    return
  }

  Write-Warning "git apply --check failed; attempting full-file overwrite fallback for unified-0."

  # Parse minimal unified-0 blocks
  $blocks = @()
  $curr = $null
  foreach ($line in ($norm -split "`n")) {
    if ($line -like "--- a/*") { if ($curr) { $blocks += ,$curr }; $curr = [ordered]@{ path=$null; hunk=@(); plus=@(); minus=@() }; continue }
    if ($line -like "+++ b/*") {
      $p = $line.Substring(6)          # after '+++ b/'
      if ($p -like "b/*") { $p = $p.Substring(2) }
      $curr.path = $p
      continue
    }
    if ($line -like "@@*") { $curr.hunk += $line; continue }
    if ($line.StartsWith("+")) { $curr.plus  += ($line.Substring(1)); continue }
    if ($line.StartsWith("-")) { $curr.minus += ($line.Substring(1)); continue }
  }
  if ($curr) { $blocks += ,$curr }
  if (-not $blocks.Count) { throw "Could not parse normalized patch." }

  $reHunk = [regex]'@@\s*-\s*1(?:,[0-9]+)?\s+\+\s*1(?:,[0-9]+)?\s*@@'
  foreach ($b in $blocks) {
    if (-not $b.path) { throw "Malformed patch: missing +++ b/<path>." }
    # Use ABSOLUTE path rooted at repo (fixes your error)
    $dstAbs = Join-Path $repo $b.path

    $parent = Split-Path $dstAbs
    if (-not (Test-Path $parent)) { New-Item $parent -ItemType Directory -Force | Out-Null }

    if ($b.hunk.Count -ne 1 -or -not $reHunk.IsMatch($b.hunk[0])) {
      throw "Fallback only supports single-hunk full-file replacements (starts at line 1). File: $($b.path)"
    }

    $newText = ($b.plus -join "`n") + "`n"
    [IO.File]::WriteAllText($dstAbs, $newText, (New-Object System.Text.UTF8Encoding($false)))
  }

  git add -u
  git commit -m "chore(codex): apply suggested patch (overwrite fallback)" | Out-Null
  Write-Host "Applied patch via full-file overwrite fallback." -ForegroundColor Yellow
}
finally {
  Pop-Location
}
