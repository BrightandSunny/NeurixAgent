"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const codexPipeline_1 = require("../router/src/pipelines/codexPipeline");
const path = __importStar(require("path"));
const sandbox = path.join(__dirname, "..", ".sandbox");
describe("AT-CODEX-002: Router -> Codex CLI path", () => {
    it("invokes the CLI and returns ok", async () => {
        if (!process.env.RUN_CODEX_CLI_TESTS)
            return; // opt-in
        process.env.CODEX_DRIVER = "cli";
        const result = await (0, codexPipeline_1.execute)({
            type: "codex.task.v1",
            repoPath: sandbox,
            branch: "chore/codex-cli",
            atIds: ["AT-CODEX-002"],
            instructions: "Apply a minimal patch per AGENTS.md."
        });
        expect(result.ok).toBe(true);
    });
});
