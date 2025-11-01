/* Minimal Codex CLI (compiles without services/codex exports) */
import * as fs from "fs";

async function runReview() {
  const out = "codex-review.md";
  fs.writeFileSync(out, `# Codex Review

Stub review generated at ${new Date().toISOString()}.
`, "utf8");
  console.log(`Wrote ${out}`);
}

async function runFix() {
  const out = "codex.patch";
  // Produce a harmless stub patch; your real logic can overwrite this.
  fs.writeFileSync(out, "# No changes\n", "utf8");
  console.log(`Wrote ${out}`);
}

async function main() {
  const mode = (process.argv[2] ?? "review").toLowerCase();
  if (mode === "review") return runReview();
  if (mode === "fix") return runFix();
  console.error(`Unknown mode: ${mode}`);
  process.exit(2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
