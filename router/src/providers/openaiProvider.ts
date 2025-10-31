import OpenAI from "openai";

/** Params all Providers accept */
export type ProviderParams = {
  system: string;
  user: string;
  model?: string;
};

/** Result a Provider returns (text for the Router, plus raw for debugging) */
export type ProviderResult = {
  text: string;
  raw?: unknown;
};

/**
 * OpenAI provider using the Responses API.
 * Returns a normalized object shape that most registries use.
 */
export const openaiProvider = async ({
  system,
  user,
  model,
}: ProviderParams): Promise<ProviderResult> => {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  const resp = await client.responses.create({
    model: model ?? "gpt-4o-mini",
    input: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  } as any);

  const anyResp: any = resp as any;
  const fallback =
    (Array.isArray(anyResp.output) &&
      anyResp.output[0]?.content?.[0]?.text?.value) ??
    "";
  // Avoid mixing ?? and || without parens:
  const text: string = (anyResp.output_text ?? fallback) || "";

  return { text, raw: resp };
};
