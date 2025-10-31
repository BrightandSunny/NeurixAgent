import { z } from "zod";
export const SpecSchema = z.object({
  goal: z.string().min(10),
  constraints: z.array(z.string()).default([]),
  changed_files: z.array(z.string()).default([]),
  tests: z.array(z.string()).default([]),
  acceptance: z.array(z.string()).min(1),
});
export type Spec = z.infer<typeof SpecSchema>;
