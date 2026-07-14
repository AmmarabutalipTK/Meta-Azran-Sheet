import { FastifyInstance } from "fastify";
import { getProducts } from "../services/salla";
import { generateCsv } from "../services/csv";

export default async function (fastify: FastifyInstance) {
  fastify.get("/feed.csv", async (request, reply) => {
    // const token = request.headers.authorization?.replace("Bearer ", "");
    const token ="Bearer ory_at_ILW2gWbqUiULAE0vWKsNRYwFphq0w5JyOaU48cx3Fa8.rPsisjKmIeKD4YR-SVgvDEe8lt1b-MJk0_68ktgy1vA"

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
// import { FastifyInstance } from "fastify";
// import { getProducts } from "../services/salla";

// export default async function (fastify: FastifyInstance) {
//   fastify.get("/feed.csv", async (request, reply) => {
//     const token = "Bearer ory_at_ILW2gWbqUiULAE0vWKsNRYwFphq0w5JyOaU48cx3Fa8.rPsisjKmIeKD4YR-SVgvDEe8lt1b-MJk0_68ktgy1vA";

//     if (!token) {
//       return reply.code(401).send({
//         message: "Missing token",
//       });
//     }

//     const result = await getProducts(token);

//     return reply.send(result);
//   });
// }

// import { FastifyInstance } from "fastify";

// export default async function (fastify: FastifyInstance) {
//   fastify.get("/feed.csv", async () => {
//   const token = "Bearer ory_at_ILW2gWbqUiULAE0vWKsNRYwFphq0w5JyOaU48cx3Fa8.rPsisjKmIeKD4YR-SVgvDEe8lt1b-MJk0_68ktgy1vA";

//     const response = await fetch(
//       "https://api.salla.dev/admin/v2/products/535087115",
//       {
//         headers: {
//           Authorization: token,
//         },
//       }
//     );

//     return await response.json();
//   });
// }