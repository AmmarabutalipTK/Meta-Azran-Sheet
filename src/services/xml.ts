import { getProducts, getToken } from "./salla";

function escapeXml(value: any): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatPrice(price: any): string {
  if (price == null) return "";

  if (typeof price === "object") {
    const amount = Number(price.amount ?? 0);
    const currency = price.currency ?? "SAR";

    return `${amount.toFixed(2)} ${currency}`;
  }

  return `${Number(price).toFixed(2)} SAR`;
}

function getAvailability(product: any): string {
  if (product.unlimited_quantity) {
    return "in stock";
  }

  return Number(product.quantity ?? 0) > 0
    ? "in stock"
    : "out of stock";
}

function getDescription(product: any): string {
  return (
    product.description ??
    product.short_description ??
    product.name ??
    ""
  );
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

      const sku = product.sku ?? "";
      const barcode = product.barcode ?? "";

      return `
      <item>
        <guid isPermaLink="false">${escapeXml(metaId)}</guid>

        <g:id>${escapeXml(metaId)}</g:id>

        <g:title>${escapeXml(title)}</g:title>

        <g:description>${escapeXml(description)}</g:description>

        <g:link>${escapeXml(link)}</g:link>

        <g:image_link>${escapeXml(image)}</g:image_link>

        <g:availability>${availability}</g:availability>

        ${
          price
            ? `<g:price>${escapeXml(price)}</g:price>`
            : ""
        }

        ${
          salePrice
            ? `<g:sale_price>${escapeXml(salePrice)}</g:sale_price>`
            : ""
        }

        ${
          itemGroupId
            ? `<g:item_group_id>${escapeXml(
                itemGroupId
              )}</g:item_group_id>`
            : ""
        }

        ${
          brand
            ? `<g:brand>${escapeXml(brand)}</g:brand>`
            : ""
        }

        ${
          sku
            ? `<g:sku>${escapeXml(sku)}</g:sku>`
            : ""
        }

        ${
          barcode
            ? `<g:gtin>${escapeXml(barcode)}</g:gtin>`
            : ""
        }

        ${
          productId
            ? `<product_id>${escapeXml(
                productId
              )}</product_id>`
            : ""
        }

        ${
          variantId
            ? `<variant_id>${escapeXml(
                variantId
              )}</variant_id>`
            : ""
        }

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
    <description>Azran products with Salla variants</description>
    <language>ar</language>
    <generator>Meta Azran Sheet</generator>
    <ttl>600</ttl>
    ${items}
  </channel>
</rss>`;
}