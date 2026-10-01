import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';
import {
  TechnicalSheetEconomicsBar,
  compactMetricValue,
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
      manufacturingCostPerProductionUnitHt: null,
    });
  });

  it('compacte les valeurs non disponibles en NC dans le cockpit', () => {
    expect(compactMetricValue('Non calculé')).toBe('NC');
    expect(compactMetricValue('Non renseignée')).toBe('NC');
    expect(compactMetricValue('12,50 €')).toBe('12,50 €');
  });

  it('affiche les KPI sous forme de sigles accessibles et ouvre le détail', async () => {
    const user = userEvent.setup();

    render(
      <TooltipProvider>
        <TechnicalSheetEconomicsBar
          canValuate
          economicSnapshot={{
            materialCostHt: '12.5',
            economatCostHt: '1.5',
            manufacturingCostHt: '14',
            manufacturingCostPerProductionUnitHt: '1.4',
            advisedPriceTtcMinor: 3500,
            finalPriceTtcMinor: 3500,
            actualMarginBasisPoints: 6000,
          }}
          finalPriceMode="ADVISED"
          lines={[]}
          onFinalPriceModeChange={vi.fn()}
          targetMarginBasisPoints={7000}
          vatRateBasisPoints={1000}
        />
      </TooltipProvider>,
    );

    expect(screen.getByText('CM HT')).toBeInTheDocument();
    expect(screen.getByText('CE HT')).toBeInTheDocument();
    expect(screen.getByText('CF HT')).toBeInTheDocument();
    expect(screen.queryByText('%MC')).not.toBeInTheDocument();
    expect(screen.getByText('CF/U HT')).toBeInTheDocument();
    expect(screen.getByText('PC TTC/U')).toBeInTheDocument();
    expect(screen.getByText('PF TTC/U')).toBeInTheDocument();
    expect(screen.getByText('%MR')).toBeInTheDocument();

    expect(screen.getByRole('button', {
      name: 'Coût matières hors taxe',
    })).toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: 'Prix conseillé toutes taxes comprises',
    })).toBeInTheDocument();

    await user.click(screen.getByRole('button', {
      name: 'Afficher le détail de la valorisation',
    }));

    expect(screen.getByRole('heading', {
      name: 'Détail de la valorisation',
    })).toBeInTheDocument();
    expect(screen.getByText('Marge cible')).toBeInTheDocument();
    expect(screen.getByText('70 %')).toBeInTheDocument();
  });

  it('ne rend aucune action manuelle de valorisation dans les résultats', () => {
    render(
      <TooltipProvider>
        <TechnicalSheetEconomicsBar
          canValuate
          economicSnapshot={null}
          finalPriceMode="ADVISED"
          lines={[]}
          onFinalPriceModeChange={vi.fn()}
          targetMarginBasisPoints={5000}
          vatRateBasisPoints={1000}
        />
      </TooltipProvider>,
    );

    expect(screen.queryByRole('button', { name: 'Valoriser' }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Revaloriser' }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Marge cible (%)' }))
      .not.toBeInTheDocument();
  });});
