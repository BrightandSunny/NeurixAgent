import { execute } from "../router/src/pipelines/codexPipeline";
import * as path from "path";

const sandbox = path.join(__dirname, "..", ".sandbox");

describe("AT-CODEX-002: Router -> Codex CLI path", () => {
  it("invokes the CLI and returns ok", async () => {
    if (!process.env.RUN_CODEX_CLI_TESTS) return; // opt-in
    process.env.CODEX_DRIVER = "cli";
    const result = await execute({
      type: "codex.task.v1",
      repoPath: sandbox,
      branch: "chore/codex-cli",
      atIds: ["AT-CODEX-002"],
      instructions: "Apply a minimal patch per AGENTS.md."
    });
    expect(result.ok).toBe(true);
  });
});
