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