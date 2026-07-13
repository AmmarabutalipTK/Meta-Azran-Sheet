export function generateCsv(products: any[], brand = "Azran") {
  const rows = [
    [
      "id",
      "title",
      "description",
      "availability",
      "condition",
      "price",
      "link",
      "image_link",
      "brand",
    ],
  ];

  for (const product of products) {

    
    // Skip hidden/unavailable products
    if (!product.is_available || product.status !== "sale") {
      continue;
    }

    rows.push([
      product.id,
      escape(product.name),
      escape(cleanDescription(product.description)),
      "in stock",
      "new",
      `${product.price.amount} ${product.price.currency}`,
      product.url,
      product.main_image ?? product.images?.[0]?.url ?? "",
      escape(product.brand?.name ?? brand),
    ]);
  }

  return rows.map((r) => r.join(",")).join("\n");
}

function cleanDescription(html?: string) {
  if (!html) return "";

  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1000);
}

function escape(value: any) {
  if (value == null) return "";
  return `"${String(value).replace(/"/g, '""')}"`;
}