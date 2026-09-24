import { describe, expect, it, vi } from 'vitest';

const captured = vi.hoisted(() => ({
  queryConfig: null,
}));

vi.mock('@/services/api/base-api', () => ({
  baseApi: {
    injectEndpoints: ({ endpoints }) => {
      const builder = {
        query: vi.fn((config) => {
          captured.queryConfig = config;
          return config;
        }),
      };

      endpoints(builder);

      return {
        useGetCurrentPlatformContextQuery: vi.fn(),
      };
    },
  },
}));

import '@/features/platform/api/platform-current-context-api';

describe('platformCurrentContextApi', () => {
  it('conserve le contrat HTTP et projette platformAccess', () => {
    expect(captured.queryConfig.query()).toBe('/platform/me');

    const platformAccess = {
      isFounder: true,
      status: 'active',
      role: {
        key: 'super_admin',
        name: 'Super administrateur',
      },
      permissions: ['platform:overview:read'],
      applicationGlobalPermissions: ['derived:reference:read'],
    };

    expect(captured.queryConfig.transformResponse({
      data: { platformAccess },
    })).toEqual(platformAccess);
    expect(captured.queryConfig.transformResponse({
      data: { platformAccess: null },
    })).toBeNull();
    expect(captured.queryConfig.transformResponse({})).toBeNull();
  });
});
