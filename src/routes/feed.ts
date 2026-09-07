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
      const tokenResponse = await getToken();

      fastify.log.info({
        tokenResponseKeys:
          tokenResponse &&
          typeof tokenResponse === "object"
            ? Object.keys(tokenResponse)
            : [],
      }, "Salla token response");

      const token =
        tokenResponse.accessToken

      if (!token) {
        throw new Error(
          "Salla access token not found"
        );
      }

      const products =
        await getProducts(token);

      fastify.log.info(
        `Feed products: ${products.length}`
      );

      const xml =
        generateXml(products);

      return reply
        .type(
          "application/xml; charset=utf-8"
        )
        .send(xml);

    } catch (error: any) {
      fastify.log.error(
        error,
        "Failed to generate feed"
      );

      return reply
        .code(500)
        .type("text/plain")
        .send(
          `Failed to generate feed: ${
            error?.message ?? error
          }`
        );
    }
  });
}