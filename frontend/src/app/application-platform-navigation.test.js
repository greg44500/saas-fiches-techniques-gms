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

function flattenNavigation(navigation) {
  return navigation.flatMap((entry) => (
    entry.type === 'group' ? entry.items : [entry]
  ));
}

function getVisibleNavigation(applicationGlobalPermissions) {
  return getVisiblePlatformNavigationSections(
    {
      status: 'active',
      permissions: ['platform:overview:read'],
      applicationGlobalPermissions,
    },
    APPLICATION_PLATFORM_NAVIGATION,
  );
}

describe('application Platform navigation composition', () => {
  it('masque Gestion des référentiels sans permission métier globale', () => {
    const items = flattenNavigation(getVisibleNavigation([]));

    expect(
      items.some(({ id }) => id === 'reference-management'),
    ).toBe(false);
  });

  it('affiche une seule entrée avec la permission globale Produit', () => {
    const items = flattenNavigation(
      getVisibleNavigation(['product:reference:read']),
    );

    expect(items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'reference-management',
        label: 'Gestion des référentiels',
        to: '/reference-management',
      }),
    ]));
    expect(
      items.filter(({ id }) => id === 'reference-management'),
    ).toHaveLength(1);
  });

  it('affiche la même entrée avec la permission globale Fournisseurs', () => {
    const items = flattenNavigation(
      getVisibleNavigation(['supplier:reference:read']),
    );

    expect(items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'reference-management',
        label: 'Gestion des référentiels',
        to: '/reference-management',
      }),
    ]));
  });

  it('ne duplique pas l’entrée quand les deux permissions sont effectives', () => {
    const items = flattenNavigation(
      getVisibleNavigation([
        'product:reference:read',
        'supplier:reference:read',
      ]),
    );

    expect(
      items.filter(({ id }) => id === 'reference-management'),
    ).toHaveLength(1);
  });

  it('conserve le Core puis ajoute un séparateur avant les sections applicatives', () => {
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
});
