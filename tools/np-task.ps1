param(
  [string]$Repo = ".",
  [string]$Task = "np-task.json",
  [switch]$Staged,
  [int]$MaxKB = 200,
  [string[]]$Exclude = @(
    "node_modules","dist","build",".next","out","coverage",".cache",".turbo",
    ".yarn",".pnpm","*.lock","*.map",".patches"
  )
)

$ErrorActionPreference = "Stop"

# Resolve repo path & verify Git repo
$repoPath = (Resolve-Path $Repo).Path
git -C $repoPath rev-parse --git-dir 1>$null 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Error "Not a git repository: $repoPath"
  exit 1
}

# Build pathspec that excludes bulky dirs via :(exclude) magic
$ps = @(".")
foreach ($x in $Exclude) { $ps += ":`(exclude`)$x" }

# Produce a zero-context unified diff (staged vs working as requested)
if ($Staged) {
  $diff = git -C $repoPath diff --cached --no-color --unified=0 -- @ps
} else {
  $diff = git -C $repoPath diff --no-color --unified=0 -- @ps
}

if (-not $diff) {
  Write-Error "No diff found in $repoPath. Make some changes or use -Staged."
  exit 1
}

# Limit payload size to protect LLM context
$limit = $MaxKB * 1024
if ($diff.Length -gt $limit) {
  $diff = $diff.Substring(0, $limit) + "`n@@ TRUNCATED @@"
  Write-Warning "Diff truncated to $MaxKB KB for Codex."
}

# Helpful metadata: staged file list (using --cached for widest Git compatibility)
$stagedPaths = @()
if ($Staged) {
  $stagedPaths = (git -C $repoPath diff --cached --name-only -- @ps) -split "`r?`n" | Where-Object { $_ }
}

# Current HEAD (short) for reference
$head = (git -C $repoPath rev-parse --short HEAD 2>$null) -replace '\s+$',''

# Tight, deterministic instructions that bias models to produce clean unified-0 (no git headers).
$instructions = @"
Return JSON ONLY matching this exact shape:

{
  "ok": true,
  "atIds": ["AT-NP-001"],
  "branch": "string",
  "summary": "string",
  "blocking_issues": [],
  "non_blocking": [],
  "suggested_patch_unified": "UNIFIED-0 DIFF ONLY. Start with '--- a/<path>' then '+++ b/<path>' then '@@' hunks. Do NOT include 'diff --git' or 'index' lines."
}

Rules:
- Fix ONLY the issues shown in the diff below.
- Minimal edits. No refactors. No new files. Keep original formatting/line-endings.
- Output one unified-0 patch that applies cleanly.
"@

# Build task object
$obj = [pscustomobject]@{
  type                  = "codex.task.v1"
  repoPath              = $repoPath
  head                  = $head
  branch                = "chore/codex-$((Get-Date).ToString('yyyyMMdd-HHmmss'))"
  instructions          = $instructions
  atIds                 = @("AT-NP-001")
  diffOrFiles           = $diff
  stagedPaths           = $stagedPaths
  diff_is_unified_zero  = $true
  generated_at_utc      = (Get-Date).ToUniversalTime().ToString("s") + "Z"
}

# Write JSON as BOM-less UTF-8
$taskPath = if ([IO.Path]::IsPathRooted($Task)) { $Task } else { Join-Path (Get-Location).Path $Task }
$enc = New-Object System.Text.UTF8Encoding($false)
[IO.File]::WriteAllText($taskPath, ($obj | ConvertTo-Json -Depth 50), $enc)

Write-Host ("Updated {0} for repo {1} | diff length {2} | staged files {3}" -f `
  $taskPath, $repoPath, $diff.Length, $stagedPaths.Count) -ForegroundColor Green
