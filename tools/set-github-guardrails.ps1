param(
  [Parameter(Mandatory=$true)] [string]$Owner,          # e.g. BrightandSunny
  [Parameter(Mandatory=$true)] [string]$Repo,           # e.g. NeurixAgent
  [string]$Branch = "main",
  [string[]]$RequireContexts = @("Verify"),
  [switch]$AddCodeowners,
  [string]$Codeowners = "*  @$Owner"
)

# --- helpers ---------------------------------------------------------------
function Ensure-Gh {
  if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    throw "GitHub CLI (gh) not found. Install: winget install GitHub.cli  (then: gh auth login)"
  }
  $auth = gh auth status 2>$null
  if ($LASTEXITCODE -ne 0) { throw "Not authenticated to GitHub CLI. Run: gh auth login" }
}

function Invoke-GhApiJson {
  param([ValidateSet('GET','POST','PUT','PATCH')][string]$Method, [string]$Path, [object]$Body = $null)
  $args = @("api","-X", $Method, $Path, "-H","Accept: application/vnd.github+json","-H","X-GitHub-Api-Version: 2022-11-28")
  if ($Body -ne $null) {
    $tmp = New-TemporaryFile
    ($Body | ConvertTo-Json -Depth 100 -Compress) | Set-Content $tmp -Encoding UTF8
    try { & gh @args --input $tmp | Out-String } finally { Remove-Item $tmp -ErrorAction SilentlyContinue }
  } else {
    & gh @args | Out-String
  }
}

# --- main ------------------------------------------------------------------
Ensure-Gh

Write-Host "==> Configuring repository switches ($Owner/$Repo)..." -ForegroundColor Cyan
$repoPatch = @{
  allow_merge_commit        = $false
  allow_squash_merge        = $true
  allow_rebase_merge        = $false
  delete_branch_on_merge    = $true
  allow_auto_merge          = $true
  default_branch            = $Branch
  security_and_analysis     = @{
    dependabot_alerts                = @{ status = "enabled" }
    dependabot_security_updates      = @{ status = "enabled" }
    secret_scanning                  = @{ status = "enabled" }
    secret_scanning_push_protection  = @{ status = "enabled" }
  }
}
try {
  Invoke-GhApiJson -Method PATCH -Path "repos/$Owner/$Repo" -Body $repoPatch | Out-Null
  Write-Host "✓ Repo switches updated" -ForegroundColor Green
} catch { Write-Warning "Repo PATCH failed (some features may be unavailable on your plan): $($_.Exception.Message)" }

Write-Host "==> Configuring Actions permissions..." -ForegroundColor Cyan
try {
  Invoke-GhApiJson -Method PUT -Path "repos/$Owner/$Repo/actions/permissions" -Body @{ enabled = $true; allowed_actions = "all" } | Out-Null
  Invoke-GhApiJson -Method PUT -Path "repos/$Owner/$Repo/actions/permissions/workflow" -Body @{
    default_workflow_permissions = "read"; can_approve_pull_request_reviews = $false
  } | Out-Null
  Write-Host "✓ Actions permissions set" -ForegroundColor Green
} catch { Write-Warning "Actions permissions failed: $($_.Exception.Message)" }

Write-Host "==> Applying branch protection on '$Branch'..." -ForegroundColor Cyan
$bp = @{
  required_status_checks = @{
    strict   = $true
    contexts = $RequireContexts
  }
  enforce_admins                      = $true
  required_pull_request_reviews       = @{
    required_approving_review_count = 1
    dismiss_stale_reviews           = $true
    require_code_owner_reviews      = $false
    require_last_push_approval      = $false
  }
  restrictions                        = $null
  allow_force_pushes                  = $false
  allow_deletions                     = $false
  required_linear_history             = $true
  block_creations                     = $false
  required_conversation_resolution    = $true
}
try {
  Invoke-GhApiJson -Method PUT -Path "repos/$Owner/$Repo/branches/$Branch/protection" -Body $bp | Out-Null
  Write-Host "✓ Branch protection applied" -ForegroundColor Green
} catch { Write-Warning "Branch protection failed: $($_.Exception.Message)" }

if ($AddCodeowners) {
  Write-Host "==> Ensuring CODEOWNERS..." -ForegroundColor Cyan
  # create/update .github/CODEOWNERS via Contents API
  $path  = ".github/CODEOWNERS"
  $msg   = "chore(guardrails): add CODEOWNERS"
  $get   = Invoke-GhApiJson -Method GET -Path "repos/$Owner/$Repo/contents/$([uri]::EscapeDataString($path))"
  $sha   = $null
  if ($LASTEXITCODE -eq 0 -and $get) {
    try { $sha = ($get | ConvertFrom-Json).sha } catch {}
  }
  $content = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($Codeowners + "`n"))
  $body = @{ message=$msg; content=$content; branch=$Branch }
  if ($sha) { $body.sha = $sha }
  try {
    Invoke-GhApiJson -Method PUT -Path "repos/$Owner/$Repo/contents/$([uri]::EscapeDataString($path))" -Body $body | Out-Null
    Write-Host "✓ CODEOWNERS ready ($path)" -ForegroundColor Green
  } catch { Write-Warning "CODEOWNERS update failed: $($_.Exception.Message)" }
}

Write-Host "`nAll done. Quick verify:" -ForegroundColor Cyan
Write-Host "  gh api repos/$Owner/$Repo | jq '.allow_merge_commit,.allow_squash_merge,.delete_branch_on_merge,.allow_auto_merge'  # expect: false,true,true,true"
Write-Host "  gh api repos/$Owner/$Repo/branches/$Branch/protection | jq '.required_status_checks.strict,.required_pull_request_reviews.required_approving_review_count,.required_linear_history,.required_conversation_resolution'"
