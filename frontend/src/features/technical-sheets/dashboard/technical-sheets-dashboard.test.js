import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  technicalSheetsDashboardModule,
} from '@/features/technical-sheets/dashboard/technical-sheets-dashboard';

describe('technicalSheetsDashboardModule', () => {
  it('déclare le KPI exports comme widget personnalisable protégé par feature et permission', () => {
    const widget =
      technicalSheetsDashboardModule.widgets
        .find((item) =>
          item.id
          === 'gms.technical-sheet-exports-monthly');

    expect(widget).toMatchObject({
      label: 'Exports ce mois',
      slot: 'summary',
      configurable: true,
      access: {
        features: [
          'technical_sheet_export',
        ],
        permissions: [
          'technical-sheet:export',
        ],
      },
    });
  });
});
