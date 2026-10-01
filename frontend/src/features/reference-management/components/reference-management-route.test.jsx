import {
  render,
  screen,
} from '@testing-library/react';
import {
  MemoryRouter,
  Route,
  Routes,
} from 'react-router';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

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

vi.mock('@/features/auth/components/authenticated-user-identity', () => ({
  AuthenticatedUserIdentity: () => <div>Identité utilisateur</div>,
}));

vi.mock('@/features/products/pages/product-reference-page', () => ({
  ProductReferencePage: ({ canManage, embedded }) => (
    <div>
      {'Produits '}
      {canManage ? 'modifiables' : 'lecture seule'}
      {embedded ? ' intégrés' : ''}
    </div>
  ),
}));

vi.mock('@/features/suppliers/pages/supplier-reference-page', () => ({
  SupplierReferencePage: ({ canManage, embedded }) => (
    <div>
      {'Fournisseurs '}
      {canManage ? 'modifiables' : 'lecture seule'}
      {embedded ? ' intégrés' : ''}
    </div>
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

function renderRoute(initialEntry = '/reference-management') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          element={<ReferenceManagementRoute />}
          path="/reference-management/:section?"
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ReferenceManagementRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.productAccessQuery.mockReturnValue(accessQuery());
    mocks.supplierAccessQuery.mockReturnValue(accessQuery());
  });

  it('redirige la racine vers Produits quand seul le référentiel Produit est autorisé', async () => {
    mocks.productAccessQuery.mockReturnValue(
      accessQuery(['product:reference:read']),
    );

    renderRoute();

    expect(
      await screen.findByText('Produits lecture seule intégrés'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Produits' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Fournisseurs' }),
    ).not.toBeInTheDocument();
  });

  it('redirige la racine vers Fournisseurs quand seul le référentiel Fournisseurs est autorisé', async () => {
    mocks.supplierAccessQuery.mockReturnValue(
      accessQuery(['supplier:reference:read']),
    );

    renderRoute();

    expect(
      await screen.findByText('Fournisseurs lecture seule intégrés'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Fournisseurs' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Produits' }),
    ).not.toBeInTheDocument();
  });

  it('affiche les deux onglets quand les deux référentiels sont autorisés', async () => {
    mocks.productAccessQuery.mockReturnValue(
      accessQuery(['product:reference:read']),
    );
    mocks.supplierAccessQuery.mockReturnValue(
      accessQuery([
        'supplier:reference:read',
        'supplier:reference:manage',
      ]),
    );

    renderRoute('/reference-management/suppliers');

    expect(
      await screen.findByText('Fournisseurs modifiables intégrés'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Produits' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Fournisseurs' }),
    ).toBeInTheDocument();
  });

  it('n’expose pas une section demandée directement sans sa permission', async () => {
    mocks.productAccessQuery.mockReturnValue(
      accessQuery([
        'product:reference:read',
        'product:reference:manage',
      ]),
    );

    renderRoute('/reference-management/suppliers');

    expect(
      await screen.findByText('Produits modifiables intégrés'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Fournisseurs .* intégrés/),
    ).not.toBeInTheDocument();
  });

  it('refuse la surface quand aucune permission de lecture globale n’est effective', () => {
    renderRoute('/reference-management/products');

    expect(screen.getByText('Accès refusé')).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Produits' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Fournisseurs' }),
    ).not.toBeInTheDocument();
  });

  it('conserve le contexte Platform visuel et le retour vers les espaces', async () => {
    mocks.productAccessQuery.mockReturnValue(
      accessQuery(['product:reference:read']),
    );

    renderRoute('/reference-management/products');

    expect(
      await screen.findByRole('heading', {
        name: 'Gestion des référentiels',
        level: 1,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Espaces de travail' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Gouvernance métier globale')).toBeInTheDocument();
  });
});
