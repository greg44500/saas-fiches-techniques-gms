import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';

const mocks = vi.hoisted(() => ({
  createArticle: vi.fn(),
  metadataQuery: vi.fn(),
}));

vi.mock('@/features/products/api/product-catalog-api', () => ({
  useGetProductMetadataQuery: mocks.metadataQuery,
}));

vi.mock('@/features/products/components/product-search-autocomplete', () => ({
  ProductSearchAutocomplete: ({ onSelect, onValueChange }) => (
    <button
      onClick={() => {
        const result = {
          product: { id: 'product-abricot', name: 'Abricot' },
          variant: {
            id: 'variant-abricot',
            name: 'Abricot',
            referenceUnit: 'KG',
          },
        };

        onSelect(result);
        onValueChange('Abricot');
      }}
      type="button"
    >
      Choisir Abricot
    </button>
  ),
}));

vi.mock('@/features/suppliers/api/supplier-api', () => ({
  useCreateSupplierArticleMutation: () => [
    mocks.createArticle,
    { isLoading: false },
  ],
}));

import {
  SupplierArticleFormDialog,
} from '@/features/suppliers/components/supplier-article-form-dialog';

function renderDialog(onSaved = vi.fn(), props = {}) {
  return render(
    <TooltipProvider>
      <SupplierArticleFormDialog
        onClose={vi.fn()}
        onSaved={onSaved}
        open
        suppliers={[{
          id: 'supplier-1',
          name: 'Sysco',
        }]}
        workspaceId="workspace-1"
        {...props}
      />
    </TooltipProvider>,
  );
}

async function selectOption(user, triggerName, optionName) {
  const trigger = screen.getByRole('combobox', {
    name: triggerName,
  });

  vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(
    DOMRect.fromRect({ x: 24, y: 24, width: 240, height: 40 }),
  );

  await user.click(trigger);
  await user.click(await screen.findByRole('option', {
    name: optionName,
  }));
}

describe('SupplierArticleFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.metadataQuery.mockReturnValue({
      data: {
        referenceUnits: [
          { value: 'KG', label: 'kg' },
          { value: 'UNIT', label: 'unité' },
        ],
      },
    });
    mocks.createArticle.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        id: 'article-1',
      }),
    });
  });

  it('conserve la Référence Produit choisie quand l autocomplete applique son libellé', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();

    renderDialog(onSaved);

    await selectOption(
      user,
      'Sélectionner le Fournisseur',
      'Sysco',
    );

    await user.click(screen.getByRole('button', { name: 'Choisir Abricot' }));

    await user.type(
      screen.getByLabelText('Référence fournisseur'),
      'ABR-001',
    );

    await user.click(screen.getByRole('button', {
      name: 'Créer l’Article',
    }));

    expect(mocks.createArticle).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: 'workspace-1',
        supplierId: 'supplier-1',
        productVariantId: 'variant-abricot',
        supplierReference: 'ABR-001',
      }),
    );
    expect(onSaved).toHaveBeenCalledWith({ id: 'article-1' });
  });

  it('réutilise le même workflow avec une Référence Produit préremplie', async () => {
    const user = userEvent.setup();

    renderDialog(vi.fn(), {
      initialProductVariant: {
        id: 'variant-prefilled',
        name: 'Purée d’abricots',
        referenceUnit: 'KG',
      },
    });

    expect(screen.getByText('Purée d’abricots')).toBeInTheDocument();
    expect(screen.queryByRole('button', {
      name: 'Choisir Abricot',
    })).not.toBeInTheDocument();
    expect(screen.getByText(
      'La Référence Produit est préremplie depuis le Produit consulté.',
    )).toBeInTheDocument();

    await selectOption(
      user,
      'Sélectionner le Fournisseur',
      'Sysco',
    );
    await user.type(
      screen.getByLabelText('Référence fournisseur'),
      'PUR-001',
    );
    await user.click(screen.getByRole('button', {
      name: 'Créer l’Article',
    }));

    expect(mocks.createArticle).toHaveBeenCalledWith(
      expect.objectContaining({
        productVariantId: 'variant-prefilled',
        supplierId: 'supplier-1',
        supplierReference: 'PUR-001',
      }),
    );
  });

  it('présente une aide métier sans jargon M-002 et affiche UNIT comme pièce', async () => {
    const user = userEvent.setup();

    renderDialog();

    expect(screen.getByRole('button', {
      name: 'À propos de l’Article fournisseur',
    })).toBeInTheDocument();
    expect(screen.getByText(
      'Recherchez puis sélectionnez le Produit correspondant à cet Article fournisseur.',
    )).toBeInTheDocument();
    expect(screen.queryByText(/M-002/)).not.toBeInTheDocument();

    const unitTrigger = screen.getByRole('combobox', {
      name: 'Unité du conditionnement',
    });

    vi.spyOn(unitTrigger, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: 24, y: 24, width: 240, height: 40 }),
    );

    await user.click(unitTrigger);

    expect(
      await screen.findByRole('option', { name: 'pièce' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'UNIT' })).not.toBeInTheDocument();
  });

  it('conserve un conditionnement plat calculable et son libellé fournisseur complet', async () => {
    const user = userEvent.setup();

    renderDialog(vi.fn(), {
      initialProductVariant: {
        id: 'variant-bruschetta',
        name: 'Pain bruschetta surgelé',
        referenceUnit: 'UNIT',
        countUnitLabelSingular: 'tranche',
        countUnitLabelPlural: 'tranches',
      },
    });

    await selectOption(
      user,
      'Sélectionner le Fournisseur',
      'Sysco',
    );

    expect(screen.getByRole('combobox', {
      name: 'Unité du conditionnement',
    })).toHaveTextContent('tranche');
    await user.type(
      screen.getByLabelText('Référence fournisseur'),
      'BRU-032',
    );
    await user.type(screen.getByLabelText('Contenant principal'), 'Carton');
    await user.type(screen.getByLabelText('Sous-unités'), '8');
    await user.type(screen.getByLabelText('Quantité / sous-unité'), '4');
    await user.type(screen.getByLabelText('Poids net total'), '3200');
    await user.type(
      screen.getByLabelText('Libellé fournisseur d’origine'),
      '1 carton = 8 paquets × 4 tranches de 100 g',
    );
    await user.click(screen.getByRole('button', {
      name: 'Créer l’Article',
    }));

    expect(mocks.createArticle).toHaveBeenCalledWith(
      expect.objectContaining({
        packaging: {
          containerType: 'Carton',
          unitCount: 8,
          quantityPerUnit: '4',
          unit: 'UNIT',
          netWeight: '3200',
          netWeightUnit: 'G',
          supplierLabel:
            '1 carton = 8 paquets × 4 tranches de 100 g',
        },
      }),
    );
  });
});
