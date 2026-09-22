import { ProductReadGate } from '@/features/products/components/product-read-gate';
import { ProductsPage } from '@/features/products/pages/products-page';

function ProductsRoute() {
  return (
    <ProductReadGate>
      <ProductsPage />
    </ProductReadGate>
  );
}

export { ProductsRoute };
