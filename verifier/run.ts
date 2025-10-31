import { execSync } from "node:child_process";
function run(cmd: string) {
  try {
    execSync(cmd, { stdio: "inherit" });
    return true;
  } catch {
    return false;
  }
}
export function verify() {
  const okTsc =
    run("yarn tsc -p tsconfig.json --noEmit") ||
    run("npm run -s tsc -- --noEmit");
  const okLint =
    run("yarn eslint . --max-warnings=0") ||
    run("npx eslint . --max-warnings=0");
  const okFmt = run("yarn prettier -c .") || run("npx prettier -c .");
  const okTest = run("yarn test -i") || run("npm test -- -i");
  process.exit(okTsc && okLint && okFmt && okTest ? 0 : 1);
}
if (require.main === module) verify();
