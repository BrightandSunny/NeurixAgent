import { writeFileSync } from "fs";
// Emit a no-op patch so CI artifacts exist
writeFileSync("codex.patch", "# No changes\n", { encoding: "utf8" });
