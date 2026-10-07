import {
  Building2,
  Folders,
  Settings2,
  Trash2,
  WandSparkles,
} from 'lucide-react';

import { DOSSIER_PERMISSION } from '@/features/dossiers/constants/dossier-permissions';
import {
  SUPPLIER_PERMISSION,
} from '@/features/suppliers/constants/supplier-permissions';
import {
  TECHNICAL_SHEET_FEATURE,
} from '@/features/technical-sheets/constants/technical-sheet-features';
import {
  TECHNICAL_SHEET_PERMISSION,
} from '@/features/technical-sheets/constants/technical-sheet-permissions';

const dossiersWorkspaceNavigation = Object.freeze({
  groups: Object.freeze([
    Object.freeze({
      id: 'dossiers',
      type: 'group',
      label: 'Dossiers',
      Icon: Folders,
      items: Object.freeze([
        Object.freeze({
          id: 'dossier-accounts',
          label: 'Compte Client',
          Icon: Building2,
          permission: DOSSIER_PERMISSION.READ,
          path: 'dossiers',
        }),
        Object.freeze({
          id: 'technical-sheet-optimizer',
          label: 'Atelier d’optimisation',
          Icon: WandSparkles,
          permission: TECHNICAL_SHEET_PERMISSION.UPDATE,
          feature: TECHNICAL_SHEET_FEATURE.OPTIMIZER,
          path: 'technical-sheets/optimization',
        }),
        Object.freeze({
          id: 'technical-sheet-trash',
          label: 'Corbeille',
          Icon: Trash2,
          permission: TECHNICAL_SHEET_PERMISSION.PURGE,
          path: 'technical-sheets/trash',
        }),
        Object.freeze({
          id: 'dossier-settings',
          label: 'Paramètres',
          Icon: Settings2,
          permission: SUPPLIER_PERMISSION.APPLICABLE_PRICE_READ,
          path: 'dossiers-settings',
        }),
      ]),
    }),
  ]),
});

export { dossiersWorkspaceNavigation };
