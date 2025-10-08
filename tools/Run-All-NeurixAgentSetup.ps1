<#
.SYNOPSIS
  Full orchestrator for setting up the NeurixAgent project.

.DESCRIPTION
  Executes the whole setup chain in sequence:
    1) Create-NeurixAgentStructure.ps1
    2) Bootstrap-NeurixAgent.ps1 (optional starter files)
    3) Run-NeurixAgentSetup.ps1
    4) (Optional) Initialize a Git repo and make an initial commit
    5) (Optional) Run `yarn install`

.PARAMETER Root
  Root folder for the project (default: D:\NeurixAgent)

.PARAMETER WithStarterFiles
  Include starter files (package.json, .env.example, etc.)

.PARAMETER GitInit
  Initialize a Git repository in $Root and create an initial commit.

.PARAMETER DefaultBranch
  The default branch name when initializing Git (default: main)

.PARAMETER YarnInstall
  Run `yarn install` in $Root at the end.

.EXAMPLE
  D:\NeurixAgent\tools\Run-All-NeurixAgentSetup.ps1 -WithStarterFiles -GitInit -YarnInstall

#>

param(
  [string]$Root = "D:\NeurixAgent",
  [switch]$WithStarterFiles,
  [switch]$GitInit,
  [string]$DefaultBranch = "main",
  [switch]$YarnInstall
)

# -----------------------------
# Helper: run another PS1 safely
# -----------------------------
function Run-Script($ScriptPath, $Args = @()) {
  if (Test-Path $ScriptPath) {
    Write-Host "Running $ScriptPath ..." -ForegroundColor Cyan
    & powershell -ExecutionPolicy Bypass -NoProfile -File $ScriptPath @Args
    if ($LASTEXITCODE -ne 0) {
      Write-Host "❌ Script failed: $ScriptPath" -ForegroundColor Red
      exit 1
    }
  } else {
    Write-Host "❌ Script not found: $ScriptPath" -ForegroundColor Red
    exit 1
  }
}

# -----------------------------
# Ensure Admin Privileges
# -----------------------------
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Host "Restarting as Administrator..." -ForegroundColor Yellow
  $argsList = @("-ExecutionPolicy","Bypass","-File","`"$PSCommandPath`"","-Root","`"$Root`"")
  if ($WithStarterFiles) { $argsList += "-WithStarterFiles" }
  if ($GitInit) { $argsList += "-GitInit" }
  if ($YarnInstall) { $argsList += "-YarnInstall" }
  $argsList += @("-DefaultBranch","`"$DefaultBranch`"")
  Start-Process powershell ($argsList -join ' ') -Verb RunAs
  exit
}

Write-Host "=== Starting Full NeurixAgent Setup ===" -ForegroundColor Cyan
Write-Host "Root: $Root" -ForegroundColor Yellow
if ($WithStarterFiles) { Write-Host "Starter files: ON" -ForegroundColor Green }
if ($GitInit) { Write-Host "Git init: ON (branch: $DefaultBranch)" -ForegroundColor Green }
if ($YarnInstall) { Write-Host "Yarn install: ON" -ForegroundColor Green }

# -----------------------------
# Paths
# -----------------------------
$ToolsPath       = "D:\NeurixAgent\tools"
$CreateScript    = Join-Path $ToolsPath "Create-NeurixAgentStructure.ps1"
$BootstrapScript = Join-Path $ToolsPath "Bootstrap-NeurixAgent.ps1"
$RunSetupScript  = Join-Path $ToolsPath "Run-NeurixAgentSetup.ps1"

# -----------------------------
# 1) Create folder structure
# -----------------------------
Run-Script $CreateScript @("-Root", $Root)

# -----------------------------
# 2) Bootstrap project
# -----------------------------
$bootstrapArgs = @("-Root", $Root)
if ($WithStarterFiles) { $bootstrapArgs += "-WithStarterFiles" }
Run-Script $BootstrapScript $bootstrapArgs

# -----------------------------
# 3) Post-setup runner
# -----------------------------
$runArgs = @("-Root", $Root)
if ($WithStarterFiles) { $runArgs += "-WithStarterFiles" }
Run-Script $RunSetupScript $runArgs

# -----------------------------
# 4) (Optional) Git init
# -----------------------------
if ($GitInit) {
  Write-Host "`n[Git] Initializing repository..." -ForegroundColor Cyan
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "⚠ Git not found in PATH. Install Git and rerun with -GitInit." -ForegroundColor Yellow
  } else {
    Push-Location $Root
    try {
      if (-not (Test-Path ".git")) {
        git init | Out-Null
        # Config default branch if supported
        git symbolic-ref HEAD "refs/heads/$DefaultBranch" 2>$null | Out-Null
      }
      if (-not (Test-Path ".gitattributes")) {
        @" 
* text=auto eol=lf
"@ | Set-Content -Encoding UTF8 ".gitattributes"
      }
      if (-not (Test-Path ".gitignore")) {
        @" 
node_modules
.env
logs
vector/stores
"@ | Add-Content -Encoding UTF8 ".gitignore"
      }
      git add -A
      git commit -m "chore: initial NeurixAgent scaffold" | Out-Null
      Write-Host "✅ Git repo initialized with initial commit on '$DefaultBranch'." -ForegroundColor Green
    } finally {
      Pop-Location
    }
  }
}

# -----------------------------
# 5) (Optional) Yarn install
# -----------------------------
if ($YarnInstall) {
  Write-Host "`n[Node/Yarn] Installing dependencies..." -ForegroundColor Cyan
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "⚠ Node.js not found. Install Node >=18.18 (<21) and rerun with -YarnInstall." -ForegroundColor Yellow
  } elseif (-not (Get-Command yarn -ErrorAction SilentlyContinue)) {
    Write-Host "⚠ Yarn not found. Install Yarn classic (1.x) and rerun with -YarnInstall." -ForegroundColor Yellow
  } else {
    Push-Location $Root
    try {
      yarn install
      Write-Host "✅ Yarn install completed." -ForegroundColor Green
    } finally {
      Pop-Location
    }
  }
}

# -----------------------------
# Summary
# -----------------------------
Write-Host "`n✅ NeurixAgent fully initialized at $Root" -ForegroundColor Green
Write-Host "Next:"
Write-Host "  cd $Root"
if (-not $YarnInstall) { Write-Host "  yarn install" }
Write-Host "  code ."
Write-Host "  yarn dev:api     # start API"
Write-Host "  yarn dev:console # start console"
