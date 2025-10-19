import OpenAI from "openai";
(async () => {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const assistant = await client.beta.assistants.create({
    name: "NeurixAgent Console",
    model: "gpt-4o-mini",
    instructions: "You are the NeurixAgent console. Summarize results tersely and suggest the next action."
  });
  const thread = await client.beta.threads.create({});
  console.log(JSON.stringify({ assistant_id: assistant.id, thread_id: thread.id }, null, 2));
})();