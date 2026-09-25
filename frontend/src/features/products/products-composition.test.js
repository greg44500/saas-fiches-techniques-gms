import { describe, expect, it } from 'vitest';

import { applicationDashboardWidgets } from '@/app/application-dashboard';
import { APPLICATION_FRONTEND_ROUTES } from '@/app/application-routes';
import { workspaceNavigation } from '@/app/workspace-navigation';
import { PRODUCT_PERMISSION } from '@/features/products/constants/product-permissions';
import { filterWorkspaceNavigation } from '@/features/workspace/components/workspace-sidebar';

function hasProductsNavigation(navigation) {
  return navigation.some((entry) => entry.id === 'products');
}

describe('products frontend composition', () => {
  it('injecte les routes Workspace et Produit global sans route Platform', () => {
    expect(APPLICATION_FRONTEND_ROUTES.workspaceRoutes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'products' }),
      ]),
    );
    expect(APPLICATION_FRONTEND_ROUTES.authenticatedRoutes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'product-reference' }),
      ]),
    );
    expect(APPLICATION_FRONTEND_ROUTES.platformRoutes).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'products' }),
      ]),
    );
  });

  it('masque la navigation Workspace sans product:read', () => {
    expect(hasProductsNavigation(filterWorkspaceNavigation(
      workspaceNavigation,
      {
        can: () => false,
        hasFeature: () => true,
      },
    ))).toBe(false);
  });

  it('affiche la navigation Workspace avec product:read indépendamment des capabilities du référentiel', () => {
    expect(hasProductsNavigation(filterWorkspaceNavigation(
      workspaceNavigation,
      {
        can: (permission) => permission === PRODUCT_PERMISSION.READ,
        hasFeature: () => false,
      },
    ))).toBe(true);
  });

  it('compose le widget Dashboard Produits avec product:read', () => {
    expect(applicationDashboardWidgets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'gms.products-catalog',
          access: expect.objectContaining({
            features: [],
            permissions: [PRODUCT_PERMISSION.READ],
          }),
        }),
      ]),
    );
  });
});
