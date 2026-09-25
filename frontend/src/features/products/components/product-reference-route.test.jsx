import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  accessQuery: vi.fn(),
}));

vi.mock('@/features/products/api/product-reference-api', () => ({
  useGetProductReferenceAccessQuery: mocks.accessQuery,
}));

vi.mock('@/features/auth/components/authenticated-user-identity', () => ({
  AuthenticatedUserIdentity: () => <div>Identité utilisateur</div>,
}));

vi.mock('@/features/products/pages/product-reference-page', () => ({
  ProductReferencePage: ({ canManage }) => (
    <div>Gouvernance Produits {canManage ? 'modifiable' : 'lecture seule'}</div>
  ),
}));

import { ProductReferenceRoute } from '@/features/products/components/product-reference-route';

function renderRoute() {
  return render(
    <MemoryRouter>
      <ProductReferenceRoute />
    </MemoryRouter>,
  );
}

describe('ProductReferenceRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('refuse la surface sans product:reference:read', () => {
    mocks.accessQuery.mockReturnValue({
      data: { permissions: [] },
      isError: false,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderRoute();

    expect(screen.getByText('Accès refusé')).toBeInTheDocument();
  });

  it('autorise la lecture seule avec product:reference:read', () => {
    mocks.accessQuery.mockReturnValue({
      data: { permissions: ['product:reference:read'] },
      isError: false,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderRoute();

    expect(screen.getByText('Gouvernance Produits lecture seule')).toBeInTheDocument();
    expect(screen.getByText('Gouvernance métier globale')).toBeInTheDocument();
  });

  it('active les actions avec product:reference:manage', () => {
    mocks.accessQuery.mockReturnValue({
      data: {
        permissions: [
          'product:reference:read',
          'product:reference:manage',
        ],
      },
      isError: false,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderRoute();

    expect(screen.getByText('Gouvernance Produits modifiable')).toBeInTheDocument();
  });
});
