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

import { TooltipProvider } from '@/components/ui/tooltip';

const mocks = vi.hoisted(() => ({
  capacityQuery: vi.fn(),
  workspaceContext: vi.fn(),
}));

vi.mock('@/features/technical-sheets/api/technical-sheets-api', () => ({
  useGetTechnicalSheetCapacityQuery:
    mocks.capacityQuery,
}));

vi.mock('@/features/workspace/components/workspace-context', () => ({
  useWorkspaceContext:
    mocks.workspaceContext,
}));

import {
  TechnicalSheetsCapacityDashboardWidget,
} from '@/features/technical-sheets/components/technical-sheets-capacity-dashboard-widget';

describe('TechnicalSheetsCapacityDashboardWidget', () => {
  beforeEach(() => {
    mocks.workspaceContext.mockReturnValue({
      workspace: {
        id: 'workspace-1',
      },
    });
    mocks.capacityQuery.mockReturnValue({
      data: {
        current: 7,
        limit: 10,
        unlimited: false,
      },
      isError: false,
      isLoading: false,
    });
  });

  it('affiche la consommation de Fiches techniques du Workspace', () => {
    render(
      <TooltipProvider>
        <TechnicalSheetsCapacityDashboardWidget />
      </TooltipProvider>,
    );

    expect(
      mocks.capacityQuery,
    ).toHaveBeenCalledWith(
      'workspace-1',
    );
    expect(
      screen.getByText('7 / 10'),
    ).toBeInTheDocument();
  });
});
