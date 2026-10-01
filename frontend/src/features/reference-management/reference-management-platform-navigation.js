import { BookOpen } from 'lucide-react';

import {
  PRODUCT_REFERENCE_PERMISSION,
} from '@/features/products/constants/product-permissions';
import {
  REFERENCE_MANAGEMENT_BASE_PATH,
} from '@/features/reference-management/reference-management.constants';
import {
  SUPPLIER_REFERENCE_PERMISSION,
} from '@/features/suppliers/constants/supplier-permissions';

const referenceManagementPlatformNavigationModule = Object.freeze({
  sections: Object.freeze([
    Object.freeze({
      type: 'section',
      id: 'gms',
      label: 'GMS',
      items: Object.freeze([
        Object.freeze({
          id: 'reference-management',
          label: 'Gestion des référentiels',
          to: REFERENCE_MANAGEMENT_BASE_PATH,
          icon: BookOpen,
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
    }),
  ]),
});

export { referenceManagementPlatformNavigationModule };
