import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

const mocks = vi.hoisted(() => ({
  productAccessQuery: vi.fn(),
  supplierAccessQuery: vi.fn(),
}));

vi.mock('@/features/products/api/product-reference-api', () => ({
  useGetProductReferenceAccessQuery: mocks.productAccessQuery,
}));

vi.mock('@/features/suppliers/api/supplier-api', () => ({
  useGetSupplierReferenceAccessQuery: mocks.supplierAccessQuery,
}));

vi.mock('@/features/products/pages/product-reference-page', () => ({
  ProductReferencePage: ({ canManage }) => (
    <h1>
      Produits {canManage ? 'modifiables' : 'en lecture seule'}
    </h1>
  ),
}));

vi.mock('@/features/suppliers/pages/supplier-reference-page', () => ({
  SupplierReferencePage: ({ canManage }) => (
    <h1>
      Fournisseurs {canManage ? 'modifiables' : 'en lecture seule'}
    </h1>
  ),
}));

import {
  ReferenceManagementRoute,
} from '@/features/reference-management/components/reference-management-route';

function accessQuery(permissions = []) {
  return {
    data: { permissions },
    isError: false,
    isFetching: false,
    isLoading: false,
    refetch: vi.fn(),
  };
}

function renderRoute(initialEntry = '/platform/reference-management') {
  const router = createMemoryRouter([
    {
      path: '/platform/reference-management/:section?',
      element: <ReferenceManagementRoute />,
    },
    {
      path: '/workspaces',
      element: <h1>Espaces de travail</h1>,
    },
  ], {
    initialEntries: [initialEntry],
  });

  render(<RouterProvider router={router} />);

  return router;
}

describe('ReferenceManagementRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.productAccessQuery.mockReturnValue(accessQuery());
    mocks.supplierAccessQuery.mockReturnValue(accessQuery());
  });

  afterEach(() => cleanup());

  it('ouvre Produits par défaut quand seul le référentiel Produit est autorisé', async () => {
    mocks.productAccessQuery.mockReturnValue(accessQuery([
      'product:reference:read',
    ]));

    const router = renderRoute();

    expect(
      await screen.findByRole('heading', {
        name: 'Produits en lecture seule',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Produits' }),
    ).toHaveAttribute('aria-current', 'page');
    expect(
      screen.queryByRole('link', { name: 'Fournisseurs' }),
    ).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe(
      '/platform/reference-management/products',
    );
  });

  it('ouvre Fournisseurs par défaut quand seul ce référentiel est autorisé', async () => {
    mocks.supplierAccessQuery.mockReturnValue(accessQuery([
      'supplier:reference:read',
      'supplier:reference:manage',
    ]));

    const router = renderRoute();

    expect(
      await screen.findByRole('heading', {
        name: 'Fournisseurs modifiables',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Fournisseurs' }),
    ).toHaveAttribute('aria-current', 'page');
    expect(
      screen.queryByRole('link', { name: 'Produits' }),
    ).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe(
      '/platform/reference-management/suppliers',
    );
  });

  it('affiche les deux onglets puis navigue sans recréer les surfaces métier', async () => {
    const user = userEvent.setup();

    mocks.productAccessQuery.mockReturnValue(accessQuery([
      'product:reference:read',
      'product:reference:manage',
    ]));
    mocks.supplierAccessQuery.mockReturnValue(accessQuery([
      'supplier:reference:read',
    ]));

    const router = renderRoute(
      '/platform/reference-management/products',
    );

    expect(
      await screen.findByRole('heading', {
        name: 'Produits modifiables',
      }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('link', { name: 'Fournisseurs' }),
    );

    expect(
      await screen.findByRole('heading', {
        name: 'Fournisseurs en lecture seule',
      }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(
      '/platform/reference-management/suppliers',
    );
  });

  it('redirige un onglet non autorisé vers le premier référentiel accessible', async () => {
    mocks.productAccessQuery.mockReturnValue(accessQuery([
      'product:reference:read',
    ]));

    const router = renderRoute(
      '/platform/reference-management/suppliers',
    );

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(
        '/platform/reference-management/products',
      );
    });
    expect(
      screen.getByRole('heading', {
        name: 'Produits en lecture seule',
      }),
    ).toBeInTheDocument();
  });

  it('refuse la surface quand aucun droit Application Global métier n’est accordé', async () => {
    const router = renderRoute(
      '/platform/reference-management/products',
    );

    expect(
      await screen.findByRole('heading', {
        name: 'Espaces de travail',
      }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/workspaces');
  });

  it('affiche un état d’erreur si les autorisations ne peuvent pas être résolues', async () => {
    const productRefetch = vi.fn();
    const supplierRefetch = vi.fn();

    mocks.productAccessQuery.mockReturnValue({
      ...accessQuery(),
      isError: true,
      refetch: productRefetch,
    });
    mocks.supplierAccessQuery.mockReturnValue({
      ...accessQuery(),
      refetch: supplierRefetch,
    });

    const user = userEvent.setup();
    renderRoute();

    expect(
      await screen.findByText(
        'Gestion des référentiels indisponible',
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /réessayer/i }));

    expect(productRefetch).toHaveBeenCalledTimes(1);
    expect(supplierRefetch).toHaveBeenCalledTimes(1);
  });
});
