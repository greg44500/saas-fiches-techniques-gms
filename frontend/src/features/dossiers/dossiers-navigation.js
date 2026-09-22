import { Store } from 'lucide-react';

import { DOSSIER_PERMISSION } from '@/features/dossiers/constants/dossier-permissions';

const dossiersWorkspaceNavigation = Object.freeze({
  groups: Object.freeze([
    Object.freeze({
      id: 'dossiers',
      type: 'item',
      label: 'Dossiers',
      Icon: Store,
      permission: DOSSIER_PERMISSION.READ,
      path: 'dossiers',
    }),
  ]),
});

export { dossiersWorkspaceNavigation };
