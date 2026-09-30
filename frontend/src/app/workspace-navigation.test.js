import { describe, expect, it } from 'vitest';

import {
  APPLICATION_WORKSPACE_NAVIGATION_MODULES,
  composeWorkspaceNavigation,
  workspaceNavigation,
} from '@/app/workspace-navigation';
import {
  WORKSPACE_ADMINISTRATION_SEPARATOR,
} from '@/features/workspace/navigation/compose-workspace-navigation';
import { coreWorkspaceNavigation } from '@/features/workspace/navigation/core-workspace-navigation';

describe('workspace navigation composition', () => {
  it('conserve la navigation Core plate lorsqu’aucun module applicatif n’est déclaré', () => {
    const navigation = composeWorkspaceNavigation([]);

    expect(navigation).toBe(coreWorkspaceNavigation);
    expect(navigation.every((entry) => entry.type === 'item')).toBe(true);
  });

  it('place les modules applicatifs avant le séparateur puis la navigation Core', () => {
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
      catalogGroup,
      WORKSPACE_ADMINISTRATION_SEPARATOR,
      ...coreWorkspaceNavigation,
    ]);
    expect(WORKSPACE_ADMINISTRATION_SEPARATOR.label)
      .toBe('Administration de l’espace');
  });

  it('compose les modules métier actuels avant l’administration de l’espace', () => {
    const separatorIndex = workspaceNavigation.findIndex(
      ({ id }) => id === WORKSPACE_ADMINISTRATION_SEPARATOR.id,
    );
    const applicationIds = workspaceNavigation
      .slice(0, separatorIndex)
      .map(({ id }) => id);

    expect(APPLICATION_WORKSPACE_NAVIGATION_MODULES).toHaveLength(3);
    expect(applicationIds).toEqual(
      expect.arrayContaining(['dossiers', 'products', 'suppliers']),
    );
    expect(workspaceNavigation.slice(separatorIndex + 1))
      .toEqual(coreWorkspaceNavigation);
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
