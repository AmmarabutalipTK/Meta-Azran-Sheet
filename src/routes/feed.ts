import { FastifyInstance } from "fastify";
import {
  generateXml,
  getProducts,
  getToken,
} from "../services/xml";

export default async function feedRoutes(
  fastify: FastifyInstance
) {
  fastify.get("/feed.xml", async (_, reply) => {
    try {
      // Get Salla token
      const tokenResponse = await getToken();

      const token =
        tokenResponse?.data?.access_token ??
        tokenResponse?.access_token ??
        "";

      if (!token) {
        throw new Error("Salla access token not found");
      }

      // Get products + variants from Salla
      const products = await getProducts(token);

      // Generate Meta-compatible XML
      const xml = generateXml(products);

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