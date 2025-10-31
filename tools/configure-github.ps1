<# 
  Configure GitHub repo settings & branch protection.

  Prereqs:
    - GitHub CLI installed:  https://cli.github.com/
    - gh auth login  (already authenticated)
    - Token must have "repo" scope (and "admin:repo_hook" for some endpoints)

  Example:
    pwsh .\configure-github.ps1 -Owner BrightandSunny -Repo NeurixAgent -Branch main -StatusContexts Verify,verify
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$Owner,
  [Parameter(Mandatory=$true)][string]$Repo,
  [string]$Branch = 'main',

  # Status check names to require on the protected branch. 
  # If your workflow is named "Verify" and the job is "verify", the check often appears as "Verify / verify".
  # We'll register both "Verify" and "verify" by default; adjust to your exact check name if needed.
  [string[]]$StatusContexts = @('Verify', 'verify'),

  # Require exactly 1 approval (change if you want 2+)
  [int]$RequiredApprovals = 1
)

function Die($msg) { Write-Error $msg; exit 1 }

# --- Sanity checks -----------------------------------------------------------
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Die "GitHub CLI 'gh' is not installed. Install from https://cli.github.com/ and run 'gh auth login'."
}

# Confirm auth
try {
  gh auth status | Out-Null
} catch {
  Die "You are not authenticated to GitHub CLI. Run: gh auth login"
}

$Full = "$Owner/$Repo"
Write-Host "Configuring $Full (branch: $Branch)..." -ForegroundColor Cyan

# --- Repo-level merge & PR settings -----------------------------------------
# Disable merge commits & rebase; enable squash; auto-delete head branches; allow auto-merge; show 'update branch' button
# (gh repo edit maps to PATCH /repos/{owner}/{repo})
$repoEditArgs = @(
  'repo','edit', $Full,
  '--enable-squash-merge',
  '--disable-merge-commit',
  '--disable-rebase-merge',
  '--delete-branch-on-merge',
  '--enable-auto-merge',
  '--allow-update-branch'
)

Write-Host "Applying repo merge/PR settings…" -ForegroundColor Yellow
gh @repoEditArgs | Out-Null

# --- Actions: default workflow permissions (read) ----------------------------
# PUT /repos/{owner}/{repo}/actions/permissions/workflow
$actionsPerms = @{
  default_workflow_permissions = 'read'
  can_approve_pull_request_reviews = $false
} | ConvertTo-Json -Depth 4

Write-Host "Setting Actions workflow permissions to 'read'…" -ForegroundColor Yellow
gh api `
  -X PUT `
  -H "Accept: application/vnd.github+json" `
  "/repos/$Owner/$Repo/actions/permissions/workflow" `
  --input - `
  --raw-field data="$actionsPerms" `
| Out-Null

# --- Security: enable Dependabot alerts + security updates -------------------
Write-Host "Enabling Dependabot vulnerability alerts…" -ForegroundColor Yellow
gh api -X PUT -H "Accept: application/vnd.github+json" "/repos/$Owner/$Repo/vulnerability-alerts" 2>$null

Write-Host "Enabling Dependabot security updates…" -ForegroundColor Yellow
gh api -X PUT -H "Accept: application/vnd.github+json" "/repos/$Owner/$Repo/automated-security-fixes" 2>$null

# --- Branch protection (classic protection endpoint) -------------------------
# PUT /repos/{owner}/{repo}/branches/{branch}/protection
# Notes:
#  - required_status_checks.contexts must match your check names exactly.
#  - strict = true => require branch to be up to date before merging.
#  - required_linear_history blocks merge commits (enforces linear history)
#  - allow_force_pushes = false; allow_deletions = false
#  - required_conversation_resolution = true
#  - required_pull_request_reviews.required_approving_review_count = N
$contexts = ($StatusContexts | Where-Object { $_ -and $_.Trim() } | Select-Object -Unique)
if (-not $contexts -or $contexts.Count -eq 0) {
  Write-Host "No status contexts provided; will configure protection without required checks." -ForegroundColor DarkYellow
}

$payload = [ordered]@{
  required_status_checks = if ($contexts -and $contexts.Count -gt 0) {
    @{
      strict   = $true
      contexts = $contexts
    }
  } else {
    $null
  }
  enforce_admins = $true
  required_pull_request_reviews = @{
    required_approving_review_count   = [Math]::Max(1,$RequiredApprovals)
    require_code_owner_reviews        = $false
    require_last_push_approval        = $false
    dismiss_stale_reviews             = $false
  }
  restrictions = $null
  required_linear_history = $true
  allow_force_pushes      = $false
  allow_deletions         = $false
  block_creations         = $false
  required_conversation_resolution = $true
}

$json = $payload | ConvertTo-Json -Depth 10

Write-Host "Applying branch protection on '$Branch'…" -ForegroundColor Yellow
gh api `
  -X PUT `
  -H "Accept: application/vnd.github+json" `
  "/repos/$Owner/$Repo/branches/$Branch/protection" `
  --input - `
  --raw-field data="$json" `
| Out-Null

# --- Read-back summary -------------------------------------------------------
Write-Host "`nSummary for $Full" -ForegroundColor Green
Write-Host "• Repo PR settings:"
gh repo view $Full --json mergeCommitAllowed,rebaseMergeAllowed,squashMergeAllowed,deleteBranchOnMerge,autoMergeAllowed,allowUpdateBranch `
  --jq '. | {
    allow_merge_commit: .mergeCommitAllowed,
    allow_rebase_merge: .rebaseMergeAllowed,
    allow_squash_merge: .squashMergeAllowed,
    delete_branch_on_merge: .deleteBranchOnMerge,
    allow_auto_merge: .autoMergeAllowed,
    allow_update_branch: .allowUpdateBranch
  }'

Write-Host "`n• Actions workflow permissions:"
gh api -H "Accept: application/vnd.github+json" "/repos/$Owner/$Repo/actions/permissions/workflow"

Write-Host "`n• Branch protection (key bits):"
gh api -H "Accept: application/vnd.github+json" "/repos/$Owner/$Repo/branches/$Branch/protection" `
  --jq '{ required_status_checks, enforce_admins, required_pull_request_reviews, required_linear_history, allow_force_pushes, allow_deletions, required_conversation_resolution }'

Write-Host "`nDone." -ForegroundColor Green
