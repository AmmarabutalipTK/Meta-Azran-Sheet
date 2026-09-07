const SALLA_API_URL = "https://api.salla.dev/admin/v2";

function getAuthHeader(token: string): string {
  const cleanToken = token.trim();

  return cleanToken.toLowerCase().startsWith("bearer ")
    ? cleanToken
    : `Bearer ${cleanToken}`;
}

async function sallaFetch(token: string, url: string) {
  const response = await fetch(url, {
    headers: {
      Authorization: getAuthHeader(token),
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `Salla API error ${response.status}: ${body.slice(0, 500)}`
    );
  }

  return response.json();
}

export async function getProducts(token: string) {
  const products: any[] = [];
  let page = 1;

  while (true) {
    const json = await sallaFetch(
      token,
      `${SALLA_API_URL}/products?page=${page}`
    );

    for (const product of json.data ?? []) {
      if (!product.is_available || product.status !== "sale") {
        continue;
      }

      const skus = product.skus ?? [];

      // Normal product
      if (skus.length === 0) {
        products.push(normalizeProduct(product));
        continue;
      }

      // Product variants / SKUs
      for (const sku of skus) {
        const productId = String(product.id);
        const variantId = String(sku.id);

        const stock = Number(
          sku.stock_quantity ?? product.quantity ?? 0
        );

        if (
          !sku.unlimited_quantity &&
          stock <= 0
        ) {
          continue;
        }

        /*
         * IMPORTANT:
         *
         * sku.related_option_values contains OPTION VALUE IDs.
         *
         * Example:
         * 665912211 = option value
         *
         * sku.id is the actual variant/SKU ID.
         *
         * Example:
         * 1240497430 = actual variant
         */
        const optionValueIds =
          sku.related_option_values ?? [];

        const variantName =
          getVariantName(
            product,
            optionValueIds
          );

        products.push({
          ...product,

          /*
           * Meta ID.
           *
           * Always starts with 2.
           */
          id: `2${productId}${variantId}`,

          /*
           * REAL SALLA IDS.
           */
          product_id: productId,
          variant_id: variantId,

          /*
           * Parent product.
           */
          item_group_id: productId,

          /*
           * Variant information.
           */
          variant_name: variantName,

          name: variantName
            ? `${removeVariantFromName(
                product.name,
                variantName
              )} - ${variantName}`
            : product.name,

          /*
           * SKU data.
           */
          sku: sku.sku ?? "",
          barcode: sku.barcode ?? "",
          mpn: sku.mpn ?? "",
          gtin: sku.gtin ?? "",

          /*
           * Stock.
           */
          quantity: stock,

          unlimited_quantity:
            sku.unlimited_quantity ??
            product.unlimited_quantity ??
            false,

          /*
           * Price.
           */
          price:
            sku.price?.amount > 0
              ? sku.price
              : product.price,

          sale_price:
            sku.sale_price?.amount > 0
              ? sku.sale_price
              : null,

          /*
           * Weight.
           */
          weight:
            sku.weight ??
            product.weight ??
            null,

          weight_type:
            sku.weight_type ??
            product.weight_type ??
            null,

          /*
           * Image.
           */
          main_image:
            getVariantImage(
              product,
              optionValueIds
            ) ??
            product.main_image ??
            product.thumbnail ??
            product.images?.[0]?.url ??
            "",

          /*
           * Keep the actual option IDs
           * for future checkout mapping.
           */
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
          value.translations?.ar?.option_details_name ??
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

function normalizeProduct(product: any) {
  const productId = String(product.id);

  return {
    ...product,

    /*
     * Meta ID always starts with 2.
     */
    id: `2${productId}`,

    /*
     * Real Salla product ID.
     */
    product_id: productId,

    variant_id: "",

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

    sku: product.sku ?? "",
    barcode: product.barcode ?? "",
    mpn: product.mpn ?? "",
    gtin: product.gtin ?? "",

    quantity:
      product.quantity ?? 0,

    unlimited_quantity:
      product.unlimited_quantity ??
      false,

    weight:
      product.weight ?? null,

    weight_type:
      product.weight_type ?? null,
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