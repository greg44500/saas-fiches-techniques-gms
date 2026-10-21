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

const packagingCount = () => screen.getByLabelText('Nb d’unités par colis');

describe('M-003 — édition de l’Article et unité de fiche', () => {
  beforeEach(() => {
    mocks.update.mockReset();
    mocks.update.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });
  });

  it('présente l’Article, son unité de recette et le nombre d’unités commerciales', () => {
    renderDialog();
    expect(screen.getByText(/Modifier les informations de : Croissant 120 g/)).toBeInTheDocument();
    expect(screen.getByText('BRIDOR')).toBeInTheDocument();
    expect(packagingCount()).toHaveValue('36');
    expect(screen.getByLabelText('Unité utilisée en fiche technique')).toHaveTextContent('pièce');
    expect(screen.getByRole('button', {
      name: 'Informations sur la correction du conditionnement',
    })).toBeInTheDocument();
  });

  it('présente la proposition 1 pour 1 avant le conditionnement, sans doubler la saisie', () => {
    renderDialog();
    const section = screen.getByRole('region', {
      name: 'Correspondance avec la fiche technique',
    });
    const scrollRegion = screen.getByRole('region', {
      name: 'Champs de l’Article fournisseur',
    });
    const saveButton = screen.getByRole('button', { name: 'Enregistrer' });

    expect(scrollRegion.firstElementChild).toBe(section);
    expect(section).toHaveTextContent('36 pièces par colis');
    expect(section).toHaveTextContent('Proposition à confirmer');
    expect(screen.getByRole('radio', { name: '1 unité du colis = 1 pièce en recette' }))
      .toBeChecked();
    expect(screen.queryByLabelText('Nombre réel de pièces utilisables par colis'))
      .not.toBeInTheDocument();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(scrollRegion).not.toContainElement(saveButton);
    expect(saveButton.closest('.shrink-0')).toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: 'Origine de l’unité utilisée en fiche technique',
    })).toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: 'Précisions sur la correspondance en pièces de recette',
    })).toBeInTheDocument();
  });

  it('anime les champs vides et laisse les champs renseignés sur la bordure', async () => {
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
  });

  it('requiert une confirmation explicite avant d’utiliser les 36 pièces proposées', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(mocks.update).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Confirmez que ce nombre correspond bien aux pièces utilisées en recette.',
    );
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      articleId: 'article-1',
      recipeUnitsPerPackage: 36,
      confirmRecipeUnits: true,
    }));
  });

  it('permet un nombre de pièces différent, sans le présumer confirmé', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole('radio', { name: 'Le nombre de pièces est différent' }));
    const count = screen.getByLabelText('Nombre réel de pièces utilisables par colis');
    expect(count).toHaveValue('');
    await user.type(count, '48');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(mocks.update).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Confirmez que ce nombre');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      recipeUnitsPerPackage: 48,
      confirmRecipeUnits: true,
    }));
  });

  it('demande un nombre valide en mode différent avant la confirmation', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole('radio', { name: 'Le nombre de pièces est différent' }));
    expect(screen.getByRole('checkbox')).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(mocks.update).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Indiquez le nombre réel de pièces de recette par colis.',
    );
  });

  it('enregistre une équivalence inconnue sans confirmation en prévenant de la perte du prix', async () => {
    const user = userEvent.setup();
    renderDialog({
      ...article,
      recipeUnitEquivalence: { unitsPerPackage: 36 },
    });
    expect(screen.getByRole('checkbox')).toBeChecked();
    await user.click(screen.getByRole('radio', {
      name: 'Je ne connais pas encore cette correspondance',
    }));
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Une équivalence déjà validée sera retirée.',
    );
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      recipeUnitsPerPackage: null,
    }));
    expect(mocks.update.mock.calls[0][0]).not.toHaveProperty('confirmRecipeUnits');
  });

  it('conserve une correspondance existante différente et sa confirmation', async () => {
    const user = userEvent.setup();
    renderDialog({
      ...article,
      recipeUnitEquivalence: { unitsPerPackage: 48 },
    });
    expect(screen.getByRole('radio', { name: 'Le nombre de pièces est différent' }))
      .toBeChecked();
    expect(screen.getByLabelText('Nombre réel de pièces utilisables par colis')).toHaveValue('48');
    expect(screen.getByRole('checkbox')).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      recipeUnitsPerPackage: 48,
      confirmRecipeUnits: true,
    }));
  });

  it('annule la confirmation d’une équivalence différente lors du retour au mode 1 pour 1', async () => {
    const user = userEvent.setup();
    renderDialog({
      ...article,
      recipeUnitEquivalence: { unitsPerPackage: 48 },
    });
    await user.click(screen.getByRole('radio', { name: '1 unité du colis = 1 pièce en recette' }));
    expect(screen.queryByLabelText('Nombre réel de pièces utilisables par colis'))
      .not.toBeInTheDocument();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(screen.getByRole('status')).toHaveTextContent('36 pièces par colis');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      recipeUnitsPerPackage: 36,
      confirmRecipeUnits: true,
    }));
  });

  it('réinitialise la confirmation après modification du nombre commercial', async () => {
    const user = userEvent.setup();
    renderDialog({
      ...article,
      recipeUnitEquivalence: { unitsPerPackage: 36 },
    });
    const initial = screen.getByRole('checkbox');
    expect(initial).toBeChecked();

    await user.clear(packagingCount());
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(initial).not.toBeInTheDocument();
    await user.type(packagingCount(), '25');
    const current = screen.getByRole('checkbox');
    expect(current).not.toBe(initial);
    expect(current).not.toBeChecked();
    expect(screen.getByRole('status')).toHaveTextContent('25 pièces par colis');

    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(mocks.update).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Confirmez que ce nombre correspond bien aux pièces utilisées en recette.',
    );
    await user.click(current);
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      recipeUnitsPerPackage: 25,
      confirmRecipeUnits: true,
    }));
  });

  it('annule une confirmation après changement de quantité physique sans démonter la case', async () => {
    const user = userEvent.setup();
    renderDialog({
      ...article,
      recipeUnitEquivalence: { unitsPerPackage: 36 },
    });
    const confirmation = screen.getByRole('checkbox');
    expect(confirmation).toBeChecked();

    await user.type(screen.getByLabelText('Quantité par unité'), '0');
    expect(screen.getByRole('checkbox')).toBe(confirmation);
    expect(confirmation).not.toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('conserve la mention fournisseur dans un volet complémentaire, sans changer son champ DB', async () => {
    const user = userEvent.setup();
    renderDialog({
      ...article,
      productVariant: { ...article.productVariant, referenceUnit: 'G' },
      packaging: {
        ...article.packaging,
        supplierLabel: 'CT 36 X 120 G',
      },
    });
    const field = screen.getByLabelText('Mention du conditionnement fournisseur (facultatif)');
    expect(field).toHaveValue('CT 36 X 120 G');
    expect(screen.getByRole('button', { name: /Informations complémentaires/ }))
      .toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: 'À quoi sert la mention du conditionnement fournisseur ?',
    })).toBeInTheDocument();
    await user.clear(field);
    await user.type(field, 'Carton de 36 croissants');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      packaging: expect.objectContaining({
        supplierLabel: 'Carton de 36 croissants',
      }),
    }));
  });

  it('replie la mention fournisseur vide pour alléger le formulaire courant', async () => {
    const user = userEvent.setup();
    renderDialog({
      ...article,
      productVariant: { ...article.productVariant, referenceUnit: 'G' },
    });
    const more = screen.getByRole('button', { name: 'Informations complémentaires' });
    expect(more).toHaveAttribute('data-slot', 'collapsible-trigger');
    await user.click(more);
    expect(screen.getByLabelText('Mention du conditionnement fournisseur (facultatif)'))
      .toBeInTheDocument();
  });

  it('ne propose pas de confirmation en pièces si la Référence Produit est au poids', () => {
    renderDialog({
      ...article,
      productVariant: { ...article.productVariant, referenceUnit: 'G' },
    });
    expect(screen.getByLabelText('Unité utilisée en fiche technique')).toHaveTextContent('g');
    expect(screen.queryByRole('radio', {
      name: '1 unité du colis = 1 pièce en recette',
    })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });
});
