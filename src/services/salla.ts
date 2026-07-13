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

    const json = await response.json();

    products.push(...json.data);

    if (page >= json.pagination.totalPages) {
      break;
    }

    page++;
  }

  return products;
}