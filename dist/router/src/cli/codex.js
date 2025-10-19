"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const codex_1 = require("../services/codex");
(async () => {
    const taskPath = process.argv[2] || "np-task.json";
    if (!node_fs_1.default.existsSync(taskPath)) {
        console.error(`Task not found: ${taskPath}`);
        process.exit(1);
    }
    const task = JSON.parse(node_fs_1.default.readFileSync(taskPath, "utf8"));
    const res = await (0, codex_1.codexReview)(task);
    node_fs_1.default.writeFileSync("codex.result.json", JSON.stringify(res, null, 2), "utf8");
    console.log(JSON.stringify(res, null, 2));
    if (res.suggested_patch_unified && task.repoPath) {
        const patchPath = node_path_1.default.join(task.repoPath, ".patches", "codex-suggested.patch");
        node_fs_1.default.mkdirSync(node_path_1.default.dirname(patchPath), { recursive: true });
        node_fs_1.default.writeFileSync(patchPath, res.suggested_patch_unified.replace(/\r\n/g, "\n"), "utf8");
        console.log(`[Codex] wrote patch: ${patchPath}`);
    }
})();
