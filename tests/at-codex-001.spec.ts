import * as fs from "fs";
import * as path from "path";
import { execute } from "../router/src/pipelines/codexPipeline";

const sandbox = path.join(__dirname, "..", ".sandbox");

function ensureSandbox() {
  if (!fs.existsSync(sandbox)) fs.mkdirSync(sandbox);
  // Minimal git repo for the stub driver:
  if (!fs.existsSync(path.join(sandbox, ".git"))) {
    require("child_process").execSync("git init", { cwd: sandbox, stdio: "inherit" });
    fs.writeFileSync(path.join(sandbox, "README.md"), "# Sandbox\\n", "utf8");
    require("child_process").execSync("git add . && git commit -m init", { cwd: sandbox, stdio: "inherit" });
  }
}

describe("AT-CODEX-001: Router -> Codex stub path", () => {
  it("creates a deterministic stub change on a branch", async () => {
    ensureSandbox();
    process.env.CODEX_DRIVER = "stub";
    const result = await execute({
      type: "codex.task.v1",
      repoPath: sandbox,
      branch: "chore/codex-stub",
      atIds: ["AT-CODEX-001"],
      instructions: "Create or update a small marker file to simulate a patch."
    });
    expect(result.ok).toBe(true);
    const marker = path.join(sandbox, "CODEx_STUB.md");
    expect(fs.existsSync(marker)).toBe(true);
  });
});
