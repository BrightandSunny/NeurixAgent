import { z } from "zod";
export const TaskSpec = z.object({
  target_files: z.array(z.string()).min(1),
  acceptance_criteria: z.array(z.string()).min(1),
  risks: z.array(z.string()).default([]),
  test_plan: z.array(z.string()).default([]),
});
export type TaskSpecT = z.infer<typeof TaskSpec>;
