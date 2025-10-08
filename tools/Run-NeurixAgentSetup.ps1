<#
.SYNOPSIS
  Runs both NeurixAgent setup scripts in sequence.
.DESCRIPTION
  1. Ensures PowerShell is running with admin rights.
  2. Runs Create-NeurixAgentStructure.ps1 to build the folder tree.
  3. Runs Bootstrap-NeurixAgent.ps1 to add starter files and configs.
  4. Displays overall progress and logs output.
#>

param(
  [string]$Root = "D:\NeurixAgent",
  [switch]$WithStarterFiles
)

Write-Host "=== NeurixAgent Setup Runner ===" -ForegroundColor Cyan
Write-Host "Root directory: $Root" -ForegroundColor Yellow
if ($WithStarterFiles) { Write-Host "Including starter files..." -ForegroundColor Green }

# --- Step 0: Ensure Admin Privileges ---
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Host "Restarting as Administrator..." -ForegroundColor Yellow
  Start-Process powershell "-ExecutionPolicy Bypass -File `"$PSCommandPath`" -Root `"$Root`" $(if($WithStarterFiles){'-WithStarterFiles'})" -Verb RunAs
  exit
}

# --- Step 1: Create Folder Structure ---
$createScript = Join-Path $PSScriptRoot "Create-NeurixAgentStructure.ps1"
if (Test-Path $createScript) {
  Write-Host "`n[1/2] Running Create-NeurixAgentStructure.ps1..." -ForegroundColor Cyan
  & $createScript -Root $Root
} else {
  Write-Host "❌ Missing: Create-NeurixAgentStructure.ps1" -ForegroundColor Red
  exit 1
}

# --- Step 2: Bootstrap with Starter Files ---
$bootstrapScript = Join-Path $PSScriptRoot "Bootstrap-NeurixAgent.ps1"
if (Test-Path $bootstrapScript) {
  Write-Host "`n[2/2] Running Bootstrap-NeurixAgent.ps1..." -ForegroundColor Cyan
  & $bootstrapScript -Root $Root $(if($WithStarterFiles){'-WithStarterFiles'})
} else {
  Write-Host "❌ Missing: Bootstrap-NeurixAgent.ps1" -ForegroundColor Red
  exit 1
}

# --- Step 3: Summary ---
Write-Host "`n✅ NeurixAgent structure and baseline created successfully." -ForegroundColor Green
Write-Host "Path: $Root"
Write-Host "You can now open this folder in VS Code and run:  yarn install"
