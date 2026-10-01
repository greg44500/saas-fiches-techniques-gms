import { Database } from 'lucide-react';

import {
  PRODUCT_REFERENCE_PERMISSION,
} from '@/features/products/constants/product-permissions';
import {
  SUPPLIER_REFERENCE_PERMISSION,
} from '@/features/suppliers/constants/supplier-permissions';

const referenceManagementPlatformNavigationModule = Object.freeze({
  sections: Object.freeze([
    Object.freeze({
      type: 'item',
      id: 'reference-management',
      label: 'Gestion des référentiels',
      to: '/reference-management',
      icon: Database,
      isVisible: ({ applicationGlobalPermissions }) => (
        applicationGlobalPermissions.has(
          PRODUCT_REFERENCE_PERMISSION.READ,
        )
        || applicationGlobalPermissions.has(
          SUPPLIER_REFERENCE_PERMISSION.READ,
        )
      ),
    }),
  ]),
});

export { referenceManagementPlatformNavigationModule };
