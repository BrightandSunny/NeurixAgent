import { writeFileSync } from "fs";
const patch = `# No changes
`; // Put a unified diff here when your generator is ready
writeFileSync("codex.patch", patch, "utf8");
console.log("codex.patch written");
