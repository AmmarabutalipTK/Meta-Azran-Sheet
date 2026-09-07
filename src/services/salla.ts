const SALLA_API_URL = "https://api.salla.dev/admin/v2";

function getAuthHeader(token: string): string {
  const cleanToken = token.trim();

  return cleanToken.toLowerCase().startsWith("bearer ")
    ? cleanToken
    : `Bearer ${cleanToken}`;
}

async function getProductDetails(
  token: string,
  productId: string | number
) {
  const response = await fetch(
    `${SALLA_API_URL}/products/${productId}`,
    {
      headers: {
        Authorization: getAuthHeader(token),
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch product details ${productId}: ${response.status}`
    );
  }

  const json = await response.json();

  return json.data;
}

export async function getProducts(token: string) {
  let page = 1;
  const products: any[] = [];

  while (true) {
    const response = await fetch(
      `${SALLA_API_URL}/products?page=${page}`,
      {
        headers: {
          Authorization: getAuthHeader(token),
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      const body = await response.text();

      throw new Error(
        `Failed to fetch products page ${page}: ${response.status} ${body}`
      );
    }

    const json = await response.json();

    for (const product of json.data ?? []) {
      if (
        !product.is_available ||
        product.status !== "sale"
      ) {
        continue;
      }

      try {
        // Always fetch details because listing API
        // may return empty options/skus.
        const details = await getProductDetails(
          token,
          product.id
        );

        const skus = details?.skus ?? [];
        const options = details?.options ?? [];

        const optionValueMap = new Map<number, any>();

        for (const option of options) {
          for (const value of option.values ?? []) {
            optionValueMap.set(Number(value.id), value);
          }
        }

        // Normal product
        if (skus.length === 0) {
          products.push(
            normalizeProduct({
              ...product,
              ...details,
            })
          );

          continue;
        }

        // Product with variants
        for (const sku of skus) {
          if (
            !sku.unlimited_quantity &&
            Number(sku.stock_quantity ?? 0) <= 0
          ) {
            continue;
          }

          const values = (
            sku.related_option_values ?? []
          )
            .map((id: string | number) =>
              optionValueMap.get(Number(id))
            )
            .filter(Boolean);

          const variantName = values
            .map((value: any) => value.name)
            .filter(Boolean)
            .join(" / ");

          const baseName = removeVariantFromName(
            product.name,
            variantName
          );

          const variantImage =
            sku.image?.url ??
            values.find(
              (value: any) => value.image_url
            )?.image_url ??
            details?.main_image ??
            product.main_image ??
            details?.images?.[0]?.url ??
            product.images?.[0]?.url ??
            "";

          const price =
            sku.taxed_price ??
            sku.price ??
            details?.taxed_price ??
            product.taxed_price ??
            product.price;

          const salePrice =
            sku.taxed_sale_price ??
            sku.sale_price ??
            null;

          products.push({
            ...product,

            id: `sku_${sku.id}`,

            item_group_id: String(product.id),

            name: variantName
              ? `${baseName} - ${variantName}`
              : product.name,

            variant_name: variantName,

            sku: sku.sku ?? "",
            barcode: sku.barcode ?? "",
            mpn: sku.mpn ?? "",
            gtin: sku.gtin ?? "",

            quantity:
              sku.stock_quantity ??
              product.quantity ??
              0,

            unlimited_quantity:
              sku.unlimited_quantity ??
              product.unlimited_quantity ??
              false,

            price,
            sale_price: salePrice,

            main_image: variantImage,

            weight:
              sku.weight ??
              details?.weight ??
              product.weight,

            weight_type:
              sku.weight_type ??
              details?.weight_type ??
              product.weight_type,

            options,
            skus: [],
          });
        }
      } catch (error: any) {
        console.error(
          `Failed to process product ${product.id}:`,
          error?.message ?? error
        );

        products.push(normalizeProduct(product));
      }
    }

    const totalPages =
      json.pagination?.totalPages ??
      json.pagination?.total_pages ??
      page;

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

function removeVariantFromName(
  productName: string,
  variantName: string
): string {
  if (!productName || !variantName) {
    return productName;
  }

  const separatorIndex = productName.lastIndexOf("|");

  if (separatorIndex === -1) {
    return productName;
  }

  const suffix = productName
    .slice(separatorIndex + 1)
    .trim();

  if (
    suffix === variantName ||
    suffix.includes(variantName) ||
    variantName.includes(suffix)
  ) {
    return productName
      .slice(0, separatorIndex)
      .trim();
  }

  return productName;
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

function normalizeProduct(product: any) {
  return {
    ...product,

    id: String(product.id),

    item_group_id: "",

    price:
      product.taxed_price ??
      product.price,

    sale_price:
      product.taxed_sale_price ??
      product.sale_price ??
      null,

    main_image:
      product.main_image ??
      product.images?.[0]?.url ??
      "",

    sku: product.sku ?? "",
    barcode: product.barcode ?? "",
    mpn: product.mpn ?? "",
    gtin: product.gtin ?? "",

    variant_name: "",
  };
}