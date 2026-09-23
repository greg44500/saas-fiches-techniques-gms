import { PackageSearch } from 'lucide-react';

import {
  PRODUCT_CAPABILITY,
  PRODUCT_PERMISSION,
} from '@/features/products/constants/product-permissions';

const productsWorkspaceNavigation = Object.freeze({
  groups: Object.freeze([
    Object.freeze({
      id: 'products',
      type: 'item',
      label: 'Produits',
      Icon: PackageSearch,
      permission: PRODUCT_PERMISSION.READ,
      feature: PRODUCT_CAPABILITY.REFERENCE_ACCESS,
      path: 'products',
    }),
  ]),
});

export { productsWorkspaceNavigation };
