"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.execute = execute;
exports.main = main;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = __importDefault(require("node:fs"));
async function execute(taskPath = "np-task.json") {
    if (!node_fs_1.default.existsSync(taskPath))
        throw new Error(`Task not found: ${taskPath}`);
    (0, node_child_process_1.execSync)(`node -e "require('tsx').tsxRequire && require('./router/src/cli/codex.ts')"`, { stdio: "inherit" });
}
async function main() {
    try {
        await execute(process.argv[2]);
    }
    catch (e) {
        console.error(e);
        process.exit(1);
    }
}
