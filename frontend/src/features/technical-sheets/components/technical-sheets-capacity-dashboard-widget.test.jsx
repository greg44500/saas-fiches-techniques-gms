import {
  render,
  screen,
} from '@testing-library/react';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { MemoryRouter } from 'react-router';

import { TooltipProvider } from '@/components/ui/tooltip';

const mocks = vi.hoisted(() => ({
  capacityQuery: vi.fn(),
  trashQuery: vi.fn(),
  workspaceContext: vi.fn(),
}));

vi.mock('@/features/technical-sheets/api/technical-sheets-api', () => ({
  useGetTechnicalSheetCapacityQuery:
    mocks.capacityQuery,
  useListTechnicalSheetTrashQuery:
    mocks.trashQuery,
}));

vi.mock('@/features/workspace/components/workspace-context', () => ({
  useWorkspaceContext:
    mocks.workspaceContext,
}));

import {
  TechnicalSheetsCapacityDashboardWidget,
} from '@/features/technical-sheets/components/technical-sheets-capacity-dashboard-widget';

function renderWidget() {
  return render(
    <MemoryRouter>
      <TooltipProvider>
        <TechnicalSheetsCapacityDashboardWidget />
      </TooltipProvider>
    </MemoryRouter>,
  );
}

describe('TechnicalSheetsCapacityDashboardWidget', () => {
  beforeEach(() => {
    mocks.workspaceContext.mockReturnValue({
      membership: {
        role: {
          key: 'owner',
        },
      },
      workspace: {
        id: 'workspace-1',
      },
    });
    mocks.capacityQuery.mockReturnValue({
      data: {
        current: 7,
        limit: 10,
        remaining: 3,
        unlimited: false,
      },
      isError: false,
      isLoading: false,
    });
    mocks.trashQuery.mockReturnValue({
      data: {
        sheets: [],
        pagination: {
          page: 1,
          limit: 1,
          total: 2,
          totalPages: 2,
        },
      },
      isError: false,
    });
  });

  it('répartit la capacité entre Dossiers et Corbeille pour le propriétaire', () => {
    renderWidget();

    expect(
      screen.getByRole('region', {
        name: 'Capacité des Fiches techniques',
      }),
    ).toBeInTheDocument();
    expect(mocks.capacityQuery).toHaveBeenCalledWith('workspace-1');
    expect(mocks.trashQuery).toHaveBeenCalledWith(
      {
        workspaceId: 'workspace-1',
        page: 1,
        limit: 1,
      },
      { skip: false },
    );
    expect(screen.getByText('7 / 10')).toBeInTheDocument();
    expect(document.querySelector('[data-slot="progress-indicator"]')).toHaveStyle({ width: '70%' });
    expect(document.querySelector('[data-slot="progress-indicator"]')).toHaveClass('bg-primary');
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3 disponibles')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Dans les Dossiers/ })).toHaveAttribute(
      'href',
      '/workspaces/workspace-1/dossiers',
    );
    expect(screen.getByRole('link', { name: /Dans la Corbeille/ })).toHaveAttribute(
      'href',
      '/workspaces/workspace-1/technical-sheets/trash',
    );
  });

  it('n’expose pas la répartition Corbeille à un membre sans accès Owner', () => {
    mocks.workspaceContext.mockReturnValue({
      membership: {
        role: {
          key: 'member',
        },
      },
      workspace: {
        id: 'workspace-1',
      },
    });
    mocks.trashQuery.mockReturnValue({
      data: undefined,
      isError: false,
    });

    renderWidget();

    expect(mocks.trashQuery).toHaveBeenCalledWith(
      {
        workspaceId: 'workspace-1',
        page: 1,
        limit: 1,
      },
      { skip: true },
    );
    expect(screen.queryByText('Dans la Corbeille')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Dans la Corbeille/ }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Dans les Dossiers/ }))
      .not.toBeInTheDocument();
  });
});
