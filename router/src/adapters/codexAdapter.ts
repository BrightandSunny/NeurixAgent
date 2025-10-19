import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";

export type CodexDriver = "cli" | "api" | "stub";

export interface CodexTask {
  repoPath: string;             // absolute path to checked-out repo
  branch: string;               // target working branch (create if missing)
  instructions: string;         // precise, tests-first directive
  atIds: string[];              // acceptance tests that must pass
  allowInternet?: boolean;      // explicit off by default
}

export interface CodexResult {
  ok: boolean;
  driver: CodexDriver;
  prBranch?: string;
  summary: string;
  transcriptPath?: string;      // where logs/prompts are persisted
}

function run(cmd: string, args: string[], cwd: string): Promise<{code:number,stdout:string,stderr:string}> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd, shell: true });
    let stdout = "", stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("close", (code) => resolve({ code: code ?? -1, stdout, stderr }));
  });
}

async function ensureBranch(repoPath: string, branch: string) {
  await run("git", ["init"], repoPath);
  await run("git", ["checkout", "-B", branch], repoPath);
}

function persistPrompt(repoPath: string, prompt: string): string {
  const p = path.join(repoPath, ".codex", "last-prompt.txt");
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, prompt, "utf8");
  return p;
}

export async function runCodexTask(task: CodexTask, driver: CodexDriver = (process.env.CODEX_DRIVER as CodexDriver) || "stub"): Promise<CodexResult> {
  const { repoPath, branch, instructions, atIds, allowInternet } = task;
  await ensureBranch(repoPath, branch);

  const prompt = [
    "Follow AGENTS.md. Policies: PATCH-ONLY; tests-first; deterministic.",
    `AT-IDs: ${atIds.join(", ") || "AT-CODEX-* (default)"}`,
    `Internet: ${allowInternet ? "enabled for this task" : "disabled"}`,
    "Run: yarn install && yarn lint && yarn tsc --noEmit && yarn test --ci",
    "--- TASK ---",
    instructions
  ].join("\n");

  const transcriptPath = persistPrompt(repoPath, prompt);

  if (driver === "stub") {
    // Create a trivial change to demonstrate end-to-end orchestration.
    const marker = path.join(repoPath, "CODEx_STUB.md");
    fs.writeFileSync(marker, `# Codex STUB\\n\\nThis file proves the Router invoked the adapter.\\n`, "utf8");
    await run("git", ["add", "."], repoPath);
    await run("git", ["commit", "-m", "chore(codex): stub change"], repoPath);
    return { ok: true, driver, prBranch: branch, summary: "Stub made a deterministic marker change.", transcriptPath };
  }

  if (driver === "cli") {
    // Expect a 'codex' CLI on PATH; pass prompt file as input.
    const cli = process.env.CODEX_CLI || "codex";
    const args = [`--prompt-file`, transcriptPath, `--repo`, repoPath, `--branch`, branch, `--patch-only`];
    const r = await run(cli, args, repoPath);
    const ok = r.code === 0;
    return {
      ok,
      driver,
      prBranch: branch,
      summary: ok ? "codex CLI applied minimal patch and created/updated branch." : `codex CLI failed: ${r.stderr || r.stdout}`,
      transcriptPath
    };
  }

  if (driver === "api") {
    // TODO: Wire the official SDK/HTTP here (Responses/Threads/etc).
    // Keep the same input/output semantics for the Router.
    return { ok: false, driver, prBranch: branch, summary: "API driver not implemented yet. Use driver=cli or stub.", transcriptPath };
  }

  return { ok: false, driver, prBranch: branch, summary: "Unknown driver.", transcriptPath };
}
