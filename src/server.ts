import 'dotenv/config';
import Fastify from "fastify";
import { z } from "zod";
import { checkForBanned } from "./agent";

const fastify = Fastify({ logger: true });

const requestSchema = z.object({
  text: z.string().min(1, "text 不能为空"),
  customBanned: z.array(z.string().min(1)).optional()
});

fastify.post("/moderation/check", async (request, reply) => {
  const parseResult = requestSchema.safeParse(request.body);
  if (!parseResult.success) {
    return reply.status(400).send({
      message: "参数校验失败",
      issues: parseResult.error.issues
    });
  }

  const { text, customBanned } = parseResult.data;

  try {
    const result = await checkForBanned(text, customBanned);
    return reply.send(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return reply.status(500).send({ message });
  }
});
const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || "0.0.0.0";

fastify
  .listen({ port, host })
  .then((address) => {
    fastify.log.info(`Moderation service listening at ${address}`);
  })
  .catch((err) => {
    fastify.log.error(err);
    process.exit(1);
  });


