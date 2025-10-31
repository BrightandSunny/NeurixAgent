"use strict";
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o)
            if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== "default") __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCodexTask = runCodexTask;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function run(cmd, args, cwd) {
  return new Promise((resolve) => {
    const child = (0, child_process_1.spawn)(cmd, args, { cwd, shell: true });
    let stdout = "",
      stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("close", (code) =>
      resolve({
        code: code !== null && code !== void 0 ? code : -1,
        stdout,
        stderr,
      }),
    );
  });
}
async function ensureBranch(repoPath, branch) {
  await run("git", ["init"], repoPath);
  await run("git", ["checkout", "-B", branch], repoPath);
}
function persistPrompt(repoPath, prompt) {
  const p = path.join(repoPath, ".codex", "last-prompt.txt");
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, prompt, "utf8");
  return p;
}
async function runCodexTask(task, driver = process.env.CODEX_DRIVER || "stub") {
  const { repoPath, branch, instructions, atIds, allowInternet } = task;
  await ensureBranch(repoPath, branch);
  const prompt = [
    "Follow AGENTS.md. Policies: PATCH-ONLY; tests-first; deterministic.",
    `AT-IDs: ${atIds.join(", ") || "AT-CODEX-* (default)"}`,
    `Internet: ${allowInternet ? "enabled for this task" : "disabled"}`,
    "Run: yarn install && yarn lint && yarn tsc --noEmit && yarn test --ci",
    "--- TASK ---",
    instructions,
  ].join("\n");
  const transcriptPath = persistPrompt(repoPath, prompt);
  if (driver === "stub") {
    // Create a trivial change to demonstrate end-to-end orchestration.
    const marker = path.join(repoPath, "CODEx_STUB.md");
    fs.writeFileSync(
      marker,
      `# Codex STUB\\n\\nThis file proves the Router invoked the adapter.\\n`,
      "utf8",
    );
    await run("git", ["add", "."], repoPath);
    await run("git", ["commit", "-m", "chore(codex): stub change"], repoPath);
    return {
      ok: true,
      driver,
      prBranch: branch,
      summary: "Stub made a deterministic marker change.",
      transcriptPath,
    };
  }
  if (driver === "cli") {
    // Expect a 'codex' CLI on PATH; pass prompt file as input.
    const cli = process.env.CODEX_CLI || "codex";
    const args = [
      `--prompt-file`,
      transcriptPath,
      `--repo`,
      repoPath,
      `--branch`,
      branch,
      `--patch-only`,
    ];
    const r = await run(cli, args, repoPath);
    const ok = r.code === 0;
    return {
      ok,
      driver,
      prBranch: branch,
      summary: ok
        ? "codex CLI applied minimal patch and created/updated branch."
        : `codex CLI failed: ${r.stderr || r.stdout}`,
      transcriptPath,
    };
  }
  if (driver === "api") {
    // TODO: Wire the official SDK/HTTP here (Responses/Threads/etc).
    // Keep the same input/output semantics for the Router.
    return {
      ok: false,
      driver,
      prBranch: branch,
      summary: "API driver not implemented yet. Use driver=cli or stub.",
      transcriptPath,
    };
  }
  return {
    ok: false,
    driver,
    prBranch: branch,
    summary: "Unknown driver.",
    transcriptPath,
  };
}
