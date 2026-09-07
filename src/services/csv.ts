export function generateXml(
  products: any[],
  brand = "Azran"
) {
  const items = products
    .map((product) => generateItem(product, brand))
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss
  version="2.0"
  xmlns:g="http://base.google.com/ns/1.0"
>
  <channel>
    <title>Azran Product Feed</title>
    <link>https://azranz39.com</link>
    <description>Azran product feed</description>

${items}

  </channel>
</rss>`;
}


function generateItem(
  product: any,
  brand: string
) {
  const price = getPrice(product);

  const salePrice = getSalePrice(product);

  const availability =
    product.unlimited_quantity ||
    (product.quantity ?? 0) > 0
      ? "in stock"
      : "out of stock";

  const image =
    product.main_image ??
    product.images?.[0]?.url ??
    "";

  const additionalImages =
    (product.images ?? [])
      .map((image: any) => image.url)
      .filter(Boolean)
      .filter((url: string) => url !== image)
      .slice(0, 10);

  const additionalImagesXml =
    additionalImages.length > 0
      ? additionalImages
          .map(
            (url: string) =>
              `    <g:additional_image_link>${xmlEscape(
                url
              )}</g:additional_image_link>`
          )
          .join("\n")
      : "";

  const itemGroupId =
    product.item_group_id
      ? `    <g:item_group_id>${xmlEscape(
          product.item_group_id
        )}</g:item_group_id>`
      : "";

  const size =
    product.variant_name
      ? `    <g:size>${xmlEscape(
          product.variant_name
        )}</g:size>`
      : "";

  return `    <item>
      <g:id>${xmlEscape(product.id)}</g:id>

      <g:title>${xmlEscape(
        product.name
      )}</g:title>

      <g:description>${xmlEscape(
        cleanDescription(product.description)
      )}</g:description>

      <g:availability>${availability}</g:availability>

      <g:condition>new</g:condition>

      <g:price>${xmlEscape(price)}</g:price>

${salePrice
  ? `      <g:sale_price>${xmlEscape(
      salePrice
    )}</g:sale_price>`
  : ""}

      <g:link>${xmlEscape(
        product.url ??
          product.urls?.customer ??
          ""
      )}</g:link>

      <g:image_link>${xmlEscape(
        image
      )}</g:image_link>

${additionalImagesXml}

      <g:brand>${xmlEscape(
        product.brand?.name ?? brand
      )}</g:brand>

${itemGroupId}

${size}

      <g:google_product_category>${xmlEscape(
        getGoogleCategory(product)
      )}</g:google_product_category>

      <g:product_type>${xmlEscape(
        getProductType(product)
      )}</g:product_type>

${product.mpn
  ? `      <g:mpn>${xmlEscape(
      product.mpn
    )}</g:mpn>`
  : ""}

${product.gtin
  ? `      <g:gtin>${xmlEscape(
      product.gtin
    )}</g:gtin>`
  : ""}

${
  product.weight
    ? `      <g:shipping_weight>${xmlEscape(
        `${product.weight} ${product.weight_type ?? "kg"}`
      )}</g:shipping_weight>`
    : ""
}

    </item>`;
}


function getPrice(product: any) {
  const price =
    product.price?.amount ??
    product.price ??
    0;

  const currency =
    product.price?.currency ??
    "SAR";

  return `${Number(price).toFixed(2)} ${currency}`;
}


function getSalePrice(product: any) {
  if (!product.sale_price) {
    return "";
  }

  const sale =
    product.sale_price.amount ??
    product.sale_price;

  const regular =
    product.price?.amount ??
    product.price ??
    0;

  /*
   * Only send sale_price if it is actually
   * lower than the regular price.
   */
  if (
    Number(sale) <= 0 ||
    Number(sale) >= Number(regular)
  ) {
    return "";
  }

  const currency =
    product.sale_price.currency ??
    product.price?.currency ??
    "SAR";

  return `${Number(sale).toFixed(2)} ${currency}`;
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
  if (!html) {
    return "";
  }

  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 5000);
}


/**
 * Escape XML special characters.
 */
function xmlEscape(value: any) {
  if (value == null) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}