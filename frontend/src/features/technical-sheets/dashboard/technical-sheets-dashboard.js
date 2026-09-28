import {
  TechnicalSheetsCapacityDashboardWidget,
} from '@/features/technical-sheets/components/technical-sheets-capacity-dashboard-widget';
import {
  TECHNICAL_SHEET_PERMISSION,
} from '@/features/technical-sheets/constants/technical-sheet-permissions';

const technicalSheetsDashboardModule = Object.freeze({
  widgets: Object.freeze([
    Object.freeze({
      id: 'gms.technical-sheets-capacity',
      label: 'Fiches techniques',
      description: 'Capacité de Fiches techniques du Workspace, corbeille comprise.',
      component: TechnicalSheetsCapacityDashboardWidget,
      slot: 'summary',
      order: 450,
      configurable: true,
      access: Object.freeze({
        features: Object.freeze([]),
        permissions: Object.freeze([
          TECHNICAL_SHEET_PERMISSION.READ,
        ]),
      }),
    }),
  ]),
});

export { technicalSheetsDashboardModule };
