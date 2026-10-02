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
  economicMetricDefinitions: [
    {
      value: 'manufacturingCostHt',
      label: 'CF HT',
      description: 'Coût de fabrication HT total de la production.',
    },
    {
      value: 'materialCostPerProductionUnitHt',
      label: 'CM/Pce HT',
      description: 'Coût matière HT par pièce fabriquée.',
    },
    {
      value: 'manufacturingCostPerPortionHt',
      label: 'CFU HT',
      description: 'Coût de fabrication HT par portion.',
    },
    {
      value: 'actualMarginBasisPoints',
      label: 'Marge réelle',
      description: 'Part du prix retenu HT restant après le coût de fabrication.',
    },
    {
      value: 'actualMarginAmountHt',
      label: 'Marge sur coût de fabrication HT',
      description: 'Écart HT après déduction du coût de fabrication.',
    },
    {
      value: 'manufacturingMarginProductionHt',
      label: 'Marge sur coût de fabrication HT · production',
      description: 'Marge HT cumulée sur la production.',
    },
    {
      value: 'targetMarginDeltaBasisPoints',
      label: 'Écart vs cible',
      description: 'Écart en points entre la marge réelle et la cible.',
    },
    {
      value: 'targetMarginDeltaAmountHt',
      label: 'Écart monétaire vs cible',
      description: 'Écart HT par unité de vente.',
    },
    {
      value: 'targetMarginDeltaProductionHt',
      label: 'Écart production vs cible',
      description: 'Écart HT cumulé sur la production.',
    },
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
  actualMarginAmountHt: { $numberDecimal: '0.25' },
  manufacturingMarginProductionHt: { $numberDecimal: '20' },
  actualMarginBasisPoints: 6000,
  targetMarginDeltaBasisPoints: -1000,
  targetMarginDeltaAmountHt: { $numberDecimal: '-0.1' },
  targetMarginDeltaProductionHt: { $numberDecimal: '-8' },
};

const productionSnapshot = {
  productionQuantity: { $numberDecimal: '10' },
  productionUnit: 'UNIT',
  portionsPerProductionUnit: { $numberDecimal: '8' },
  saleBasis: 'PORTION',
  vatRateBasisPoints: 1000,
  targetMarginBasisPoints: 7000,
};

describe('TechnicalSheetAnalysisDrawer', () => {
  it('utilise les résultats backend pour diagnostiquer coûts, prix et marge', async () => {
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
    expect(screen.getByText('Marge positive, objectif non atteint'))
      .toBeInTheDocument();
    expect(screen.getAllByText('↓ 10 points').length)
      .toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/↓ 0,10/)).toBeInTheDocument();
    expect(screen.getByText(/↓ 8,00/)).toBeInTheDocument();

    await user.hover(screen.getAllByRole('button', {
      name: 'Définition : CF HT',
    })[0]);

    expect(await screen.findByText(
      'Coût de fabrication HT total de la production.',
    )).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Coûts' }));
    expect(screen.getByText('CM/Pce HT')).toBeInTheDocument();
    expect(screen.getByText('CFU HT')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Prix & marge' }));
    expect(screen.getByText('Prix conseillé TTC')).toBeInTheDocument();
    expect(screen.getByText('Plancher économique TTC')).toBeInTheDocument();
    expect(screen.getByText('10 %')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Historique' }));
    expect(screen.getByText('Validation test')).toBeInTheDocument();
    expect(screen.getByText('Économie')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', {
      name: 'Prix retenu TTC',
    })).toBeInTheDocument();
  });

  it('signale un prix retenu sous le coût de fabrication sans bloquer l’analyse', () => {
    render(
      <TechnicalSheetAnalysisDrawer
        economicSnapshot={{
          ...economicSnapshot,
          actualMarginAmountHt: { $numberDecimal: '-0.05' },
          actualMarginBasisPoints: -2500,
          targetMarginDeltaBasisPoints: -9500,
        }}
        metadata={metadata}
        onClose={vi.fn()}
        open
        productionSnapshot={productionSnapshot}
      />,
    );

    expect(screen.getByText('Prix retenu sous le coût de fabrication'))
      .toBeInTheDocument();
    expect(screen.getByText('Prix retenu TTC')).toBeInTheDocument();
  });
});
