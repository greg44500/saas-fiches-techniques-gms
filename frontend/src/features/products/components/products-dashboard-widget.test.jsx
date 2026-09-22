import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';

const mocks = vi.hoisted(() => ({
  summaryQuery: vi.fn(),
  workspaceContext: vi.fn(),
}));

vi.mock('@/features/products/api/product-catalog-api', () => ({
  useGetProductSummaryQuery: mocks.summaryQuery,
}));

vi.mock('@/features/workspace/components/workspace-context', () => ({
  useWorkspaceContext: mocks.workspaceContext,
}));

import { ProductsDashboardWidget } from '@/features/products/components/products-dashboard-widget';

describe('ProductsDashboardWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.workspaceContext.mockReturnValue({
      workspace: { id: 'workspace-1' },
    });
  });

  it('affiche les deux indicateurs M-002 et le lien d’accès', () => {
    mocks.summaryQuery.mockReturnValue({
      data: {
        activeCatalogEntries: 12,
        pendingContributions: 3,
      },
      isError: false,
      isLoading: false,
      refetch: vi.fn(),
    });

    render(
      <MemoryRouter>
        <TooltipProvider>
          <ProductsDashboardWidget />
        </TooltipProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Références actives')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Contributions en validation')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ouvrir les Produits' }))
      .toHaveAttribute('href', '/workspaces/workspace-1/products');
  });
});
