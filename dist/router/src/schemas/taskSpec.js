"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskSpec = void 0;
const zod_1 = require("zod");
exports.TaskSpec = zod_1.z.object({
    target_files: zod_1.z.array(zod_1.z.string()).min(1),
    acceptance_criteria: zod_1.z.array(zod_1.z.string()).min(1),
    risks: zod_1.z.array(zod_1.z.string()).default([]),
    test_plan: zod_1.z.array(zod_1.z.string()).default([])
});
