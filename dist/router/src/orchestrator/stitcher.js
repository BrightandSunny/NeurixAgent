"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stitchAndWrite = stitchAndWrite;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
// Minimal stitcher: concatenates unified diffs; relies on `git apply --check`.
function stitchAndWrite(repoPath, phaseName, patches) {
    const combined = patches.map((p) => p.replace(/\r\n/g, "\n")).join("\n");
    const outPath = node_path_1.default.join(repoPath, ".patches", `phase-${phaseName}.patch`);
    node_fs_1.default.mkdirSync(node_path_1.default.dirname(outPath), { recursive: true });
    node_fs_1.default.writeFileSync(outPath, combined, "utf8");
    return outPath;
}
