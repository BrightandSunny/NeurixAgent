"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const parallel_1 = require("../orchestrator/parallel");
const stitcher_1 = require("../orchestrator/stitcher");
const node_child_process_1 = require("node:child_process");
function run(cmd) { (0, node_child_process_1.execSync)(cmd, { stdio: "inherit" }); }
(async () => {
    const planPath = process.argv[2] || "phase.plan.json";
    if (!node_fs_1.default.existsSync(planPath)) {
        console.error(`Plan not found: ${planPath}`);
        process.exit(1);
    }
    const plan = JSON.parse(node_fs_1.default.readFileSync(planPath, "utf8"));
    const items = plan.items; // [{id,file,instructions,context}]
    const repo = plan.repoPath;
    const phase = plan.phase || "1";
    const { patches, failures } = await (0, parallel_1.runParallel)(items, plan.lang || "ts", plan.maxConcurrency || 4);
    if (!patches.length) {
        console.error("No patches generated.", failures);
        process.exit(1);
    }
    const patchPath = (0, stitcher_1.stitchAndWrite)(repo, phase, patches);
    // Validate + apply
    run(`git -C "${repo}" config core.autocrlf false`);
    try {
        run(`git -C "${repo}" apply --check "${patchPath}"`);
    }
    catch {
        console.error("Patch failed --check");
        process.exit(1);
    }
    try {
        run(`git -C "${repo}" apply -p1 --index --reject --ignore-space-change --ignore-whitespace "${patchPath}"`);
    }
    catch {
        run(`git -C "${repo}" apply -p1 --3way --reject --ignore-space-change --ignore-whitespace "${patchPath}"`);
    }
    run(`git -C "${repo}" add -u`);
    run(`git -C "${repo}" commit -m "orchestrator: apply phase ${phase} patch"`);
    // Verify
    try {
        run(`yarn verify`);
    }
    catch {
        console.error("Verifier failed. Please inspect and re-run.");
        process.exit(1);
    }
    console.log(`[Phase] Applied & verified: ${patchPath}`);
})();
