import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const useWorkspaceContextMock = vi.hoisted(() => vi.fn());
const useGetCurrentUserPreferencesQueryMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/workspace/components/workspace-context', () => ({
  useWorkspaceContext: useWorkspaceContextMock,
}));

vi.mock('@/features/preferences/api/user-preferences-api', () => ({
  useGetCurrentUserPreferencesQuery: useGetCurrentUserPreferencesQueryMock,
}));

import { WORKSPACE_FEATURE } from '@/features/workspace/constants/workspace-features';
import { WORKSPACE_PERMISSION } from '@/features/workspace/constants/workspace-permissions';
import { useWorkspaceDashboardWidgets } from '@/features/workspace/hooks/use-workspace-dashboard-widgets';

const workspace = { id: 'workspace-1', name: 'Acme', status: 'active' };

function mockWorkspaceContext({ features = [], permissions = [] } = {}) {
  const featureSet = new Set(features);
  const permissionSet = new Set(permissions);

  useWorkspaceContextMock.mockReturnValue({
    workspace,
    can: (permission) => permissionSet.has(permission),
    hasFeature: (feature) => featureSet.has(feature),
  });
}

function mockPreferences({ hiddenWidgetIds = [], loading = false } = {}) {
  useGetCurrentUserPreferencesQueryMock.mockReturnValue({
    data: loading ? undefined : {
      dashboard: { hiddenWidgetIds },
    },
    isError: false,
    isFetching: loading,
    isLoading: loading,
  });
}

describe('useWorkspaceDashboardWidgets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWorkspaceContext();
    mockPreferences();
  });

  it('ne rend accessible que les widgets couverts par les capabilities et permissions effectives', () => {
    mockWorkspaceContext({
      features: [WORKSPACE_FEATURE.TEAM_MANAGEMENT],
      permissions: [WORKSPACE_PERMISSION.MEMBER_READ],
    });

    const { result } = renderHook(() => useWorkspaceDashboardWidgets());
    const accessibleIds = result.current.accessibleWidgets.map((widget) => widget.id);

    expect(accessibleIds).toEqual(['core.members']);
    expect(accessibleIds).not.toContain('core.workspace-status');
    expect(accessibleIds).not.toContain('core.workspace-role');
    expect(accessibleIds).not.toContain('core.subscription');
    expect(accessibleIds).not.toContain('core.pending-invitations');
    expect(accessibleIds).not.toContain('core.files');
    expect(accessibleIds).not.toContain('core.recent-activity');
  });

  it('ignore les anciens ids de widgets retirés sans modifier les préférences persistées', () => {
    mockWorkspaceContext({
      features: [WORKSPACE_FEATURE.TEAM_MANAGEMENT],
      permissions: [WORKSPACE_PERMISSION.MEMBER_READ],
    });
    mockPreferences({
      hiddenWidgetIds: [
        'core.workspace-status',
        'core.workspace-role',
        'core.subscription',
      ],
    });

    const { result } = renderHook(() => useWorkspaceDashboardWidgets());

    expect(result.current.visibleWidgets.map((widget) => widget.id))
      .toEqual(['core.members']);
  });

  it('applique le masquage personnel uniquement à un widget encore enregistré et accessible', () => {
    mockWorkspaceContext({
      features: [WORKSPACE_FEATURE.TEAM_MANAGEMENT],
      permissions: [WORKSPACE_PERMISSION.MEMBER_READ],
    });
    mockPreferences({ hiddenWidgetIds: ['core.members'] });

    const { result } = renderHook(() => useWorkspaceDashboardWidgets());

    expect(result.current.visibleWidgets).toEqual([]);
  });

  it('ne monte aucun widget configurable tant que les préférences sont en chargement', () => {
    mockWorkspaceContext({
      features: [WORKSPACE_FEATURE.TEAM_MANAGEMENT],
      permissions: [WORKSPACE_PERMISSION.MEMBER_READ],
    });
    mockPreferences({ loading: true });

    const { result } = renderHook(() => useWorkspaceDashboardWidgets());

    expect(result.current.visibleWidgets).toEqual([]);
    expect(result.current.isPreferencesLoading).toBe(true);
  });
});
