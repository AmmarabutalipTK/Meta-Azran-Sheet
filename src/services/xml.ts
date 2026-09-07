import {
  getProductsFromFeed,
  getToken,
} from "./salla";

let cachedXml: string | null = null;
let cacheTime = 0;

const CACHE_TTL = 10 * 60 * 1000;

export async function generateXml() {
  const now = Date.now();

  if (
    cachedXml &&
    now - cacheTime < CACHE_TTL
  ) {
    return cachedXml;
  }

  const tokenResponse = await getToken();

const token = tokenResponse?.accessToken;

  if (!token) {
    throw new Error("Salla token not found");
  }

  const products =
    await getProductsFromFeed(token);

  const items = products
    .map((product) => product.xml)
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Azran Product Feed</title>
    <link>https://azranz39.com</link>
    <description>Azran products with Salla variants</description>
    <language>ar</language>
    <generator>Meta Azran Sheet</generator>
    <ttl>600</ttl>
    ${items}
  </channel>
</rss>`;

  cachedXml = xml;
  cacheTime = now;

  return xml;
}