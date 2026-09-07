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

async function getProductVariants(
  token: string,
  productId: string | number
) {
  const json = await sallaFetch(
    token,
    `${SALLA_API_URL}/products/${productId}/variants`
  );

  return json.data ?? [];
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

      try {
        const variants = await getProductVariants(
          token,
          product.id
        );

        // No variants
        if (variants.length === 0) {
          products.push(normalizeProduct(product));
          continue;
        }

        // Variants
        for (const variant of variants) {
          const stock = Number(
            variant.stock_quantity ?? 0
          );

          if (
            !variant.unlimited_quantity &&
            stock <= 0
          ) {
            continue;
          }

          const productId = String(product.id);
          const variantId = String(variant.id);

          const variantName =
            variant.related_option_values
              ?.map((value: any) => {
                if (typeof value === "string") {
                  return value;
                }

                return (
                  value?.name ??
                  value?.value ??
                  ""
                );
              })
              .filter(Boolean)
              .join(" / ") ?? "";

          products.push({
            ...product,

            /*
             * Meta ID
             *
             * Always starts with 2.
             */
            id: `2${productId}${variantId}`,

            /*
             * Real Salla IDs.
             */
            product_id: productId,
            variant_id: variantId,

            /*
             * Meta product group.
             */
            item_group_id: productId,

            /*
             * Variant name.
             */
            variant_name: variantName,

            name: variantName
              ? `${removeVariantFromName(
                  product.name,
                  variantName
                )} - ${variantName}`
              : product.name,

            /*
             * Variant data.
             */
            sku:
              variant.sku ??
              product.sku ??
              "",

            barcode:
              variant.barcode ??
              product.barcode ??
              "",

            mpn:
              variant.mpn ??
              product.mpn ??
              "",

            gtin:
              variant.gtin ??
              product.gtin ??
              "",

            /*
             * Stock.
             */
            quantity: stock,

            unlimited_quantity:
              variant.unlimited_quantity ??
              product.unlimited_quantity ??
              false,

            /*
             * Price.
             */
            price:
              variant.regular_price?.amount > 0
                ? variant.regular_price
                : variant.price ??
                  product.price,

            sale_price:
              variant.sale_price?.amount > 0
                ? variant.sale_price
                : null,

            /*
             * Weight.
             */
            weight:
              variant.weight ??
              product.weight ??
              null,

            weight_type:
              variant.weight_type ??
              product.weight_type ??
              null,

            /*
             * Product image.
             */
            main_image:
              variant.image?.url ??
              variant.main_image ??
              product.main_image ??
              product.thumbnail ??
              product.images?.[0]?.url ??
              "",

            related_option_values:
              variant.related_option_values ?? [],
          });
        }
      } catch (error: any) {
        console.error(
          `Failed to process product ${product.id}:`,
          error?.message ?? error
        );

        /*
         * Keep the parent product if
         * the variant request fails.
         */
        products.push(
          normalizeProduct(product)
        );
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