import {
  TechnicalSheetExportsDashboardWidget,
} from '@/features/technical-sheets/components/technical-sheet-exports-dashboard-widget';
import {
  TechnicalSheetsCapacityDashboardWidget,
} from '@/features/technical-sheets/components/technical-sheets-capacity-dashboard-widget';
import {
  TECHNICAL_SHEET_FEATURE,
} from '@/features/technical-sheets/constants/technical-sheet-features';
import {
  TECHNICAL_SHEET_PERMISSION,
} from '@/features/technical-sheets/constants/technical-sheet-permissions';

const technicalSheetsDashboardModule = Object.freeze({
  widgets: Object.freeze([
    Object.freeze({
      id: 'gms.technical-sheet-exports-monthly',
      label: 'Exports ce mois',
      description: 'Exports PDF, XLSX et CSV consommés pendant le mois calendaire.',
      component: TechnicalSheetExportsDashboardWidget,
      slot: 'summary',
      order: 250,
      configurable: true,
      access: Object.freeze({
        features: Object.freeze([
          TECHNICAL_SHEET_FEATURE.EXPORT,
        ]),
        permissions: Object.freeze([
          TECHNICAL_SHEET_PERMISSION.EXPORT,
        ]),
      }),
    }),
    Object.freeze({
      id: 'gms.technical-sheets-capacity',
      label: 'Fiches techniques',
      description: 'Capacité de Fiches techniques du Workspace, corbeille comprise.',
      component: TechnicalSheetsCapacityDashboardWidget,
      slot: 'content',
      order: 70,
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
