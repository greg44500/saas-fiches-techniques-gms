import { describe, expect, it } from 'vitest';

import {
  APPLICATION_DASHBOARD_WIDGET_MODULES,
  applicationDashboardWidgets,
  getAccessibleDashboardWidgets,
} from '@/app/application-dashboard';
import { DOSSIER_PERMISSION } from '@/features/dossiers/constants/dossier-permissions';
import { dossiersDashboardModule } from '@/features/dossiers/dashboard/dossiers-dashboard';

describe('dossiers dashboard composition', () => {
  it('enregistre le module métier dans le Dashboard Workspace existant', () => {
    expect(APPLICATION_DASHBOARD_WIDGET_MODULES).toContain(dossiersDashboardModule);

    const dossierWidget = applicationDashboardWidgets.find(
      (widget) => widget.id === 'gms.dossiers-overview',
    );

    expect(dossierWidget).toEqual(expect.objectContaining({
      label: 'Dossiers',
      slot: 'content',
      configurable: false,
    }));
    expect(dossierWidget.order).toBeLessThan(
      applicationDashboardWidgets.find(
        (widget) => widget.id === 'core.recent-activity',
      ).order,
    );
  });

  it('rend le widget accessible uniquement avec dossier:read', () => {
    const withoutPermission = getAccessibleDashboardWidgets(
      applicationDashboardWidgets,
      {
        can: () => false,
        hasFeature: () => true,
      },
    );

    expect(
      withoutPermission.some((widget) => widget.id === 'gms.dossiers-overview'),
    ).toBe(false);

    const withPermission = getAccessibleDashboardWidgets(
      applicationDashboardWidgets,
      {
        can: (permission) => permission === DOSSIER_PERMISSION.READ,
        hasFeature: () => false,
      },
    );

    expect(
      withPermission.some((widget) => widget.id === 'gms.dossiers-overview'),
    ).toBe(true);
  });
});
