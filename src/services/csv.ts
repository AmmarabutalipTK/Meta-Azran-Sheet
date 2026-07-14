export function generateCsv(products: any[], brand = "Azran") {
  const rows = [[
    "id",
    "title",
    "description",
    "availability",
    "condition",
    "price",
    "sale_price",
    "link",
    "image_link",
    "brand",
    "item_group_id",
    "size",
    "google_product_category",
    "product_type",
    "mpn",
    "gtin",
  ]];

  for (const product of products) {
    if (!product.is_available || product.status !== "sale") {
      continue;
    }

    const salePrice =
  product.sale_price &&
  product.sale_price.amount > 0 &&
  product.sale_price.amount < product.price.amount
    ? `${product.sale_price.amount} ${product.sale_price.currency}`
    : "";

    const availability =
      product.unlimited_quantity ||
      (product.quantity ?? 0) > 0
        ? "in stock"
        : "out of stock";

    rows.push([
      product.id,
      escape(product.name),
      escape(cleanDescription(product.description)),
      availability,
      "new",
      `${product.price.amount} ${product.price.currency}`,

      salePrice,

      product.url,

      product.main_image ??
        product.images?.[0]?.url ??
        "",

      escape(product.brand?.name ?? brand),

      product.item_group_id ?? "",

      escape(product.variant_name ?? ""),

      escape(getGoogleCategory(product)),

      escape(getProductType(product)),

      product.mpn ?? "",

      product.gtin ?? "",
    ]);
  }

  return rows.map((r) => r.join(",")).join("\n");
}

function getGoogleCategory(product: any) {
  return (
    product.category?.name ??
    product.categories?.[0]?.name ??
    "Food, Beverages & Tobacco > Food Items > Honey"
  );
}

function getProductType(product: any) {
  return (
    product.category?.name ??
    product.categories?.[0]?.name ??
    "Honey"
  );
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
    .slice(0, 5000);
}

function escape(value: any) {
  if (value == null) return "";
  return `"${String(value).replace(/"/g, '""')}"`;
}