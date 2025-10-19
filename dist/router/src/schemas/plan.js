"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Plan = void 0;
const zod_1 = require("zod");
exports.Plan = zod_1.z.object({
    steps: zod_1.z.array(zod_1.z.object({ action: zod_1.z.string(), file: zod_1.z.string(), rationale: zod_1.z.string().max(400) })).min(1),
    tools: zod_1.z.array(zod_1.z.string()).default([])
});
