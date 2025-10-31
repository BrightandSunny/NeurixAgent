param([string]$InPath,[string]$OutPath)

if (-not (Test-Path $InPath)) { throw "Patch not found: $InPath" }
$raw = Get-Content $InPath -Raw

# Strip noisy headers (diff --git, index …) and keep only unified sections.
$lines = $raw -split "`r?`n"
$buf   = New-Object System.Collections.Generic.List[string]
$keep  = $false

for ($i=0; $i -lt $lines.Count; $i++) {
  $L = $lines[$i]

  if ($L -match '^\s*diff --git ') { continue }
  if ($L -match '^\s*index\s+[0-9a-f]+\.\.[0-9a-f]+') { continue }

  if ($L -match '^\s*---\s+a/') { $keep = $true }
  if ($keep) { $buf.Add($L) }
}

$norm = ($buf -join "`n") -replace "`r`n","`n"
if (-not $norm.EndsWith("`n")) { $norm += "`n" }

$enc = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($OutPath, $norm, $enc)
Write-Host "Normalized patch → $OutPath" -ForegroundColor Green
