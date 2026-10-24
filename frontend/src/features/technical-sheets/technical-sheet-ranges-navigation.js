import { Tags } from 'lucide-react';

import {
  TECHNICAL_SHEET_PERMISSION,
} from '@/features/technical-sheets/constants/technical-sheet-permissions';

const technicalSheetRangesWorkspaceNavigation = Object.freeze({
  groups: Object.freeze([
    Object.freeze({
      id: 'technical-sheet-ranges',
      type: 'item',
      label: 'Gammes de produits finis',
      Icon: Tags,
      permission: TECHNICAL_SHEET_PERMISSION.READ,
      path: 'technical-sheets/ranges',
    }),
  ]),
});

export { technicalSheetRangesWorkspaceNavigation };
