import { writeFileSync } from "fs";
writeFileSync("codex-review.md",
  `# Codex Review (stub)\nStatus: ok\nTime: ${new Date().toISOString()}\n`,
  { encoding: "utf8" });
