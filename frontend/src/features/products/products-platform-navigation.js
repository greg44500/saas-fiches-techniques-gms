import { Database } from 'lucide-react';

import {
  PRODUCT_REFERENCE_PERMISSION,
} from '@/features/products/constants/product-permissions';

const productsPlatformNavigationModule = Object.freeze({
  sections: Object.freeze([
    Object.freeze({
      type: 'item',
      id: 'product-reference',
      label: 'Référentiel Produits',
      to: '/product-reference',
      icon: Database,
      isVisible: ({ applicationGlobalPermissions }) => (
        applicationGlobalPermissions.has(
          PRODUCT_REFERENCE_PERMISSION.READ,
        )
      ),
    }),
  ]),
});

export { productsPlatformNavigationModule };
