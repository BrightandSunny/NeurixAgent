"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const codexPipeline_1 = require("../router/src/pipelines/codexPipeline");
test("AT-CODEX-001 should pass (stub driver)", async () => {
    const res = await (0, codexPipeline_1.execute)({
        repoPath: "NeurixAgent",
        branch: "chore/smoke",
        instructions: "Touch marker",
        atIds: ["AT-CODEX-001"],
        diffOrFiles: "/* AT-CODEX-001 */"
    });
    expect(res.ok).toBe(true);
});
