(async () => {
  const key = process.env.OPENAI_API_KEY;
  if (!key || !key.startsWith("sk-")) {
    console.error("Missing or malformed OPENAI_API_KEY. Set it first.");
    process.exit(1);
  }

  const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const res = await fetch(`${baseUrl}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + key,
    },
    body: JSON.stringify({
      model,
      input: "Say hello in one line",
      store: false,
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    console.error("HTTP", res.status, json);
    process.exit(1);
  }

  const text = json.output?.[0]?.content?.[0]?.text || json.output_text;
  console.log("OK:", text || "[no text]");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
