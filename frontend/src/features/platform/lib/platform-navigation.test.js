import { describe, expect, it } from 'vitest';

import {
  composeApplicationPlatformNavigation,
} from '@/app/application-platform-navigation';
import { PLATFORM_PERMISSION } from '@/features/platform/constants/platform-permissions';
import {
  canAccessPlatformPath,
  getActivePlatformNavigationGroupId,
  getFirstPlatformDestination,
  getPlatformNavigationItemForPath,
  getVisiblePlatformNavigationSections,
  hasActivePlatformAccess,
} from '@/features/platform/lib/platform-navigation';

function visibleDestinations(
  visibilityContext,
  navigationSections,
) {
  return getVisiblePlatformNavigationSections(
    visibilityContext,
    navigationSections,
  ).flatMap((entry) => (
    entry.type === 'group'
      ? entry.items.map((item) => item.to)
      : [entry.to]
  ));
}

describe('platform navigation policy', () => {
  it('projette uniquement les destinations autorisées et masque les groupes vides', () => {
    const entries = getVisiblePlatformNavigationSections([
      PLATFORM_PERMISSION.USERS_READ,
      PLATFORM_PERMISSION.RETENTION_READ,
    ]);

    expect(visibleDestinations([
      PLATFORM_PERMISSION.USERS_READ,
      PLATFORM_PERMISSION.RETENTION_READ,
    ])).toEqual([
      '/platform/users',
      '/platform/retention',
    ]);
    expect(entries.map((entry) => entry.id)).toEqual([
      'clients',
      'security-data',
    ]);
  });

  it('projette les invitations commerciales uniquement avec leur permission read', () => {
    expect(visibleDestinations([
      PLATFORM_PERMISSION.COMMERCIAL_INVITATIONS_READ,
    ])).toEqual([
      '/platform/commercial-invitations',
    ]);

    expect(canAccessPlatformPath('/platform/commercial-invitations', {
      status: 'active',
      permissions: [PLATFORM_PERMISSION.PLANS_READ],
    })).toBe(false);
  });

  it('compose une entrée applicative visible uniquement avec son autorisation globale explicite', () => {
    const applicationNavigation = composeApplicationPlatformNavigation([
      {
        sections: [
          {
            type: 'item',
            id: 'derived-reference',
            label: 'Référentiel applicatif',
            to: '/derived-reference',
            isVisible: ({ applicationGlobalPermissions }) => (
              applicationGlobalPermissions.has(
                'derived:reference:read',
              )
            ),
          },
        ],
      },
    ]);

    const platformAccess = {
      status: 'active',
      permissions: [PLATFORM_PERMISSION.OVERVIEW_READ],
      applicationGlobalPermissions: [
        'derived:reference:read',
      ],
    };

    expect(visibleDestinations(
      platformAccess,
      applicationNavigation,
    )).toContain('/derived-reference');
    expect(canAccessPlatformPath(
      '/derived-reference',
      platformAccess,
      applicationNavigation,
    )).toBe(true);

    const withoutApplicationPermission = {
      ...platformAccess,
      applicationGlobalPermissions: [],
    };

    expect(visibleDestinations(
      withoutApplicationPermission,
      applicationNavigation,
    )).not.toContain('/derived-reference');
    expect(canAccessPlatformPath(
      '/derived-reference',
      withoutApplicationPermission,
      applicationNavigation,
    )).toBe(false);
  });

  it('ne transforme jamais les permissions Platform en autorisation Application Global', () => {
    const applicationNavigation = composeApplicationPlatformNavigation([
      {
        sections: [
          {
            type: 'item',
            id: 'derived-reference',
            label: 'Référentiel applicatif',
            to: '/derived-reference',
            isVisible: ({ applicationGlobalPermissions }) => (
              applicationGlobalPermissions.has(
                'derived:reference:read',
              )
            ),
          },
        ],
      },
    ]);

    expect(visibleDestinations(
      {
        status: 'active',
        permissions: Object.values(PLATFORM_PERMISSION),
        applicationGlobalPermissions: [],
      },
      applicationNavigation,
    )).not.toContain('/derived-reference');
  });

  it('choisit la première destination réellement autorisée', () => {
    expect(getFirstPlatformDestination({
      status: 'active',
      permissions: [PLATFORM_PERMISSION.OVERVIEW_READ],
    })).toBe('/platform/overview');

    expect(getFirstPlatformDestination({
      status: 'active',
      permissions: [PLATFORM_PERMISSION.USERS_READ],
    })).toBe('/platform/users');

    expect(getFirstPlatformDestination({
      status: 'active',
      permissions: [PLATFORM_PERMISSION.TEAM_READ],
    })).toBe('/platform/team');
  });

  it('résout les routes Core vers leur item et leur groupe actif', () => {
    expect(
      getPlatformNavigationItemForPath('/platform/plans')?.id,
    ).toBe('plans');
    expect(
      getPlatformNavigationItemForPath('/platform/commercial-invitations')?.id,
    ).toBe('commercial-invitations');
    expect(
      getPlatformNavigationItemForPath('/platform/team/roles')?.id,
    ).toBe('team');
    expect(
      getPlatformNavigationItemForPath('/platform/retention')?.id,
    ).toBe('retention');

    const entries = getVisiblePlatformNavigationSections([
      PLATFORM_PERMISSION.RETENTION_READ,
    ]);

    expect(
      getActivePlatformNavigationGroupId(entries, '/platform/retention'),
    ).toBe('security-data');
  });

  it('résout aussi le groupe actif d’une navigation applicative composée', () => {
    const navigation = composeApplicationPlatformNavigation([
      {
        sections: [
          {
            type: 'group',
            id: 'derived-governance',
            label: 'Gouvernance applicative',
            items: [
              {
                id: 'derived-reference',
                label: 'Référentiel applicatif',
                to: '/derived-reference',
                isVisible: () => true,
              },
            ],
          },
        ],
      },
    ]);

    expect(
      getActivePlatformNavigationGroupId(
        navigation,
        '/derived-reference',
      ),
    ).toBe('derived-governance');
  });

  it('refuse la rétention lorsque la permission read a été retirée', () => {
    const platformAccess = {
      status: 'active',
      permissions: [PLATFORM_PERMISSION.AUDIT_LOGS_READ],
    };

    expect(
      canAccessPlatformPath('/platform/audit-logs', platformAccess),
    ).toBe(true);
    expect(
      canAccessPlatformPath('/platform/retention', platformAccess),
    ).toBe(false);
  });

  it('préserve le point d’extension des routes Platform non déclarées dans la navigation', () => {
    expect(canAccessPlatformPath('/platform/catalog', {
      status: 'active',
      permissions: [PLATFORM_PERMISSION.USERS_READ],
    })).toBe(true);
  });

  it('reste fail-closed sans accès Platform actif exploitable', () => {
    expect(hasActivePlatformAccess(null)).toBe(false);
    expect(hasActivePlatformAccess({ status: 'suspended', permissions: [] })).toBe(false);
    expect(hasActivePlatformAccess({ status: 'active', permissions: [] })).toBe(false);
    expect(getFirstPlatformDestination(null)).toBeNull();
    expect(getFirstPlatformDestination({ status: 'suspended', permissions: [] })).toBeNull();
    expect(canAccessPlatformPath('/platform/retention', null)).toBe(false);
  });
});
