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

  it('affiche la correspondance pièce/colis avant le conditionnement sans masquer les actions', () => {
    renderDialog();

    const scrollRegion = screen.getByRole('region', {
      name: 'Champs de l’Article fournisseur',
    });
    const section = screen.getByRole('region', {
      name: 'Correspondance avec la fiche technique',
    });
    const saveButton = screen.getByRole('button', { name: 'Enregistrer' });

    expect(scrollRegion.firstElementChild).toBe(section);
    expect(section).toHaveTextContent('Valorisation à la pièce');
    expect(section).toHaveTextContent('Pour utiliser un tarif au carton');
    expect(section).toContainElement(screen.getByRole('checkbox'));
    expect(scrollRegion).not.toContainElement(saveButton);
    expect(saveButton.closest('.shrink-0')).toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: 'Origine de l’unité utilisée en fiche technique',
    })).toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: 'Précisions sur la correspondance en pièces de recette',
    })).toBeInTheDocument();
    expect(screen.queryByText('Définie dans le Référentiel Produits : elle ne se modifie pas ici.'))
      .not.toBeInTheDocument();
    expect(screen.queryByText(/Ne confirmez pas une estimation de poids/))
      .not.toBeInTheDocument();
  });

  it('anime les champs vides et laisse sur la bordure les champs renseignés', async () => {
    const user = userEvent.setup();
    renderDialog();

    const empty = screen.getByLabelText('Marque (facultatif)');
    const filled = screen.getByLabelText('Désignation fournisseur');
    expect(empty).toHaveClass('h-12');
    expect(filled).toHaveClass('h-12');
    expect(empty.closest('[data-slot="field"]')).toHaveAttribute('data-label-state', 'empty');
    expect(filled.closest('[data-slot="field"]')).toHaveAttribute('data-label-state', 'filled');
    expect(screen.getByText('Marque (facultatif)').parentElement)
      .toHaveClass('top-8', 'group-focus-within:top-2');
    await user.type(empty, 'BRIDOR');
    expect(empty.closest('[data-slot="field"]')).toHaveAttribute('data-label-state', 'filled');
    expect(screen.getByLabelText('Nb d’unités par colis')).toHaveValue('36');
  });

  it('réinitialise la confirmation lorsque le conditionnement est modifié', async () => {
    const user = userEvent.setup();
    renderDialog({
      ...article,
      recipeUnitEquivalence: { unitsPerPackage: 36 },
    });
    const initialConfirmation = screen.getByRole('checkbox');
    expect(initialConfirmation).toBeChecked();

    // Un colisage incomplet masque le contrôle des pièces : l'ancienne
    // checkbox est alors démontée. Il faut relire celle du DOM courant.
    await user.clear(screen.getByLabelText('Nb d’unités par colis'));
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(initialConfirmation).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Nb d’unités par colis'), '25');
    const currentConfirmation = screen.getByRole('checkbox');
    expect(currentConfirmation).not.toBe(initialConfirmation);
    expect(currentConfirmation).not.toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(mocks.update).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Confirmez que ce nombre correspond bien aux pièces utilisées en recette.',
    );
  });

  it('annule également une confirmation après modification du poids sans démonter la case', async () => {
    const user = userEvent.setup();
    renderDialog({
      ...article,
      recipeUnitEquivalence: { unitsPerPackage: 36 },
    });

    const confirmation = screen.getByRole('checkbox');
    expect(confirmation).toBeChecked();

    const quantity = screen.getByLabelText('Quantité par unité');
    await user.type(quantity, '0');

    expect(screen.getByRole('checkbox')).toBe(confirmation);
    expect(confirmation).not.toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(mocks.update).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Confirmez que ce nombre correspond bien aux pièces utilisées en recette.',
    );
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
