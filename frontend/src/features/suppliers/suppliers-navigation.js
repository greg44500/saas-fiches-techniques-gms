import { Truck } from 'lucide-react';

import {
  SUPPLIER_PERMISSION,
} from '@/features/suppliers/constants/supplier-permissions';

const suppliersWorkspaceNavigation = Object.freeze({
  groups: Object.freeze([
    Object.freeze({
      id: 'suppliers',
      type: 'item',
      label: 'Fournisseurs',
      Icon: Truck,
      permission: SUPPLIER_PERMISSION.SUPPLIER_READ,
      path: 'suppliers',
    }),
  ]),
});

export { suppliersWorkspaceNavigation };
