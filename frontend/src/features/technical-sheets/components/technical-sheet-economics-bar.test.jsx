import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';
import {
  TechnicalSheetEconomicsBar,
  compactMetricValue,
} from '@/features/technical-sheets/components/technical-sheet-economics-bar';

const finalPriceModeItems = [
  {
    value: 'ADVISED',
    label: 'Conseillé',
    requiresManualPrice: false,
  },
  {
    value: 'MANUAL',
    label: 'Manuel',
    requiresManualPrice: true,
  },
];

const saleBasisItems = [
  { value: 'PIECE', label: 'Pièce' },
  { value: 'PORTION', label: 'Portion' },
];

const economicMetricDefinitions = [
  {
    value: 'manufacturingCostHt',
    label: 'CF HT',
    description: 'Coût de fabrication HT total de la production.',
  },
  {
    value: 'materialCostPerPortionHt',
    label: 'CMU HT',
    description: 'Coût matière unitaire HT par portion.',
  },
  {
    value: 'manufacturingCostPerPortionHt',
    label: 'CFU HT',
    description: 'Coût de fabrication unitaire HT par portion.',
  },
  {
    value: 'actualMarginBasisPoints',
    label: 'Marge réelle',
    description: 'Part du prix retenu HT restant après le coût.',
  },
];

describe('TechnicalSheetEconomicsBar', () => {
  it('compacte les valeurs non disponibles en NC dans le cockpit', () => {
    expect(compactMetricValue('Non calculé')).toBe('NC');
    expect(compactMetricValue('Non renseignée')).toBe('NC');
    expect(compactMetricValue('NC')).toBe('NC');
    expect(compactMetricValue('12,50 €')).toBe('12,50 €');
  });

  it('affiche uniquement les cinq repères économiques du poste de travail', () => {
    render(
      <TooltipProvider>
        <TechnicalSheetEconomicsBar
          canValuate
          economicMetricDefinitions={economicMetricDefinitions}
          economicSnapshot={{
            manufacturingCostHt: '14',
            materialCostPerPortionHt: '0.625',
            manufacturingCostPerPortionHt: '0.7',
            finalPriceTtcMinor: 350,
            actualMarginBasisPoints: 6000,
          }}
          finalPriceMode="ADVISED"
          finalPriceModeItems={finalPriceModeItems}
          onFinalPriceModeChange={vi.fn()}
          saleBasis="PORTION"
          saleBasisItems={saleBasisItems}
        />
      </TooltipProvider>,
    );

    expect(screen.getByText('CF HT')).toBeInTheDocument();
    expect(screen.getByText('CMU HT')).toBeInTheDocument();
    expect(screen.getByText('CFU HT')).toBeInTheDocument();
    expect(screen.getByText('Prix retenu TTC')).toBeInTheDocument();
    expect(screen.getByText('%MR')).toBeInTheDocument();
    expect(screen.queryByText('PC TTC')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {
      name: 'Afficher le détail de la valorisation',
    })).not.toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: 'Définition : CF HT',
    })).toBeInTheDocument();
  });

  it('affiche Actualisation sans masquer les anciennes valeurs', () => {
    render(
      <TooltipProvider>
        <TechnicalSheetEconomicsBar
          economicSnapshot={{
            manufacturingCostHt: '14',
            materialCostPerPortionHt: '0.625',
            manufacturingCostPerPortionHt: '0.7',
            finalPriceTtcMinor: 350,
            actualMarginBasisPoints: 6000,
          }}
          finalPriceMode="ADVISED"
          finalPriceModeItems={finalPriceModeItems}
          saleBasis="PORTION"
          saleBasisItems={saleBasisItems}
          updating
        />
      </TooltipProvider>,
    );

    expect(screen.getByText('Actualisation…')).toBeInTheDocument();
    expect(screen.getByText(/14,00/)).toBeInTheDocument();
  });

  it('affiche la saisie du prix uniquement lorsque la définition backend l’exige', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <TooltipProvider>
        <TechnicalSheetEconomicsBar
          canValuate
          economicSnapshot={{
            finalPriceTtcMinor: 350,
          }}
          finalPriceInputValue="4,20"
          finalPriceMode="MANUAL"
          finalPriceModeItems={finalPriceModeItems}
          onFinalPriceInputChange={onChange}
          onFinalPriceModeChange={vi.fn()}
          saleBasis="PIECE"
          saleBasisItems={saleBasisItems}
        />
      </TooltipProvider>,
    );

    const input = screen.getByLabelText('Prix retenu TTC (€)');
    await user.clear(input);
    await user.type(input, '5');

    expect(onChange).toHaveBeenCalled();
  });

  it('ne reconstruit aucun coût lorsqu’aucun snapshot backend n’est disponible', () => {
    render(
      <TooltipProvider>
        <TechnicalSheetEconomicsBar
          economicSnapshot={null}
          finalPriceMode="ADVISED"
          finalPriceModeItems={finalPriceModeItems}
          saleBasis="PIECE"
          saleBasisItems={saleBasisItems}
        />
      </TooltipProvider>,
    );

    expect(screen.getAllByText('NC').length).toBeGreaterThanOrEqual(4);
  });
});
