import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@/components/ui/tooltip';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
}));

vi.mock('@/features/products/api/product-reference-api', () => ({
  useUpdateProductReferenceVariantMutation: () => [
    mocks.update, { isLoading: false },
  ],
  useGetProductReferenceDimensionsQuery: () => ({
    data: { varieties: [], characteristics: [] },
    refetch: vi.fn(),
  }),
}));

vi.mock('@/features/products/components/product-variant-fields', () => ({
  ProductVariantFields: ({ onChange, value }) => (
    <button
      aria-label="Unité de référence"
      onClick={() => onChange({
        ...value, referenceUnit: value.referenceUnit === 'UNIT' ? 'KG' : 'UNIT',
      })}
      type="button"
    >
      {value.referenceUnit === 'UNIT' ? 'pièce' : 'kg'}
    </button>
  ),
  variantDraftToPayload: (draft) => ({
    name: draft.name,
    referenceUnit: draft.referenceUnit,
    conservationType: draft.conservationType,
  }),
}));

vi.mock('@/features/products/components/product-dimension-contribution-dialog', () => ({
  ProductDimensionContributionDialog: () => null,
}));

import {
  ProductReferenceVariantEditDialog,
} from './product-reference-variant-edit-dialog';

const variant = {
  id: 'variant-1',
  name: 'Croissant individuel PAI',
  referenceUnit: 'KG',
  conservationType: 'SURGELE',
  countUnitLabelSingular: null,
  countUnitLabelPlural: null,
};

describe('M-002 correction encadrée de l’unité de référence', () => {
  beforeEach(() => {
    mocks.update.mockReset();
    mocks.update.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ id: variant.id }),
    });
  });

  it('affiche le nom exact de la Référence et l’action d’enrichissement dans l’en-tête', () => {
    render(
      <TooltipProvider>
        <ProductReferenceVariantEditDialog
          metadata={{}}
          onClose={vi.fn()}
          onSaved={vi.fn()}
          open
          productId="product-1"
          variant={variant}
        />
      </TooltipProvider>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Corriger Croissant individuel PAI' });
    const header = dialog.querySelector('[data-slot="dialog-header"]');
    const enrich = screen.getByRole('button', { name: 'Enrichir le référentiel' });

    expect(header).toContainElement(enrich);
    expect(screen.queryByText('Caractéristiques de la référence')).not.toBeInTheDocument();
    expect(dialog.getAttribute('aria-labelledby')).toBeTruthy();
  });

  it('exige une confirmation avant de modifier une unité avec conséquences économiques', async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <ProductReferenceVariantEditDialog
          metadata={{}}
          onClose={vi.fn()}
          onSaved={vi.fn()}
          open
          productId="product-1"
          variant={variant}
        />
      </TooltipProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Unité de référence' }));
    expect(screen.getByText('Correction de l’unité de recette')).toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: 'Conséquences de la correction de l’unité de recette',
    })).toBeInTheDocument();
    expect(screen.getByText(/Les coûts de recette devront être vérifiés/))
      .toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(mocks.update).not.toHaveBeenCalled();
    expect(screen.getByText(/Confirmez la correction/)).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', {
      name: 'Je confirme vouloir corriger l’unité de cette référence.',
    }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      productId: 'product-1',
      variantId: 'variant-1',
      referenceUnit: 'UNIT',
      confirmSupplierArticleRevaluation: true,
    }));
  });

  it('ne demande pas de confirmation pour la correction du nom sans changement d’unité', async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <ProductReferenceVariantEditDialog
          metadata={{}}
          onClose={vi.fn()}
          onSaved={vi.fn()}
          open
          productId="product-1"
          variant={variant}
        />
      </TooltipProvider>,
    );
    expect(screen.queryByText('Correction de l’unité de recette'))
      .not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(mocks.update).toHaveBeenCalledWith(
      expect.not.objectContaining({ confirmSupplierArticleRevaluation: true }),
    );
  });
  it('garde les actions et les erreurs hors de la zone défilante', async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <ProductReferenceVariantEditDialog
          metadata={{}}
          onClose={vi.fn()}
          onSaved={vi.fn()}
          open
          productId="product-1"
          variant={variant}
        />
      </TooltipProvider>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Corriger Croissant individuel PAI' });
    const fields = screen.getByRole('region', {
      name: 'Champs de la référence Produit',
    });
    const cancel = screen.getByRole('button', { name: 'Annuler' });
    const save = screen.getByRole('button', { name: 'Enregistrer' });

    expect(dialog).toHaveClass(
      'flex', 'flex-col', 'overflow-hidden', 'max-h-[calc(100dvh-2rem)]',
    );
    expect(fields).toHaveClass('min-h-0', 'flex-1', 'overflow-y-auto');
    expect(fields).toContainElement(screen.getByLabelText('Unité de référence'));
    expect(fields).not.toContainElement(cancel);
    expect(fields).not.toContainElement(save);
    const footer = dialog.querySelector('[data-slot="dialog-footer"]');
    expect(footer.parentElement).toHaveClass('shrink-0');

    await user.click(screen.getByRole('button', { name: 'Unité de référence' }));
    await user.click(save);

    const error = screen.getByRole('alert');
    expect(error).toHaveTextContent('Confirmez la correction');
    expect(fields).not.toContainElement(error);
    expect(mocks.update).not.toHaveBeenCalled();
  });

});
