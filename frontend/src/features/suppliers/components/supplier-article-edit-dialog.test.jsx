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
const withProof = () => ({
  ...article,
  recipeUnitEquivalence: {
    unitsPerPackage: 36,
    verifiedAt: '2026-10-20T10:00:00.000Z',
  },
});
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

describe('M-003 — édition simple et persistance de la preuve', () => {
  beforeEach(() => {
    mocks.update.mockReset();
    mocks.update.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });
  });

  it('affiche le contenu du colis avant le nombre de pièces, sans radios ni checkbox', () => {
    renderDialog();
    expect(screen.getByLabelText('Nb d’unités par colis')).toHaveValue('36');
    expect(screen.getByLabelText('Nombre réel de pièces par colis')).toHaveValue('36');
    expect(screen.getByLabelText('Unité utilisée en fiche technique')).toHaveTextContent('pièce');
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    const region = screen.getByRole('region', { name: 'Champs de l’Article fournisseur' });
    expect(region.lastElementChild).toHaveAttribute('aria-label', 'Correspondance avec la fiche technique');
  });

  it('enregistre une correction de marque sans réattester les 36 pièces', async () => {
    const user = userEvent.setup();
    renderDialog(withProof());
    expect(screen.getByRole('status')).toHaveTextContent('36 pièces déjà vérifiées');
    await user.type(screen.getByLabelText('Marque (facultatif)'), 'BRIDOR');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      brand: 'BRIDOR',
    }));
    const payload = mocks.update.mock.calls[0][0];
    expect(payload).not.toHaveProperty('recipeUnitsPerPackage');
    expect(payload).not.toHaveProperty('confirmRecipeUnits');
    expect(payload).not.toHaveProperty('packaging');
  });

  it('ne relance aucune mutation en cas de formulaire inchangé', async () => {
    const user = userEvent.setup();
    renderDialog(withProof());
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('atteste 36 pièces par une action explicite lorsque la preuve manque', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole('button', { name: 'Confirmer ce nombre' }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      recipeUnitsPerPackage: 36,
      confirmRecipeUnits: true,
    }));
  });

  it('exige une nouvelle confirmation si le nombre de pièces est réellement modifié', async () => {
    const user = userEvent.setup();
    renderDialog(withProof());
    const input = screen.getByLabelText('Nombre réel de pièces par colis');
    await user.clear(input);
    await user.type(input, '48');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(mocks.update).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Confirmez le nouveau nombre');
    await user.click(screen.getByRole('button', { name: 'Confirmer ce nombre' }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      recipeUnitsPerPackage: 48,
      confirmRecipeUnits: true,
    }));
  });

  it('autorise le changement de colis sans confirmation mais signale la perte de preuve', async () => {
    const user = userEvent.setup();
    renderDialog(withProof());
    const count = screen.getByLabelText('Nb d’unités par colis');
    await user.clear(count);
    await user.type(count, '24');
    expect(screen.getByRole('status')).toHaveTextContent('ancienne correspondance sera retirée');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      packaging: expect.objectContaining({ unitCount: 24 }),
    }));
    expect(mocks.update.mock.calls[0][0]).not.toHaveProperty('confirmRecipeUnits');
  });

  it('conserve une attestation lorsque seule la mention fournisseur change', async () => {
    const user = userEvent.setup();
    renderDialog({ ...withProof(), packaging: {
      ...article.packaging, supplierLabel: 'CT 36 X 120 G',
    } });
    const input = screen.getByLabelText('Mention du conditionnement fournisseur (facultatif)');
    await user.clear(input);
    await user.type(input, 'Carton de 36 croissants');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    const payload = mocks.update.mock.calls[0][0];
    expect(payload.packaging.supplierLabel).toBe('Carton de 36 croissants');
    expect(payload).not.toHaveProperty('confirmRecipeUnits');
    expect(payload).not.toHaveProperty('recipeUnitsPerPackage');
  });

  it('ne propose pas de preuve de pièces pour une Référence au kilogramme', () => {
    renderDialog({
      ...article,
      productVariant: { ...article.productVariant, referenceUnit: 'KG' },
    });
    expect(screen.queryByLabelText('Nombre réel de pièces par colis')).not.toBeInTheDocument();
  });
});
