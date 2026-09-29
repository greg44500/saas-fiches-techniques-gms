import { describe, expect, it } from 'vitest';

import { APPLICATION_FRONTEND_ROUTES } from '@/app/application-routes';
import { workspaceNavigation } from '@/app/workspace-navigation';
import { DOSSIER_PERMISSION } from '@/features/dossiers/constants/dossier-permissions';
import {
  SUPPLIER_PERMISSION,
} from '@/features/suppliers/constants/supplier-permissions';
import {
  TECHNICAL_SHEET_PERMISSION,
} from '@/features/technical-sheets/constants/technical-sheet-permissions';
import { filterWorkspaceNavigation } from '@/features/workspace/components/workspace-sidebar';

function getDossiersNavigation(navigation) {
  return navigation.find((entry) => entry.id === 'dossiers') ?? null;
}

describe('dossiers frontend composition', () => {
  it('injecte les routes liste, paramètres et shell Dossier imbriqué', () => {
    expect(APPLICATION_FRONTEND_ROUTES.workspaceRoutes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'dossiers' }),
        expect.objectContaining({ path: 'dossiers-settings' }),
        expect.objectContaining({ path: 'dossiers/:dossierId' }),
      ]),
    );

    const dossierRoute = APPLICATION_FRONTEND_ROUTES.workspaceRoutes.find(
      (route) => route.path === 'dossiers/:dossierId',
    );

    expect(dossierRoute.children).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ index: true }),
        expect.objectContaining({ path: 'suppliers' }),
        expect.objectContaining({ path: 'technical-sheets' }),
        expect.objectContaining({ path: 'technical-sheets/:technicalSheetId' }),
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

  it('compose Compte Client, Corbeille et Paramètres selon leurs permissions', () => {
    const navigation = filterWorkspaceNavigation(
      workspaceNavigation,
      {
        can: (permission) => [
          DOSSIER_PERMISSION.READ,
          TECHNICAL_SHEET_PERMISSION.PURGE,
          SUPPLIER_PERMISSION.APPLICABLE_PRICE_READ,
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
        path: 'dossiers-settings',
      },
    ]);
  });
});
