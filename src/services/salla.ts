const SALLA_API_URL = "https://api.salla.dev/admin/v2";

const SOURCE_FEED_URL =
  "https://azranz39.com/feed/xml/eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1IjozMjU5ODQ2NjgsInMiOjMyNTk4NDY2OCwiaWF0IjoxNzU5MzA3NDEyfQ.Z50O8R9xqUWGtXmO4ZKRHd_zVzo6eGdZAdmti-CnMpU/ar/SAR";

function getAuthHeader(token: string): string {
  const cleanToken = token.trim();

  return cleanToken.toLowerCase().startsWith("bearer ")
    ? cleanToken
    : `Bearer ${cleanToken}`;
}

async function getProductVariants(
  token: string,
  productId: string | number
) {
  const response = await fetch(
    `${SALLA_API_URL}/products/${productId}/variants`,
    {
      headers: {
        Authorization: getAuthHeader(token),
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch variants ${productId}: ${response.status}`
    );
  }

  const json = await response.json();

  return json.data ?? [];
}

export async function getSourceFeed() {
  const response = await fetch(SOURCE_FEED_URL, {
    headers: {
      Accept: "application/xml",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch source feed: ${response.status}`
    );
  }

  return response.text();
}

export async function getProductsFromFeed(token: string) {
  const xml = await getSourceFeed();

  const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];

  const products: any[] = [];

  for (const itemXml of itemMatches) {
    const productId = getTagValue(itemXml, "g:id");

    if (!productId) {
      continue;
    }

    try {
      const variants = await getProductVariants(
        token,
        productId
      );

      // No variants
      if (!variants.length) {
        products.push({
          xml: itemXml,
          product_id: productId,
          variant_id: null,
        });

        continue;
      }

      // Product has variants
      for (const variant of variants) {
        if (
          !variant.unlimited_quantity &&
          Number(variant.stock_quantity ?? 0) <= 0
        ) {
          continue;
        }

        const variantName = getVariantName(
          variant.related_option_values
        );

        const feedId = `2${productId}${variant.id}`;

        const variantXml = buildVariantXml(
          itemXml,
          {
            feedId,
            productId,
            variantId: String(variant.id),
            variantName,
            variant,
          }
        );

        products.push({
          xml: variantXml,
          product_id: productId,
          variant_id: String(variant.id),
        });
      }
    } catch (error: any) {
      console.error(
        `Failed to process variants for ${productId}:`,
        error?.message ?? error
      );

      // Keep original product if variant request fails
      products.push({
        xml: itemXml,
        product_id: productId,
        variant_id: null,
      });
    }
  }

  console.log(
    `Feed generated: ${products.length} items`
  );

  return products;
}

function getVariantName(values: any[]): string {
  if (!Array.isArray(values)) {
    return "";
  }

  return values
    .map((value) => {
      if (typeof value === "string") {
        return value;
      }

      return (
        value?.name ??
        value?.value ??
        value?.option_value ??
        ""
      );
    })
    .filter(Boolean)
    .join(" / ");
}

function buildVariantXml(
  originalXml: string,
  data: {
    feedId: string;
    productId: string;
    variantId: string;
    variantName: string;
    variant: any;
  }
) {
  let xml = originalXml;

  const baseTitle = getTagValue(xml, "g:title") ?? "";

  const title = data.variantName
    ? `${removeVariantFromName(
        baseTitle,
        data.variantName
      )} - ${data.variantName}`
    : baseTitle;

  xml = replaceTag(
    xml,
    "g:id",
    data.feedId
  );

  xml = replaceTag(
    xml,
    "guid",
    data.feedId
  );

  xml = replaceTag(
    xml,
    "g:title",
    escapeXml(title)
  );

  /*
   * Parent product ID.
   * This is useful internally and does not affect
   * the Meta catalog fields.
   */
  xml = insertAfterId(
    xml,
    `<product_id>${escapeXml(data.productId)}</product_id>
<variant_id>${escapeXml(data.variantId)}</variant_id>
<g:item_group_id>${escapeXml(data.productId)}</g:item_group_id>`
  );

  const regularPrice =
    data.variant.regular_price?.amount ??
    data.variant.price?.amount;

  const salePrice =
    data.variant.sale_price?.amount;

  if (regularPrice != null) {
    xml = replaceTag(
      xml,
      "g:price",
      `${Number(regularPrice).toFixed(2)} SAR`
    );
  }

  if (salePrice != null && Number(salePrice) > 0) {
    xml = replaceTag(
      xml,
      "g:sale_price",
      `${Number(salePrice).toFixed(2)} SAR`
    );
  } else {
    xml = removeTag(xml, "g:sale_price");
  }

  const quantity =
    data.variant.stock_quantity;

  if (
    !data.variant.unlimited_quantity &&
    quantity != null &&
    Number(quantity) <= 0
  ) {
    xml = replaceTag(
      xml,
      "g:availability",
      "out of stock"
    );
  }

  if (data.variant.sku) {
    xml = insertAfterId(
      xml,
      `<g:mpn>${escapeXml(
        String(data.variant.sku)
      )}</g:mpn>`
    );
  }

  return xml;
}

function removeVariantFromName(
  productName: string,
  variantName: string
): string {
  if (!productName || !variantName) {
    return productName;
  }

  const product = productName.trim();
  const variant = variantName.trim();

  if (product === variant) {
    const separatorIndex = product.lastIndexOf("|");

    if (separatorIndex !== -1) {
      return product.slice(0, separatorIndex).trim();
    }

    return product;
  }

  if (product.includes(variant)) {
    return product;
  }

  const separatorIndex = product.lastIndexOf("|");

  if (separatorIndex !== -1) {
    const suffix = product
      .slice(separatorIndex + 1)
      .trim();

    if (
      suffix === variant ||
      variant.includes(suffix)
    ) {
      return product.slice(0, separatorIndex).trim();
    }
  }

  return product;
}

function getTagValue(
  xml: string,
  tag: string
): string | null {
  const escapedTag = tag.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

  const regex = new RegExp(
    `<${escapedTag}>([\\s\\S]*?)<\\/${escapedTag}>`
  );

  const match = xml.match(regex);

  return match
    ? decodeXml(match[1].trim())
    : null;
}

function replaceTag(
  xml: string,
  tag: string,
  value: string
): string {
  const escapedTag = tag.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

  const regex = new RegExp(
    `<${escapedTag}>[\\s\\S]*?<\\/${escapedTag}>`
  );

  return xml.replace(
    regex,
    `<${tag}>${value}</${tag}>`
  );
}

function removeTag(
  xml: string,
  tag: string
): string {
  const escapedTag = tag.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

  const regex = new RegExp(
    `\\s*<${escapedTag}>[\\s\\S]*?<\\/${escapedTag}>`,
    "g"
  );

  return xml.replace(regex, "");
}

function insertAfterId(
  xml: string,
  content: string
): string {
  return xml.replace(
    /(<g:id>[\s\S]*?<\/g:id>)/,
    `$1\n${content}`
  );
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

export async function getToken() {
  const response = await fetch(
    "https://salla.takarubdev.com/salla/api/cahtgate/auth/token/2",
    {
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `Failed to get Salla token: ${response.status} ${body}`
    );
  }

  return response.json();
}