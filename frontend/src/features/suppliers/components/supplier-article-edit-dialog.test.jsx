import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';

const mocks = vi.hoisted(() => ({ update: vi.fn() }));
vi.mock('@/features/suppliers/api/supplier-api', () => ({
  useUpdateSupplierArticleMutation: () => [mocks.update, { isLoading: false }],
}));
import { SupplierArticleEditDialog } from './supplier-article-edit-dialog';

const article = {
  id: 'article-1',
  supplierReference: '43279',
  supplierDesignation: 'Croissant 120 g',
  supplier: { name: 'BRIDOR' },
  productVariant: {
    id: 'variant-1', name: 'Croissant individuel PAI',
    referenceUnit: 'UNIT',
    countUnitLabelSingular: 'pièce', countUnitLabelPlural: 'pièces',
  },
  packaging: {
    containerType: 'Carton', supplierLabel: null,
    unitCount: 36, quantityPerUnit: '120', unit: 'G',
    totalQuantity: '4320', netWeight: '4320', netWeightUnit: 'G',
  },
};

function renderDialog(customArticle = article) {
  return render(
    <TooltipProvider>
      <SupplierArticleEditDialog
        article={customArticle}
        open
        onClose={vi.fn()}
        onSaved={vi.fn()}
        workspaceId="workspace-1"
      />
    </TooltipProvider>,
  );
}

describe('M-003 — édition de l’Article et unité de fiche', () => {
  beforeEach(() => {
    mocks.update.mockReset();
    mocks.update.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });
  });

  it('présente le titre demandé, la pièce en lecture seule et le nombre par colis', () => {
    renderDialog();
    expect(screen.getByText(/Modifier les informations de : Croissant 120 g/)).toBeTruthy();
    expect(screen.getByText('BRIDOR')).toBeTruthy();
    expect(screen.getByLabelText('Nb d’unités par colis')).toHaveValue('36');
    expect(screen.getByLabelText('Unité utilisée en fiche technique')).toHaveTextContent('pièce');
    expect(screen.getByRole('button', {
      name: 'Informations sur la correction du conditionnement',
    })).toBeTruthy();
    expect(screen.queryByText(/^UNIT$/)).toBeNull();
  });

  it('exige une confirmation humaine du nombre de pièces de recette', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.type(screen.getByLabelText(
      'Nombre de pièces de recette par colis (facultatif)',
    ), '36');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(mocks.update).not.toHaveBeenCalled();
    expect(screen.getByText(/Confirmez que ce nombre/)).toBeTruthy();
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      articleId: 'article-1',
      recipeUnitsPerPackage: 36,
      confirmRecipeUnits: true,
    }));
  });

  it('ne propose pas de correspondance pièce si le Produit est au poids', () => {
    renderDialog({
      ...article,
      productVariant: { ...article.productVariant, referenceUnit: 'G' },
    });
    expect(screen.getByLabelText('Unité utilisée en fiche technique')).toHaveTextContent('g');
    expect(screen.queryByLabelText(
      'Nombre de pièces de recette par colis (facultatif)',
    )).toBeNull();
  });
});
