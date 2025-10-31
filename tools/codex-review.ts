import { writeFileSync } from "fs";
const body = `# Codex Review

No blockers detected by the stub. Once your real review tool is ready,
replace this file with the actual analysis output.
`;
writeFileSync("codex-review.md", body, "utf8");
console.log("codex-review.md written");
