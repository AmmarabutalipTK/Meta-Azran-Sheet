import { FastifyInstance } from "fastify";

import { getProducts, getToken } from "../services/salla";
import { generateXml } from "../services/csv";

export default async function (fastify: FastifyInstance) {
  fastify.get("/feed.xml", async (request, reply) => {
    try {
      const token = await getToken()?.then((res) => {
        return res.accessToken
      });


      console.log({token})
      // if (!token) {
      //   return reply.code(500).send({
      //     message: "SALLA_TOKEN is not configured",
      //   });
      // }

      const products = await getProducts(token);

      const xml = generateXml(products);

      return reply
        .header(
          "Content-Type",
          "application/xml; charset=utf-8"
        )
        .header(
          "Content-Disposition",
          'inline; filename="feed.xml"'
        )
        .send(xml);
    } catch (error: any) {
      fastify.log.error(error);

      return reply.code(500).send({
        message: "Failed to generate feed",
        error: error.message,
      });
    }
  });
}