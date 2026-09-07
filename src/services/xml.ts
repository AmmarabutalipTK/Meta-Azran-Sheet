const SALLA_API_URL = "https://api.salla.dev/admin/v2";

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

  /*
   * For variants:
   *
   * g:id = actual Salla variant/SKU ID
   * g:item_group_id = parent Salla product ID
   *
   * For normal products:
   *
   * g:id = product ID
   * no item_group_id
   */
  const metaId =
    product.variant_id
      ? String(product.variant_id)
      : String(
          product.product_id ??
          product.id
        );

  const itemGroupId =
    product.variant_id &&
    product.product_id
      ? `    <g:item_group_id>${xmlEscape(
          product.product_id
        )}</g:item_group_id>`
      : "";

  const size =
    product.variant_name
      ? `    <g:size>${xmlEscape(
          product.variant_name
        )}</g:size>`
      : "";

  /*
   * Optional internal/reference fields.
   *
   * These are NOT used for Meta's grouping.
   * Meta grouping is done through:
   *
   * g:id
   * g:item_group_id
   */
  const productIdXml =
    product.product_id
      ? `      <product_id>${xmlEscape(
          product.product_id
        )}</product_id>`
      : "";

  const variantIdXml =
    product.variant_id
      ? `      <variant_id>${xmlEscape(
          product.variant_id
        )}</variant_id>`
      : "";

  return `    <item>
      <g:id>${xmlEscape(metaId)}</g:id>

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

${productIdXml}

${variantIdXml}

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
        `${product.weight} ${
          product.weight_type ?? "kg"
        }`
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


function getAuthHeader(token: string): string {
  const cleanToken = token.trim();

  return cleanToken
    .toLowerCase()
    .startsWith("bearer ")
    ? cleanToken
    : `Bearer ${cleanToken}`;
}


async function sallaFetch(
  token: string,
  url: string
) {
  const response = await fetch(url, {
    headers: {
      Authorization: getAuthHeader(token),
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `Salla API error ${response.status}: ${body.slice(
        0,
        500
      )}`
    );
  }

  return response.json();
}


export async function getProducts(
  token: string
) {
  const products: any[] = [];
  let page = 1;

  while (true) {
    const json = await sallaFetch(
      token,
      `${SALLA_API_URL}/products?page=${page}`
    );

    for (const product of json.data ?? []) {
      if (
        !product.is_available ||
        product.status !== "sale"
      ) {
        continue;
      }

      const skus = product.skus ?? [];

      /*
       * ==========================================
       * NORMAL PRODUCT
       * ==========================================
       */
      if (skus.length === 0) {
        products.push(
          normalizeProduct(product)
        );

        continue;
      }

      /*
       * ==========================================
       * PRODUCT WITH VARIANTS
       * ==========================================
       */
      for (const sku of skus) {
        const productId = String(product.id);
        const variantId = String(sku.id);

        const stock = Number(
          sku.stock_quantity ??
          product.quantity ??
          0
        );

        /*
         * Skip unavailable variants.
         */
        if (
          !sku.unlimited_quantity &&
          stock <= 0
        ) {
          continue;
        }

        /*
         * These are OPTION VALUE IDs.
         *
         * They are NOT the variant ID.
         */
        const optionValueIds =
          sku.related_option_values ?? [];

        const variantName =
          getVariantName(
            product,
            optionValueIds
          );

        /*
         * ========================================
         * IMPORTANT META STRUCTURE
         * ========================================
         *
         * g:id
         *      = REAL SALLA VARIANT ID
         *
         * product_id
         *      = REAL SALLA PRODUCT ID
         *
         * variant_id
         *      = REAL SALLA VARIANT ID
         *
         * g:item_group_id
         *      = PRODUCT ID
         *
         * Example:
         *
         * product_id     = 1695733188
         * variant_id     = 1553437301
         *
         * g:id           = 1553437301
         * g:item_group_id = 1695733188
         */
        products.push({
          ...product,

          id: variantId,

          product_id: productId,

          variant_id: variantId,

          item_group_id: productId,

          variant_name: variantName,

          name: variantName
            ? `${removeVariantFromName(
                product.name,
                variantName
              )} - ${variantName}`
            : product.name,

          sku:
            sku.sku ??
            "",

          barcode:
            sku.barcode ??
            "",

          mpn:
            sku.mpn ??
            "",

          gtin:
            sku.gtin ??
            "",

          quantity: stock,

          unlimited_quantity:
            sku.unlimited_quantity ??
            product.unlimited_quantity ??
            false,

          price:
            sku.price?.amount > 0
              ? sku.price
              : product.price,

          sale_price:
            sku.sale_price?.amount > 0
              ? sku.sale_price
              : null,

          weight:
            sku.weight ??
            product.weight ??
            null,

          weight_type:
            sku.weight_type ??
            product.weight_type ??
            null,

          main_image:
            getVariantImage(
              product,
              optionValueIds
            ) ??
            product.main_image ??
            product.thumbnail ??
            product.images?.[0]?.url ??
            "",

          related_option_values:
            optionValueIds,
        });
      }
    }

    const totalPages =
      json.pagination?.totalPages ??
      json.pagination?.total_pages ??
      1;

    if (page >= totalPages) {
      break;
    }

    page++;
  }

  console.log(
    `Salla feed generation complete: ${products.length} feed items`
  );

  return products;
}


function getVariantName(
  product: any,
  optionValueIds: number[]
): string {
  const names: string[] = [];

  for (const option of product.options ?? []) {
    for (const value of option.values ?? []) {
      if (
        optionValueIds.includes(
          Number(value.id)
        )
      ) {
        names.push(
          value.name ??
          value.translations?.ar
            ?.option_details_name ??
          ""
        );
      }
    }
  }

  return names
    .filter(Boolean)
    .join(" / ");
}


function getVariantImage(
  product: any,
  optionValueIds: number[]
): string {
  for (const option of product.options ?? []) {
    for (const value of option.values ?? []) {
      if (
        optionValueIds.includes(
          Number(value.id)
        )
      ) {
        if (value.image_url) {
          return value.image_url;
        }
      }
    }
  }

  return "";
}


function normalizeProduct(
  product: any
) {
  const productId = String(product.id);

  return {
    ...product,

    /*
     * Normal product:
     * g:id = product ID
     */
    id: productId,

    product_id: productId,

    /*
     * Empty because this is
     * NOT a variant.
     */
    variant_id: "",

    /*
     * IMPORTANT:
     *
     * Do NOT set item_group_id
     * for a product that has no variants.
     */
    item_group_id: "",

    variant_name: "",

    price:
      product.taxed_price ??
      product.price,

    sale_price:
      product.taxed_sale_price ??
      product.sale_price ??
      null,

    main_image:
      product.main_image ??
      product.thumbnail ??
      product.images?.[0]?.url ??
      "",

    sku:
      product.sku ??
      "",

    barcode:
      product.barcode ??
      "",

    mpn:
      product.mpn ??
      "",

    gtin:
      product.gtin ??
      "",

    quantity:
      product.quantity ??
      0,

    unlimited_quantity:
      product.unlimited_quantity ??
      false,

    weight:
      product.weight ??
      null,

    weight_type:
      product.weight_type ??
      null,
  };
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
    const separatorIndex =
      product.lastIndexOf("|");

    if (separatorIndex !== -1) {
      return product
        .slice(0, separatorIndex)
        .trim();
    }

    return product;
  }

  if (product.includes(variant)) {
    return product;
  }

  const separatorIndex =
    product.lastIndexOf("|");

  if (separatorIndex !== -1) {
    const suffix = product
      .slice(separatorIndex + 1)
      .trim();

    if (
      suffix === variant ||
      variant.includes(suffix)
    ) {
      return product
        .slice(0, separatorIndex)
        .trim();
    }
  }

  return product;
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