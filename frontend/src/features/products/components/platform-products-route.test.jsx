import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  platformContextQuery: vi.fn(),
}));

vi.mock('@/features/platform/api/platform-current-context-api', () => ({
  useGetCurrentPlatformContextQuery: mocks.platformContextQuery,
}));

vi.mock('@/features/products/pages/platform-products-page', () => ({
  PlatformProductsPage: ({ canManage }) => (
    <div>Gouvernance Produits {canManage ? 'modifiable' : 'lecture seule'}</div>
  ),
}));

import {
  PLATFORM_PRODUCT_PERMISSION,
} from '@/features/products/constants/product-permissions';
import { PlatformProductsRoute } from '@/features/products/components/platform-products-route';

describe('PlatformProductsRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('refuse la surface sans platform:products:read', () => {
    mocks.platformContextQuery.mockReturnValue({
      data: { permissions: [] },
      isError: false,
      isFetching: false,
      isLoading: false,
    });

    render(<PlatformProductsRoute />);

    expect(screen.getByText('Accès refusé')).toBeInTheDocument();
  });

  it('autorise la lecture seule avec platform:products:read', () => {
    mocks.platformContextQuery.mockReturnValue({
      data: { permissions: [PLATFORM_PRODUCT_PERMISSION.READ] },
      isError: false,
      isFetching: false,
      isLoading: false,
    });

    render(<PlatformProductsRoute />);

    expect(screen.getByText('Gouvernance Produits lecture seule')).toBeInTheDocument();
  });

  it('active les actions de gouvernance avec platform:products:manage', () => {
    mocks.platformContextQuery.mockReturnValue({
      data: {
        permissions: [
          PLATFORM_PRODUCT_PERMISSION.READ,
          PLATFORM_PRODUCT_PERMISSION.MANAGE,
        ],
      },
      isError: false,
      isFetching: false,
      isLoading: false,
    });

    render(<PlatformProductsRoute />);

    expect(screen.getByText('Gouvernance Produits modifiable')).toBeInTheDocument();
  });
});
