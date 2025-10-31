"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatchReview = exports.Citation = void 0;
const zod_1 = require("zod");
exports.Citation = zod_1.z.object({
  source: zod_1.z.string(),
  from: zod_1.z.number(),
  to: zod_1.z.number(),
});
exports.PatchReview = zod_1.z.object({
  minimal: zod_1.z.boolean().default(true),
  changed_files: zod_1.z.array(zod_1.z.string()).default([]),
  citations: zod_1.z.array(exports.Citation).default([]),
});
