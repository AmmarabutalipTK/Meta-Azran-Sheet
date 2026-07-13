import Fastify from "fastify";
import feed from "./routes/feed";

const app = Fastify({
  logger: true,
});

app.register(feed);

app.listen({
  port: 3010,
});