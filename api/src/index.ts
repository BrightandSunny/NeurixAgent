import Fastify from "fastify";
import cors from "@fastify/cors";
import staticPlugin from "@fastify/static";
import path from "path";
import { runNeurixFlow } from "../../agents/router/src/flow";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await app.register(staticPlugin, {
  root: path.join(__dirname, "../../console/public"),
  prefix: "/console/",
});

app.get("/api/health", async () => ({ ok: true }));

app.post("/api/chatkit/session", async () => ({
  client_secret: "dev-local-secret",
}));

app.post("/api/run", async (req: any, reply) => {
  const { text } = req.body ?? {};
  if (!text) return reply.code(400).send({ error: "text required" });
  const result = await runNeurixFlow(text);
  return { result };
});

app.post("/api/patch", async () => ({ accepted: true, ts: Date.now() }));
app.post("/api/evals/run", async () => ({ ran: true }));

app.listen({ port: 3100, host: "0.0.0.0" });
