import { describe, expect, it } from 'vitest';

import { coreDashboardWidgets } from '@/features/workspace/dashboard/core-dashboard-widgets';

describe('Core workspace dashboard surfaces', () => {
  it('ne rend plus les informations déjà exposées par le shell Workspace', () => {
    const widgetIds = coreDashboardWidgets.map((widget) => widget.id);

    expect(widgetIds).not.toContain('core.workspace-status');
    expect(widgetIds).not.toContain('core.workspace-role');
    expect(widgetIds).not.toContain('core.subscription');
  });

  it('ne traite plus le nombre de fichiers actifs comme un KPI de dashboard', () => {
    expect(
      coreDashboardWidgets.some((widget) => widget.id === 'core.files'),
    ).toBe(false);
  });
});
