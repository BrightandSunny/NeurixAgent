"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runParallel = runParallel;
const providers_1 = require("../providers");
async function runParallel(items, lang = "ts", maxConcurrency = 4) {
  const providers = (0, providers_1.pickProviders)(lang);
  if (!providers.length)
    return { ok: false, patches: [], failures: ["no providers"] };
  const queue = [...items];
  const patches = [];
  const failures = [];
  const locks = new Set(); // file-level locks
  async function runOne(item) {
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
        const item = queue.shift();
        await runOne(item);
      }
    },
  );
  await Promise.all(workers);
  return { ok: failures.length === 0, patches, failures };
}
