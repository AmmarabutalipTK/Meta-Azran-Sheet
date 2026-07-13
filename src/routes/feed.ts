import { FastifyInstance } from "fastify";
import { getProducts } from "../services/salla";
import { generateCsv } from "../services/csv";

export default async function (fastify: FastifyInstance) {
  fastify.get("/feed.csv", async (request, reply) => {
    // const token = request.headers.authorization?.replace("Bearer ", "");
    const token ="Bearer 123"

    if (!token) {
      return reply.code(401).send({
        message: "Missing token",
      });
    }

    const products = await getProducts(token);

    const csv = generateCsv(products);

reply
  .header("Content-Type", "text/csv; charset=utf-8")
  .header("Content-Disposition", 'inline; filename="feed.csv"')
  .send(csv);
  });
}