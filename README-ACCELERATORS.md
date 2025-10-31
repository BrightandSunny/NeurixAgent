
## Neurix Accelerator Pack
Contents:
- tools/codex-fix.ts — minimal-diff autofixer (CI/Local).
- tools/codex-review.ts — checklist reviewer.
- .github/workflows/codex-autofix.yml — CI to fix failing PRs.
- .github/workflows/codex-review.yml — CI to generate review notes.
- tools/Run-CodexFix.ps1 — Windows wrapper.
- tools/.env.example — required env vars.
- Documents/ADRs/ADR-00XX-adopt-codex.md — decision record.
- ops/runbooks/accelerate-dev-cycle.md — operations runbook.

### Setup
1) Copy this pack into your repo root.
2) `yarn add -D openai@^4`
3) Set GitHub secret `OPENAI_API_KEY`.
4) Run `codex-autofix` workflow on a failing PR, or run locally:
   ```
   $env:OPENAI_API_KEY="..." ; pwsh tools/Run-CodexFix.ps1
   ```
