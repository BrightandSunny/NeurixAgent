import { z } from "zod";
export const Citation = z.object({ source: z.string(), from: z.number(), to: z.number() });
export const PatchReview = z.object({
  minimal: z.boolean().default(true),
  changed_files: z.array(z.string()).default([]),
  citations: z.array(Citation).default([])
});
export type PatchReviewT = z.infer<typeof PatchReview>;