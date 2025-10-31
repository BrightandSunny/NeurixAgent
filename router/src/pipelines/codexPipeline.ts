import { execSync } from "node:child_process";
import fs from "node:fs";
export async function execute(taskPath = "np-task.json") {
  if (!fs.existsSync(taskPath)) throw new Error(`Task not found: ${taskPath}`);
  execSync(
    `node -e "require('tsx').tsxRequire && require('./router/src/cli/codex.ts')"`,
    { stdio: "inherit" },
  );
}
export async function main() {
  try {
    await execute(process.argv[2]);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
