import { FastifyInstance } from "fastify";
import { generateXml } from "../services/xml";

export default async function feedRoutes(
  fastify: FastifyInstance
) {
  fastify.get("/feed.xml", async (_, reply) => {
    try {
      const xml = await generateXml();

      return reply
        .type("application/xml; charset=utf-8")
        .send(xml);
    } catch (error: any) {
      fastify.log.error(error);

      return reply
        .code(500)
        .type("text/plain")
        .send("Failed to generate feed");
    }
  });
}