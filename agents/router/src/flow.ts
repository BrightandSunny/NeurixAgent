import {
  Agent,
  run,
  fileSearchTool,
  webSearchTool,
  defineOutputGuardrail,
} from "@openai/agents";
import { SpecSchema } from "../../shared/schemas/spec";

const ssot = fileSearchTool({
  vectorStoreId: process.env.NEURIX_SSOT_VECTOR ?? "dev",
});
const web = webSearchTool({ requireCitations: true });
const SpecOut = defineOutputGuardrail({ name: "SpecOut", schema: SpecSchema });

const Router = new Agent({
  name: "Router",
  instructions: `Classify the request into one of: spec|research|code|docs. Answer only with the label.`,
  tools: [ssot, web],
  model: "o3-mini",
});

const PromptCritic = new Agent({
  name: "PromptCritic",
  instructions: `Produce a JSON spec that matches SpecOut. No code.`,
  tools: [ssot],
  outputGuardrails: [SpecOut],
  model: "o3",
});

export async function runNeurixFlow(text: string) {
  // naive route: if “spec” keyword then spec, otherwise request a spec first
  const r = await run(Router, `Classify: ${text}`);
  const route =
    /spec|research|code|docs/i
      .exec(String(r.finalOutput))?.[0]
      ?.toLowerCase() ?? "spec";
  if (route !== "spec") {
    // enforce spec-first policy
  }
  const spec = await run(PromptCritic, `Create a spec for this task:\n${text}`);
  return { route, spec: spec.finalOutput };
}
