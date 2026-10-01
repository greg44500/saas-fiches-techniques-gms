import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  APPLICATION_FRONTEND_ROUTES,
  composeApplicationFrontendRoutes,
} from '@/app/application-routes';
import { createAppRoutes } from '@/app/router';

function collectPaths(routes = []) {
  return routes.flatMap((route) => [
    ...(route.path ? [route.path] : []),
    ...(Array.isArray(route.children)
      ? collectPaths(route.children)
      : []),
  ]);
}

describe('application frontend route composition', () => {
  it('compose les quatre surfaces de routing applicatif', () => {
    const routes = composeApplicationFrontendRoutes([
      {
        publicRoutes: [{ path: 'catalog-public' }],
        authenticatedRoutes: [{ path: 'catalog-account' }],
        workspaceRoutes: [{ path: 'catalog' }],
        platformRoutes: [{ path: 'catalog-admin' }],
      },
    ]);

    expect(routes.publicRoutes).toEqual([
      { path: 'catalog-public' },
    ]);
    expect(routes.authenticatedRoutes).toEqual([
      { path: 'catalog-account' },
    ]);
    expect(routes.workspaceRoutes).toEqual([
      { path: 'catalog' },
    ]);
    expect(routes.platformRoutes).toEqual([
      { path: 'catalog-admin' },
    ]);
  });

  it('compose explicitement les routes Core du centre d’aide', () => {
    expect(APPLICATION_FRONTEND_ROUTES.workspaceRoutes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'help/:entryId?' }),
      ]),
    );
    expect(APPLICATION_FRONTEND_ROUTES.platformRoutes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'help/:entryId?' }),
      ]),
    );
  });

  it('compose la route Platform unifiée de gestion des référentiels', () => {
    expect(APPLICATION_FRONTEND_ROUTES.platformRoutes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'reference-management/:section?',
        }),
      ]),
    );
  });

  it('compose les routes Workspace de Corbeille et paramètres Dossiers', () => {
    expect(APPLICATION_FRONTEND_ROUTES.workspaceRoutes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'technical-sheets/trash' }),
        expect.objectContaining({ path: 'dossiers-settings' }),
      ]),
    );
    expect(APPLICATION_FRONTEND_ROUTES.workspaceRoutes).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'technical-sheets/settings' }),
      ]),
    );
  });

  it('imbrique les modules métier dans le shell Dossier persistant', () => {
    const dossierRoute = APPLICATION_FRONTEND_ROUTES.workspaceRoutes.find(
      (route) => route.path === 'dossiers/:dossierId',
    );

    expect(dossierRoute).toBeDefined();
    expect(collectPaths(dossierRoute.children)).toEqual(
      expect.arrayContaining([
        'suppliers',
        'technical-sheets',
        'technical-sheets/:technicalSheetId',
      ]),
    );
    expect(dossierRoute.children.some((route) => route.index === true)).toBe(true);
  });

  it('injecte chaque route métier sous la bonne frontière du Core', () => {
    const applicationRoutes = composeApplicationFrontendRoutes([
      {
        publicRoutes: [{ path: 'catalog-public' }],
        authenticatedRoutes: [{ path: 'catalog-account' }],
        workspaceRoutes: [{ path: 'catalog' }],
        platformRoutes: [{ path: 'catalog-admin' }],
      },
    ]);

    const routes = createAppRoutes(applicationRoutes);
    const publicRoot = routes[0];
    const authenticatedRoot = routes.find((route) => (
      collectPaths(route.children).includes('workspaces/:workspaceId')
    ));
    const workspaceRoot = authenticatedRoot.children.find(
      (route) => route.path === 'workspaces/:workspaceId',
    );
    const platformRoot = authenticatedRoot.children.find(
      (route) => route.path === 'platform',
    );

    expect(collectPaths(publicRoot.children)).toContain('catalog-public');
    expect(collectPaths(authenticatedRoot.children)).toContain('catalog-account');
    expect(collectPaths(workspaceRoot.children)).toContain('catalog');
    expect(collectPaths(platformRoot.children)).toContain('catalog-admin');

    expect(collectPaths(publicRoot.children)).not.toContain('catalog');
    expect(collectPaths(workspaceRoot.children)).not.toContain('catalog-admin');
  });

  it('refuse une collection de routes métier non déclarée sous forme de tableau', () => {
    expect(() => composeApplicationFrontendRoutes([
      {
        workspaceRoutes: 'catalog',
      },
    ])).toThrow(
      'modules[0].workspaceRoutes must be an array',
    );
  });

  it('refuse deux chemins identiques dans une même surface de routing', () => {
    expect(() => composeApplicationFrontendRoutes([
      {
        workspaceRoutes: [{ path: 'catalog' }],
      },
      {
        workspaceRoutes: [{ path: 'catalog' }],
      },
    ])).toThrow(
      'Duplicate frontend route path "catalog" in workspaceRoutes',
    );
  });

  it('autorise un même chemin dans deux surfaces de routing différentes', () => {
    const routes = composeApplicationFrontendRoutes([
      {
        workspaceRoutes: [{ path: 'help' }],
        platformRoutes: [{ path: 'help' }],
      },
    ]);

    expect(routes.workspaceRoutes).toEqual([{ path: 'help' }]);
    expect(routes.platformRoutes).toEqual([{ path: 'help' }]);
  });
});