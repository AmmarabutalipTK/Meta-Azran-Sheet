import { getProducts, getToken } from "./salla";

function escapeXml(value: any): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function stripHtml(value: any): string {
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function getDescription(product: any): string {
  const description = stripHtml(
    product.description ??
      product.short_description ??
      product.name ??
      ""
  );

  // Keep description at a reasonable length.
  return description.slice(0, 5000);
}

function formatPrice(price: any): string {
  if (price == null) {
    return "";
  }

  if (typeof price === "object") {
    const amount = Number(price.amount);

    if (!Number.isFinite(amount)) {
      return "";
    }

    const currency = price.currency ?? "SAR";

    return `${amount.toFixed(2)} ${currency}`;
  }

  const amount = Number(price);

  if (!Number.isFinite(amount)) {
    return "";
  }

  return `${amount.toFixed(2)} SAR`;
}

function getAvailability(product: any): string {
  if (product.unlimited_quantity) {
    return "in stock";
  }

  return Number(product.quantity ?? 0) > 0
    ? "in stock"
    : "out of stock";
}

function getLink(product: any): string {
  return (
    product.url ??
    product.customer_url ??
    product.link ??
    ""
  );
}

function getImage(product: any): string {
  return (
    product.main_image ??
    product.thumbnail ??
    product.images?.[0]?.url ??
    ""
  );
}

function getBrand(product: any): string {
  return (
    product.brand?.name ??
    product.brand_name ??
    ""
  );
}

function getValidGtin(product: any): string {
  const value = String(
    product.gtin ??
      product.barcode ??
      ""
  ).trim();

  /*
   * GTIN must be numeric and one of:
   * 8, 12, 13 or 14 digits.
   */
  if (!/^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/.test(value)) {
    return "";
  }

  return value;
}

export async function generateXml(): Promise<string> {
  const tokenResponse = await getToken();

  const token =
    tokenResponse.accessToken ??
    tokenResponse.access_token ??
    tokenResponse.token;

  if (!token) {
    throw new Error("Salla access token not found");
  }

  const products = await getProducts(token);

  const items = products
    .map((product: any) => {
      const metaId = String(product.id);

      const title = product.name ?? "";
      const description = getDescription(product);
      const link = getLink(product);
      const image = getImage(product);
      const brand = getBrand(product);

      const price = formatPrice(product.price);
      const salePrice = formatPrice(product.sale_price);

      const availability = getAvailability(product);

      const itemGroupId = product.item_group_id
        ? String(product.item_group_id)
        : "";

      const productId = product.product_id
        ? String(product.product_id)
        : "";

      const variantId = product.variant_id
        ? String(product.variant_id)
        : "";

      const sku = product.sku
        ? String(product.sku)
        : "";

      const gtin = getValidGtin(product);

      return `
      <item>
        <guid isPermaLink="false">${escapeXml(metaId)}</guid>

        <g:id>${escapeXml(metaId)}</g:id>

        <g:title>${escapeXml(title)}</g:title>

        <g:description>${escapeXml(description)}</g:description>

        <g:link>${escapeXml(link)}</g:link>

        <g:image_link>${escapeXml(image)}</g:image_link>

        <g:availability>${escapeXml(availability)}</g:availability>

        <g:condition>new</g:condition>

        ${price
          ? `<g:price>${escapeXml(price)}</g:price>`
          : ""}

        ${salePrice
          ? `<g:sale_price>${escapeXml(salePrice)}</g:sale_price>`
          : ""}

        ${itemGroupId
          ? `<g:item_group_id>${escapeXml(itemGroupId)}</g:item_group_id>`
          : ""}

        ${brand
          ? `<g:brand>${escapeXml(brand)}</g:brand>`
          : ""}

        ${sku
          ? `<g:mpn>${escapeXml(sku)}</g:mpn>`
          : ""}

        ${gtin
          ? `<g:gtin>${escapeXml(gtin)}</g:gtin>`
          : ""}

        ${productId
          ? `<product_id>${escapeXml(productId)}</product_id>`
          : ""}

        ${variantId
          ? `<variant_id>${escapeXml(variantId)}</variant_id>`
          : ""}

        ${
          product.variant_name
            ? `<variant_name>${escapeXml(
                product.variant_name
              )}</variant_name>`
            : ""
        }
      </item>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss
  xmlns:g="http://base.google.com/ns/1.0"
  version="2.0"
>
  <channel>
    <title>Azran Product Feed</title>

    <link>https://azranz39.com</link>

    <description>
      Azran products with Salla variants
    </description>

    <language>ar</language>

    <generator>Meta Azran Sheet</generator>

    <ttl>600</ttl>

    ${items}
  </channel>
</rss>`;
}