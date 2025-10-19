param(
  [string]$Repo = ".sandbox",
  [string]$Task = "task.json",
  [string]$Branch = "chore/codex-real",
  [string]$AtId = "AT-CODEX-REAL-001"
)

$repoAbs = Resolve-Path $Repo
$diff = git -C $repoAbs diff --no-color --unified=0

if (-not (Test-Path $Task)) {
  $obj = [pscustomobject]@{
    type = "codex.task.v1"
    repoPath = $Repo
    branch = $Branch
    instructions = "Review latest change; propose a patch if obvious."
    atIds = @($AtId)
    diffOrFiles = $diff
  }
} else {
  $obj = Get-Content $Task -Raw | ConvertFrom-Json
  $obj.diffOrFiles = $diff
}

$obj | ConvertTo-Json -Depth 50 | Set-Content $Task -Encoding UTF8
Write-Host "Updated $Task with diff length $($diff.Length)"
