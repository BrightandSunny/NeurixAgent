import fs from "node:fs";
import path from "node:path";
export type Chunk = { file: string; from: number; to: number; text: string };
export function* walk(root: string): Generator<string> {
  const stack = [root];
  while (stack.length) {
    const cur = stack.pop()!;
    const st = fs.statSync(cur);
    if (st.isDirectory()) for (const n of fs.readdirSync(cur)) { if (!n.startsWith(".git")) stack.push(path.join(cur, n)); }
    else yield cur;
  }
}
export function indexFiles(paths: string[], maxLines = 80): Chunk[] {
  const out: Chunk[] = [];
  for (const p of paths) {
    if (!fs.existsSync(p)) continue;
    const text = fs.readFileSync(p, "utf8");
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += maxLines) {
      const slice = lines.slice(i, i + maxLines);
      out.push({ file: path.relative(process.cwd(), p), from: i + 1, to: i + slice.length, text: slice.join("\n") });
    }
  }
  return out;
}