import Fastify from "fastify";
import feedRoutes from "./routes/feed";

const app = Fastify({
  logger: true,
});

app.register(feedRoutes);

app.get("/health", async () => {
  return {
    status: "ok",
  };
});

app.listen({
  // host: "127.0.0.1",
  port: 3015,
}).catch((error) => {
  app.log.error(error);
  process.exit(1);
});