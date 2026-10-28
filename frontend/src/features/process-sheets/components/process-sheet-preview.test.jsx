import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ProcessSheetPreview } from '@/features/process-sheets/components/process-sheet-preview';

const ingredients = [
  { lineKey: 'line:one', productVariantName: 'Aubergines en rondelles', sourcePosition: 0 },
  { lineKey: 'line:two', productVariantName: 'Tomate', sourcePosition: 1 },
  { lineKey: 'line:three', productVariantName: 'Tomate', sourcePosition: 2 },
];

describe('M-006 — prévisualisation épurée', () => {
  it('montre les noms seuls sans numéros de ligne, labels inutiles ni doublon phase/étape', () => {
    render(
      <ProcessSheetPreview
        ingredients={ingredients}
        phases={[{
          id: 'phase-one', title: 'Préparation du poste',
          instructions: 'Décongeler les produits',
          ingredientLineKeys: ['line:one'],
          steps: [{
            id: 'step-one', title: 'Décongélation',
            instructions: 'Mettre en œuvre la décongélation',
            ingredientLineKeys: ['line:two', 'line:three'],
          }],
        }]}
      />,
    );
    const preview = screen.getByRole('region', { name: 'Aperçu du process' });
    expect(within(preview).getByRole('heading', { name: '1. Préparation du poste' }))
      .toBeInTheDocument();
    expect(within(preview).getByRole('heading', { name: '1.1 Décongélation' }))
      .toBeInTheDocument();
    expect(within(preview).getByText('Décongeler les produits')).toBeInTheDocument();
    expect(within(preview).getByText('Aubergines en rondelles')).toBeInTheDocument();
    // Deux occurrences identiques restent deux associations distinctes en mémoire et à l'écran.
    expect(within(preview).getAllByText('Tomate')).toHaveLength(2);
    expect(within(preview).queryByText(/ligne [0-9]+/i)).not.toBeInTheDocument();
    expect(within(preview).queryByText(/Ingrédients (de la phase|de l’étape)/))
      .not.toBeInTheDocument();
    expect(within(preview).queryByText(/Aperçu de lecture du brouillon/))
      .not.toBeInTheDocument();
    const phase = within(preview).getByRole('heading', { name: '1. Préparation du poste' })
      .closest('li');
    const step = within(preview).getByRole('heading', { name: '1.1 Décongélation' })
      .closest('li');
    expect(phase.querySelector(':scope > ul')).toHaveTextContent('Aubergines en rondelles');
    expect(phase.querySelector(':scope > ul')).not.toHaveTextContent('Tomate');
    expect(step.querySelector(':scope > ul')).toHaveTextContent('Tomate');
  });

  it('conserve instructions et compléments sans créer de sous-titres vides', () => {
    render(
      <ProcessSheetPreview
        ingredients={ingredients}
        phases={[{
          id: 'phase-two', title: 'Cuisson', instructions: '',
          ingredientLineKeys: [],
          steps: [{
            id: 'step-cook', title: 'Cuire', instructions: 'Surveiller la cuisson',
            ingredientLineKeys: [], duration: { activeMinutes: 10 },
            temperatureCelsius: 180, equipment: ['Four'],
            manufacturingVigilance: ['Vérifier la coloration'],
            qualityControls: [], sanitaryControls: [],
          }],
        }]}
      />,
    );
    const preview = screen.getByRole('region', { name: 'Aperçu du process' });
    expect(within(preview).getByText('Surveiller la cuisson')).toBeInTheDocument();
    expect(within(preview).getByText(/Actif : 10 min/)).toBeInTheDocument();
    expect(within(preview).getByText(/Température : 180 °C/)).toBeInTheDocument();
    expect(within(preview).getByText(/Four/)).toBeInTheDocument();
    expect(within(preview).getByText('Vérifier la coloration')).toBeInTheDocument();
    expect(within(preview).queryByText(/Ingrédients de la phase/)).not.toBeInTheDocument();
    expect(within(preview).queryByText(/Ingrédients de l’étape/)).not.toBeInTheDocument();
  });
});
