import {
  render,
  screen,
  within,
} from '@testing-library/react';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';

const mocks = vi.hoisted(() => ({
  usageQuery: vi.fn(),
  workspaceContext: vi.fn(),
}));

vi.mock('@/features/technical-sheets/api/technical-sheets-api', () => ({
  useGetTechnicalSheetExportUsageQuery:
    mocks.usageQuery,
}));

vi.mock('@/features/workspace/components/workspace-context', () => ({
  useWorkspaceContext:
    mocks.workspaceContext,
}));

import {
  TechnicalSheetExportsDashboardWidget,
} from '@/features/technical-sheets/components/technical-sheet-exports-dashboard-widget';

describe('TechnicalSheetExportsDashboardWidget', () => {
  beforeEach(() => {
    mocks.workspaceContext.mockReturnValue({
      workspace: {
        id: 'workspace-1',
      },
    });
    mocks.usageQuery.mockReturnValue({
      data: {
        current: 4,
        limit: 10,
        remaining: 6,
        unlimited: false,
      },
      isError: false,
      isLoading: false,
    });
  });

  it('affiche le quota cumulé du mois pour le Workspace', () => {
    render(
      <TooltipProvider>
        <TechnicalSheetExportsDashboardWidget />
      </TooltipProvider>,
    );

    expect(
      mocks.usageQuery,
    ).toHaveBeenCalledWith(
      'workspace-1',
    );
    const widget =
      screen.getByRole('region', {
        name: 'Exports ce mois',
      });

    expect(widget).toBeInTheDocument();
    expect(within(widget).getByText('4 / 10')).toBeInTheDocument();
    expect(within(widget).getByText('6 disponibles')).toBeInTheDocument();
    expect(within(widget).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40');
    expect(within(widget).getByRole('progressbar').querySelector('[data-slot="progress-indicator"]'))
      .toHaveStyle({ width: '40%' });
  });
  it('ne présente pas une progression artificielle pour une offre illimitée', () => {
    mocks.usageQuery.mockReturnValue({
      data: { current: 12, unlimited: true },
      isError: false,
      isLoading: false,
    });
    render(<TooltipProvider><TechnicalSheetExportsDashboardWidget /></TooltipProvider>);
    expect(screen.getByText('12 / illimité')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
