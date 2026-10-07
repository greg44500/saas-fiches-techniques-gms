import {
  render,
  screen,
} from '@testing-library/react';
import {
  describe,
  expect,
  it,
} from 'vitest';
import {
  MemoryRouter,
} from 'react-router';

import { TooltipProvider } from '@/components/ui/tooltip';
import {
  DashboardSummaryCard,
} from '@/features/workspace/components/dashboard-summary-card';

describe('DashboardSummaryCard', () => {
  it('place l’aide contextuelle avec le titre sans l’imbriquer dans le lien', () => {
    render(
      <MemoryRouter>
        <TooltipProvider>
          <DashboardSummaryCard
            description="Tous formats confondus."
            href="/usage"
            label="Exports ce mois"
            value="0 / 10"
          />
        </TooltipProvider>
      </MemoryRouter>,
    );

    const label =
      screen.getByText(
        'Exports ce mois',
      );
    const info =
      screen.getByRole('button', {
        name:
          'À propos de Exports ce mois',
      });
    const link =
      screen.getByRole('link', {
        name:
          'Ouvrir Exports ce mois',
      });

    expect(
      label.parentElement,
    ).toContainElement(info);
    expect(link).not.toContainElement(info);
    expect(
      screen.getByText('0 / 10'),
    ).toBeInTheDocument();
  });
});
