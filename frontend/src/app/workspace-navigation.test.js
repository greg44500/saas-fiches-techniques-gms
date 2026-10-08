import { describe, expect, it } from 'vitest';

import {
  APPLICATION_WORKSPACE_NAVIGATION_MODULES,
  composeWorkspaceNavigation,
  workspaceNavigation,
} from '@/app/workspace-navigation';
import {
  WORKSPACE_ADMINISTRATION_SEPARATOR,
} from '@/features/workspace/navigation/compose-workspace-navigation';
import {
  coreWorkspaceAdministrationNavigation,
  coreWorkspaceDashboardNavigationItem,
  coreWorkspaceNavigation,
} from '@/features/workspace/navigation/core-workspace-navigation';

describe('workspace navigation composition', () => {
  it('conserve la navigation Core plate lorsqu’aucun module applicatif n’est déclaré', () => {
    const navigation = composeWorkspaceNavigation([]);

    expect(navigation).toBe(coreWorkspaceNavigation);
    expect(navigation.every((entry) => entry.type === 'item')).toBe(true);
  });

  it('garde le Tableau de bord en tête puis place les modules avant l’administration', () => {
    const catalogGroup = {
      id: 'catalog',
      type: 'group',
      label: 'Catalogue',
      items: [],
    };

    const navigation = composeWorkspaceNavigation([
      {
        groups: [catalogGroup],
      },
    ]);

    expect(navigation).toEqual([
      coreWorkspaceDashboardNavigationItem,
      catalogGroup,
      WORKSPACE_ADMINISTRATION_SEPARATOR,
      ...coreWorkspaceAdministrationNavigation,
    ]);
    expect(WORKSPACE_ADMINISTRATION_SEPARATOR.label)
      .toBe('Administration de l’espace');
  });

  it('compose le produit sans espace artificiel après le Dashboard et masque Fichiers', () => {
    const separatorIndex = workspaceNavigation.findIndex(
      ({ id }) => id === WORKSPACE_ADMINISTRATION_SEPARATOR.id,
    );
    const beforeAdministration = workspaceNavigation
      .slice(0, separatorIndex)
      .map(({ id }) => id);
    const administrationIds = workspaceNavigation
      .slice(separatorIndex + 1)
      .map(({ id }) => id);

    expect(APPLICATION_WORKSPACE_NAVIGATION_MODULES).toHaveLength(3);
    expect(beforeAdministration[0]).toBe('dashboard');
    expect(beforeAdministration.slice(1)).toEqual([
      'dossiers',
      'products',
      'suppliers',
    ]);
    expect(workspaceNavigation.some(({ id }) => id === 'files')).toBe(false);

    const dossiersGroup = workspaceNavigation.find(
      ({ id }) => id === 'dossiers',
    );
    expect(dossiersGroup.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'technical-sheet-optimizer',
          label: 'Atelier d’optimisation',
          path: 'technical-sheets/optimization',
        }),
      ]),
    );

    expect(administrationIds).toEqual([
      'members',
      'roles',
      'settings',
      'subscription',
      'activity',
    ]);
  });

  it('refuse un descriptor de navigation invalide', () => {
    expect(() => composeWorkspaceNavigation([
      {
        groups: 'catalog',
      },
    ])).toThrow(
      'navigationModules[0].groups must be an array',
    );
  });
});
