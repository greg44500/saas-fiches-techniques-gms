import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';

const mocks = vi.hoisted(() => ({
  metadataQuery: vi.fn(),
  createDossierMutation: vi.fn(),
  listQuery: vi.fn(),
  workspaceContext: vi.fn(),
}));

vi.mock('@/components/shared/toast-provider', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/features/dossiers/api/dossiers-api', () => ({
  useCreateDossierMutation: () => [mocks.createDossierMutation, { isLoading: false }],
  useGetDossierMetadataQuery: mocks.metadataQuery,
  useListDossiersQuery: mocks.listQuery,
}));

vi.mock('@/features/workspace/components/workspace-context', () => ({
  useWorkspaceContext: mocks.workspaceContext,
}));

import {
  DASHBOARD_DOSSIER_LIMIT,
  DossiersDashboardWidget,
} from '@/features/dossiers/components/dossiers-dashboard-widget';

function createQuery(overrides = {}) {
  return {
    data: undefined,
    isError: false,
    isFetching: false,
    isLoading: false,
    refetch: vi.fn(),
    ...overrides,
  };
}

describe('DossiersDashboardWidget', () => {
  beforeEach(() => {
    mocks.workspaceContext.mockReset();
    mocks.listQuery.mockReset();
    mocks.metadataQuery.mockReset();
    mocks.createDossierMutation.mockReset();

    mocks.workspaceContext.mockReturnValue({
      workspace: { id: 'workspace-1' },
      can: () => false,
    });
    mocks.listQuery.mockReturnValue(createQuery({
      data: {
        dossiers: [
          {
            id: 'dossier-1',
            name: 'Nantes',
            brand: null,
            location: { city: 'Nantes', postalCode: '44000' },
            status: 'ACTIVE',
          },
        ],
        pagination: { total: 1, totalPages: 1 },
      },
    }));
    mocks.metadataQuery.mockReturnValue(createQuery({
      data: {
        dossierStatuses: [{ value: 'ACTIVE', label: 'Actif' }],
      },
    }));
  });

  it('charge une synthèse paginée du workspace courant et les metadata', () => {
    render(
      <MemoryRouter>
        <TooltipProvider>
          <DossiersDashboardWidget />
        </TooltipProvider>
      </MemoryRouter>,
    );

    expect(mocks.listQuery).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      page: 1,
      limit: DASHBOARD_DOSSIER_LIMIT,
      search: undefined,
    });
    expect(mocks.metadataQuery).toHaveBeenCalledWith('workspace-1');
    expect(screen.getByText('Nantes')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Dossiers (1)' })).toBeInTheDocument();
    expect(screen.getByText('1 sur 1')).toBeInTheDocument();
  });

  it('relance les deux lectures lorsque le widget est en erreur', () => {
    const listRefetch = vi.fn();
    const metadataRefetch = vi.fn();

    mocks.listQuery.mockReturnValue(createQuery({
      isError: true,
      refetch: listRefetch,
    }));
    mocks.metadataQuery.mockReturnValue(createQuery({
      isError: true,
      refetch: metadataRefetch,
    }));

    render(
      <MemoryRouter>
        <TooltipProvider>
          <DossiersDashboardWidget />
        </TooltipProvider>
      </MemoryRouter>,
    );

    screen.getByRole('button', { name: 'Réessayer' }).click();

    expect(listRefetch).toHaveBeenCalledTimes(1);
    expect(metadataRefetch).toHaveBeenCalledTimes(1);
  });
});
