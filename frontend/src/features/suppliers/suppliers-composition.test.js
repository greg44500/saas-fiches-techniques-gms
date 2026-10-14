import { describe, expect, it } from 'vitest';

import {
  APPLICATION_PLATFORM_NAVIGATION,
} from '@/app/application-platform-navigation';
import {
  APPLICATION_FRONTEND_ROUTES,
} from '@/app/application-routes';
import {
  workspaceNavigation,
} from '@/app/workspace-navigation';
import {
  getVisiblePlatformNavigationSections,
} from '@/features/platform/lib/platform-navigation';
import {
  SUPPLIER_PERMISSION,
  SUPPLIER_REFERENCE_PERMISSION,
} from '@/features/suppliers/constants/supplier-permissions';
import {
  filterWorkspaceNavigation,
} from '@/features/workspace/components/workspace-sidebar';

function hasWorkspaceEntry(navigation, id) {
  return navigation.some((entry) => entry.id === id);
}

function flattenPlatformEntries(entries) {
  return entries.flatMap((entry) => {
    if (entry.type === 'separator') return [];

    return (
      entry.type === 'group'
      || entry.type === 'section'
    )
      ? entry.items
      : [entry];
  });
}

describe('suppliers frontend composition', () => {
  it('injecte les routes Workspace, Dossier imbriquée et gouvernance globale', () => {
    expect(APPLICATION_FRONTEND_ROUTES.workspaceRoutes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'suppliers' }),
        expect.objectContaining({
          path: 'suppliers/catalogs/:catalogId',
        }),
      ]),
    );

    const dossierRoute = APPLICATION_FRONTEND_ROUTES.workspaceRoutes.find(
      (route) => route.path === 'dossiers/:dossierId',
    );

    expect(dossierRoute).toBeDefined();
    expect(dossierRoute.children).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'suppliers' }),
      ]),
    );

    expect(APPLICATION_FRONTEND_ROUTES.authenticatedRoutes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'supplier-reference' }),
      ]),
    );
  });

  it('masque la navigation Workspace sans supplier:read', () => {
    const visible = filterWorkspaceNavigation(
      workspaceNavigation,
      {
        can: () => false,
        hasFeature: () => true,
      },
    );

    expect(hasWorkspaceEntry(visible, 'suppliers')).toBe(false);
  });

  it('affiche la navigation Workspace avec supplier:read sans capability import', () => {
    const visible = filterWorkspaceNavigation(
      workspaceNavigation,
      {
        can: (permission) => permission === SUPPLIER_PERMISSION.SUPPLIER_READ,
        hasFeature: () => false,
      },
    );

    expect(hasWorkspaceEntry(visible, 'suppliers')).toBe(true);
  });

  it('affiche Gestion des référentiels avec le droit Fournisseurs Application Global', () => {
    const withoutPermission = flattenPlatformEntries(
      getVisiblePlatformNavigationSections(
        {
          status: 'active',
          permissions: ['platform:overview:read'],
          applicationGlobalPermissions: [],
        },
        APPLICATION_PLATFORM_NAVIGATION,
      ),
    );

    expect(
      withoutPermission.some(({ id }) => id === 'reference-management'),
    ).toBe(false);

    const withPermission = flattenPlatformEntries(
      getVisiblePlatformNavigationSections(
        {
          status: 'active',
          permissions: ['platform:overview:read'],
          applicationGlobalPermissions: [
            SUPPLIER_REFERENCE_PERMISSION.READ,
          ],
        },
        APPLICATION_PLATFORM_NAVIGATION,
      ),
    );

    expect(withPermission).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'reference-management',
          label: 'Gestion des référentiels',
          to: '/platform/reference-management',
        }),
      ]),
    );
    expect(
      withPermission.filter(({ id }) => id === 'reference-management'),
    ).toHaveLength(1);
    expect(
      withPermission.some(({ id }) => id === 'supplier-reference'),
    ).toBe(false);
  });
});