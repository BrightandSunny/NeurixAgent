import { z } from "zod";
export const Plan = z.object({
  steps: z
    .array(
      z.object({
        action: z.string(),
        file: z.string(),
        rationale: z.string().max(400),
      }),
    )
    .min(1),
  tools: z.array(z.string()).default([]),
});
export type PlanT = z.infer<typeof Plan>;
