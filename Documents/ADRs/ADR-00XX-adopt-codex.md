
# ADR-00XX — Adopt GPT-5-Codex + CI Autofix + Review Bot
## Status
Proposed
## Context
- Development loop is slow; human time is spent on trivial compile/test fixes.
- We must preserve SSOT/ADR discipline (Node 18.19.x, Yarn 1.22.22).
## Decision
- Use OpenAI Responses API with model `gpt-5-codex` for automated minimal patches.
- Add two GitHub Actions: codex-autofix (fix) and codex-review (checklist).
- Keep Computer-Use/GUI automation off; scoped tokens only.
## Consequences
- Faster PR turnarounds; small, green diffs by default.
- Token cost introduced; monitored in CI job logs.
## Rollback
- Disable workflows, delete scripts; no schema migrations.
