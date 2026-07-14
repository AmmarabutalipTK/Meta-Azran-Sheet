export async function getProducts(token: string) {
  let page = 1;
  const products: any[] = [];

  while (true) {
    const response = await fetch(
      `https://api.salla.dev/admin/v2/products?page=${page}`,
      {
        headers: {
          Authorization: token,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch page ${page}`);
    }

    const json = await response.json();

    for (const product of json.data ?? []) {
      // Skip hidden products
      if (!product.is_available || product.status !== "sale") {
        continue;
      }

      // Normal product
      if ((product.options?.length ?? 0) === 0) {
        products.push(product);
        continue;
      }

      // Fetch full product details
      const detailsResponse = await fetch(
        `https://api.salla.dev/admin/v2/products/${product.id}`,
        {
          headers: {
            Authorization: token,
          },
        }
      );

      if (!detailsResponse.ok) {
        console.error(`Failed to fetch product ${product.id}`);
        products.push(product);
        continue;
      }

      const details = (await detailsResponse.json()).data;

      const optionValueMap = new Map<number, any>();

      for (const option of details.options ?? []) {
        for (const value of option.values ?? []) {
          optionValueMap.set(value.id, value);
        }
      }

      // No variants? Keep parent
      if (!details.skus?.length) {
        products.push(product);
        continue;
      }

      // Replace parent with SKUs
      for (const sku of details.skus) {
        // Skip only if stock is limited and zero
        if (
          !sku.unlimited_quantity &&
          (sku.stock_quantity ?? 0) <= 0
        ) {
          continue;
        }

        const values = (sku.related_option_values ?? [])
          .map((id: number) => optionValueMap.get(id))
          .filter(Boolean);

   products.push({
  ...product,

  // Meta prefers SKU if available, otherwise use the SKU ID
  id: sku.sku || sku.id,

  // Group all variants together
  item_group_id: product.id,

  // Product title
  name:
    values.length > 0
      ? `${product.name} - ${values
          .map((v: any) => v.name)
          .join(" / ")}`
      : product.name,

  // Variant value (used for the "size" column)
  variant_name:
    values.length > 0
      ? values.map((v: any) => v.name).join(" / ")
      : "",

  // Stock
  quantity: sku.stock_quantity,
  unlimited_quantity: sku.unlimited_quantity,

  // Pricing
  price: sku.price ?? product.price,
  sale_price: sku.sale_price ?? null,

  // Image
  main_image:
    sku.image?.url ??
    values.find((v: any) => v.image_url)?.image_url ??
    product.main_image ??
    product.images?.[0]?.url,

  // SKU identifiers
  sku: sku.sku,
  mpn: sku.mpn,
  gtin: sku.gtin,
  barcode: sku.barcode,

  // Weight
  weight: sku.weight,
  weight_label: sku.weight_label,

  // Remove nested data
  options: [],
  skus: [],
});
      }
    }

    if (page >= json.pagination.totalPages) {
      break;
    }

    page++;
  }

  return products;
}