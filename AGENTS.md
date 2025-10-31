# AGENTS.md — NeurixAgent SSOT for Automated Changes

Tooling: Node 18.19.x, Yarn 1.22.x
Build: yarn install && yarn lint && yarn tsc --noEmit && yarn test --ci

Policies:

- PATCH-ONLY: minimal diffs; no bulk rewrites; no lockfile churn unless asked.
- Tests-first: failing AT-\* tests must be added/updated before fixes.
- Doc/ADR: Any architectural change MUST update /Documents/ADR-0001.md.
- Determinism: Use pinned toolchain. Internet access for tools must be explicit.

Acceptance gates (merge blocks):

- All AT-IDs referenced in a task are green in CI.
- Doc Ranger confirms SSOT/ADR updated when architecture is touched.
