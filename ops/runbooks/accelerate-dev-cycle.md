
# Runbook — Accelerating the Dev Cycle (NeurixPlay)
### Preconditions
- Node 18.19.x, Yarn 1.22.22. `corepack enable && yarn set version 1.22.22`
- `OPENAI_API_KEY` set in environment and GitHub Secrets.
### Local quick fix
1. `yarn install`
2. `node tools/codex-fix.ts` (or `pwsh tools/Run-CodexFix.ps1`)
3. Review applied patch → run `yarn tsc && yarn test`
4. Push branch, open PR.
### CI autofix on PR
- Trigger `codex-autofix` from the Actions tab or on PR open.
- Workflow uploads `codex.patch` as artifact; if tests pass it pushes a branch.
### Review bot
- `codex-review` creates `codex-review.md` checklist artifact for reviewers.
### Rollback
- Disable workflows; remove scripts; revert ADR.
