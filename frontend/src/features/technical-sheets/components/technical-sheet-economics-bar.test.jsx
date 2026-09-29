import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';
import {
  TechnicalSheetEconomicsBar,
  getVisibleCosts,
  sumDecimalStrings,
} from '@/features/technical-sheets/components/technical-sheet-economics-bar';

describe('TechnicalSheetEconomicsBar', () => {
  it('additionne exactement les coûts partiels sans flottants métier', () => {
    expect(sumDecimalStrings(['0.1', '0.2', '1.25'])).toBe('1.55');

    expect(getVisibleCosts([
      {
        kind: 'INGREDIENT',
        valuation: { lineCostHt: '1.125' },
      },
      {
        kind: 'INGREDIENT',
        valuation: { lineCostHt: '2.2' },
      },
      {
        kind: 'ECONOMAT',
        valuation: { lineCostHt: '0.75' },
      },
    ], null)).toEqual({
      materialCostHt: '3.325',
      economatCostHt: '0.75',
      manufacturingCostHt: '4.075',
    });
  });

  it('affiche les coûts visibles avant valorisation complète et ouvre le détail', async () => {
    const user = userEvent.setup();

    render(
      <TooltipProvider>
        <TechnicalSheetEconomicsBar
          economicSnapshot={null}
          lines={[
            {
              kind: 'INGREDIENT',
              valuation: { lineCostHt: '12.5' },
            },
          ]}
          targetMarginBasisPoints={7000}
          vatRateBasisPoints={1000}
        />
      </TooltipProvider>,
    );

    expect(screen.getByText('Coût matières HT')).toBeInTheDocument();
    expect(screen.getByText(/12,50/)).toBeInTheDocument();
    expect(screen.getAllByText('Non calculé').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', {
      name: 'Afficher le détail de la valorisation',
    }));

    expect(screen.getByRole('heading', {
      name: 'Détail de la valorisation',
    })).toBeInTheDocument();
    expect(screen.getByText('Marge cible')).toBeInTheDocument();
    expect(screen.getByText('70 %')).toBeInTheDocument();
  });
});
