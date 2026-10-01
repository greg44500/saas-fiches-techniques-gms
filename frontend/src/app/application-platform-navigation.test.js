import { describe, expect, it } from 'vitest';

import {
  APPLICATION_PLATFORM_NAVIGATION,
  PLATFORM_APPLICATION_SEPARATOR,
  composeApplicationPlatformNavigation,
} from '@/app/application-platform-navigation';
import {
  corePlatformNavigationSections,
  getVisiblePlatformNavigationSections,
} from '@/features/platform/lib/platform-navigation';

function flattenNavigationItems(navigation) {
  return navigation.flatMap((entry) => (
    entry.type === 'group' || entry.type === 'section'
      ? entry.items
      : entry.type === 'separator'
        ? []
        : [entry]
  ));
}

describe('application Platform navigation composition', () => {
  it('affiche une seule entrée Gestion des référentiels dès qu’un référentiel métier est autorisé', () => {
    const withoutReferencePermission =
      getVisiblePlatformNavigationSections(
        {
          status: 'active',
          permissions: ['platform:overview:read'],
          applicationGlobalPermissions: [],
        },
        APPLICATION_PLATFORM_NAVIGATION,
      );

    expect(
      flattenNavigationItems(withoutReferencePermission)
        .some(({ id }) => id === 'reference-management'),
    ).toBe(false);

    for (const permission of [
      'product:reference:read',
      'supplier:reference:read',
    ]) {
      const visibleNavigation =
        getVisiblePlatformNavigationSections(
          {
            status: 'active',
            permissions: ['platform:overview:read'],
            applicationGlobalPermissions: [permission],
          },
          APPLICATION_PLATFORM_NAVIGATION,
        );

      expect(
        flattenNavigationItems(visibleNavigation),
      ).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: 'reference-management',
          label: 'Gestion des référentiels',
          to: '/platform/reference-management',
        }),
      ]));

      expect(
        flattenNavigationItems(visibleNavigation)
          .filter(({ id }) => id === 'reference-management'),
      ).toHaveLength(1);
    }
  });

  it('ne donne aucun accès métier implicite à un administrateur Platform', () => {
    const visibleNavigation = getVisiblePlatformNavigationSections(
      {
        status: 'active',
        permissions: [
          'platform:overview:read',
          'platform:users:read',
          'platform:workspaces:read',
        ],
        applicationGlobalPermissions: [],
      },
      APPLICATION_PLATFORM_NAVIGATION,
    );

    expect(
      flattenNavigationItems(visibleNavigation)
        .some(({ id }) => id === 'reference-management'),
    ).toBe(false);
  });

  it('compose la surface GMS comme une section Core sans séparateur redondant', () => {
    const applicationEntry =
      APPLICATION_PLATFORM_NAVIGATION.at(
        corePlatformNavigationSections.length,
      );

    expect(applicationEntry).toMatchObject({
      id: 'gms',
      type: 'section',
      label: 'GMS',
    });
    expect(applicationEntry.items).toEqual([
      expect.objectContaining({
        id: 'reference-management',
        label: 'Gestion des référentiels',
      }),
    ]);
    expect(APPLICATION_PLATFORM_NAVIGATION)
      .not.toContain(PLATFORM_APPLICATION_SEPARATOR);
  });

  it('conserve le Core puis ajoute un séparateur avant les anciens items applicatifs', () => {
    const applicationEntry = {
      type: 'item',
      id: 'catalog',
      label: 'Catalogue',
      to: '/catalog',
      isVisible: () => true,
    };

    const navigation = composeApplicationPlatformNavigation([
      {
        sections: [applicationEntry],
      },
    ]);

    expect(
      navigation.slice(0, corePlatformNavigationSections.length),
    ).toEqual(corePlatformNavigationSections);
    expect(navigation.at(corePlatformNavigationSections.length))
      .toEqual(PLATFORM_APPLICATION_SEPARATOR);
    expect(navigation.at(-1)).toMatchObject({
      id: 'catalog',
      label: 'Catalogue',
      to: '/catalog',
      type: 'item',
    });
  });

  it('refuse une collision avec une clé Core', () => {
    expect(() => composeApplicationPlatformNavigation([
      {
        sections: [
          {
            type: 'item',
            id: 'overview',
            label: 'Collision',
            to: '/catalog',
            isVisible: () => true,
          },
        ],
      },
    ])).toThrow('Duplicate Platform navigation id "overview"');
  });

  it('refuse une collision silencieuse de destination', () => {
    expect(() => composeApplicationPlatformNavigation([
      {
        sections: [
          {
            type: 'item',
            id: 'catalog',
            label: 'Catalogue',
            to: '/platform/overview',
            isVisible: () => true,
          },
        ],
      },
    ])).toThrow(
      'Duplicate Platform navigation destination "/platform/overview"',
    );
  });

  it('refuse les descriptors invalides', () => {
    expect(() => composeApplicationPlatformNavigation([
      {
        sections: 'catalog',
      },
    ])).toThrow(
      'navigationModules[0].sections must be an array',
    );

    expect(() => composeApplicationPlatformNavigation([
      {
        sections: [
          {
            id: 'catalog',
            label: 'Catalogue',
            to: '/catalog',
            isVisible: true,
          },
        ],
      },
    ])).toThrow(
      'navigationModules[0].sections[0].isVisible must be a function',
    );
  });

  it('compose des sections visuelles applicatives sans séparateur global redondant', () => {
    const navigation = composeApplicationPlatformNavigation([
      {
        sections: [
          {
            type: 'section',
            id: 'derived-management',
            label: 'Gestion applicative',
            items: [
              {
                id: 'derived-reference',
                label: 'Référentiel',
                to: '/derived-reference',
                isVisible: () => true,
              },
            ],
          },
          {
            type: 'section',
            id: 'derived-operations',
            label: 'Opérations applicatives',
            items: [
              {
                id: 'derived-jobs',
                label: 'Traitements',
                to: '/derived-jobs',
                isVisible: () => true,
              },
            ],
          },
        ],
      },
    ]);

    expect(navigation.at(corePlatformNavigationSections.length))
      .toMatchObject({
        id: 'derived-management',
        type: 'section',
        label: 'Gestion applicative',
      });
    expect(navigation).not.toContain(PLATFORM_APPLICATION_SEPARATOR);
    expect(navigation.at(-1)).toMatchObject({
      id: 'derived-operations',
      type: 'section',
    });
  });

  it('préserve strictement le séparateur historique pour item et group', () => {
    const navigation = composeApplicationPlatformNavigation([
      {
        sections: [
          {
            type: 'group',
            id: 'derived-group',
            label: 'Groupe applicatif',
            items: [
              {
                id: 'derived-item',
                label: 'Entrée',
                to: '/derived-item',
                isVisible: () => true,
              },
            ],
          },
        ],
      },
    ]);

    expect(navigation.at(corePlatformNavigationSections.length))
      .toEqual(PLATFORM_APPLICATION_SEPARATOR);
    expect(navigation.at(-1).type).toBe('group');
  });

  it('refuse les collisions dans les enfants de section', () => {
    expect(() => composeApplicationPlatformNavigation([
      {
        sections: [
          {
            type: 'section',
            id: 'derived-management',
            label: 'Gestion applicative',
            items: [
              {
                id: 'overview',
                label: 'Collision',
                to: '/derived-reference',
                isVisible: () => true,
              },
            ],
          },
        ],
      },
    ])).toThrow('Duplicate Platform navigation id "overview"');

    expect(() => composeApplicationPlatformNavigation([
      {
        sections: [
          {
            type: 'section',
            id: 'derived-management',
            label: 'Gestion applicative',
            items: [
              {
                id: 'derived-reference',
                label: 'Collision',
                to: '/platform/overview',
                isVisible: () => true,
              },
            ],
          },
        ],
      },
    ])).toThrow(
      'Duplicate Platform navigation destination "/platform/overview"',
    );
  });

  it('refuse une section dont les enfants ne sont pas des items valides', () => {
    expect(() => composeApplicationPlatformNavigation([
      {
        sections: [
          {
            type: 'section',
            id: 'derived-management',
            label: 'Gestion applicative',
            items: [
              {
                id: 'derived-reference',
                label: 'Référentiel',
              },
            ],
          },
        ],
      },
    ])).toThrow(
      'navigationModules[0].sections[0].items[0].to must be a non-empty string',
    );
  });
});
