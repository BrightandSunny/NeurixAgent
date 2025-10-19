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