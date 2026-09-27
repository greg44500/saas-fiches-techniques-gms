import { Warehouse } from 'lucide-react';

import {
  SUPPLIER_REFERENCE_PERMISSION,
} from '@/features/suppliers/constants/supplier-permissions';

const suppliersPlatformNavigationModule = Object.freeze({
  sections: Object.freeze([
    Object.freeze({
      type: 'item',
      id: 'supplier-reference',
      label: 'Référentiel Fournisseurs',
      to: '/supplier-reference',
      icon: Warehouse,
      isVisible: ({ applicationGlobalPermissions }) => (
        applicationGlobalPermissions.has(
          SUPPLIER_REFERENCE_PERMISSION.READ,
        )
      ),
    }),
  ]),
});

export { suppliersPlatformNavigationModule };
