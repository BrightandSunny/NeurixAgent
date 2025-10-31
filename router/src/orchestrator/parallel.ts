import { pickProviders } from "../providers";
import type { WorkItem } from "../providers";

export type ParallelResult = {
  ok: boolean;
  patches: string[];
  failures: string[];
};

export async function runParallel(
  items: WorkItem[],
  lang = "ts",
  maxConcurrency = 4,
): Promise<ParallelResult> {
  const providers = pickProviders(lang);
  if (!providers.length)
    return { ok: false, patches: [], failures: ["no providers"] };

  const queue = [...items];
  const patches: string[] = [];
  const failures: string[] = [];
  const locks = new Set<string>(); // file-level locks

  async function runOne(item: WorkItem) {
    if (locks.has(item.file)) {
      queue.push(item);
      return;
    }
    locks.add(item.file);
    try {
      for (const p of providers) {
        const res = await p.review(item);
        if (res.ok && res.patch) {
          patches.push(res.patch);
          return;
        }
      }
      failures.push(item.id + ": no provider succeeded");
    } finally {
      locks.delete(item.file);
    }
  }

  const workers = Array.from(
    { length: Math.max(1, maxConcurrency) },
    async () => {
      while (queue.length) {
        const item = queue.shift()!;
        await runOne(item);
      }
    },
  );
  await Promise.all(workers);
  return { ok: failures.length === 0, patches, failures };
}
