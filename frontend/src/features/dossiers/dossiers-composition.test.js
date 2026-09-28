import { describe, expect, it } from 'vitest';

import { APPLICATION_FRONTEND_ROUTES } from '@/app/application-routes';
import { workspaceNavigation } from '@/app/workspace-navigation';
import { DOSSIER_PERMISSION } from '@/features/dossiers/constants/dossier-permissions';
import {
  TECHNICAL_SHEET_PERMISSION,
} from '@/features/technical-sheets/constants/technical-sheet-permissions';
import { filterWorkspaceNavigation } from '@/features/workspace/components/workspace-sidebar';

function getDossiersNavigation(navigation) {
  return navigation.find((entry) => entry.id === 'dossiers') ?? null;
}

describe('dossiers frontend composition', () => {
  it('injecte les routes liste et contexte Dossier dans la surface Workspace', () => {
    expect(APPLICATION_FRONTEND_ROUTES.workspaceRoutes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'dossiers' }),
        expect.objectContaining({ path: 'dossiers/:dossierId' }),
      ]),
    );
  });

  it('masque la navigation sans accès à une surface Dossiers', () => {
    expect(getDossiersNavigation(filterWorkspaceNavigation(
      workspaceNavigation,
      {
        can: () => false,
        hasFeature: () => true,
      },
    ))).toBeNull();
  });

  it('affiche uniquement Compte Client avec dossier:read', () => {
    const navigation = filterWorkspaceNavigation(
      workspaceNavigation,
      {
        can: (permission) => permission === DOSSIER_PERMISSION.READ,
        hasFeature: () => false,
      },
    );
    const dossiers = getDossiersNavigation(navigation);

    expect(dossiers).toEqual(expect.objectContaining({
      type: 'group',
      label: 'Dossiers',
    }));
    expect(dossiers.items.map((item) => item.label)).toEqual([
      'Compte Client',
    ]);
  });

  it('regroupe Corbeille et Paramètres avec Compte Client pour le propriétaire', () => {
    const navigation = filterWorkspaceNavigation(
      workspaceNavigation,
      {
        can: (permission) => [
          DOSSIER_PERMISSION.READ,
          TECHNICAL_SHEET_PERMISSION.PURGE,
        ].includes(permission),
        hasFeature: () => true,
      },
    );
    const dossiers = getDossiersNavigation(navigation);

    expect(dossiers.items.map((item) => ({
      label: item.label,
      path: item.path,
    }))).toEqual([
      {
        label: 'Compte Client',
        path: 'dossiers',
      },
      {
        label: 'Corbeille',
        path: 'technical-sheets/trash',
      },
      {
        label: 'Paramètres',
        path: 'technical-sheets/settings',
      },
    ]);
  });
});
