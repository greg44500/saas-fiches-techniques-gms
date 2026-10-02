import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/shared/entity-details-drawer', () => ({
  EntityDetailsDrawer: ({ children, open, title }) => (
    open ? (
      <aside>
        <h2>{title}</h2>
        {children}
      </aside>
    ) : null
  ),
}));

import {
  TechnicalSheetAnalysisDrawer,
} from '@/features/technical-sheets/components/technical-sheet-analysis-drawer';

const metadata = {
  changeKindDefinitions: [
    { value: 'ECONOMICS', label: 'Économie' },
  ],
  productionUnits: [
    { value: 'UNIT', label: 'Pièce' },
  ],
  saleBases: [
    { value: 'PORTION', label: 'Portion' },
  ],
};

const economicSnapshot = {
  materialCostHt: { $numberDecimal: '12' },
  economatCostHt: { $numberDecimal: '4' },
  manufacturingCostHt: { $numberDecimal: '16' },
  materialCostPerProductionUnitHt: { $numberDecimal: '1.2' },
  manufacturingCostPerProductionUnitHt: { $numberDecimal: '1.6' },
  totalPortions: { $numberDecimal: '80' },
  materialCostPerPortionHt: { $numberDecimal: '0.15' },
  economatCostPerPortionHt: { $numberDecimal: '0.05' },
  manufacturingCostPerPortionHt: { $numberDecimal: '0.2' },
  theoreticalPriceHt: { $numberDecimal: '0.4' },
  theoreticalPriceTtc: { $numberDecimal: '0.44' },
  advisedPriceTtcMinor: 50,
  finalPriceTtcMinor: 50,
  economicFloorTtc: { $numberDecimal: '0.22' },
  actualMarginBasisPoints: 6000,
};

const productionSnapshot = {
  productionQuantity: { $numberDecimal: '10' },
  productionUnit: 'UNIT',
  portionsPerProductionUnit: { $numberDecimal: '8' },
  saleBasis: 'PORTION',
  targetMarginBasisPoints: 7000,
};

describe('TechnicalSheetAnalysisDrawer', () => {
  it('sépare synthèse, coûts, prix et historique sans recalcul métier local', async () => {
    const user = userEvent.setup();

    render(
      <TechnicalSheetAnalysisDrawer
        economicSnapshot={economicSnapshot}
        history={[{
          id: 'validation-1',
          validatedAt: '2026-10-02T08:00:00.000Z',
          comment: 'Validation test',
          changeKinds: ['ECONOMICS'],
          economicSnapshot,
        }]}
        metadata={metadata}
        onClose={vi.fn()}
        open
        productionSnapshot={productionSnapshot}
      />,
    );

    expect(screen.getByRole('heading', {
      name: 'Analyse de gestion',
    })).toBeInTheDocument();
    expect(screen.getByText('10 pièce')).toBeInTheDocument();
    expect(screen.getByText('80')).toBeInTheDocument();
    expect(screen.getByRole('img', {
      name: 'Matières 75 %, Économat 25 %',
    })).toBeInTheDocument();
    expect(screen.getByText('Écart : -10 points')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Coûts' }));
    expect(screen.getByText('CM/Pce HT')).toBeInTheDocument();
    expect(screen.getByText('CFU HT · Fabrication / portion'))
      .toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Prix & marge' }));
    expect(screen.getByText('Prix conseillé TTC')).toBeInTheDocument();
    expect(screen.getByText('Plancher économique TTC')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Historique' }));
    expect(screen.getByText('Validation test')).toBeInTheDocument();
    expect(screen.getByText('Économie')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', {
      name: 'Prix retenu TTC',
    })).toBeInTheDocument();
  });
});
