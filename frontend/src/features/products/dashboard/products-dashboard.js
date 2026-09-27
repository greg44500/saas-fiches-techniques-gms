import { ProductsDashboardWidget } from '@/features/products/components/products-dashboard-widget';
import { PRODUCT_PERMISSION } from '@/features/products/constants/product-permissions';

const productsDashboardModule = Object.freeze({
  widgets: Object.freeze([
    Object.freeze({
      id: 'gms.products-catalog',
      label: 'Mon référentiel Produits',
      description: 'État du référentiel Produit de l’espace de travail.',
      component: ProductsDashboardWidget,
      slot: 'content',
      order: 60,
      configurable: true,
      access: Object.freeze({
        features: Object.freeze([]),
        permissions: Object.freeze([PRODUCT_PERMISSION.READ]),
      }),
    }),
  ]),
});

export { productsDashboardModule };
