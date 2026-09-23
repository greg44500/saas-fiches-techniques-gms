import { describe, expect, it } from 'vitest';

import { PRODUCT_CAPABILITY } from '@/features/products/constants/product-permissions';
import { WORKSPACE_FEATURE } from '@/features/workspace/constants/workspace-features';
import {
  getWorkspaceRouteRequiredFeature,
} from '@/features/workspace/lib/workspace-route-entitlement';

describe('getWorkspaceRouteRequiredFeature', () => {
  it('associe les routes commerciales à leur feature effective', () => {
    expect(getWorkspaceRouteRequiredFeature({
      pathname: '/workspaces/workspace-1/members',
      workspaceId: 'workspace-1',
    })).toBe(WORKSPACE_FEATURE.TEAM_MANAGEMENT);

    expect(getWorkspaceRouteRequiredFeature({
      pathname: '/workspaces/workspace-1/roles/role-1',
      workspaceId: 'workspace-1',
    })).toBe(WORKSPACE_FEATURE.TEAM_MANAGEMENT);

    expect(getWorkspaceRouteRequiredFeature({
      pathname: '/workspaces/workspace-1/activity',
      workspaceId: 'workspace-1',
    })).toBe(WORKSPACE_FEATURE.AUDIT_LOGS);

    expect(getWorkspaceRouteRequiredFeature({
      pathname: '/workspaces/workspace-1/products',
      workspaceId: 'workspace-1',
    })).toBe(PRODUCT_CAPABILITY.REFERENCE_ACCESS);
  });

  it('ne bloque pas une route sans feature commerciale de navigation', () => {
    expect(getWorkspaceRouteRequiredFeature({
      pathname: '/workspaces/workspace-1/files',
      workspaceId: 'workspace-1',
    })).toBeNull();

    expect(getWorkspaceRouteRequiredFeature({
      pathname: '/workspaces/workspace-1/dashboard',
      workspaceId: 'workspace-1',
    })).toBeNull();
  });
});
