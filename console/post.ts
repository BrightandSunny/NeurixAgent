import OpenAI from "openai";
(async () => {
  const title = process.argv[2] || "(no title)";
  const body = process.argv[3] || "(no body)";
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const assistant_id = process.env.NEURIX_ASSISTANT_ID!;
  const thread_id = process.env.NEURIX_THREAD_ID!;
  await client.beta.threads.messages.create(thread_id, { role: "user", content: [{ type: "text", text: `**${title}**\n\n${body}` }] });
  const run = await client.beta.threads.runs.create(thread_id, { assistant_id });
  console.log(`Posted to thread: ${thread_id} (run ${run.id})`);
})();